import { Worker, type Job } from "bullmq";

import { apiEnv } from "./config";
import {
  deliverAssignedNotificationEmailNow,
  deliverInviteEmailNow,
  deliverPasswordResetEmailNow,
} from "./lib/connectors";
import {
  closeJobClients,
  deliveryJobNames,
  enqueueMaintenanceJob,
  getRedisConnection,
  maintenanceJobNames,
  queueNames,
  upsertMaintenanceScheduler,
  type InviteEmailJobData,
  type NotificationEmailJobData,
  type PasswordResetEmailJobData,
  type WebhookEventJobData,
} from "./lib/jobs";
import {
  escalateNotificationsAcrossTenants,
  refreshGovernanceAcrossTenants,
} from "./lib/maintenance";
import { emitTenantWebhookEventNow } from "./lib/webhooks";

function formatJobPrefix(queueName: string) {
  return `[worker:${queueName}]`;
}

function registerWorkerLogging(
  queueName: string,
  worker: Worker<Record<string, unknown>, any, string>,
) {
  const prefix = formatJobPrefix(queueName);

  worker.on("ready", () => {
    console.info(`${prefix} Ready.`);
  });

  worker.on("completed", (job) => {
    console.info(`${prefix} Completed ${job.name} (${job.id}).`);
  });

  worker.on("failed", (job, error) => {
    console.error(
      `${prefix} Failed ${job?.name ?? "unknown"} (${job?.id ?? "n/a"}).`,
      error,
    );
  });

  worker.on("error", (error) => {
    console.error(`${prefix} Worker error.`, error);
  });
}

async function processDeliveryJob(job: Job<Record<string, unknown>, unknown, string>) {
  switch (job.name) {
    case deliveryJobNames.inviteEmail:
      return deliverInviteEmailNow(job.data as InviteEmailJobData);
    case deliveryJobNames.passwordResetEmail:
      return deliverPasswordResetEmailNow(job.data as PasswordResetEmailJobData);
    case deliveryJobNames.notificationEmail:
      return deliverAssignedNotificationEmailNow(
        job.data as NotificationEmailJobData,
      );
    case deliveryJobNames.webhookEvent:
      return emitTenantWebhookEventNow(job.data as WebhookEventJobData);
    default:
      throw new Error(`Unsupported delivery job: ${job.name}`);
  }
}

async function processMaintenanceJob(
  job: Job<Record<string, unknown>, unknown, string>,
) {
  switch (job.name) {
    case maintenanceJobNames.refreshAllTenants:
      return refreshGovernanceAcrossTenants();
    case maintenanceJobNames.escalateAllTenants:
      return escalateNotificationsAcrossTenants();
    default:
      throw new Error(`Unsupported maintenance job: ${job.name}`);
  }
}

async function bootstrapSchedulers() {
  await Promise.all([
    upsertMaintenanceScheduler({
      schedulerId: maintenanceJobNames.refreshAllTenants,
      jobName: maintenanceJobNames.refreshAllTenants,
      everyMs: apiEnv.WORKER_GOVERNANCE_REFRESH_INTERVAL_MS,
    }),
    upsertMaintenanceScheduler({
      schedulerId: maintenanceJobNames.escalateAllTenants,
      jobName: maintenanceJobNames.escalateAllTenants,
      everyMs: apiEnv.WORKER_ESCALATION_INTERVAL_MS,
    }),
  ]);

  await Promise.all([
    enqueueMaintenanceJob(maintenanceJobNames.refreshAllTenants, {
      triggeredBy: "manual",
      scheduledFor: new Date().toISOString(),
    }),
    enqueueMaintenanceJob(maintenanceJobNames.escalateAllTenants, {
      triggeredBy: "manual",
      scheduledFor: new Date().toISOString(),
    }),
  ]);
}

async function main() {
  const connection = getRedisConnection();

  const deliveryWorker = new Worker(queueNames.delivery, processDeliveryJob, {
    connection,
    concurrency: apiEnv.WORKER_DELIVERY_CONCURRENCY,
  });
  const maintenanceWorker = new Worker(
    queueNames.maintenance,
    processMaintenanceJob,
    {
      connection,
      concurrency: 1,
    },
  );

  registerWorkerLogging(queueNames.delivery, deliveryWorker);
  registerWorkerLogging(queueNames.maintenance, maintenanceWorker);

  await Promise.all([
    deliveryWorker.waitUntilReady(),
    maintenanceWorker.waitUntilReady(),
  ]);

  await bootstrapSchedulers();

  console.info(
    `[worker] Online with Redis ${apiEnv.REDIS_URL}, delivery mode ${apiEnv.JOB_DELIVERY_MODE}.`,
  );

  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    console.info(`[worker] Received ${signal}. Closing workers.`);

    await Promise.allSettled([
      deliveryWorker.close(),
      maintenanceWorker.close(),
    ]);
    await closeJobClients();

    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

main().catch(async (error) => {
  console.error("Failed to start worker.", error);
  await closeJobClients();
  process.exitCode = 1;
});

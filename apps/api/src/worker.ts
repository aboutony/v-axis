import { Worker, type Job } from "bullmq";

import { apiEnv } from "./config";
import {
  createOrUpdateMaintenanceRun,
  markAutomationJobCompleted,
  markAutomationJobFailed,
  markAutomationJobRunning,
} from "./lib/automation";
import {
  deliverAssignedNotificationEmailNow,
  deliverInviteEmailNow,
  deliverPasswordResetEmailNow,
} from "./lib/connectors";
import {
  closeJobClients,
  createRedisConnection,
  deliveryJobNames,
  type DeliveryQueueJobData,
  enqueueMaintenanceJob,
  maintenanceJobNames,
  ocrJobNames,
  type OcrQueueJobData,
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
import { processOcrJob } from "./lib/ocr";
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

async function processDeliveryJob(
  job: Job<Record<string, unknown>, unknown, string>,
) {
  const queueData = job.data as DeliveryQueueJobData;
  const attemptsMade = job.attemptsMade + 1;

  await markAutomationJobRunning({
    queueJobId: String(job.id),
    attemptsMade,
  });

  try {
    let result: unknown;

    switch (job.name) {
      case deliveryJobNames.inviteEmail:
        result = await deliverInviteEmailNow(
          queueData.payload as InviteEmailJobData,
        );
        break;
      case deliveryJobNames.passwordResetEmail:
        result = await deliverPasswordResetEmailNow(
          queueData.payload as PasswordResetEmailJobData,
        );
        break;
      case deliveryJobNames.notificationEmail:
        result = await deliverAssignedNotificationEmailNow(
          queueData.payload as NotificationEmailJobData,
        );
        break;
      case deliveryJobNames.webhookEvent:
        const webhookResult = await emitTenantWebhookEventNow(
          queueData.payload as WebhookEventJobData,
        );
        result = webhookResult;
        if (webhookResult.failed > 0 && webhookResult.failures.length > 0) {
          throw new Error(
            `Webhook delivery failed: ${webhookResult.failures
              .map((failure) => failure.error ?? "Unknown webhook error")
              .join("; ")}`,
          );
        }
        break;
      default:
        throw new Error(`Unsupported delivery job: ${job.name}`);
    }

    await markAutomationJobCompleted({
      queueJobId: String(job.id),
      attemptsMade,
      resultSummary:
        result && typeof result === "object"
          ? (result as Record<string, unknown>)
          : { completed: true },
    });

    return result;
  } catch (error) {
    await markAutomationJobFailed({
      queueJobId: String(job.id),
      attemptsMade,
      error,
    });
    throw error;
  }
}

async function processMaintenanceJob(
  job: Job<Record<string, unknown>, unknown, string>,
) {
  const payload = job.data as Record<string, unknown>;
  const attemptsMade = job.attemptsMade + 1;

  await createOrUpdateMaintenanceRun({
    queueJobId: String(job.id),
    queueName: queueNames.maintenance,
    jobName: job.name,
    payload,
    attemptsMade,
    maxAttempts: job.opts.attempts ?? 1,
  });

  try {
    let result: unknown;

    switch (job.name) {
      case maintenanceJobNames.refreshAllTenants:
        result = await refreshGovernanceAcrossTenants();
        break;
      case maintenanceJobNames.escalateAllTenants:
        result = await escalateNotificationsAcrossTenants();
        break;
      default:
        throw new Error(`Unsupported maintenance job: ${job.name}`);
    }

    await markAutomationJobCompleted({
      queueJobId: String(job.id),
      attemptsMade,
      resultSummary:
        result && typeof result === "object"
          ? (result as Record<string, unknown>)
          : { completed: true },
    });

    return result;
  } catch (error) {
    await markAutomationJobFailed({
      queueJobId: String(job.id),
      attemptsMade,
      error,
    });
    throw error;
  }
}

async function processOcrQueueJob(
  job: Job<Record<string, unknown>, unknown, string>,
) {
  const queueData = job.data as OcrQueueJobData;
  const attemptsMade = job.attemptsMade + 1;

  if (job.name !== ocrJobNames.extractDocument) {
    throw new Error(`Unsupported OCR job: ${job.name}`);
  }

  await markAutomationJobRunning({
    queueJobId: String(job.id),
    attemptsMade,
  });

  return processOcrJob({
    automationJobId: String(job.id),
    payload: queueData.payload,
    attemptsMade,
  });
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
  const deliveryConnection = createRedisConnection();
  const maintenanceConnection = createRedisConnection();
  const ocrConnection = createRedisConnection();

  const deliveryWorker = new Worker(queueNames.delivery, processDeliveryJob, {
    connection: deliveryConnection,
    concurrency: apiEnv.WORKER_DELIVERY_CONCURRENCY,
  });
  const maintenanceWorker = new Worker(
    queueNames.maintenance,
    processMaintenanceJob,
    {
      connection: maintenanceConnection,
      concurrency: 1,
    },
  );
  const ocrWorker = new Worker(queueNames.ocr, processOcrQueueJob, {
    connection: ocrConnection,
    concurrency: 1,
  });

  registerWorkerLogging(queueNames.delivery, deliveryWorker);
  registerWorkerLogging(queueNames.maintenance, maintenanceWorker);
  registerWorkerLogging(queueNames.ocr, ocrWorker);

  await Promise.all([
    deliveryWorker.waitUntilReady(),
    maintenanceWorker.waitUntilReady(),
    ocrWorker.waitUntilReady(),
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
      ocrWorker.close(),
    ]);
    await Promise.allSettled([
      deliveryConnection.quit().catch(() => deliveryConnection.disconnect()),
      maintenanceConnection
        .quit()
        .catch(() => maintenanceConnection.disconnect()),
      ocrConnection.quit().catch(() => ocrConnection.disconnect()),
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

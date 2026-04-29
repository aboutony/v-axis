import { Queue } from "bullmq";
import IORedis from "ioredis";

import type { ActivityEventType } from "@vaxis/domain";

import { apiEnv } from "../config";
import {
  createQueuedDeliveryJobRecord,
  markAutomationJobFailed,
} from "./automation";

export const queueNames = {
  delivery: "vaxis-delivery",
  maintenance: "vaxis-maintenance",
  ocr: "vaxis-ocr",
} as const;

export const deliveryJobNames = {
  inviteEmail: "delivery.email.invite",
  passwordResetEmail: "delivery.email.password-reset",
  notificationEmail: "delivery.email.notification",
  webhookEvent: "delivery.webhook.event",
} as const;

export const maintenanceJobNames = {
  refreshAllTenants: "maintenance.governance.refresh-all-tenants",
  escalateAllTenants: "maintenance.notifications.escalate-all-tenants",
} as const;

export const ocrJobNames = {
  extractDocument: "ocr.document.extract",
} as const;

export type InviteEmailJobData = {
  tenantId: string;
  actorUserId?: string | null;
  recipientEmail: string;
  recipientName?: string | null;
  tenantName: string;
  inviteLink: string;
  expiresAt: string;
};

export type PasswordResetEmailJobData = {
  tenantId: string;
  actorUserId?: string | null;
  recipientEmail: string;
  recipientName?: string | null;
  tenantName: string;
  resetLink: string;
  expiresAt: string;
};

export type NotificationEmailJobData = {
  tenantId: string;
  actorUserId?: string | null;
  assigneeUserId: string;
  notificationTitle: string;
  notificationMessage: string;
  dueDate?: string | null;
  severity: string;
  escalationLevel?: number;
  purpose: "TASK_ASSIGNMENT" | "TASK_ESCALATION";
};

export type WebhookEventJobData = {
  tenantId: string;
  webhookId?: string;
  eventType: ActivityEventType;
  resourceType: string;
  resourceId?: string | null;
  data: Record<string, unknown>;
};

export type MaintenanceJobData = {
  triggeredBy: "scheduler" | "manual";
  scheduledFor?: string;
};

export type DeliveryQueueJobData = {
  automationJobId: string;
  payload: Record<string, unknown>;
};

export type OcrJobData = {
  tenantId: string;
  documentId: string;
  ocrExtractionId: string;
  requestedBy?: string | null;
};

export type OcrQueueJobData = {
  automationJobId: string;
  payload: OcrJobData;
};

let redisConnection: IORedis | null = null;
let deliveryQueue:
  | Queue<Record<string, unknown>, unknown, string>
  | null = null;
let maintenanceQueue:
  | Queue<Record<string, unknown>, unknown, string>
  | null = null;
let ocrQueue: Queue<Record<string, unknown>, unknown, string> | null = null;

export function createRedisConnection() {
  return new IORedis(apiEnv.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });
}

export function getRedisConnection() {
  if (!redisConnection) {
    redisConnection = createRedisConnection();
  }

  return redisConnection;
}

export function getDeliveryQueue() {
  if (!deliveryQueue) {
    deliveryQueue = new Queue(queueNames.delivery, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 200,
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 1_000,
        },
      },
    });
  }

  return deliveryQueue;
}

export function getMaintenanceQueue() {
  if (!maintenanceQueue) {
    maintenanceQueue = new Queue(queueNames.maintenance, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 100,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5_000,
        },
      },
    });
  }

  return maintenanceQueue;
}

export function getOcrQueue() {
  if (!ocrQueue) {
    ocrQueue = new Queue(queueNames.ocr, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 200,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2_000,
        },
      },
    });
  }

  return ocrQueue;
}

export async function enqueueDeliveryJob(
  name:
    | (typeof deliveryJobNames)[keyof typeof deliveryJobNames]
    | string,
  data:
    | InviteEmailJobData
    | PasswordResetEmailJobData
    | NotificationEmailJobData
    | WebhookEventJobData,
  options?: {
    replayOfId?: string | null;
    triggeredBy?: string;
  },
) {
  const payload = data as Record<string, unknown>;
  const automationJobId = await createQueuedDeliveryJobRecord({
    jobName: name,
    queueName: queueNames.delivery,
    payload,
    triggeredBy: options?.triggeredBy ?? "API",
    replayOfId: options?.replayOfId ?? null,
    maxAttempts: 5,
  });

  try {
    return await getDeliveryQueue().add(
      name,
      {
        automationJobId,
        payload,
      } satisfies DeliveryQueueJobData,
      {
        jobId: automationJobId,
      },
    );
  } catch (error) {
    await markAutomationJobFailed({
      queueJobId: automationJobId,
      attemptsMade: 0,
      error,
    });
    throw error;
  }
}

export async function enqueueMaintenanceJob(
  name:
    | (typeof maintenanceJobNames)[keyof typeof maintenanceJobNames]
    | string,
  data: MaintenanceJobData,
) {
  return getMaintenanceQueue().add(name, data as Record<string, unknown>);
}

export async function enqueueOcrJob(data: OcrJobData) {
  const automationJobId = await createQueuedDeliveryJobRecord({
    jobName: ocrJobNames.extractDocument,
    queueName: queueNames.ocr,
    payload: data as unknown as Record<string, unknown>,
    triggeredBy: "OCR",
    maxAttempts: 3,
  });

  try {
    return await getOcrQueue().add(
      ocrJobNames.extractDocument,
      {
        automationJobId,
        payload: data,
      } satisfies OcrQueueJobData,
      {
        jobId: automationJobId,
      },
    );
  } catch (error) {
    await markAutomationJobFailed({
      queueJobId: automationJobId,
      attemptsMade: 0,
      error,
    });
    throw error;
  }
}

export async function upsertMaintenanceScheduler(input: {
  schedulerId: string;
  jobName: (typeof maintenanceJobNames)[keyof typeof maintenanceJobNames];
  everyMs: number;
}) {
  return getMaintenanceQueue().upsertJobScheduler(
    input.schedulerId,
    {
      every: input.everyMs,
    },
    {
      name: input.jobName,
      data: {
        triggeredBy: "scheduler",
        scheduledFor: new Date().toISOString(),
      } as Record<string, unknown>,
      opts: {
        removeOnComplete: 50,
        removeOnFail: 100,
        attempts: 3,
      },
    },
  );
}

export async function closeJobClients() {
  await Promise.allSettled([
    deliveryQueue?.close(),
    maintenanceQueue?.close(),
    ocrQueue?.close(),
  ]);

  deliveryQueue = null;
  maintenanceQueue = null;
  ocrQueue = null;

  if (redisConnection) {
    await redisConnection.quit().catch(() => redisConnection?.disconnect());
    redisConnection = null;
  }
}

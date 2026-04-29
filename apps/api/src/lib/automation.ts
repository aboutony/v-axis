import { randomUUID } from "node:crypto";

import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@vaxis/db";
import { automationJobs } from "@vaxis/db/schema";

import { decryptSensitiveValue, encryptSensitiveValue } from "./secrets";

function normalizeTriggeredBy(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value.trim().toUpperCase();
  }

  return "SYSTEM";
}

function pickTenantId(payload: Record<string, unknown>) {
  const tenantId = payload.tenantId;
  return typeof tenantId === "string" && tenantId.trim() ? tenantId : null;
}

function pickResourcePointer(input: {
  jobName: string;
  payload: Record<string, unknown>;
}) {
  switch (input.jobName) {
    case "delivery.webhook.event": {
      const webhookId = input.payload.webhookId;
      const resourceType = input.payload.resourceType;
      const resourceId = input.payload.resourceId;

      return {
        resourceType:
          typeof webhookId === "string" && webhookId.trim()
            ? "WEBHOOK"
            : typeof resourceType === "string" && resourceType.trim()
              ? resourceType.trim()
              : "WEBHOOK_EVENT",
        resourceId:
          typeof webhookId === "string" && webhookId.trim()
            ? webhookId
            : typeof resourceId === "string" && resourceId.trim()
              ? resourceId
              : null,
      };
    }
    case "delivery.email.notification": {
      const assigneeUserId = input.payload.assigneeUserId;
      return {
        resourceType: "USER",
        resourceId:
          typeof assigneeUserId === "string" && assigneeUserId.trim()
            ? assigneeUserId
            : null,
      };
    }
    case "ocr.document.extract": {
      const documentId = input.payload.documentId;
      return {
        resourceType: "DOCUMENT",
        resourceId:
          typeof documentId === "string" && documentId.trim()
            ? documentId
            : null,
      };
    }
    default:
      return {
        resourceType: "DELIVERY",
        resourceId: null,
      };
  }
}

function buildPayloadPreview(input: {
  jobName: string;
  payload: Record<string, unknown>;
}) {
  switch (input.jobName) {
    case "delivery.email.invite":
      return {
        purpose: "INVITE",
        recipientEmail: input.payload.recipientEmail ?? null,
        recipientName: input.payload.recipientName ?? null,
        tenantName: input.payload.tenantName ?? null,
        expiresAt: input.payload.expiresAt ?? null,
      };
    case "delivery.email.password-reset":
      return {
        purpose: "PASSWORD_RESET",
        recipientEmail: input.payload.recipientEmail ?? null,
        recipientName: input.payload.recipientName ?? null,
        tenantName: input.payload.tenantName ?? null,
        expiresAt: input.payload.expiresAt ?? null,
      };
    case "delivery.email.notification":
      return {
        purpose: input.payload.purpose ?? "TASK_ASSIGNMENT",
        assigneeUserId: input.payload.assigneeUserId ?? null,
        notificationTitle: input.payload.notificationTitle ?? null,
        severity: input.payload.severity ?? null,
        dueDate: input.payload.dueDate ?? null,
        escalationLevel: input.payload.escalationLevel ?? null,
      };
    case "delivery.webhook.event":
      return {
        webhookId: input.payload.webhookId ?? null,
        eventType: input.payload.eventType ?? null,
        resourceType: input.payload.resourceType ?? null,
        resourceId: input.payload.resourceId ?? null,
      };
    case "maintenance.governance.refresh-all-tenants":
      return {
        scope: "ALL_TENANTS",
        action: "REFRESH_GOVERNANCE",
        triggeredBy: normalizeTriggeredBy(input.payload.triggeredBy),
        scheduledFor: input.payload.scheduledFor ?? null,
      };
    case "maintenance.notifications.escalate-all-tenants":
      return {
        scope: "ALL_TENANTS",
        action: "ESCALATE_NOTIFICATIONS",
        triggeredBy: normalizeTriggeredBy(input.payload.triggeredBy),
        scheduledFor: input.payload.scheduledFor ?? null,
      };
    case "ocr.document.extract":
      return {
        purpose: "OCR_EXTRACTION",
        documentId: input.payload.documentId ?? null,
        ocrExtractionId: input.payload.ocrExtractionId ?? null,
        requestedBy: input.payload.requestedBy ?? null,
      };
    default:
      return {
        jobName: input.jobName,
      };
  }
}

function normalizeAutomationError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown automation execution error.";
}

export async function createQueuedDeliveryJobRecord(input: {
  jobName: string;
  queueName: string;
  payload: Record<string, unknown>;
  triggeredBy?: string;
  maxAttempts: number;
  replayOfId?: string | null;
}) {
  const jobId = randomUUID();
  const resource = pickResourcePointer({
    jobName: input.jobName,
    payload: input.payload,
  });

  await db.insert(automationJobs).values({
    id: jobId,
    tenantId: pickTenantId(input.payload),
    jobKind: input.queueName === "vaxis-ocr" ? "OCR" : "DELIVERY",
    queueName: input.queueName,
    jobName: input.jobName,
    queueJobId: jobId,
    status: "QUEUED",
    triggeredBy: normalizeTriggeredBy(input.triggeredBy ?? "API"),
    resourceType: resource.resourceType,
    resourceId: resource.resourceId,
    payloadPreview: buildPayloadPreview({
      jobName: input.jobName,
      payload: input.payload,
    }),
    payloadEncrypted: encryptSensitiveValue(JSON.stringify(input.payload)),
    maxAttempts: input.maxAttempts,
    replayOfId: input.replayOfId ?? null,
  });

  return jobId;
}

export async function createOrUpdateMaintenanceRun(input: {
  queueJobId: string;
  queueName: string;
  jobName: string;
  payload: Record<string, unknown>;
  attemptsMade: number;
  maxAttempts: number;
}) {
  await db
    .insert(automationJobs)
    .values({
      jobKind: "MAINTENANCE",
      queueName: input.queueName,
      jobName: input.jobName,
      queueJobId: input.queueJobId,
      status: "RUNNING",
      triggeredBy: normalizeTriggeredBy(input.payload.triggeredBy),
      payloadPreview: buildPayloadPreview({
        jobName: input.jobName,
        payload: input.payload,
      }),
      resultSummary: {},
      attemptsMade: input.attemptsMade,
      maxAttempts: input.maxAttempts,
      startedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: automationJobs.queueJobId,
      set: {
        status: "RUNNING",
        triggeredBy: normalizeTriggeredBy(input.payload.triggeredBy),
        payloadPreview: buildPayloadPreview({
          jobName: input.jobName,
          payload: input.payload,
        }),
        attemptsMade: input.attemptsMade,
        maxAttempts: input.maxAttempts,
        error: null,
        startedAt: sql`coalesce(${automationJobs.startedAt}, now())`,
        updatedAt: new Date(),
      },
    });
}

export async function markAutomationJobRunning(input: {
  queueJobId: string;
  attemptsMade: number;
}) {
  await db
    .update(automationJobs)
    .set({
      status: "RUNNING",
      attemptsMade: input.attemptsMade,
      error: null,
      startedAt: sql`coalesce(${automationJobs.startedAt}, now())`,
      updatedAt: new Date(),
    })
    .where(eq(automationJobs.queueJobId, input.queueJobId));
}

export async function markAutomationJobCompleted(input: {
  queueJobId: string;
  attemptsMade: number;
  resultSummary?: Record<string, unknown>;
}) {
  await db
    .update(automationJobs)
    .set({
      status: "COMPLETED",
      attemptsMade: input.attemptsMade,
      resultSummary: input.resultSummary ?? {},
      error: null,
      finishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(automationJobs.queueJobId, input.queueJobId));
}

export async function markAutomationJobFailed(input: {
  queueJobId: string;
  attemptsMade: number;
  error: unknown;
}) {
  await db
    .update(automationJobs)
    .set({
      status: "FAILED",
      attemptsMade: input.attemptsMade,
      error: normalizeAutomationError(input.error),
      finishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(automationJobs.queueJobId, input.queueJobId));
}

export async function fetchAutomationOverview(input: {
  tenantId: string;
  limit: number;
}) {
  const [
    recentDeliveries,
    recentMaintenanceRuns,
    recentOcrJobs,
    deliveryFailureCount,
    maintenanceFailureCount,
    ocrFailureCount,
  ] =
    await Promise.all([
      db
        .select()
        .from(automationJobs)
        .where(
          and(
            eq(automationJobs.jobKind, "DELIVERY"),
            eq(automationJobs.tenantId, input.tenantId),
          ),
        )
        .orderBy(desc(automationJobs.createdAt))
        .limit(input.limit),
      db
        .select()
        .from(automationJobs)
        .where(
          and(
            eq(automationJobs.jobKind, "MAINTENANCE"),
            isNull(automationJobs.tenantId),
          ),
        )
        .orderBy(desc(automationJobs.createdAt))
        .limit(input.limit),
      db
        .select()
        .from(automationJobs)
        .where(
          and(
            eq(automationJobs.jobKind, "OCR"),
            eq(automationJobs.tenantId, input.tenantId),
          ),
        )
        .orderBy(desc(automationJobs.createdAt))
        .limit(input.limit),
      db
        .select({ count: sql<number>`count(*)` })
        .from(automationJobs)
        .where(
          and(
            eq(automationJobs.jobKind, "DELIVERY"),
            eq(automationJobs.tenantId, input.tenantId),
            eq(automationJobs.status, "FAILED"),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(automationJobs)
        .where(
          and(
            eq(automationJobs.jobKind, "MAINTENANCE"),
            eq(automationJobs.status, "FAILED"),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(automationJobs)
        .where(
          and(
            eq(automationJobs.jobKind, "OCR"),
            eq(automationJobs.tenantId, input.tenantId),
            eq(automationJobs.status, "FAILED"),
          ),
        ),
    ]);

  return {
    recentDeliveries,
    recentMaintenanceRuns,
    recentOcrJobs,
    failureSummary: {
      deliveryFailed: deliveryFailureCount[0]?.count ?? 0,
      maintenanceFailed: maintenanceFailureCount[0]?.count ?? 0,
      ocrFailed: ocrFailureCount[0]?.count ?? 0,
    },
  };
}

export async function loadReplayableDeliveryJob(input: {
  id: string;
  tenantId: string;
}) {
  const [job] = await db
    .select()
    .from(automationJobs)
    .where(
      and(
        eq(automationJobs.id, input.id),
        eq(automationJobs.jobKind, "DELIVERY"),
        eq(automationJobs.tenantId, input.tenantId),
      ),
    )
    .limit(1);

  if (!job) {
    return null;
  }

  return {
    job,
    payload: job.payloadEncrypted
      ? (JSON.parse(
          decryptSensitiveValue(job.payloadEncrypted),
        ) as Record<string, unknown>)
      : null,
  };
}

export async function loadReplayableOcrJob(input: {
  id: string;
  tenantId: string;
}) {
  const [job] = await db
    .select()
    .from(automationJobs)
    .where(
      and(
        eq(automationJobs.id, input.id),
        eq(automationJobs.jobKind, "OCR"),
        eq(automationJobs.tenantId, input.tenantId),
      ),
    )
    .limit(1);

  if (!job) {
    return null;
  }

  return {
    job,
    payload: job.payloadEncrypted
      ? (JSON.parse(
          decryptSensitiveValue(job.payloadEncrypted),
        ) as Record<string, unknown>)
      : null,
  };
}

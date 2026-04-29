import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { db } from "@vaxis/db";
import { auditLogs } from "@vaxis/db/schema";

import {
  fetchAutomationOverview,
  loadReplayableOcrJob,
  loadReplayableDeliveryJob,
} from "../lib/automation";
import {
  enqueueDeliveryJob,
  enqueueMaintenanceJob,
  enqueueOcrJob,
  getDeliveryQueue,
  getMaintenanceQueue,
  getOcrQueue,
  getRedisConnection,
  maintenanceJobNames,
} from "../lib/jobs";
import { ensureAuthenticated, ensurePermission } from "../lib/permissions";
import { apiEnv } from "../config";

const automationQuerySchema = z.object({
  limit: z.coerce.number().int().min(5).max(50).default(10),
});

const automationJobParamsSchema = z.object({
  id: z.string().uuid(),
});

async function loadQueueCounts() {
  try {
    const [redisPing, deliveryCounts, maintenanceCounts, ocrCounts, schedulers] =
      await Promise.all([
        getRedisConnection().ping(),
      getDeliveryQueue().getJobCounts(
        "wait",
        "active",
        "delayed",
        "completed",
        "failed",
        "paused",
      ),
      getMaintenanceQueue().getJobCounts(
        "wait",
        "active",
        "delayed",
        "completed",
        "failed",
        "paused",
      ),
      getOcrQueue().getJobCounts(
        "wait",
        "active",
        "delayed",
        "completed",
        "failed",
        "paused",
      ),
      getMaintenanceQueue().getJobSchedulers(0, 10, true),
    ]);

    return {
      available: true as const,
      redisPing,
      queues: {
        delivery: {
          waiting: deliveryCounts.wait ?? 0,
          active: deliveryCounts.active ?? 0,
          delayed: deliveryCounts.delayed ?? 0,
          completed: deliveryCounts.completed ?? 0,
          failed: deliveryCounts.failed ?? 0,
          paused: deliveryCounts.paused ?? 0,
        },
        maintenance: {
          waiting: maintenanceCounts.wait ?? 0,
          active: maintenanceCounts.active ?? 0,
          delayed: maintenanceCounts.delayed ?? 0,
          completed: maintenanceCounts.completed ?? 0,
          failed: maintenanceCounts.failed ?? 0,
          paused: maintenanceCounts.paused ?? 0,
        },
        ocr: {
          waiting: ocrCounts.wait ?? 0,
          active: ocrCounts.active ?? 0,
          delayed: ocrCounts.delayed ?? 0,
          completed: ocrCounts.completed ?? 0,
          failed: ocrCounts.failed ?? 0,
          paused: ocrCounts.paused ?? 0,
        },
      },
      schedulers: schedulers.map((scheduler) => ({
        key: scheduler.key,
        name: scheduler.name,
        everyMs: scheduler.every ?? null,
        nextRunAt: scheduler.next ? new Date(scheduler.next).toISOString() : null,
        iterationCount: scheduler.iterationCount ?? 0,
      })),
    };
  } catch (error) {
    return {
      available: false as const,
      message:
        error instanceof Error
          ? error.message
          : "Automation queue status is unavailable.",
      queues: {
        delivery: {
          waiting: 0,
          active: 0,
          delayed: 0,
          completed: 0,
          failed: 0,
          paused: 0,
        },
        maintenance: {
          waiting: 0,
          active: 0,
          delayed: 0,
          completed: 0,
          failed: 0,
          paused: 0,
        },
        ocr: {
          waiting: 0,
          active: 0,
          delayed: 0,
          completed: 0,
          failed: 0,
          paused: 0,
        },
      },
      schedulers: [],
    };
  }
}

function buildReplayMessage(jobName: string) {
  switch (jobName) {
    case "delivery.email.invite":
      return "Invite delivery requeued.";
    case "delivery.email.password-reset":
      return "Password reset delivery requeued.";
    case "delivery.email.notification":
      return "Notification email requeued.";
    case "delivery.webhook.event":
      return "Webhook delivery requeued.";
    default:
      return "Delivery requeued.";
  }
}

export const automationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/api/v1/automation", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "NOTIFICATION_MANAGE")) {
      return;
    }

    const input = automationQuerySchema.parse(request.query);
    const [overview, queueState] = await Promise.all([
      fetchAutomationOverview({
        tenantId: request.user.tenantId,
        limit: input.limit,
      }),
      loadQueueCounts(),
    ]);

    return {
      worker: {
        deliveryMode: apiEnv.JOB_DELIVERY_MODE,
        deliveryConcurrency: apiEnv.WORKER_DELIVERY_CONCURRENCY,
        governanceRefreshIntervalMs:
          apiEnv.WORKER_GOVERNANCE_REFRESH_INTERVAL_MS,
        escalationIntervalMs: apiEnv.WORKER_ESCALATION_INTERVAL_MS,
        queueAvailable: queueState.available,
        queueMessage: queueState.available ? null : queueState.message,
        redisPing: queueState.available ? queueState.redisPing : null,
      },
      queues: queueState.queues,
      schedulers: queueState.schedulers,
      failureSummary: overview.failureSummary,
      recentDeliveries: overview.recentDeliveries.map((job) => ({
        id: job.id,
        jobName: job.jobName,
        queueJobId: job.queueJobId,
        status: job.status,
        triggeredBy: job.triggeredBy,
        resourceType: job.resourceType,
        resourceId: job.resourceId,
        payloadPreview: job.payloadPreview,
        resultSummary: job.resultSummary,
        error: job.error,
        attemptsMade: job.attemptsMade,
        maxAttempts: job.maxAttempts,
        replayOfId: job.replayOfId,
        availableForReplay: job.status === "FAILED" && Boolean(job.payloadEncrypted),
        startedAt: job.startedAt,
        finishedAt: job.finishedAt,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      })),
      recentMaintenanceRuns: overview.recentMaintenanceRuns.map((job) => ({
        id: job.id,
        jobName: job.jobName,
        queueJobId: job.queueJobId,
        status: job.status,
        triggeredBy: job.triggeredBy,
        payloadPreview: job.payloadPreview,
        resultSummary: job.resultSummary,
        error: job.error,
        attemptsMade: job.attemptsMade,
        maxAttempts: job.maxAttempts,
        startedAt: job.startedAt,
        finishedAt: job.finishedAt,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      })),
      recentOcrJobs: overview.recentOcrJobs.map((job) => ({
        id: job.id,
        jobName: job.jobName,
        queueJobId: job.queueJobId,
        status: job.status,
        triggeredBy: job.triggeredBy,
        resourceType: job.resourceType,
        resourceId: job.resourceId,
        payloadPreview: job.payloadPreview,
        resultSummary: job.resultSummary,
        error: job.error,
        attemptsMade: job.attemptsMade,
        maxAttempts: job.maxAttempts,
        replayOfId: job.replayOfId,
        availableForReplay: job.status === "FAILED" && Boolean(job.payloadEncrypted),
        startedAt: job.startedAt,
        finishedAt: job.finishedAt,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      })),
    };
  });

  fastify.post(
    "/api/v1/automation/maintenance/:name/run",
    async (request, reply) => {
      if (!(await ensureAuthenticated(request, reply))) {
        return;
      }

      if (!ensurePermission(request, reply, "NOTIFICATION_MANAGE")) {
        return;
      }

      const params = z
        .object({
          name: z.enum([
            maintenanceJobNames.refreshAllTenants,
            maintenanceJobNames.escalateAllTenants,
          ]),
        })
        .parse(request.params);

      const job = await enqueueMaintenanceJob(params.name, {
        triggeredBy: "manual",
        scheduledFor: new Date().toISOString(),
      });

      return {
        message:
          params.name === maintenanceJobNames.refreshAllTenants
            ? "Governance refresh queued."
            : "Notification escalation queued.",
        jobId: String(job.id),
      };
    },
  );

  fastify.post(
    "/api/v1/automation/deliveries/:id/replay",
    async (request, reply) => {
      if (!(await ensureAuthenticated(request, reply))) {
        return;
      }

      if (!ensurePermission(request, reply, "NOTIFICATION_MANAGE")) {
        return;
      }

      const { id } = automationJobParamsSchema.parse(request.params);
      const replayable = await loadReplayableDeliveryJob({
        id,
        tenantId: request.user.tenantId,
      });

      if (!replayable) {
        return reply.code(404).send({
          error: "AUTOMATION_JOB_NOT_FOUND",
          message: "The requested delivery record was not found in this tenant.",
        });
      }

      if (replayable.job.status !== "FAILED" || !replayable.payload) {
        return reply.code(400).send({
          error: "AUTOMATION_JOB_NOT_REPLAYABLE",
          message: "Only failed delivery records with stored payloads can be replayed.",
        });
      }

      const queuedJob = await enqueueDeliveryJob(
        replayable.job.jobName,
        replayable.payload as never,
        {
          replayOfId: replayable.job.id,
          triggeredBy: "REPLAY",
        },
      );

      await db.insert(auditLogs).values({
        tenantId: request.user.tenantId,
        userId: request.user.sub,
        eventType: "automation.delivery.replayed",
        resourceType: "AUTOMATION_JOB",
        resourceId: replayable.job.id,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
        metadata: {
          originalJobId: replayable.job.id,
          replayJobId: String(queuedJob.id),
          replayedJobName: replayable.job.jobName,
        },
      });

      return {
        message: buildReplayMessage(replayable.job.jobName),
        replayJobId: String(queuedJob.id),
      };
    },
  );

  fastify.post(
    "/api/v1/automation/ocr/:id/replay",
    async (request, reply) => {
      if (!(await ensureAuthenticated(request, reply))) {
        return;
      }

      if (!ensurePermission(request, reply, "NOTIFICATION_MANAGE")) {
        return;
      }

      const { id } = automationJobParamsSchema.parse(request.params);
      const replayable = await loadReplayableOcrJob({
        id,
        tenantId: request.user.tenantId,
      });

      if (!replayable) {
        return reply.code(404).send({
          error: "AUTOMATION_JOB_NOT_FOUND",
          message: "The requested OCR job was not found in this tenant.",
        });
      }

      if (replayable.job.status !== "FAILED" || !replayable.payload) {
        return reply.code(400).send({
          error: "AUTOMATION_JOB_NOT_REPLAYABLE",
          message: "Only failed OCR jobs with stored payloads can be replayed.",
        });
      }

      const queuedJob = await enqueueOcrJob(replayable.payload as never);

      return {
        message: "OCR job requeued.",
        replayJobId: String(queuedJob.id),
      };
    },
  );
};

import type { FastifyPluginAsync } from "fastify";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@vaxis/db";
import { auditLogs, webhooks } from "@vaxis/db/schema";
import { activityEventTypes } from "@vaxis/domain";

import { hashToken } from "../lib/auth";
import { ensureAuthenticated, ensurePermission } from "../lib/permissions";
import {
  encryptWebhookSecret,
  sendWebhookTestEvent,
} from "../lib/webhooks";

const webhookEventSchema = z.enum(activityEventTypes);

const webhookParamsSchema = z.object({
  id: z.string().uuid(),
});

const webhookCreateSchema = z.object({
  name: z.string().trim().min(2).max(200),
  url: z.string().trim().url(),
  sharedSecret: z.string().trim().min(16).max(255),
  subscribedEvents: z.array(webhookEventSchema).min(1).max(32),
  enabled: z.boolean().optional(),
});

const webhookUpdateSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  url: z.string().trim().url().optional(),
  sharedSecret: z.string().trim().min(16).max(255).optional().or(z.literal("")),
  subscribedEvents: z.array(webhookEventSchema).min(1).max(32).optional(),
  enabled: z.boolean().optional(),
});

const webhookTestSchema = z.object({
  eventType: webhookEventSchema.optional(),
});

async function buildWebhooksResponse(tenantId: string) {
  const webhookRows = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.tenantId, tenantId));

  return {
    availableEvents: activityEventTypes,
    webhooks: webhookRows
      .map((webhook) => ({
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        subscribedEvents: webhook.subscribedEvents,
        enabled: webhook.enabled,
        secretConfigured: Boolean(webhook.sharedSecretHash),
        lastDeliveryAttemptAt: webhook.lastDeliveryAttemptAt,
        lastDeliveryStatus: webhook.lastDeliveryStatus,
        lastResponseStatusCode: webhook.lastResponseStatusCode,
        lastDeliveryError: webhook.lastDeliveryError,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt,
      }))
      .sort((left, right) => left.name.localeCompare(right.name)),
  };
}

export const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/api/v1/webhooks", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "NOTIFICATION_MANAGE")) {
      return;
    }

    return buildWebhooksResponse(request.user.tenantId);
  });

  fastify.post("/api/v1/webhooks", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "NOTIFICATION_MANAGE")) {
      return;
    }

    const input = webhookCreateSchema.parse(request.body);
    const subscribedEvents = Array.from(new Set(input.subscribedEvents));
    const [webhook] = await db
      .insert(webhooks)
      .values({
        tenantId: request.user.tenantId,
        name: input.name,
        url: input.url,
        sharedSecretHash: hashToken(input.sharedSecret),
        sharedSecretEncrypted: encryptWebhookSecret(input.sharedSecret),
        subscribedEvents,
        enabled: input.enabled ?? true,
      })
      .returning();

    await db.insert(auditLogs).values({
      tenantId: request.user.tenantId,
      userId: request.user.sub,
      eventType: "webhook.updated",
      resourceType: "WEBHOOK",
      resourceId: webhook?.id ?? null,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
      metadata: {
        action: "created",
        subscribedEventCount: subscribedEvents.length,
      },
    });

    return reply.code(201).send({
      message: "Webhook created.",
      ...(await buildWebhooksResponse(request.user.tenantId)),
    });
  });

  fastify.patch("/api/v1/webhooks/:id", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "NOTIFICATION_MANAGE")) {
      return;
    }

    const { id } = webhookParamsSchema.parse(request.params);
    const input = webhookUpdateSchema.parse(request.body);

    const [existing] = await db
      .select()
      .from(webhooks)
      .where(
        and(eq(webhooks.id, id), eq(webhooks.tenantId, request.user.tenantId)),
      )
      .limit(1);

    if (!existing) {
      return reply.code(404).send({
        error: "WEBHOOK_NOT_FOUND",
        message: "The webhook was not found in this tenant.",
      });
    }

    const nextSecret =
      input.sharedSecret && input.sharedSecret.trim()
        ? {
            sharedSecretHash: hashToken(input.sharedSecret.trim()),
            sharedSecretEncrypted: encryptWebhookSecret(
              input.sharedSecret.trim(),
            ),
          }
        : null;

    await db
      .update(webhooks)
      .set({
        name: input.name ?? existing.name,
        url: input.url ?? existing.url,
        subscribedEvents:
          input.subscribedEvents === undefined
            ? existing.subscribedEvents
            : Array.from(new Set(input.subscribedEvents)),
        enabled: input.enabled ?? existing.enabled,
        sharedSecretHash:
          nextSecret?.sharedSecretHash ?? existing.sharedSecretHash,
        sharedSecretEncrypted:
          nextSecret?.sharedSecretEncrypted ?? existing.sharedSecretEncrypted,
        updatedAt: new Date(),
      })
      .where(eq(webhooks.id, existing.id));

    await db.insert(auditLogs).values({
      tenantId: request.user.tenantId,
      userId: request.user.sub,
      eventType: "webhook.updated",
      resourceType: "WEBHOOK",
      resourceId: existing.id,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
      metadata: {
        action: "updated",
        rotatedSecret: Boolean(nextSecret),
      },
    });

    return {
      message: "Webhook updated.",
      ...(await buildWebhooksResponse(request.user.tenantId)),
    };
  });

  fastify.post("/api/v1/webhooks/:id/test", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "NOTIFICATION_MANAGE")) {
      return;
    }

    const { id } = webhookParamsSchema.parse(request.params);
    const input = webhookTestSchema.parse(request.body ?? {});
    const result = await sendWebhookTestEvent({
      tenantId: request.user.tenantId,
      webhookId: id,
      eventType: input.eventType ?? "notification.created",
      actorUserId: request.user.sub,
    });

    if (!result.ok) {
      return reply.code(502).send({
        error: result.error,
        message: result.message,
      });
    }

    await db.insert(auditLogs).values({
      tenantId: request.user.tenantId,
      userId: request.user.sub,
      eventType: "webhook.updated",
      resourceType: "WEBHOOK",
      resourceId: id,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
      metadata: {
        action: "tested",
        deliveryId: result.deliveryId,
        statusCode: result.statusCode,
      },
    });

    return {
      message: "Webhook test delivered.",
      deliveryId: result.deliveryId,
      statusCode: result.statusCode,
      ...(await buildWebhooksResponse(request.user.tenantId)),
    };
  });
};

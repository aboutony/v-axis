import { createHmac, randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import { db } from "@vaxis/db";
import { webhooks } from "@vaxis/db/schema";
import type { ActivityEventType } from "@vaxis/domain";

import { apiEnv } from "../config";
import {
  deliveryJobNames,
  enqueueDeliveryJob,
  type WebhookEventJobData,
} from "./jobs";
import { decryptSensitiveValue, encryptSensitiveValue } from "./secrets";

type WebhookRow = typeof webhooks.$inferSelect;

export function encryptWebhookSecret(secret: string) {
  return encryptSensitiveValue(secret);
}

export function buildWebhookSignature(input: {
  sharedSecret: string;
  timestamp: string;
  payload: string;
}) {
  return createHmac("sha256", input.sharedSecret)
    .update(`${input.timestamp}.${input.payload}`)
    .digest("hex");
}

export function buildWebhookEnvelope(input: {
  tenantId: string;
  eventType: ActivityEventType;
  resourceType: string;
  resourceId?: string | null;
  data: Record<string, unknown>;
}) {
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    eventType: input.eventType,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    occurredAt: new Date().toISOString(),
    data: input.data,
  };
}

function normalizeWebhookError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown webhook delivery error.";
}

async function storeWebhookDeliveryResult(input: {
  webhookId: string;
  status: "SUCCESS" | "FAILED";
  responseStatusCode?: number | null;
  error?: string | null;
}) {
  await db
    .update(webhooks)
    .set({
      lastDeliveryAttemptAt: new Date(),
      lastDeliveryStatus: input.status,
      lastResponseStatusCode: input.responseStatusCode ?? null,
      lastDeliveryError: input.error ?? null,
      updatedAt: new Date(),
    })
    .where(eq(webhooks.id, input.webhookId));
}

async function deliverWebhook(input: {
  webhook: WebhookRow;
  envelope: ReturnType<typeof buildWebhookEnvelope>;
}) {
  try {
    const sharedSecret = decryptSensitiveValue(
      input.webhook.sharedSecretEncrypted,
    );
    const payload = JSON.stringify(input.envelope);
    const timestamp = new Date().toISOString();
    const signature = buildWebhookSignature({
      sharedSecret,
      timestamp,
      payload,
    });
    const response = await fetch(input.webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "V-AXIS-Webhook/1.0",
        "X-VAxis-Event": input.envelope.eventType,
        "X-VAxis-Delivery-Id": input.envelope.id,
        "X-VAxis-Timestamp": timestamp,
        "X-VAxis-Signature": `sha256=${signature}`,
      },
      body: payload,
      signal: AbortSignal.timeout(apiEnv.WEBHOOK_TIMEOUT_MS),
    });

    if (!response.ok) {
      await storeWebhookDeliveryResult({
        webhookId: input.webhook.id,
        status: "FAILED",
        responseStatusCode: response.status,
        error: `HTTP ${response.status}`,
      });

      return {
        ok: false as const,
        statusCode: response.status,
        error: `Webhook responded with ${response.status}.`,
      };
    }

    await storeWebhookDeliveryResult({
      webhookId: input.webhook.id,
      status: "SUCCESS",
      responseStatusCode: response.status,
    });

    return {
      ok: true as const,
      statusCode: response.status,
    };
  } catch (error) {
    const message = normalizeWebhookError(error);

    await storeWebhookDeliveryResult({
      webhookId: input.webhook.id,
      status: "FAILED",
      error: message,
    });

    return {
      ok: false as const,
      error: message,
    };
  }
}

async function loadEnabledWebhook(input: {
  tenantId: string;
  webhookId: string;
}) {
  const [webhook] = await db
    .select()
    .from(webhooks)
    .where(
      and(
        eq(webhooks.id, input.webhookId),
        eq(webhooks.tenantId, input.tenantId),
        eq(webhooks.enabled, true),
      ),
    )
    .limit(1);

  return webhook ?? null;
}

function logWebhookQueueFallback(error: unknown) {
  console.warn(
    "[delivery] Falling back to inline webhook delivery.",
    error,
  );
}

export async function emitTenantWebhookEventNow(input: {
  tenantId: string;
  webhookId?: string;
  eventType: ActivityEventType;
  resourceType: string;
  resourceId?: string | null;
  data: Record<string, unknown>;
}) {
  const subscribedWebhooks =
    typeof input.webhookId === "string" && input.webhookId.trim()
      ? (
          await Promise.all([
            loadEnabledWebhook({
              tenantId: input.tenantId,
              webhookId: input.webhookId,
            }),
          ])
        ).filter((webhook): webhook is WebhookRow => Boolean(webhook))
      : (
          await db
            .select()
            .from(webhooks)
            .where(
              and(
                eq(webhooks.tenantId, input.tenantId),
                eq(webhooks.enabled, true),
              ),
            )
        ).filter((webhook) => webhook.subscribedEvents.includes(input.eventType));

  if (subscribedWebhooks.length === 0) {
    return {
      attempted: 0,
      delivered: 0,
      failed: 0,
      failures: [],
    };
  }

  const envelope = buildWebhookEnvelope({
    tenantId: input.tenantId,
    eventType: input.eventType,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    data: input.data,
  });

  const results = await Promise.all(
    subscribedWebhooks.map((webhook) => deliverWebhook({ webhook, envelope })),
  );

  return {
    attempted: subscribedWebhooks.length,
    delivered: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    failures: results
      .map((result, index) =>
        result.ok
          ? null
          : {
              webhookId: subscribedWebhooks[index]?.id ?? null,
              statusCode: result.statusCode ?? null,
              error: result.error ?? "Unknown webhook delivery error.",
            },
      )
      .filter(
        (
          failure,
        ): failure is {
          webhookId: string | null;
          statusCode: number | null;
          error: string;
        } => Boolean(failure),
      ),
  };
}

export async function emitTenantWebhookEvent(input: WebhookEventJobData) {
  const tenantWebhooks = await db
    .select()
    .from(webhooks)
    .where(and(eq(webhooks.tenantId, input.tenantId), eq(webhooks.enabled, true)));

  const subscribedWebhooks = tenantWebhooks.filter((webhook) =>
    webhook.subscribedEvents.includes(input.eventType),
  );

  if (subscribedWebhooks.length === 0) {
    return {
      attempted: 0,
      delivered: 0,
      queued: 0,
    };
  }

  if (apiEnv.JOB_DELIVERY_MODE === "QUEUE") {
    let queued = 0;
    let delivered = 0;

    for (const webhook of subscribedWebhooks) {
      try {
        await enqueueDeliveryJob(deliveryJobNames.webhookEvent, {
          ...input,
          webhookId: webhook.id,
        });
        queued += 1;
      } catch (error) {
        logWebhookQueueFallback(error);
        const fallbackResult = await emitTenantWebhookEventNow({
          ...input,
          webhookId: webhook.id,
        });
        delivered += fallbackResult.delivered;
      }
    }

    return {
      attempted: subscribedWebhooks.length,
      delivered,
      queued,
    };
  }

  return emitTenantWebhookEventNow(input);
}

export async function sendWebhookTestEvent(input: {
  tenantId: string;
  webhookId: string;
  eventType: ActivityEventType;
  actorUserId?: string | null;
}) {
  const [webhook] = await db
    .select()
    .from(webhooks)
    .where(
      and(
        eq(webhooks.id, input.webhookId),
        eq(webhooks.tenantId, input.tenantId),
      ),
    )
    .limit(1);

  if (!webhook) {
    return {
      ok: false as const,
      error: "WEBHOOK_NOT_FOUND",
      message: "The webhook does not exist in this tenant.",
    };
  }

  const envelope = buildWebhookEnvelope({
    tenantId: input.tenantId,
    eventType: input.eventType,
    resourceType: "WEBHOOK",
    resourceId: webhook.id,
    data: {
      message: "Test event from the V-AXIS control plane.",
      actorUserId: input.actorUserId ?? null,
      webhookName: webhook.name,
    },
  });

  const result = await deliverWebhook({ webhook, envelope });

  if (!result.ok) {
    return {
      ok: false as const,
      error: "WEBHOOK_TEST_FAILED",
      message: result.error,
      statusCode: result.statusCode,
    };
  }

  return {
    ok: true as const,
    statusCode: result.statusCode,
    deliveryId: envelope.id,
  };
}

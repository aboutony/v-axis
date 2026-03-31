import { describe, expect, it } from "vitest";

import { buildWebhookEnvelope, buildWebhookSignature } from "./webhooks";

describe("webhooks helpers", () => {
  it("builds a deterministic HMAC signature for the payload", () => {
    const signature = buildWebhookSignature({
      sharedSecret: "shared-secret-value",
      timestamp: "2026-03-31T00:00:00.000Z",
      payload: '{"ok":true}',
    });

    expect(signature).toBe(
      "09a0f0c6ded848ff8276f491a7136465b07bafd0315dfc0f26aaa9852aa3704c",
    );
  });

  it("wraps webhook events in the standard delivery envelope", () => {
    const envelope = buildWebhookEnvelope({
      tenantId: "tenant-123",
      eventType: "notification.created",
      resourceType: "NOTIFICATION",
      resourceId: "resource-456",
      data: {
        title: "Missing document",
      },
    });

    expect(envelope.eventType).toBe("notification.created");
    expect(envelope.resourceType).toBe("NOTIFICATION");
    expect(envelope.resourceId).toBe("resource-456");
    expect(envelope.data.title).toBe("Missing document");
    expect(envelope.id).toBeTruthy();
    expect(envelope.occurredAt).toBeTruthy();
  });
});

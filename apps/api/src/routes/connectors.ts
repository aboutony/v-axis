import type { FastifyPluginAsync } from "fastify";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@vaxis/db";
import { auditLogs, connectors, users } from "@vaxis/db/schema";

import {
  dispatchConnectorEmail,
  notificationConnectorConfigSchema,
} from "../lib/connectors";
import { ensureAuthenticated, ensurePermission } from "../lib/permissions";

const connectorParamsSchema = z.object({
  id: z.string().uuid(),
});

const connectorCreateSchema = z.object({
  name: z.string().trim().min(2).max(200),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  senderName: z.string().trim().min(1).max(120),
  senderEmail: z.string().trim().email(),
  replyToEmail: z
    .string()
    .trim()
    .email()
    .optional()
    .or(z.literal("")),
  subjectPrefix: z.string().trim().max(40).default("[V-AXIS]"),
  dispatchInviteLinks: z.boolean().default(true),
  dispatchPasswordResets: z.boolean().default(true),
  dispatchTaskAssignments: z.boolean().default(true),
  dispatchEscalations: z.boolean().default(true),
});

const connectorUpdateSchema = connectorCreateSchema.partial();

const connectorTestSchema = z.object({
  recipientEmail: z.string().trim().email().optional(),
});

function normalizeOptionalEmail(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function buildConnectorResponse(
  connectorRows: Array<typeof connectors.$inferSelect>,
) {
  return {
    connectors: connectorRows
      .map((connector) => {
        const config = notificationConnectorConfigSchema.parse(connector.config);

        return {
          id: connector.id,
          connectorType: connector.connectorType,
          name: connector.name,
          status: connector.status,
          senderName: config.senderName,
          senderEmail: config.senderEmail,
          replyToEmail: config.replyToEmail ?? null,
          subjectPrefix: config.subjectPrefix,
          dispatchInviteLinks: config.dispatchInviteLinks,
          dispatchPasswordResets: config.dispatchPasswordResets,
          dispatchTaskAssignments: config.dispatchTaskAssignments,
          dispatchEscalations: config.dispatchEscalations,
          lastSync: connector.lastSync,
          createdAt: connector.createdAt,
          updatedAt: connector.updatedAt,
        };
      })
      .sort((left, right) => left.name.localeCompare(right.name)),
  };
}

async function loadNotificationConnectors(tenantId: string) {
  const connectorRows = await db
    .select()
    .from(connectors)
    .where(
      and(
        eq(connectors.tenantId, tenantId),
        eq(connectors.connectorType, "NOTIFICATION"),
      ),
    );

  return connectorRows;
}

export const connectorRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/api/v1/connectors", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "NOTIFICATION_MANAGE")) {
      return;
    }

    const connectorRows = await loadNotificationConnectors(request.user.tenantId);
    return buildConnectorResponse(connectorRows);
  });

  fastify.post("/api/v1/connectors", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "NOTIFICATION_MANAGE")) {
      return;
    }

    const input = connectorCreateSchema.parse(request.body);
    const [existing] = await db
      .select({ id: connectors.id })
      .from(connectors)
      .where(
        and(
          eq(connectors.tenantId, request.user.tenantId),
          eq(connectors.connectorType, "NOTIFICATION"),
          eq(connectors.name, input.name),
        ),
      )
      .limit(1);

    if (existing) {
      return reply.code(409).send({
        error: "CONNECTOR_NAME_IN_USE",
        message: "A notification connector with this name already exists.",
      });
    }

    const config = notificationConnectorConfigSchema.parse({
      senderName: input.senderName,
      senderEmail: input.senderEmail,
      replyToEmail: normalizeOptionalEmail(input.replyToEmail ?? undefined),
      subjectPrefix: input.subjectPrefix,
      dispatchInviteLinks: input.dispatchInviteLinks,
      dispatchPasswordResets: input.dispatchPasswordResets,
      dispatchTaskAssignments: input.dispatchTaskAssignments,
      dispatchEscalations: input.dispatchEscalations,
    });

    await db.insert(connectors).values({
      tenantId: request.user.tenantId,
      connectorType: "NOTIFICATION",
      name: input.name,
      config,
      status: input.status,
    });

    const connectorRows = await loadNotificationConnectors(request.user.tenantId);
    const createdConnector = connectorRows.find((connector) => connector.name === input.name);

    await db.insert(auditLogs).values({
      tenantId: request.user.tenantId,
      userId: request.user.sub,
      eventType: "connector.updated",
      resourceType: "CONNECTOR",
      resourceId: createdConnector?.id ?? null,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
      metadata: {
        action: "created",
        connectorType: "NOTIFICATION",
        status: input.status,
      },
    });

    return reply.code(201).send({
      message: "Notification connector created.",
      ...buildConnectorResponse(connectorRows),
    });
  });

  fastify.patch("/api/v1/connectors/:id", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "NOTIFICATION_MANAGE")) {
      return;
    }

    const { id } = connectorParamsSchema.parse(request.params);
    const input = connectorUpdateSchema.parse(request.body);

    const [existing] = await db
      .select()
      .from(connectors)
      .where(
        and(
          eq(connectors.id, id),
          eq(connectors.tenantId, request.user.tenantId),
          eq(connectors.connectorType, "NOTIFICATION"),
        ),
      )
      .limit(1);

    if (!existing) {
      return reply.code(404).send({
        error: "CONNECTOR_NOT_FOUND",
        message: "The notification connector was not found in this tenant.",
      });
    }

    if (input.name && input.name !== existing.name) {
      const conflictingRows = await db
        .select({ id: connectors.id })
        .from(connectors)
        .where(
          and(
            eq(connectors.tenantId, request.user.tenantId),
            eq(connectors.connectorType, "NOTIFICATION"),
            eq(connectors.name, input.name),
          ),
        );

      if (conflictingRows.some((row) => row.id !== existing.id)) {
        return reply.code(409).send({
          error: "CONNECTOR_NAME_IN_USE",
          message: "A notification connector with this name already exists.",
        });
      }
    }

    const currentConfig = notificationConnectorConfigSchema.parse(existing.config);
    const nextConfig = notificationConnectorConfigSchema.parse({
      ...currentConfig,
      senderName: input.senderName ?? currentConfig.senderName,
      senderEmail: input.senderEmail ?? currentConfig.senderEmail,
      replyToEmail:
        input.replyToEmail === undefined
          ? currentConfig.replyToEmail
          : normalizeOptionalEmail(input.replyToEmail),
      subjectPrefix: input.subjectPrefix ?? currentConfig.subjectPrefix,
      dispatchInviteLinks:
        input.dispatchInviteLinks ?? currentConfig.dispatchInviteLinks,
      dispatchPasswordResets:
        input.dispatchPasswordResets ?? currentConfig.dispatchPasswordResets,
      dispatchTaskAssignments:
        input.dispatchTaskAssignments ?? currentConfig.dispatchTaskAssignments,
      dispatchEscalations:
        input.dispatchEscalations ?? currentConfig.dispatchEscalations,
    });

    await db
      .update(connectors)
      .set({
        name: input.name ?? existing.name,
        status: input.status ?? existing.status,
        config: nextConfig,
        updatedAt: new Date(),
      })
      .where(eq(connectors.id, existing.id));

    await db.insert(auditLogs).values({
      tenantId: request.user.tenantId,
      userId: request.user.sub,
      eventType: "connector.updated",
      resourceType: "CONNECTOR",
      resourceId: existing.id,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
      metadata: {
        action: "updated",
        status: input.status ?? existing.status,
      },
    });

    const connectorRows = await loadNotificationConnectors(request.user.tenantId);
    return {
      message: "Notification connector updated.",
      ...buildConnectorResponse(connectorRows),
    };
  });

  fastify.post("/api/v1/connectors/:id/test-email", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "NOTIFICATION_MANAGE")) {
      return;
    }

    const { id } = connectorParamsSchema.parse(request.params);
    const input = connectorTestSchema.parse(request.body ?? {});

    const [connector, actor] = await Promise.all([
      db
        .select()
        .from(connectors)
        .where(
          and(
            eq(connectors.id, id),
            eq(connectors.tenantId, request.user.tenantId),
            eq(connectors.connectorType, "NOTIFICATION"),
          ),
        )
        .limit(1),
      db
        .select({
          email: users.email,
          fullName: users.fullName,
        })
        .from(users)
        .where(
          and(
            eq(users.id, request.user.sub),
            eq(users.tenantId, request.user.tenantId),
          ),
        )
        .limit(1),
    ]);

    const selectedConnector = connector[0];
    const currentActor = actor[0];

    if (!selectedConnector) {
      return reply.code(404).send({
        error: "CONNECTOR_NOT_FOUND",
        message: "The notification connector was not found in this tenant.",
      });
    }

    const recipientEmail = input.recipientEmail ?? currentActor?.email;

    if (!recipientEmail) {
      return reply.code(400).send({
        error: "RECIPIENT_REQUIRED",
        message: "A test recipient email is required for this connector.",
      });
    }

    const config = notificationConnectorConfigSchema.parse(selectedConnector.config);

    const result = await dispatchConnectorEmail({
      tenantId: request.user.tenantId,
      actorUserId: request.user.sub,
      targetConnectorIds: [selectedConnector.id],
      ignoreConnectorStatus: true,
      purpose: "TEST",
      recipientEmail,
      recipientName: currentActor?.fullName ?? null,
      subject: `Test email from ${selectedConnector.name}`,
      text: [
        `This is a connector test from ${selectedConnector.name}.`,
        "",
        `Sender: ${config.senderName} <${config.senderEmail}>`,
        `Transport: notification connector / ${selectedConnector.status}`,
      ].join("\n"),
      metadata: {
        connectorId: selectedConnector.id,
        testSend: true,
      },
    });

    await db.insert(auditLogs).values({
      tenantId: request.user.tenantId,
      userId: request.user.sub,
      eventType: "connector.updated",
      resourceType: "CONNECTOR",
      resourceId: selectedConnector.id,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
      metadata: {
        action: "test_email",
        recipientEmail,
        attempted: result.attempted,
        delivered: result.delivered,
      },
    });

    const connectorRows = await loadNotificationConnectors(request.user.tenantId);
    return {
      message:
        result.delivered > 0
          ? "Test email dispatched."
          : "No active connector delivered this test email.",
      attempted: result.attempted,
      delivered: result.delivered,
      ...buildConnectorResponse(connectorRows),
    };
  });
};

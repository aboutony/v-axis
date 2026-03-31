import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@vaxis/db";
import { auditLogs, connectors, users } from "@vaxis/db/schema";

import { apiEnv } from "../config";
import { sendPlatformEmail } from "./mailer";

function emptyStringToUndefined(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim();
  return normalized === "" ? undefined : normalized;
}

export const notificationConnectorConfigSchema = z.object({
  channel: z.literal("EMAIL").default("EMAIL"),
  senderName: z.string().trim().min(1).max(120).default(apiEnv.EMAIL_FROM_NAME),
  senderEmail: z
    .string()
    .trim()
    .email()
    .default(apiEnv.EMAIL_FROM_ADDRESS),
  replyToEmail: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().email().optional(),
  ),
  subjectPrefix: z.string().trim().max(40).default("[V-AXIS]"),
  dispatchInviteLinks: z.boolean().default(true),
  dispatchPasswordResets: z.boolean().default(true),
  dispatchTaskAssignments: z.boolean().default(true),
  dispatchEscalations: z.boolean().default(true),
});

export type NotificationConnectorConfig = z.infer<
  typeof notificationConnectorConfigSchema
>;

type ConnectorEmailPurpose =
  | "INVITE"
  | "PASSWORD_RESET"
  | "TASK_ASSIGNMENT"
  | "TASK_ESCALATION"
  | "TEST";

function normalizeConnectorConfig(
  rawConfig: unknown,
): NotificationConnectorConfig | null {
  const parsed = notificationConnectorConfigSchema.safeParse(rawConfig);
  return parsed.success ? parsed.data : null;
}

function isPurposeEnabled(
  config: NotificationConnectorConfig,
  purpose: ConnectorEmailPurpose,
) {
  switch (purpose) {
    case "INVITE":
      return config.dispatchInviteLinks;
    case "PASSWORD_RESET":
      return config.dispatchPasswordResets;
    case "TASK_ASSIGNMENT":
      return config.dispatchTaskAssignments;
    case "TASK_ESCALATION":
      return config.dispatchEscalations;
    case "TEST":
      return true;
  }
}

function buildSubject(
  config: NotificationConnectorConfig,
  subject: string,
) {
  return config.subjectPrefix.trim()
    ? `${config.subjectPrefix.trim()} ${subject}`.trim()
    : subject;
}

async function markConnectorStatus(input: {
  connectorId: string;
  status: "ACTIVE" | "ERROR";
}) {
  await db
    .update(connectors)
    .set({
      status: input.status,
      lastSync: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(connectors.id, input.connectorId));
}

export async function listNotificationConnectors(tenantId: string) {
  const connectorRows = await db
    .select()
    .from(connectors)
    .where(
      and(
        eq(connectors.tenantId, tenantId),
        eq(connectors.connectorType, "NOTIFICATION"),
      ),
    );

  return connectorRows.map((connector) => ({
    ...connector,
    parsedConfig: normalizeConnectorConfig(connector.config),
  }));
}

export async function dispatchConnectorEmail(input: {
  tenantId: string;
  actorUserId?: string | null | undefined;
  targetConnectorIds?: string[] | undefined;
  ignoreConnectorStatus?: boolean | undefined;
  purpose: ConnectorEmailPurpose;
  recipientEmail: string;
  recipientName?: string | null | undefined;
  subject: string;
  text: string;
  html?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}) {
  const connectorRows = await listNotificationConnectors(input.tenantId);
  const eligibleConnectors = connectorRows.filter(
    (connector) =>
      (!input.targetConnectorIds ||
        input.targetConnectorIds.includes(connector.id)) &&
      (input.ignoreConnectorStatus || connector.status === "ACTIVE") &&
      connector.parsedConfig &&
      isPurposeEnabled(connector.parsedConfig, input.purpose),
  );

  if (eligibleConnectors.length === 0) {
    return {
      attempted: 0,
      delivered: 0,
    };
  }

  let delivered = 0;

  for (const connector of eligibleConnectors) {
    const config = connector.parsedConfig;

    if (!config) {
      continue;
    }

    try {
      const email = await sendPlatformEmail({
        to: input.recipientEmail,
        subject: buildSubject(config, input.subject),
        text: input.text,
        html: input.html,
        fromName: config.senderName,
        fromAddress: config.senderEmail,
        replyTo: config.replyToEmail,
      });

      delivered += 1;
      await markConnectorStatus({
        connectorId: connector.id,
        status: "ACTIVE",
      });

      await db.insert(auditLogs).values({
        tenantId: input.tenantId,
        userId: input.actorUserId ?? null,
        eventType: "email.sent",
        resourceType: "CONNECTOR",
        resourceId: connector.id,
        metadata: {
          purpose: input.purpose,
          recipientEmail: input.recipientEmail,
          recipientName: input.recipientName ?? null,
          subject: buildSubject(config, input.subject),
          messageId: email.messageId,
          transport: email.transport,
          deliveryStatus: "SENT",
          ...(input.metadata ?? {}),
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown email delivery error.";

      await markConnectorStatus({
        connectorId: connector.id,
        status: "ERROR",
      });

      await db.insert(auditLogs).values({
        tenantId: input.tenantId,
        userId: input.actorUserId ?? null,
        eventType: "email.sent",
        resourceType: "CONNECTOR",
        resourceId: connector.id,
        metadata: {
          purpose: input.purpose,
          recipientEmail: input.recipientEmail,
          recipientName: input.recipientName ?? null,
          subject: buildSubject(config, input.subject),
          deliveryStatus: "FAILED",
          error: message,
          ...(input.metadata ?? {}),
        },
      });
    }
  }

  return {
    attempted: eligibleConnectors.length,
    delivered,
  };
}

export async function dispatchInviteEmail(input: {
  tenantId: string;
  actorUserId?: string | null;
  recipientEmail: string;
  recipientName?: string | null;
  tenantName: string;
  inviteLink: string;
  expiresAt: string;
}) {
  const text = [
    `You have been invited to ${input.tenantName} on V-AXIS.`,
    "",
    `Activate your access: ${input.inviteLink}`,
    `This link expires on ${input.expiresAt}.`,
    "",
    "After activation, sign in and complete MFA enrollment.",
  ].join("\n");

  return dispatchConnectorEmail({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    purpose: "INVITE",
    recipientEmail: input.recipientEmail,
    recipientName: input.recipientName,
    subject: `You're invited to ${input.tenantName}`,
    text,
    metadata: {
      expiresAt: input.expiresAt,
    },
  });
}

export async function dispatchPasswordResetEmail(input: {
  tenantId: string;
  actorUserId?: string | null;
  recipientEmail: string;
  recipientName?: string | null;
  tenantName: string;
  resetLink: string;
  expiresAt: string;
}) {
  const text = [
    `A password reset was requested for ${input.tenantName} on V-AXIS.`,
    "",
    `Set a new password: ${input.resetLink}`,
    `This link expires on ${input.expiresAt}.`,
    "",
    "If you did not expect this reset, contact your tenant administrator.",
  ].join("\n");

  return dispatchConnectorEmail({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    purpose: "PASSWORD_RESET",
    recipientEmail: input.recipientEmail,
    recipientName: input.recipientName,
    subject: `Password reset for ${input.tenantName}`,
    text,
    metadata: {
      expiresAt: input.expiresAt,
    },
  });
}

export async function dispatchAssignedNotificationEmail(input: {
  tenantId: string;
  actorUserId?: string | null;
  assigneeUserId: string;
  notificationTitle: string;
  notificationMessage: string;
  dueDate?: string | null;
  severity: string;
  escalationLevel?: number;
  purpose: "TASK_ASSIGNMENT" | "TASK_ESCALATION";
}) {
  const [user] = await db
    .select({
      email: users.email,
      fullName: users.fullName,
      notificationPreferences: users.notificationPreferences,
    })
    .from(users)
    .where(
      and(eq(users.id, input.assigneeUserId), eq(users.tenantId, input.tenantId)),
    )
    .limit(1);

  if (!user || !user.notificationPreferences.email) {
    return {
      attempted: 0,
      delivered: 0,
    };
  }

  const text = [
    `A governance task has been assigned to you in V-AXIS.`,
    "",
    `Title: ${input.notificationTitle}`,
    `Severity: ${input.severity}`,
    `Escalation level: ${input.escalationLevel ?? 0}`,
    input.dueDate ? `Due date: ${input.dueDate}` : "Due date: not set",
    "",
    input.notificationMessage,
  ].join("\n");

  return dispatchConnectorEmail({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    purpose: input.purpose,
    recipientEmail: user.email,
    recipientName: user.fullName,
    subject:
      input.purpose === "TASK_ESCALATION"
        ? `Escalated task: ${input.notificationTitle}`
        : `New task: ${input.notificationTitle}`,
    text,
    metadata: {
      severity: input.severity,
      dueDate: input.dueDate ?? null,
      escalationLevel: input.escalationLevel ?? 0,
    },
  });
}

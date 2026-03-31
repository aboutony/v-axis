import { and, eq, inArray, isNull, notInArray } from "drizzle-orm";

import { db } from "@vaxis/db";
import {
  documents,
  entityDocumentRules,
  entityRiskScores,
  entities,
  notifications,
  userEntityAssignments,
  users,
} from "@vaxis/db/schema";
import { clampScore, getExpirySeverity } from "@vaxis/domain";

type RiskDocument = {
  id: string;
  title: string;
  documentTypeId: string;
  expiryDate: string | Date | null;
  status: string;
};

type RiskRule = {
  id: string;
  documentTypeId: string;
  isMandatory: boolean;
  country: string | null;
};

export type RiskAlert = {
  kind: "expiry" | "gap";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  documentId?: string;
  documentTypeId?: string;
  title: string;
  reason: string;
  daysRemaining?: number | null;
};

export type EntityRiskSnapshot = {
  score: number;
  breakdown: Array<{
    reason: string;
    points: number;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  }>;
  alerts: RiskAlert[];
  documentStatusCounts: {
    active: number;
    expiring: number;
    expired: number;
    archived: number;
  };
  gapCount: number;
};

function toDate(input: string | Date | null) {
  if (!input) {
    return null;
  }

  const value = input instanceof Date ? input : new Date(input);

  return Number.isNaN(value.getTime()) ? null : value;
}

export function getDaysRemaining(input: string | Date | null) {
  const date = toDate(input);

  if (!date) {
    return null;
  }

  const today = new Date();
  const midnightToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const midnightTarget = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  return Math.floor(
    (midnightTarget.getTime() - midnightToday.getTime()) / (1000 * 60 * 60 * 24),
  );
}

export function deriveDocumentStatusFromExpiry(input: string | Date | null) {
  const daysRemaining = getDaysRemaining(input);

  if (daysRemaining === null) {
    return "ACTIVE" as const;
  }

  if (daysRemaining < 0) {
    return "EXPIRED" as const;
  }

  if (daysRemaining <= 90) {
    return "EXPIRING" as const;
  }

  return "ACTIVE" as const;
}

export function buildEntityRiskSnapshot(input: {
  documents: RiskDocument[];
  rules: RiskRule[];
}) {
  const breakdown: EntityRiskSnapshot["breakdown"] = [];
  const alerts: RiskAlert[] = [];
  const statusCounts: EntityRiskSnapshot["documentStatusCounts"] = {
    active: 0,
    expiring: 0,
    expired: 0,
    archived: 0,
  };

  for (const document of input.documents) {
    if (document.status === "ARCHIVED") {
      statusCounts.archived += 1;
      continue;
    }

    const derivedStatus = deriveDocumentStatusFromExpiry(document.expiryDate);
    const daysRemaining = getDaysRemaining(document.expiryDate);

    if (derivedStatus === "EXPIRED") {
      statusCounts.expired += 1;
      breakdown.push({
        reason: `${document.title} is expired`,
        points: -15,
        severity: "CRITICAL",
      });
      alerts.push({
        kind: "expiry",
        severity: "CRITICAL",
        documentId: document.id,
        documentTypeId: document.documentTypeId,
        title: document.title,
        reason: "Document has passed its expiry date.",
        daysRemaining,
      });
      continue;
    }

    if (derivedStatus === "EXPIRING") {
      statusCounts.expiring += 1;

      if (daysRemaining !== null) {
        const severity = getExpirySeverity(daysRemaining);

        if (severity === "HIGH" || severity === "CRITICAL") {
          breakdown.push({
            reason: `${document.title} is approaching expiry`,
            points: -10,
            severity: "HIGH",
          });
          alerts.push({
            kind: "expiry",
            severity: severity === "CRITICAL" ? "CRITICAL" : "HIGH",
            documentId: document.id,
            documentTypeId: document.documentTypeId,
            title: document.title,
            reason: "Document is within the high-risk renewal window.",
            daysRemaining,
          });
        } else if (severity === "MEDIUM") {
          breakdown.push({
            reason: `${document.title} is in the amber renewal window`,
            points: -5,
            severity: "MEDIUM",
          });
          alerts.push({
            kind: "expiry",
            severity: "MEDIUM",
            documentId: document.id,
            documentTypeId: document.documentTypeId,
            title: document.title,
            reason: "Document is within 60 days of expiry.",
            daysRemaining,
          });
        } else if (severity === "LOW") {
          breakdown.push({
            reason: `${document.title} is entering the early renewal window`,
            points: -2,
            severity: "LOW",
          });
        }
      }

      continue;
    }

    statusCounts.active += 1;
  }

  let gapCount = 0;

  for (const rule of input.rules) {
    const matches = input.documents.filter(
      (document) => document.documentTypeId === rule.documentTypeId,
    );
    const hasValidDocument = matches.some((document) => {
      const derivedStatus = deriveDocumentStatusFromExpiry(document.expiryDate);
      return document.status !== "ARCHIVED" && derivedStatus !== "EXPIRED";
    });

    if (hasValidDocument) {
      continue;
    }

    gapCount += 1;

    if (matches.length === 0) {
      if (rule.isMandatory) {
        breakdown.push({
          reason: `Required document type ${rule.documentTypeId} is missing`,
          points: -15,
          severity: "CRITICAL",
        });
        alerts.push({
          kind: "gap",
          severity: "CRITICAL",
          documentTypeId: rule.documentTypeId,
          title: "Required document missing",
          reason: "A mandatory document type is missing for this entity.",
          daysRemaining: null,
        });
      } else {
        breakdown.push({
          reason: `Optional document type ${rule.documentTypeId} is missing`,
          points: -5,
          severity: "MEDIUM",
        });
      }

      continue;
    }

    breakdown.push({
      reason: `Document type ${rule.documentTypeId} exists only in expired form`,
      points: -10,
      severity: "HIGH",
    });
    alerts.push({
      kind: "gap",
      severity: "HIGH",
      documentTypeId: rule.documentTypeId,
      title: "Required document renewal overdue",
      reason: "A required document exists, but all active records are expired.",
      daysRemaining: null,
    });
  }

  const score = clampScore(
    100 + breakdown.reduce((sum, item) => sum + item.points, 0),
  );

  return {
    score,
    breakdown,
    alerts,
    documentStatusCounts: statusCounts,
    gapCount,
  } satisfies EntityRiskSnapshot;
}

export async function syncEntityRiskScore(input: {
  tenantId: string;
  entityId: string;
}) {
  const documentRows = await db
    .select({
      id: documents.id,
      title: documents.title,
      documentTypeId: documents.documentTypeId,
      expiryDate: documents.expiryDate,
      status: documents.status,
    })
    .from(documents)
    .where(
      and(
        eq(documents.tenantId, input.tenantId),
        eq(documents.entityId, input.entityId),
        isNull(documents.deletedAt),
      ),
    );

  const ruleRows = await db
    .select({
      id: entityDocumentRules.id,
      documentTypeId: entityDocumentRules.documentTypeId,
      isMandatory: entityDocumentRules.isMandatory,
      country: entityDocumentRules.country,
    })
    .from(entityDocumentRules)
    .where(eq(entityDocumentRules.tenantId, input.tenantId));

  const snapshot = buildEntityRiskSnapshot({
    documents: documentRows,
    rules: ruleRows,
  });

  await db
    .insert(entityRiskScores)
    .values({
      entityId: input.entityId,
      tenantId: input.tenantId,
      score: snapshot.score,
      scoreBreakdown: snapshot.breakdown,
      computedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: entityRiskScores.entityId,
      set: {
        prevScore: entityRiskScores.score,
        score: snapshot.score,
        scoreBreakdown: snapshot.breakdown,
        computedAt: new Date(),
      },
    });

  return snapshot;
}

function buildNotificationSourceKey(input: RiskAlert & { entityId: string }) {
  if (input.kind === "expiry") {
    return `expiry:${input.entityId}:${input.documentId ?? "none"}`;
  }

  return `gap:${input.entityId}:${input.documentTypeId ?? "unknown"}`;
}

function buildNotificationPayload(input: RiskAlert & { entityId: string }) {
  if (input.kind === "expiry") {
    const daysRemaining = input.daysRemaining ?? 0;

    return {
      sourceKey: buildNotificationSourceKey(input),
      type: "EXPIRY_WARNING" as const,
      title: input.title,
      message:
        input.daysRemaining === null
          ? input.reason
          : `${input.reason} ${daysRemaining} day(s) remaining.`,
      dueDate:
        input.daysRemaining === null
          ? null
          : daysRemaining > 7
            ? new Date(Date.now() + (daysRemaining - 7) * 24 * 60 * 60 * 1000)
            : new Date(),
    };
  }

  return {
    sourceKey: buildNotificationSourceKey(input),
    type: "DOCUMENT_MISSING" as const,
    title: input.title,
    message: input.reason,
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  };
}

async function resolveAssignee(input: { tenantId: string; entityId: string }) {
  const entityAssignments = await db
    .select({
      userId: users.id,
      role: users.role,
    })
    .from(userEntityAssignments)
    .innerJoin(users, eq(users.id, userEntityAssignments.userId))
    .where(
      and(
        eq(userEntityAssignments.entityId, input.entityId),
        eq(users.tenantId, input.tenantId),
        eq(users.status, "ACTIVE"),
      ),
    );

  const manager = entityAssignments.find(
    (assignment) => assignment.role === "SUBSIDIARY_MANAGER",
  );

  if (manager) {
    return manager.userId;
  }

  const [clientAdmin] = await db
    .select({
      userId: users.id,
    })
    .from(users)
    .where(
      and(
        eq(users.tenantId, input.tenantId),
        eq(users.role, "CLIENT_ADMIN"),
        eq(users.status, "ACTIVE"),
      ),
    )
    .limit(1);

  return clientAdmin?.userId ?? null;
}

export async function syncEntityNotifications(input: {
  tenantId: string;
  entityId: string;
  alerts: RiskAlert[];
}) {
  const assigneeUserId = await resolveAssignee({
    tenantId: input.tenantId,
    entityId: input.entityId,
  });

  const openStatuses = [
    "PENDING",
    "ACKNOWLEDGED",
    "IN_PROGRESS",
    "ESCALATED",
  ] as const;
  const currentSourceKeys = input.alerts.map((alert) =>
    buildNotificationSourceKey({
      ...alert,
      entityId: input.entityId,
    }),
  );

  for (const alert of input.alerts) {
    const payload = buildNotificationPayload({
      ...alert,
      entityId: input.entityId,
    });

    const [existing] = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.tenantId, input.tenantId),
          eq(notifications.sourceKey, payload.sourceKey),
        ),
      )
      .limit(1);

    const nextStatus =
      existing &&
      existing.status !== "RESOLVED" &&
      existing.status !== "CLOSED"
        ? existing.status
        : "PENDING";

    await db
      .insert(notifications)
      .values({
        tenantId: input.tenantId,
        entityId: input.entityId,
        documentId: alert.documentId ?? null,
        sourceKey: payload.sourceKey,
        type: payload.type,
        severity: alert.severity,
        status: nextStatus,
        title: payload.title,
        message: payload.message,
        assignedTo: assigneeUserId,
        escalationLevel: alert.severity === "CRITICAL" ? 2 : 0,
        dueDate: payload.dueDate ? payload.dueDate.toISOString().slice(0, 10) : null,
        resolvedAt: nextStatus === "PENDING" ? null : existing?.resolvedAt ?? null,
      })
      .onConflictDoUpdate({
        target: [notifications.tenantId, notifications.sourceKey],
        set: {
          documentId: alert.documentId ?? null,
          type: payload.type,
          severity: alert.severity,
          title: payload.title,
          message: payload.message,
          assignedTo: assigneeUserId,
          dueDate: payload.dueDate ? payload.dueDate.toISOString().slice(0, 10) : null,
          status: nextStatus,
          resolvedAt: nextStatus === "PENDING" ? null : existing?.resolvedAt ?? null,
          updatedAt: new Date(),
        },
      });
  }

  const staleNotifications = await db
    .select({
      id: notifications.id,
      sourceKey: notifications.sourceKey,
    })
    .from(notifications)
    .where(
      and(
        eq(notifications.tenantId, input.tenantId),
        eq(notifications.entityId, input.entityId),
        inArray(notifications.status, openStatuses),
        currentSourceKeys.length > 0
          ? notInArray(notifications.sourceKey, currentSourceKeys)
          : undefined,
      ),
    );

  if (currentSourceKeys.length === 0) {
    const allOpenNotifications = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.tenantId, input.tenantId),
          eq(notifications.entityId, input.entityId),
          inArray(notifications.status, openStatuses),
        ),
      );

    if (allOpenNotifications.length > 0) {
      await db
        .update(notifications)
        .set({
          status: "CLOSED",
          resolvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(notifications.tenantId, input.tenantId),
            eq(notifications.entityId, input.entityId),
            inArray(
              notifications.id,
              allOpenNotifications.map((notification) => notification.id),
            ),
          ),
        );
    }

    return;
  }

  if (staleNotifications.length > 0) {
    await db
      .update(notifications)
      .set({
        status: "CLOSED",
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(notifications.tenantId, input.tenantId),
          eq(notifications.entityId, input.entityId),
          inArray(
            notifications.id,
            staleNotifications.map((notification) => notification.id),
          ),
        ),
      );
  }
}

export async function refreshEntityGovernance(input: {
  tenantId: string;
  entityId: string;
}) {
  const snapshot = await syncEntityRiskScore(input);
  await syncEntityNotifications({
    tenantId: input.tenantId,
    entityId: input.entityId,
    alerts: snapshot.alerts,
  });

  return snapshot;
}

export async function refreshTenantGovernance(input: { tenantId: string }) {
  const entityRows = await db
    .select({ id: entities.id })
    .from(entities)
    .where(eq(entities.tenantId, input.tenantId));

  for (const entity of entityRows) {
    await refreshEntityGovernance({
      tenantId: input.tenantId,
      entityId: entity.id,
    });
  }
}

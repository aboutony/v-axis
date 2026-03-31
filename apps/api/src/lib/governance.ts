import { and, eq, isNull } from "drizzle-orm";

import { db } from "@vaxis/db";
import {
  documents,
  entityDocumentRules,
  entityRiskScores,
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

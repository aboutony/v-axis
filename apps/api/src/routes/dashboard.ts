import type { FastifyPluginAsync } from "fastify";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@vaxis/db";
import {
  auditLogs,
  categories,
  documentTypes,
  documents,
  entities,
  entityDocumentRules,
  entityRiskScores,
} from "@vaxis/db/schema";
import { getSeverityRank } from "@vaxis/domain";

import {
  buildEntityRiskSnapshot,
  deriveDocumentStatusFromExpiry,
  getDaysRemaining,
  syncEntityRiskScore,
} from "../lib/governance";
import { ensureAuthenticated, ensurePermission } from "../lib/permissions";

const entityParamsSchema = z.object({
  id: z.string().uuid(),
});

export const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/api/v1/dashboard/summary", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "REPORTS_VIEW")) {
      return;
    }

    const categoryRows = await db
      .select()
      .from(categories)
      .where(eq(categories.tenantId, request.user.tenantId));

    const entityRows = await db
      .select()
      .from(entities)
      .where(eq(entities.tenantId, request.user.tenantId));

    const documentRows = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.tenantId, request.user.tenantId),
          isNull(documents.deletedAt),
        ),
      );

    const typeRows = await db
      .select()
      .from(documentTypes)
      .where(eq(documentTypes.tenantId, request.user.tenantId));

    const systemTypeRows = await db
      .select()
      .from(documentTypes)
      .where(isNull(documentTypes.tenantId));

    const documentTypeMap = new Map(
      [...systemTypeRows, ...typeRows].map((type) => [type.id, type]),
    );

    const ruleRows = await db
      .select()
      .from(entityDocumentRules)
      .where(eq(entityDocumentRules.tenantId, request.user.tenantId));

    const scoreRows = await db
      .select()
      .from(entityRiskScores)
      .where(eq(entityRiskScores.tenantId, request.user.tenantId));

    const scoreMap = new Map(scoreRows.map((score) => [score.entityId, score]));
    const snapshots: Array<{
      entity: (typeof entities.$inferSelect);
      snapshot: ReturnType<typeof buildEntityRiskSnapshot>;
      cachedScore: (typeof entityRiskScores.$inferSelect) | undefined;
    }> = [];

    for (const entity of entityRows) {
      const entityDocuments = documentRows.filter((document) => document.entityId === entity.id);
      const entityRules = ruleRows.filter((rule) => rule.entityType === entity.entityType);
      const snapshot = buildEntityRiskSnapshot({
        documents: entityDocuments.map((document) => ({
          id: document.id,
          title: document.title,
          documentTypeId: document.documentTypeId,
          expiryDate: document.expiryDate,
          status: document.status,
        })),
        rules: entityRules.map((rule) => ({
          id: rule.id,
          documentTypeId: rule.documentTypeId,
          isMandatory: rule.isMandatory,
          country: rule.country,
        })),
      });

      snapshots.push({
        entity,
        snapshot,
        cachedScore: scoreMap.get(entity.id),
      });
    }

    const portfolioHealthScore =
      snapshots.length === 0
        ? 100
        : Math.round(
            snapshots.reduce((sum, item) => sum + item.snapshot.score, 0) /
              snapshots.length,
          );

    const categoryHealthCards = categoryRows
      .sort((left, right) => left.slotNumber - right.slotNumber)
      .map((category) => {
        const categoryEntities = snapshots.filter(
          (item) => item.entity.categoryId === category.id,
        );

        return {
          id: category.id,
          slotNumber: category.slotNumber,
          label: category.label,
          colorCode: category.colorCode,
          entityCount: categoryEntities.length,
          worstEntityScore:
            categoryEntities.length === 0
              ? 100
              : Math.min(...categoryEntities.map((item) => item.snapshot.score)),
          activeAlerts: categoryEntities.reduce(
            (sum, item) => sum + item.snapshot.alerts.length,
            0,
          ),
        };
      });

    const criticalAlerts = snapshots
      .flatMap((item) =>
        item.snapshot.alerts
          .filter((alert) => alert.severity === "CRITICAL")
          .map((alert) => ({
            ...alert,
            entityId: item.entity.id,
            entityName: item.entity.entityName,
          })),
      )
      .slice(0, 12);

    const expiryTimeline = documentRows
      .map((document) => {
        const daysRemaining = getDaysRemaining(document.expiryDate);
        const entity = entityRows.find((item) => item.id === document.entityId);
        const documentType = documentTypeMap.get(document.documentTypeId);

        return {
          id: document.id,
          dnaCode: document.dnaCode,
          title: document.title,
          entityName: entity?.entityName ?? "Unknown entity",
          documentTypeLabel: documentType?.label ?? "Unknown",
          daysRemaining,
          expiryDate: document.expiryDate,
          derivedStatus:
            document.status === "ARCHIVED"
              ? "ARCHIVED"
              : deriveDocumentStatusFromExpiry(document.expiryDate),
        };
      })
      .filter(
        (item) =>
          item.daysRemaining !== null &&
          item.daysRemaining >= 0 &&
          item.daysRemaining <= 90,
      )
      .sort((left, right) => (left.daysRemaining ?? 999) - (right.daysRemaining ?? 999))
      .slice(0, 20);

    const documentGapSummary = categoryRows
      .sort((left, right) => left.slotNumber - right.slotNumber)
      .map((category) => {
        const categoryEntities = snapshots.filter(
          (item) => item.entity.categoryId === category.id,
        );

        return {
          categoryId: category.id,
          label: category.label,
          gapCount: categoryEntities.reduce(
            (sum, item) => sum + item.snapshot.gapCount,
            0,
          ),
        };
      });

    const recentActivity = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, request.user.tenantId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(20);

    return {
      portfolioHealthScore,
      categoryHealthCards,
      criticalAlerts,
      expiryTimeline,
      documentGapSummary,
      recentActivity,
      entities: snapshots
        .map((item) => ({
          id: item.entity.id,
          entityName: item.entity.entityName,
          entityCode: item.entity.entityCode,
          entityType: item.entity.entityType,
          score: item.snapshot.score,
          prevScore: item.cachedScore?.prevScore ?? null,
          openAlerts: item.snapshot.alerts.length,
          gapCount: item.snapshot.gapCount,
          statusCounts: item.snapshot.documentStatusCounts,
        }))
        .sort((left, right) => left.score - right.score),
    };
  });

  fastify.get("/api/v1/dashboard/entity/:id", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "REPORTS_VIEW")) {
      return;
    }

    const { id } = entityParamsSchema.parse(request.params);

    const [entity] = await db
      .select()
      .from(entities)
      .where(and(eq(entities.id, id), eq(entities.tenantId, request.user.tenantId)))
      .limit(1);

    if (!entity) {
      return reply.code(404).send({
        error: "ENTITY_NOT_FOUND",
        message: "The entity was not found in this tenant.",
      });
    }

    const entityDocuments = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.tenantId, request.user.tenantId),
          eq(documents.entityId, entity.id),
          isNull(documents.deletedAt),
        ),
      );

    const ruleRows = await db
      .select()
      .from(entityDocumentRules)
      .where(eq(entityDocumentRules.tenantId, request.user.tenantId));

    const snapshot = await syncEntityRiskScore({
      tenantId: request.user.tenantId,
      entityId: entity.id,
    });

    return {
      entity,
      snapshot,
      documents: entityDocuments.map((document) => ({
        ...document,
        daysRemaining: getDaysRemaining(document.expiryDate),
        derivedStatus:
          document.status === "ARCHIVED"
            ? "ARCHIVED"
            : deriveDocumentStatusFromExpiry(document.expiryDate),
      })),
      rules: ruleRows.filter((rule) => rule.entityType === entity.entityType),
      alerts: snapshot.alerts.sort(
        (left, right) => getSeverityRank(right.severity) - getSeverityRank(left.severity),
      ),
    };
  });
};

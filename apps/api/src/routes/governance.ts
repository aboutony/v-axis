import type { FastifyPluginAsync } from "fastify";
import { and, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@vaxis/db";
import {
  auditLogs,
  documentTypes,
  entities,
  entityDocumentRules,
  notifications,
} from "@vaxis/db/schema";

import {
  refreshEntityGovernance,
  refreshTenantGovernance,
} from "../lib/governance";
import { ensureAuthenticated, ensurePermission } from "../lib/permissions";

const ruleCreateSchema = z.object({
  entityType: z.enum(["SUBSIDIARY", "JV", "ASSOCIATE", "BRANCH"]),
  documentTypeId: z.string().uuid(),
  isMandatory: z.boolean().default(true),
  country: z.string().max(100).nullable().optional(),
});

const notificationParamsSchema = z.object({
  id: z.string().uuid(),
});

const ruleParamsSchema = z.object({
  id: z.string().uuid(),
});

export const governanceRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/api/v1/rules", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "REPORTS_VIEW")) {
      return;
    }

    const rules = await db
      .select()
      .from(entityDocumentRules)
      .where(eq(entityDocumentRules.tenantId, request.user.tenantId));

    const types = await db
      .select()
      .from(documentTypes)
      .where(
        or(
          eq(documentTypes.tenantId, request.user.tenantId),
          isNull(documentTypes.tenantId),
        ),
      );

    const typeMap = new Map(types.map((type) => [type.id, type]));

    return {
      rules: rules.map((rule) => ({
        ...rule,
        documentTypeLabel: typeMap.get(rule.documentTypeId)?.label ?? "Unknown",
        documentSector: typeMap.get(rule.documentTypeId)?.sector ?? "INTERNAL",
      })),
    };
  });

  fastify.post("/api/v1/rules", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "TAXONOMY_CONFIGURE")) {
      return;
    }

    const input = ruleCreateSchema.parse(request.body);

    const [documentType] = await db
      .select()
      .from(documentTypes)
      .where(
        and(
          eq(documentTypes.id, input.documentTypeId),
          or(
            eq(documentTypes.tenantId, request.user.tenantId),
            isNull(documentTypes.tenantId),
          ),
        ),
      )
      .limit(1);

    if (!documentType) {
      return reply.code(404).send({
        error: "DOCUMENT_TYPE_NOT_FOUND",
        message: "The selected document type was not found for this tenant.",
      });
    }

    const existing = await db
      .select({ id: entityDocumentRules.id })
      .from(entityDocumentRules)
      .where(
        and(
          eq(entityDocumentRules.tenantId, request.user.tenantId),
          eq(entityDocumentRules.entityType, input.entityType),
          eq(entityDocumentRules.documentTypeId, input.documentTypeId),
          input.country === undefined || input.country === null
            ? isNull(entityDocumentRules.country)
            : eq(entityDocumentRules.country, input.country),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return reply.code(409).send({
        error: "RULE_EXISTS",
        message: "This entity document rule already exists.",
      });
    }

    const [rule] = await db
      .insert(entityDocumentRules)
      .values({
        tenantId: request.user.tenantId,
        entityType: input.entityType,
        documentTypeId: input.documentTypeId,
        isMandatory: input.isMandatory,
        country: input.country ?? null,
      })
      .returning();

    await db.insert(auditLogs).values({
      tenantId: request.user.tenantId,
      userId: request.user.sub,
      eventType: "governance.rule.updated",
      resourceType: "RULE",
      resourceId: rule?.id ?? null,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
      metadata: {
        action: "created",
        entityType: input.entityType,
        documentTypeId: input.documentTypeId,
      },
    });

    const affectedEntities = await db
      .select({ id: entities.id })
      .from(entities)
      .where(
        and(
          eq(entities.tenantId, request.user.tenantId),
          eq(entities.entityType, input.entityType),
        ),
      );

    for (const entity of affectedEntities) {
      await refreshEntityGovernance({
        tenantId: request.user.tenantId,
        entityId: entity.id,
      });
    }

    return reply.code(201).send({
      message: "Rule created.",
      rule,
    });
  });

  fastify.delete("/api/v1/rules/:id", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "TAXONOMY_CONFIGURE")) {
      return;
    }

    const { id } = ruleParamsSchema.parse(request.params);

    const [rule] = await db
      .select()
      .from(entityDocumentRules)
      .where(
        and(
          eq(entityDocumentRules.id, id),
          eq(entityDocumentRules.tenantId, request.user.tenantId),
        ),
      )
      .limit(1);

    if (!rule) {
      return reply.code(404).send({
        error: "RULE_NOT_FOUND",
        message: "The rule does not exist in this tenant.",
      });
    }

    await db
      .delete(entityDocumentRules)
      .where(eq(entityDocumentRules.id, rule.id));

    await db.insert(auditLogs).values({
      tenantId: request.user.tenantId,
      userId: request.user.sub,
      eventType: "governance.rule.updated",
      resourceType: "RULE",
      resourceId: rule.id,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
      metadata: {
        action: "deleted",
        entityType: rule.entityType,
        documentTypeId: rule.documentTypeId,
      },
    });

    const affectedEntities = await db
      .select({ id: entities.id })
      .from(entities)
      .where(
        and(
          eq(entities.tenantId, request.user.tenantId),
          eq(entities.entityType, rule.entityType),
        ),
      );

    for (const entity of affectedEntities) {
      await refreshEntityGovernance({
        tenantId: request.user.tenantId,
        entityId: entity.id,
      });
    }

    return {
      message: "Rule deleted.",
    };
  });

  fastify.post("/api/v1/governance/refresh", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "REPORTS_VIEW")) {
      return;
    }

    await refreshTenantGovernance({
      tenantId: request.user.tenantId,
    });

    return {
      message: "Tenant governance state refreshed.",
    };
  });

  fastify.get("/api/v1/notifications", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    const notificationRows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.tenantId, request.user.tenantId));

    const entityRows = await db
      .select({ id: entities.id, entityName: entities.entityName })
      .from(entities)
      .where(eq(entities.tenantId, request.user.tenantId));

    const entityMap = new Map(entityRows.map((entity) => [entity.id, entity]));

    return {
      notifications: notificationRows
        .map((notification) => ({
          ...notification,
          entityName: notification.entityId
            ? entityMap.get(notification.entityId)?.entityName ?? "Unknown entity"
            : "No entity",
        }))
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        ),
    };
  });

  fastify.patch("/api/v1/notifications/:id/acknowledge", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "NOTIFICATION_MANAGE")) {
      return;
    }

    const { id } = notificationParamsSchema.parse(request.params);

    const [updated] = await db
      .update(notifications)
      .set({
        status: "ACKNOWLEDGED",
        acknowledgedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.tenantId, request.user.tenantId),
        ),
      )
      .returning();

    if (!updated) {
      return reply.code(404).send({
        error: "NOTIFICATION_NOT_FOUND",
        message: "The notification was not found in this tenant.",
      });
    }

    await db.insert(auditLogs).values({
      tenantId: request.user.tenantId,
      userId: request.user.sub,
      eventType: "notification.acknowledged",
      resourceType: "NOTIFICATION",
      resourceId: updated.id,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
      metadata: {
        sourceKey: updated.sourceKey,
      },
    });

    return {
      message: "Notification acknowledged.",
      notification: updated,
    };
  });

  fastify.patch("/api/v1/notifications/:id/resolve", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "NOTIFICATION_MANAGE")) {
      return;
    }

    const { id } = notificationParamsSchema.parse(request.params);

    const [updated] = await db
      .update(notifications)
      .set({
        status: "RESOLVED",
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.tenantId, request.user.tenantId),
        ),
      )
      .returning();

    if (!updated) {
      return reply.code(404).send({
        error: "NOTIFICATION_NOT_FOUND",
        message: "The notification was not found in this tenant.",
      });
    }

    await db.insert(auditLogs).values({
      tenantId: request.user.tenantId,
      userId: request.user.sub,
      eventType: "notification.resolved",
      resourceType: "NOTIFICATION",
      resourceId: updated.id,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
      metadata: {
        sourceKey: updated.sourceKey,
      },
    });

    return {
      message: "Notification resolved.",
      notification: updated,
    };
  });
};

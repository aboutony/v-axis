import type { FastifyPluginAsync } from "fastify";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@vaxis/db";
import { auditLogs, categories, documents, entities, tenants } from "@vaxis/db/schema";

import { refreshEntityGovernance } from "../lib/governance";
import { ensureAuthenticated, ensurePermission } from "../lib/permissions";

const publicParamsSchema = z.object({
  tenantSlug: z.string().min(2),
});

const categoryUpdateSchema = z.object({
  label: z.string().min(2).max(100).optional(),
  colorCode: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Use a 6-character hex color.")
    .optional(),
  description: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

const entityCreateSchema = z.object({
  categoryId: z.string().uuid(),
  entityName: z.string().min(2).max(200),
  entityCode: z
    .string()
    .min(2)
    .max(10)
    .regex(/^[A-Z0-9]+$/, "Entity code must be uppercase alphanumeric."),
  entityType: z.enum(["SUBSIDIARY", "JV", "ASSOCIATE", "BRANCH"]),
  country: z.string().max(100).nullable().optional(),
  registrationNumber: z.string().max(100).nullable().optional(),
});

const entityUpdateSchema = z.object({
  entityName: z.string().min(2).max(200).optional(),
  entityType: z.enum(["SUBSIDIARY", "JV", "ASSOCIATE", "BRANCH"]).optional(),
  country: z.string().max(100).nullable().optional(),
  registrationNumber: z.string().max(100).nullable().optional(),
  isActive: z.boolean().optional(),
});

const entityParamsSchema = z.object({
  id: z.string().uuid(),
});

function buildTaxonomyResponse(input: {
  tenant: {
    id: string;
    clientName: string;
    slug: string;
  };
  categoryRows: Array<(typeof categories.$inferSelect)>;
  entityRows: Array<(typeof entities.$inferSelect)>;
}) {
  return {
    tenant: input.tenant,
    categories: input.categoryRows
      .sort((left, right) => left.slotNumber - right.slotNumber)
      .map((category) => ({
        ...category,
        entities: input.entityRows.filter((entity) => entity.categoryId === category.id),
      })),
  };
}

function getSubDesignator(index: number) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return alphabet[index] ?? `X${index + 1}`;
}

export const taxonomyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/api/v1/taxonomy/:tenantSlug", async (request, reply) => {
    const { tenantSlug } = publicParamsSchema.parse(request.params);

    const [tenant] = await db
      .select({
        id: tenants.id,
        clientName: tenants.clientName,
        slug: tenants.slug,
      })
      .from(tenants)
      .where(eq(tenants.slug, tenantSlug))
      .limit(1);

    if (!tenant) {
      return reply.code(404).send({
        error: "TENANT_NOT_FOUND",
        message: "No tenant matches the provided slug.",
      });
    }

    const categoryRows = await db
      .select()
      .from(categories)
      .where(eq(categories.tenantId, tenant.id));

    const entityRows = await db
      .select()
      .from(entities)
      .where(eq(entities.tenantId, tenant.id));

    return buildTaxonomyResponse({ tenant, categoryRows, entityRows });
  });

  fastify.get("/api/v1/taxonomy", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    const [tenant] = await db
      .select({
        id: tenants.id,
        clientName: tenants.clientName,
        slug: tenants.slug,
      })
      .from(tenants)
      .where(eq(tenants.id, request.user.tenantId))
      .limit(1);

    if (!tenant) {
      return reply.code(404).send({
        error: "TENANT_NOT_FOUND",
        message: "The authenticated tenant no longer exists.",
      });
    }

    const categoryRows = await db
      .select()
      .from(categories)
      .where(eq(categories.tenantId, tenant.id));

    const entityRows = await db
      .select()
      .from(entities)
      .where(eq(entities.tenantId, tenant.id));

    return buildTaxonomyResponse({ tenant, categoryRows, entityRows });
  });

  fastify.patch("/api/v1/categories/:id", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "TAXONOMY_CONFIGURE")) {
      return;
    }

    const { id } = entityParamsSchema.parse(request.params);
    const input = categoryUpdateSchema.parse(request.body);

    const [category] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.tenantId, request.user.tenantId)))
      .limit(1);

    if (!category) {
      return reply.code(404).send({
        error: "CATEGORY_NOT_FOUND",
        message: "The category was not found in this tenant.",
      });
    }

    const [updated] = await db
      .update(categories)
      .set({
        label: input.label ?? category.label,
        colorCode:
          input.colorCode === undefined ? category.colorCode : input.colorCode,
        description:
          input.description === undefined ? category.description : input.description,
        isActive: input.isActive ?? category.isActive,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, category.id))
      .returning();

    if (!updated) {
      return reply.code(500).send({
        error: "CATEGORY_UPDATE_FAILED",
        message: "Unable to update the category.",
      });
    }

    await db.insert(auditLogs).values({
      tenantId: request.user.tenantId,
      userId: request.user.sub,
      eventType: "taxonomy.category.updated",
      resourceType: "CATEGORY",
      resourceId: updated.id,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
      metadata: {
        label: updated.label,
        isActive: updated.isActive,
      },
    });

    return {
      message: "Category updated.",
      category: updated,
    };
  });

  fastify.post("/api/v1/entities", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "TAXONOMY_CONFIGURE")) {
      return;
    }

    const input = entityCreateSchema.parse(request.body);

    const [category] = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, input.categoryId),
          eq(categories.tenantId, request.user.tenantId),
        ),
      )
      .limit(1);

    if (!category) {
      return reply.code(404).send({
        error: "CATEGORY_NOT_FOUND",
        message: "The selected category does not belong to this tenant.",
      });
    }

    const existingCode = await db
      .select({ id: entities.id })
      .from(entities)
      .where(
        and(
          eq(entities.tenantId, request.user.tenantId),
          eq(entities.entityCode, input.entityCode),
        ),
      )
      .limit(1);

    if (existingCode.length > 0) {
      return reply.code(409).send({
        error: "ENTITY_CODE_IN_USE",
        message: "This entity code is already in use for the tenant.",
      });
    }

    const siblingEntities = await db
      .select({ id: entities.id })
      .from(entities)
      .where(eq(entities.categoryId, category.id));

    const [entity] = await db
      .insert(entities)
      .values({
        tenantId: request.user.tenantId,
        categoryId: category.id,
        entityName: input.entityName,
        entityCode: input.entityCode,
        entityType: input.entityType,
        country: input.country ?? null,
        registrationNumber: input.registrationNumber ?? null,
        subDesignator: getSubDesignator(siblingEntities.length),
      })
      .returning();

    if (!entity) {
      return reply.code(500).send({
        error: "ENTITY_CREATE_FAILED",
        message: "Unable to create the entity.",
      });
    }

    await db.insert(auditLogs).values({
      tenantId: request.user.tenantId,
      userId: request.user.sub,
      eventType: "taxonomy.entity.updated",
      resourceType: "ENTITY",
      resourceId: entity.id,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
      metadata: {
        action: "created",
        entityCode: entity.entityCode,
        entityType: entity.entityType,
      },
    });

    await refreshEntityGovernance({
      tenantId: request.user.tenantId,
      entityId: entity.id,
    });

    return reply.code(201).send({
      message: "Entity created.",
      entity,
    });
  });

  fastify.patch("/api/v1/entities/:id", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "TAXONOMY_CONFIGURE")) {
      return;
    }

    const { id } = entityParamsSchema.parse(request.params);
    const input = entityUpdateSchema.parse(request.body);

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

    const [updated] = await db
      .update(entities)
      .set({
        entityName: input.entityName ?? entity.entityName,
        entityType: input.entityType ?? entity.entityType,
        country: input.country === undefined ? entity.country : input.country,
        registrationNumber:
          input.registrationNumber === undefined
            ? entity.registrationNumber
            : input.registrationNumber,
        isActive: input.isActive ?? entity.isActive,
        updatedAt: new Date(),
      })
      .where(eq(entities.id, entity.id))
      .returning();

    if (!updated) {
      return reply.code(500).send({
        error: "ENTITY_UPDATE_FAILED",
        message: "Unable to update the entity.",
      });
    }

    await db.insert(auditLogs).values({
      tenantId: request.user.tenantId,
      userId: request.user.sub,
      eventType: "taxonomy.entity.updated",
      resourceType: "ENTITY",
      resourceId: updated.id,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
      metadata: {
        action: "updated",
        entityName: updated.entityName,
        isActive: updated.isActive,
      },
    });

    return {
      message: "Entity updated.",
      entity: updated,
    };
  });

  fastify.delete("/api/v1/entities/:id", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "TAXONOMY_CONFIGURE")) {
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

    const linkedDocuments = await db
      .select({ id: documents.id })
      .from(documents)
      .where(
        and(
          eq(documents.entityId, entity.id),
          eq(documents.tenantId, request.user.tenantId),
          isNull(documents.deletedAt),
        ),
      )
      .limit(1);

    if (linkedDocuments.length > 0) {
      return reply.code(409).send({
        error: "ENTITY_HAS_DOCUMENTS",
        message: "This entity already has documents and cannot be deleted.",
      });
    }

    const [updated] = await db
      .update(entities)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(entities.id, entity.id))
      .returning();

    if (!updated) {
      return reply.code(500).send({
        error: "ENTITY_DELETE_FAILED",
        message: "Unable to deactivate the entity.",
      });
    }

    await db.insert(auditLogs).values({
      tenantId: request.user.tenantId,
      userId: request.user.sub,
      eventType: "taxonomy.entity.updated",
      resourceType: "ENTITY",
      resourceId: updated.id,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
      metadata: {
        action: "deactivated",
      },
    });

    return {
      message: "Entity deactivated.",
      entity: updated,
    };
  });
};

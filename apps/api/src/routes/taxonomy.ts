import type { FastifyPluginAsync } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@vaxis/db";
import { categories, entities, tenants } from "@vaxis/db/schema";

const paramsSchema = z.object({
  tenantSlug: z.string().min(2),
});

export const taxonomyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/api/v1/taxonomy/:tenantSlug", async (request, reply) => {
    const { tenantSlug } = paramsSchema.parse(request.params);

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

    return {
      tenant,
      categories: categoryRows
        .sort((left, right) => left.slotNumber - right.slotNumber)
        .map((category) => ({
          ...category,
          entities: entityRows.filter((entity) => entity.categoryId === category.id),
        })),
    };
  });
};

import type { FastifyPluginAsync } from "fastify";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@vaxis/db";
import { auditLogs, users } from "@vaxis/db/schema";
import { activityEventTypes } from "@vaxis/domain";

import { ensureAuthenticated, ensurePermission } from "../lib/permissions";

const auditQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  eventType: z.enum(activityEventTypes).optional(),
  resourceType: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .or(z.literal("")),
  userId: z.string().uuid().optional(),
});

export const auditRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/api/v1/audit", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "AUDIT_VIEW")) {
      return;
    }

    const input = auditQuerySchema.parse(request.query);
    const whereClauses = [eq(auditLogs.tenantId, request.user.tenantId)];

    if (input.eventType) {
      whereClauses.push(eq(auditLogs.eventType, input.eventType));
    }

    if (input.resourceType && input.resourceType.trim()) {
      whereClauses.push(eq(auditLogs.resourceType, input.resourceType.trim()));
    }

    if (input.userId) {
      whereClauses.push(eq(auditLogs.userId, input.userId));
    }

    const logRows = await db
      .select()
      .from(auditLogs)
      .where(and(...whereClauses))
      .orderBy(desc(auditLogs.createdAt))
      .limit(input.limit);

    const actorIds = Array.from(
      new Set(
        logRows
          .map((log) => log.userId)
          .filter((userId): userId is string => Boolean(userId)),
      ),
    );

    const actorRows =
      actorIds.length > 0
        ? await db
            .select({
              id: users.id,
              fullName: users.fullName,
              email: users.email,
            })
            .from(users)
            .where(inArray(users.id, actorIds))
        : [];

    const actorMap = new Map(actorRows.map((actor) => [actor.id, actor]));

    return {
      availableEventTypes: activityEventTypes,
      logs: logRows.map((log) => ({
        ...log,
        actorName: log.userId ? (actorMap.get(log.userId)?.fullName ?? null) : null,
        actorEmail: log.userId ? (actorMap.get(log.userId)?.email ?? null) : null,
      })),
    };
  });
};

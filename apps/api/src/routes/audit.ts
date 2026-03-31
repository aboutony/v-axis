import type { FastifyPluginAsync } from "fastify";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@vaxis/db";
import { auditLogs, users } from "@vaxis/db/schema";
import { activityEventTypes } from "@vaxis/domain";

import { ensureAuthenticated, ensurePermission } from "../lib/permissions";

const auditFilterSchema = z.object({
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

const auditExportQuerySchema = auditFilterSchema.extend({
  format: z.enum(["csv", "json"]).default("csv"),
});

async function loadAuditData(input: {
  tenantId: string;
  limit: number;
  eventType?: (typeof activityEventTypes)[number];
  resourceType?: string;
  userId?: string;
}) {
  const whereClauses = [eq(auditLogs.tenantId, input.tenantId)];

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

  return logRows.map((log) => ({
    ...log,
    actorName: log.userId ? (actorMap.get(log.userId)?.fullName ?? null) : null,
    actorEmail: log.userId ? (actorMap.get(log.userId)?.email ?? null) : null,
  }));
}

function escapeCsvValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  const normalized =
    typeof value === "string" ? value : JSON.stringify(value);

  return `"${normalized.replace(/"/g, '""')}"`;
}

function buildAuditCsv(logs: Awaited<ReturnType<typeof loadAuditData>>) {
  const headers = [
    "id",
    "eventType",
    "resourceType",
    "resourceId",
    "actorName",
    "actorEmail",
    "ipAddress",
    "userAgent",
    "createdAt",
    "metadata",
  ];

  const rows = logs.map((log) =>
    [
      log.id,
      log.eventType,
      log.resourceType,
      log.resourceId,
      log.actorName,
      log.actorEmail,
      log.ipAddress,
      log.userAgent,
      log.createdAt.toISOString(),
      log.metadata,
    ]
      .map(escapeCsvValue)
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}

export const auditRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/api/v1/audit", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "AUDIT_VIEW")) {
      return;
    }

    const input = auditFilterSchema.parse(request.query);
    const auditInput: Parameters<typeof loadAuditData>[0] = {
      tenantId: request.user.tenantId,
      limit: input.limit,
    };

    if (input.eventType) {
      auditInput.eventType = input.eventType;
    }

    if (input.resourceType) {
      auditInput.resourceType = input.resourceType;
    }

    if (input.userId) {
      auditInput.userId = input.userId;
    }

    const logs = await loadAuditData(auditInput);

    return {
      availableEventTypes: activityEventTypes,
      logs,
    };
  });

  fastify.get("/api/v1/audit/export", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "AUDIT_VIEW")) {
      return;
    }

    const input = auditExportQuerySchema.parse(request.query);
    const auditInput: Parameters<typeof loadAuditData>[0] = {
      tenantId: request.user.tenantId,
      limit: input.limit,
    };

    if (input.eventType) {
      auditInput.eventType = input.eventType;
    }

    if (input.resourceType) {
      auditInput.resourceType = input.resourceType;
    }

    if (input.userId) {
      auditInput.userId = input.userId;
    }

    const logs = await loadAuditData(auditInput);
    const exportedAt = new Date().toISOString();

    if (input.format === "json") {
      reply.header("Content-Type", "application/json; charset=utf-8");
      reply.header(
        "Content-Disposition",
        `attachment; filename="vaxis-audit-${exportedAt.slice(0, 10)}.json"`,
      );

      return {
        exportedAt,
        filters: {
          eventType: input.eventType ?? null,
          resourceType: input.resourceType ?? null,
          userId: input.userId ?? null,
          limit: input.limit,
        },
        logs,
      };
    }

    reply.header("Content-Type", "text/csv; charset=utf-8");
    reply.header(
      "Content-Disposition",
      `attachment; filename="vaxis-audit-${exportedAt.slice(0, 10)}.csv"`,
    );

    return reply.send(buildAuditCsv(logs));
  });
};

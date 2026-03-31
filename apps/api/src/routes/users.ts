import type { FastifyPluginAsync } from "fastify";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@vaxis/db";
import {
  auditLogs,
  entities,
  mfaEnrollments,
  notifications,
  userEntityAssignments,
  userSessions,
  users,
} from "@vaxis/db/schema";
import { defaultPermissionsByRole, permissionFlags } from "@vaxis/domain";

import { hashPassword } from "../lib/auth";
import { ensureAuthenticated, ensurePermission } from "../lib/permissions";

const manageableUserRoleSchema = z.enum([
  "CLIENT_ADMIN",
  "SUBSIDIARY_MANAGER",
  "STAFF",
]);

const permissionFlagSchema = z.enum(permissionFlags);

function emptyStringToNull(value: unknown) {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized === "" ? null : normalized;
  }

  return value;
}

const nullableTrimmedText = (maxLength: number) =>
  z.preprocess(
    emptyStringToNull,
    z.string().trim().max(maxLength).nullable().optional(),
  );

const nullableUuid = z.preprocess(
  emptyStringToNull,
  z.string().uuid().nullable().optional(),
);

const userCreateSchema = z.object({
  fullName: z.string().trim().min(2).max(200),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(12).max(128),
  role: manageableUserRoleSchema.default("STAFF"),
  jobTitle: nullableTrimmedText(200),
  department: nullableTrimmedText(200),
  phone: nullableTrimmedText(50),
  supervisorUserId: nullableUuid,
  entityIds: z.array(z.string().uuid()).max(100).default([]),
  mfaRequired: z.boolean().optional(),
  permissions: z.array(permissionFlagSchema).optional(),
});

const userUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(200).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  password: z.string().min(12).max(128).optional(),
  role: manageableUserRoleSchema.optional(),
  status: z.enum(["ACTIVE", "LOCKED", "DEACTIVATED"]).optional(),
  jobTitle: nullableTrimmedText(200),
  department: nullableTrimmedText(200),
  phone: nullableTrimmedText(50),
  supervisorUserId: nullableUuid,
  entityIds: z.array(z.string().uuid()).max(100).optional(),
  mfaRequired: z.boolean().optional(),
  permissions: z.array(permissionFlagSchema).optional(),
});

const userParamsSchema = z.object({
  id: z.string().uuid(),
});

function normalizeUserAgent(userAgent: string | string[] | undefined) {
  return Array.isArray(userAgent) ? userAgent.join(" ") : userAgent;
}

async function validateEntityAssignments(input: {
  tenantId: string;
  entityIds: string[];
}) {
  const uniqueEntityIds = Array.from(new Set(input.entityIds));

  if (uniqueEntityIds.length === 0) {
    return [];
  }

  const entityRows = await db
    .select({
      id: entities.id,
      entityName: entities.entityName,
      entityCode: entities.entityCode,
    })
    .from(entities)
    .where(
      and(
        eq(entities.tenantId, input.tenantId),
        inArray(entities.id, uniqueEntityIds),
      ),
    );

  if (entityRows.length !== uniqueEntityIds.length) {
    throw new Error(
      "One or more entity assignments are invalid for this tenant.",
    );
  }

  return entityRows;
}

async function validateSupervisor(input: {
  tenantId: string;
  supervisorUserId: string | null | undefined;
  subjectUserId?: string;
}) {
  if (!input.supervisorUserId) {
    return null;
  }

  if (input.subjectUserId && input.subjectUserId === input.supervisorUserId) {
    throw new Error("A user cannot supervise themselves.");
  }

  const [supervisor] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      status: users.status,
    })
    .from(users)
    .where(
      and(
        eq(users.id, input.supervisorUserId),
        eq(users.tenantId, input.tenantId),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);

  if (!supervisor || supervisor.status !== "ACTIVE") {
    throw new Error("Supervisor must be an active user in this tenant.");
  }

  return supervisor;
}

async function ensureClientAdminContinuity(input: {
  tenantId: string;
  currentRole: (typeof users.$inferSelect)["role"];
  currentStatus: (typeof users.$inferSelect)["status"];
  nextRole: (typeof users.$inferSelect)["role"];
  nextStatus: (typeof users.$inferSelect)["status"];
  userId: string;
}) {
  const removesLastClientAdmin =
    input.currentRole === "CLIENT_ADMIN" &&
    input.currentStatus === "ACTIVE" &&
    (input.nextRole !== "CLIENT_ADMIN" || input.nextStatus !== "ACTIVE");

  if (!removesLastClientAdmin) {
    return;
  }

  const activeClientAdmins = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.tenantId, input.tenantId),
        eq(users.role, "CLIENT_ADMIN"),
        eq(users.status, "ACTIVE"),
        isNull(users.deletedAt),
      ),
    );

  if (activeClientAdmins.length <= 1) {
    throw new Error(
      "At least one active client admin must remain assigned to this tenant.",
    );
  }
}

async function syncUserAssignments(input: {
  tenantId: string;
  userId: string;
  entityIds: string[];
}) {
  await db
    .delete(userEntityAssignments)
    .where(eq(userEntityAssignments.userId, input.userId));

  if (input.entityIds.length === 0) {
    return;
  }

  await db.insert(userEntityAssignments).values(
    input.entityIds.map((entityId) => ({
      userId: input.userId,
      entityId,
    })),
  );
}

async function buildUsersResponse(tenantId: string) {
  const [userRows, assignmentRows, entityRows, notificationRows] =
    await Promise.all([
      db
        .select()
        .from(users)
        .where(and(eq(users.tenantId, tenantId), isNull(users.deletedAt))),
      db
        .select({
          userId: userEntityAssignments.userId,
          entityId: entities.id,
        })
        .from(userEntityAssignments)
        .innerJoin(entities, eq(entities.id, userEntityAssignments.entityId))
        .where(eq(entities.tenantId, tenantId)),
      db
        .select({
          id: entities.id,
          entityName: entities.entityName,
          entityCode: entities.entityCode,
        })
        .from(entities)
        .where(eq(entities.tenantId, tenantId)),
      db
        .select({
          assignedTo: notifications.assignedTo,
          status: notifications.status,
        })
        .from(notifications)
        .where(eq(notifications.tenantId, tenantId)),
    ]);

  const userMap = new Map(userRows.map((user) => [user.id, user]));
  const entityMap = new Map(entityRows.map((entity) => [entity.id, entity]));
  const assignmentsByUser = new Map<
    string,
    Array<{
      id: string;
      entityName: string;
      entityCode: string;
    }>
  >();

  for (const row of assignmentRows) {
    const entity = entityMap.get(row.entityId);

    if (!entity) {
      continue;
    }

    const currentAssignments = assignmentsByUser.get(row.userId) ?? [];
    currentAssignments.push(entity);
    assignmentsByUser.set(row.userId, currentAssignments);
  }

  const openNotificationsByUser = new Map<string, number>();

  for (const notification of notificationRows) {
    if (
      !notification.assignedTo ||
      (notification.status !== "PENDING" &&
        notification.status !== "ACKNOWLEDGED" &&
        notification.status !== "IN_PROGRESS" &&
        notification.status !== "ESCALATED")
    ) {
      continue;
    }

    openNotificationsByUser.set(
      notification.assignedTo,
      (openNotificationsByUser.get(notification.assignedTo) ?? 0) + 1,
    );
  }

  return {
    users: userRows
      .map((user) => ({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        jobTitle: user.jobTitle,
        department: user.department,
        phone: user.phone,
        mfaRequired: user.mfaRequired,
        mfaEnabled: user.mfaEnabled,
        supervisorUserId: user.supervisorUserId,
        supervisorName: user.supervisorUserId
          ? (userMap.get(user.supervisorUserId)?.fullName ?? null)
          : null,
        lastLoginAt: user.lastLoginAt,
        permissions: user.permissions,
        openNotificationCount: openNotificationsByUser.get(user.id) ?? 0,
        assignedEntities: assignmentsByUser.get(user.id) ?? [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }))
      .sort((left, right) => left.fullName.localeCompare(right.fullName)),
  };
}

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/api/v1/users", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "USER_MANAGE")) {
      return;
    }

    return buildUsersResponse(request.user.tenantId);
  });

  fastify.post("/api/v1/users", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "USER_MANAGE")) {
      return;
    }

    try {
      const input = userCreateSchema.parse(request.body);
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.tenantId, request.user.tenantId),
            eq(users.email, input.email),
            isNull(users.deletedAt),
          ),
        )
        .limit(1);

      if (existing) {
        return reply.code(409).send({
          error: "USER_EMAIL_IN_USE",
          message: "This email address is already used in the tenant.",
        });
      }

      const assignedEntities = await validateEntityAssignments({
        tenantId: request.user.tenantId,
        entityIds: input.entityIds,
      });

      await validateSupervisor({
        tenantId: request.user.tenantId,
        supervisorUserId: input.supervisorUserId,
      });

      const passwordHash = await hashPassword(input.password);

      const [user] = await db
        .insert(users)
        .values({
          tenantId: request.user.tenantId,
          email: input.email,
          passwordHash,
          fullName: input.fullName,
          role: input.role,
          permissions:
            input.permissions ?? defaultPermissionsByRole[input.role],
          jobTitle: input.jobTitle ?? null,
          department: input.department ?? null,
          phone: input.phone ?? null,
          supervisorUserId: input.supervisorUserId ?? null,
          mfaRequired: input.mfaRequired ?? true,
        })
        .returning();

      if (!user) {
        return reply.code(500).send({
          error: "USER_CREATE_FAILED",
          message: "Unable to create the user.",
        });
      }

      await syncUserAssignments({
        tenantId: request.user.tenantId,
        userId: user.id,
        entityIds: assignedEntities.map((entity) => entity.id),
      });

      await db.insert(auditLogs).values({
        tenantId: request.user.tenantId,
        userId: request.user.sub,
        eventType: "user.created",
        resourceType: "USER",
        resourceId: user.id,
        ipAddress: request.ip,
        userAgent: normalizeUserAgent(request.headers["user-agent"]),
        metadata: {
          role: user.role,
          mfaRequired: user.mfaRequired,
          assignmentCount: assignedEntities.length,
        },
      });

      return reply.code(201).send({
        message: "User created.",
        ...(await buildUsersResponse(request.user.tenantId)),
      });
    } catch (error) {
      return reply.code(400).send({
        error: "INVALID_USER_INPUT",
        message:
          error instanceof Error
            ? error.message
            : "Unable to validate this user request.",
      });
    }
  });

  fastify.patch("/api/v1/users/:id", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "USER_MANAGE")) {
      return;
    }

    try {
      const { id } = userParamsSchema.parse(request.params);
      const input = userUpdateSchema.parse(request.body);

      const [user] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.id, id),
            eq(users.tenantId, request.user.tenantId),
            isNull(users.deletedAt),
          ),
        )
        .limit(1);

      if (!user) {
        return reply.code(404).send({
          error: "USER_NOT_FOUND",
          message: "The user was not found in this tenant.",
        });
      }

      if (input.email && input.email !== user.email) {
        const existingUsers = await db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.tenantId, request.user.tenantId),
              eq(users.email, input.email),
              isNull(users.deletedAt),
            ),
          );

        if (existingUsers.some((existing) => existing.id !== user.id)) {
          return reply.code(409).send({
            error: "USER_EMAIL_IN_USE",
            message: "This email address is already used in the tenant.",
          });
        }
      }

      const nextRole = input.role ?? user.role;
      const nextStatus = input.status ?? user.status;

      if (request.user.sub === user.id && nextStatus !== "ACTIVE") {
        return reply.code(400).send({
          error: "SELF_DEACTIVATION_NOT_ALLOWED",
          message:
            "Use another active admin account before deactivating yourself.",
        });
      }

      await ensureClientAdminContinuity({
        tenantId: request.user.tenantId,
        currentRole: user.role,
        currentStatus: user.status,
        nextRole,
        nextStatus,
        userId: user.id,
      });

      await validateSupervisor({
        tenantId: request.user.tenantId,
        supervisorUserId:
          input.supervisorUserId === undefined
            ? user.supervisorUserId
            : input.supervisorUserId,
        subjectUserId: user.id,
      });

      const assignedEntities =
        input.entityIds === undefined
          ? null
          : await validateEntityAssignments({
              tenantId: request.user.tenantId,
              entityIds: input.entityIds,
            });

      const passwordHash = input.password
        ? await hashPassword(input.password)
        : undefined;

      const [updated] = await db
        .update(users)
        .set({
          fullName: input.fullName ?? user.fullName,
          email: input.email ?? user.email,
          passwordHash: passwordHash ?? user.passwordHash,
          role: nextRole,
          status: nextStatus,
          permissions:
            input.permissions ??
            (input.role
              ? defaultPermissionsByRole[nextRole]
              : user.permissions),
          jobTitle:
            input.jobTitle === undefined ? user.jobTitle : input.jobTitle,
          department:
            input.department === undefined ? user.department : input.department,
          phone: input.phone === undefined ? user.phone : input.phone,
          supervisorUserId:
            input.supervisorUserId === undefined
              ? user.supervisorUserId
              : input.supervisorUserId,
          mfaRequired:
            input.mfaRequired === undefined
              ? user.mfaRequired
              : input.mfaRequired,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))
        .returning();

      if (!updated) {
        return reply.code(500).send({
          error: "USER_UPDATE_FAILED",
          message: "Unable to update the user.",
        });
      }

      if (assignedEntities) {
        await syncUserAssignments({
          tenantId: request.user.tenantId,
          userId: updated.id,
          entityIds: assignedEntities.map((entity) => entity.id),
        });
      }

      if (nextStatus !== "ACTIVE") {
        await db
          .update(userSessions)
          .set({ revokedAt: new Date() })
          .where(
            and(
              eq(userSessions.userId, updated.id),
              isNull(userSessions.revokedAt),
            ),
          );
      }

      await db.insert(auditLogs).values({
        tenantId: request.user.tenantId,
        userId: request.user.sub,
        eventType: "user.updated",
        resourceType: "USER",
        resourceId: updated.id,
        ipAddress: request.ip,
        userAgent: normalizeUserAgent(request.headers["user-agent"]),
        metadata: {
          nextRole,
          nextStatus,
          assignmentCount: assignedEntities?.length,
          mfaRequired: updated.mfaRequired,
        },
      });

      return {
        message: "User updated.",
        ...(await buildUsersResponse(request.user.tenantId)),
      };
    } catch (error) {
      return reply.code(400).send({
        error: "INVALID_USER_INPUT",
        message:
          error instanceof Error
            ? error.message
            : "Unable to validate this user update.",
      });
    }
  });

  fastify.post("/api/v1/users/:id/reset-mfa", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    if (!ensurePermission(request, reply, "USER_MANAGE")) {
      return;
    }

    const { id } = userParamsSchema.parse(request.params);

    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, id),
          eq(users.tenantId, request.user.tenantId),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    if (!user) {
      return reply.code(404).send({
        error: "USER_NOT_FOUND",
        message: "The user was not found in this tenant.",
      });
    }

    await db.transaction(async (tx) => {
      await tx.delete(mfaEnrollments).where(eq(mfaEnrollments.userId, user.id));
      await tx
        .update(users)
        .set({
          mfaEnabled: false,
          mfaRequired: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
    });

    await db.insert(auditLogs).values({
      tenantId: request.user.tenantId,
      userId: request.user.sub,
      eventType: "user.updated",
      resourceType: "USER",
      resourceId: user.id,
      ipAddress: request.ip,
      userAgent: normalizeUserAgent(request.headers["user-agent"]),
      metadata: {
        action: "reset_mfa",
      },
    });

    return {
      message:
        "User MFA reset. The next login will require a fresh enrollment.",
      ...(await buildUsersResponse(request.user.tenantId)),
    };
  });
};

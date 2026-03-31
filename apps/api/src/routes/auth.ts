import { randomUUID } from "node:crypto";

import type { FastifyInstance, FastifyPluginAsync, FastifyReply } from "fastify";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@vaxis/db";
import {
  auditLogs,
  categories,
  tenants,
  userSessions,
  users,
} from "@vaxis/db/schema";
import {
  categorySlots,
  defaultPermissionsByRole,
  seededDocumentTypes,
} from "@vaxis/domain";

import { apiEnv } from "../config";
import {
  generateRefreshToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from "../lib/auth";
import type { AuthTokenPayload } from "../types/auth";

const bootstrapSchema = z.object({
  clientName: z.string().min(2).max(200),
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug must use lowercase letters, numbers, and hyphens."),
  adminFullName: z.string().min(2).max(200),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(12).max(128),
});

const loginSchema = z.object({
  tenantSlug: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(12).max(128),
});

function buildAuthPayload(input: {
  userId: string;
  tenantId: string;
  role: AuthTokenPayload["role"];
  permissions: AuthTokenPayload["permissions"];
  email: string;
}): AuthTokenPayload {
  return {
    sub: input.userId,
    tenantId: input.tenantId,
    role: input.role,
    permissions: input.permissions,
    email: input.email,
  };
}

async function issueSession(input: {
  fastify: FastifyInstance;
  reply: FastifyReply;
  userId: string;
  tenantId: string;
  email: string;
  role: AuthTokenPayload["role"];
  permissions: AuthTokenPayload["permissions"];
  ipAddress: string | undefined;
  userAgent: string | undefined;
}) {
  const accessToken = await input.fastify.jwt.sign(
    buildAuthPayload({
      userId: input.userId,
      tenantId: input.tenantId,
      role: input.role,
      permissions: input.permissions,
      email: input.email,
    }),
  );

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  const refreshTokenExpiresAt = new Date();
  refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 30);

  await db.insert(userSessions).values({
    userId: input.userId,
    refreshTokenHash,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    expiresAt: refreshTokenExpiresAt,
  });

  input.reply.setCookie("vaxis_refresh_token", refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: apiEnv.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    signed: false,
  });

  return {
    accessToken,
    refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
  };
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/api/v1/auth/bootstrap-client", async (request, reply) => {
    const input = bootstrapSchema.parse(request.body);

    const existingTenant = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, input.slug))
      .limit(1);

    if (existingTenant.length > 0) {
      return reply.code(409).send({
        error: "TENANT_EXISTS",
        message: "A tenant with this slug already exists.",
      });
    }

    const passwordHash = await hashPassword(input.adminPassword);
    const categoryPalette = [
      "#1B3A6B",
      "#2E75B6",
      "#2B9348",
      "#F39C12",
      "#C0392B",
      "#0F766E",
      "#7C3AED",
      "#334155",
    ];

    const result = await db.transaction(async (tx) => {
      const [tenant] = await tx
        .insert(tenants)
        .values({
          clientName: input.clientName,
          slug: input.slug,
        })
        .returning();

      if (!tenant) {
        throw new Error("Tenant bootstrap failed to return a tenant row.");
      }

      const [admin] = await tx
        .insert(users)
        .values({
          tenantId: tenant.id,
          email: input.adminEmail,
          passwordHash,
          fullName: input.adminFullName,
          role: "CLIENT_ADMIN",
          permissions: defaultPermissionsByRole.CLIENT_ADMIN,
          mfaRequired: true,
        })
        .returning();

      if (!admin) {
        throw new Error("Tenant bootstrap failed to return an admin row.");
      }

      await tx.insert(categories).values(
        categorySlots.map((slot, index) => ({
          tenantId: tenant.id,
          slotNumber: slot,
          label: `Category ${String(slot).padStart(2, "0")}`,
          description: "Rename this slot during taxonomy onboarding.",
          colorCode: categoryPalette[index] ?? "#1B3A6B",
        })),
      );

      await tx.insert(auditLogs).values({
        tenantId: tenant.id,
        userId: admin.id,
        eventType: "tenant.bootstrapped",
        resourceType: "TENANT",
        resourceId: tenant.id,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
        metadata: {
          source: "bootstrap-client-endpoint",
          seededCategorySlots: categorySlots.length,
          seededSystemDocumentTypes: seededDocumentTypes.length,
        },
      });

      return { tenant, admin };
    });

    return reply.code(201).send({
      message: "Client tenant bootstrapped successfully.",
      tenant: {
        id: result.tenant.id,
        clientName: result.tenant.clientName,
        slug: result.tenant.slug,
      },
      admin: {
        id: result.admin.id,
        email: result.admin.email,
        fullName: result.admin.fullName,
      },
      nextSteps: [
        "Sign in with the admin account",
        "Enable MFA for the first session",
        "Rename category slots and add entities",
        "Seed entity document rules for predictive governance",
      ],
    });
  });

  fastify.post("/api/v1/auth/login", async (request, reply) => {
    const input = loginSchema.parse(request.body);

    const [tenant] = await db
      .select({
        id: tenants.id,
        slug: tenants.slug,
        clientName: tenants.clientName,
      })
      .from(tenants)
      .where(eq(tenants.slug, input.tenantSlug))
      .limit(1);

    if (!tenant) {
      return reply.code(401).send({
        error: "INVALID_CREDENTIALS",
        message: "Invalid tenant or credentials.",
      });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.tenantId, tenant.id),
          eq(users.email, input.email),
          eq(users.status, "ACTIVE"),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    if (!user?.passwordHash) {
      return reply.code(401).send({
        error: "INVALID_CREDENTIALS",
        message: "Invalid tenant or credentials.",
      });
    }

    const passwordMatches = await verifyPassword(
      input.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      return reply.code(401).send({
        error: "INVALID_CREDENTIALS",
        message: "Invalid tenant or credentials.",
      });
    }

    await db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    await db.insert(auditLogs).values({
      tenantId: user.tenantId,
      userId: user.id,
      eventType: "user.login.succeeded",
      resourceType: "USER",
      resourceId: user.id,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
      metadata: {
        sessionHint: randomUUID(),
      },
    });

    const session = await issueSession({
      fastify,
      reply,
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });

    return {
      message: "Login successful.",
      accessToken: session.accessToken,
      refreshTokenExpiresAt: session.refreshTokenExpiresAt,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        permissions: user.permissions,
        preferredLanguage: user.preferredLanguage,
        preferredTheme: user.preferredTheme,
        mfaRequired: user.mfaRequired,
        mfaEnabled: user.mfaEnabled,
      },
      tenant,
    };
  });

  fastify.post("/api/v1/auth/refresh", async (request, reply) => {
    const refreshToken = request.cookies.vaxis_refresh_token;

    if (!refreshToken) {
      return reply.code(401).send({
        error: "SESSION_REQUIRED",
        message: "Refresh token cookie is missing.",
      });
    }

    const refreshTokenHash = hashToken(refreshToken);
    const now = new Date();

    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.refreshTokenHash, refreshTokenHash))
      .orderBy(desc(userSessions.createdAt))
      .limit(1);

    if (!session || session.revokedAt || session.expiresAt <= now) {
      reply.clearCookie("vaxis_refresh_token", { path: "/" });
      return reply.code(401).send({
        error: "SESSION_EXPIRED",
        message: "Your session has expired. Please sign in again.",
      });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, session.userId), eq(users.status, "ACTIVE")))
      .limit(1);

    if (!user) {
      reply.clearCookie("vaxis_refresh_token", { path: "/" });
      return reply.code(401).send({
        error: "SESSION_INVALID",
        message: "Unable to restore this session.",
      });
    }

    await db
      .update(userSessions)
      .set({ revokedAt: now })
      .where(eq(userSessions.id, session.id));

    const rotated = await issueSession({
      fastify,
      reply,
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });

    return {
      message: "Session refreshed.",
      accessToken: rotated.accessToken,
      refreshTokenExpiresAt: rotated.refreshTokenExpiresAt,
    };
  });

  fastify.post("/api/v1/auth/logout", async (request, reply) => {
    const refreshToken = request.cookies.vaxis_refresh_token;

    if (refreshToken) {
      const refreshTokenHash = hashToken(refreshToken);

      await db
        .update(userSessions)
        .set({ revokedAt: new Date() })
        .where(eq(userSessions.refreshTokenHash, refreshTokenHash));
    }

    reply.clearCookie("vaxis_refresh_token", { path: "/" });

    return {
      message: "Session closed.",
    };
  });

  fastify.get("/api/v1/auth/me", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({
        error: "UNAUTHORIZED",
        message: "A valid access token is required.",
      });
    }

    const [user] = await db
      .select({
        id: users.id,
        tenantId: users.tenantId,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        permissions: users.permissions,
        preferredLanguage: users.preferredLanguage,
        preferredTheme: users.preferredTheme,
        mfaRequired: users.mfaRequired,
        mfaEnabled: users.mfaEnabled,
        timezone: users.timezone,
      })
      .from(users)
      .where(eq(users.id, request.user.sub))
      .limit(1);

    if (!user) {
      return reply.code(404).send({
        error: "USER_NOT_FOUND",
        message: "Authenticated user no longer exists.",
      });
    }

    return { user };
  });
};

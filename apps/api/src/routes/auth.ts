import { randomUUID } from "node:crypto";

import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
} from "fastify";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@vaxis/db";
import {
  auditLogs,
  categories,
  mfaEnrollments,
  tenants,
  userActionTokens,
  userSessions,
  users,
} from "@vaxis/db/schema";
import {
  categorySlots,
  defaultPermissionsByRole,
  platformName,
  seededDocumentTypes,
} from "@vaxis/domain";

import { apiEnv } from "../config";
import {
  generateRefreshToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from "../lib/auth";
import {
  createTotpEnrollment,
  decryptSecret,
  hashBackupCode,
  verifyTotpCode,
} from "../lib/mfa";
import { ensureAuthenticated } from "../lib/permissions";
import { inspectUserActionToken } from "../lib/user-actions";
import type { AuthTokenPayload } from "../types/auth";

const bootstrapSchema = z.object({
  clientName: z.string().min(2).max(200),
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must use lowercase letters, numbers, and hyphens.",
    ),
  adminFullName: z.string().min(2).max(200),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(12).max(128),
});

const loginSchema = z.object({
  tenantSlug: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(12).max(128),
  mfaCode: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().min(6).max(64).optional(),
  ),
});

const mfaVerificationSchema = z.object({
  code: z.string().trim().min(6).max(64),
});

const actionTokenParamsSchema = z.object({
  token: z.string().trim().min(20).max(255),
});

const acceptInviteSchema = z.object({
  token: z.string().trim().min(20).max(255),
  fullName: z
    .string()
    .trim()
    .min(2)
    .max(200)
    .optional()
    .or(z.literal("")),
  password: z.string().min(12).max(128),
});

const passwordResetSchema = z.object({
  token: z.string().trim().min(20).max(255),
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

function normalizeUserAgent(userAgent: string | string[] | undefined) {
  return Array.isArray(userAgent) ? userAgent.join(" ") : userAgent;
}

function buildRefreshCookieOptions() {
  return {
    httpOnly: true as const,
    sameSite: apiEnv.COOKIE_SAME_SITE,
    secure: apiEnv.COOKIE_SECURE,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    signed: false,
    ...(apiEnv.COOKIE_DOMAIN ? { domain: apiEnv.COOKIE_DOMAIN } : {}),
  };
}

function getActionTokenReplyCode(code: string) {
  switch (code) {
    case "ACTION_TOKEN_NOT_FOUND":
      return 404;
    case "ACTION_TOKEN_CONSUMED":
    case "ACTION_TOKEN_EXPIRED":
      return 410;
    default:
      return 400;
  }
}

function buildSessionUser(
  user: Pick<
    typeof users.$inferSelect,
    | "id"
    | "tenantId"
    | "email"
    | "fullName"
    | "role"
    | "permissions"
    | "preferredLanguage"
    | "preferredTheme"
    | "mfaRequired"
    | "mfaEnabled"
    | "timezone"
  >,
) {
  return {
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
    timezone: user.timezone,
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

  input.reply.setCookie(
    "vaxis_refresh_token",
    refreshToken,
    buildRefreshCookieOptions(),
  );

  return {
    accessToken,
    refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
  };
}

async function recordLoginFailure(input: {
  tenantId?: string | null;
  userId?: string | null;
  email: string;
  tenantSlug: string;
  reason: string;
  ipAddress: string | undefined;
  userAgent: string | undefined;
}) {
  await db.insert(auditLogs).values({
    tenantId: input.tenantId ?? null,
    userId: input.userId ?? null,
    eventType: "user.login.failed",
    resourceType: "USER",
    resourceId: input.userId ?? null,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: {
      email: input.email,
      reason: input.reason,
      tenantSlug: input.tenantSlug,
    },
  });
}

async function validateMfaChallenge(input: {
  userId: string;
  code: string | undefined;
}) {
  const [enrollment] = await db
    .select()
    .from(mfaEnrollments)
    .where(
      and(
        eq(mfaEnrollments.userId, input.userId),
        eq(mfaEnrollments.method, "TOTP"),
        eq(mfaEnrollments.isVerified, true),
      ),
    )
    .orderBy(desc(mfaEnrollments.createdAt))
    .limit(1);

  if (!enrollment?.totpSecretEncrypted) {
    return {
      ok: false as const,
      statusCode: 409,
      code: "MFA_CONFIGURATION_MISSING",
      message:
        "This account requires MFA, but no verified authenticator enrollment is available.",
    };
  }

  if (!input.code) {
    return {
      ok: false as const,
      statusCode: 401,
      code: "MFA_REQUIRED",
      message: "Enter the authenticator or backup code for this account.",
    };
  }

  const normalizedCode = input.code.trim();
  const secret = decryptSecret(enrollment.totpSecretEncrypted);

  if (verifyTotpCode({ secret, code: normalizedCode })) {
    return {
      ok: true as const,
      method: "TOTP" as const,
    };
  }

  const backupHash = hashBackupCode(normalizedCode);
  const backupCodes = enrollment.backupCodesHash ?? [];

  if (backupCodes.includes(backupHash)) {
    await db
      .update(mfaEnrollments)
      .set({
        backupCodesHash: backupCodes.filter((hash) => hash !== backupHash),
      })
      .where(eq(mfaEnrollments.id, enrollment.id));

    return {
      ok: true as const,
      method: "BACKUP_CODE" as const,
      backupCodesRemaining: backupCodes.length - 1,
    };
  }

  return {
    ok: false as const,
    statusCode: 401,
    code: "MFA_INVALID",
    message: "Authenticator or backup code was not valid.",
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
        userAgent: normalizeUserAgent(request.headers["user-agent"]),
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
    const userAgent = normalizeUserAgent(request.headers["user-agent"]);

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
      await recordLoginFailure({
        email: input.email,
        tenantSlug: input.tenantSlug,
        reason: "tenant_not_found",
        ipAddress: request.ip,
        userAgent,
      });

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
      await recordLoginFailure({
        tenantId: tenant.id,
        email: input.email,
        tenantSlug: input.tenantSlug,
        reason: "user_not_found",
        ipAddress: request.ip,
        userAgent,
      });

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
      await recordLoginFailure({
        tenantId: user.tenantId,
        userId: user.id,
        email: input.email,
        tenantSlug: input.tenantSlug,
        reason: "password_mismatch",
        ipAddress: request.ip,
        userAgent,
      });

      return reply.code(401).send({
        error: "INVALID_CREDENTIALS",
        message: "Invalid tenant or credentials.",
      });
    }

    let mfaMethod: "TOTP" | "BACKUP_CODE" | "NOT_ENABLED" = "NOT_ENABLED";

    if (user.mfaEnabled) {
      const mfaResult = await validateMfaChallenge({
        userId: user.id,
        code: input.mfaCode,
      });

      if (!mfaResult.ok) {
        await recordLoginFailure({
          tenantId: user.tenantId,
          userId: user.id,
          email: input.email,
          tenantSlug: input.tenantSlug,
          reason: mfaResult.code,
          ipAddress: request.ip,
          userAgent,
        });

        return reply.code(mfaResult.statusCode).send({
          error: mfaResult.code,
          message: mfaResult.message,
        });
      }

      mfaMethod = mfaResult.method;
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
      userAgent,
      metadata: {
        mfaMethod,
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
      userAgent,
    });

    return {
      message: "Login successful.",
      accessToken: session.accessToken,
      refreshTokenExpiresAt: session.refreshTokenExpiresAt,
      user: buildSessionUser(user),
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
      reply.clearCookie("vaxis_refresh_token", buildRefreshCookieOptions());
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
      reply.clearCookie("vaxis_refresh_token", buildRefreshCookieOptions());
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
      userAgent: normalizeUserAgent(request.headers["user-agent"]),
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

    reply.clearCookie("vaxis_refresh_token", buildRefreshCookieOptions());

    return {
      message: "Session closed.",
    };
  });

  fastify.get("/api/v1/auth/access/:token", async (request, reply) => {
    const { token } = actionTokenParamsSchema.parse(request.params);
    const inspection = await inspectUserActionToken(token);

    if (!inspection.ok) {
      return reply.code(getActionTokenReplyCode(inspection.code)).send({
        error: inspection.code,
        message: inspection.message,
      });
    }

    return {
      purpose: inspection.record.token.purpose,
      expiresAt: inspection.record.token.expiresAt,
      tenant: {
        id: inspection.record.tenant.id,
        clientName: inspection.record.tenant.clientName,
        slug: inspection.record.tenant.slug,
      },
      user: {
        id: inspection.record.user.id,
        email: inspection.record.user.email,
        fullName: inspection.record.user.fullName,
      },
    };
  });

  fastify.post("/api/v1/auth/invitations/accept", async (request, reply) => {
    const input = acceptInviteSchema.parse(request.body);
    const inspection = await inspectUserActionToken(input.token, "INVITE");

    if (!inspection.ok) {
      return reply.code(getActionTokenReplyCode(inspection.code)).send({
        error: inspection.code,
        message: inspection.message,
      });
    }

    const now = new Date();
    const passwordHash = await hashPassword(input.password);
    const normalizedFullName = input.fullName?.trim()
      ? input.fullName.trim()
      : inspection.record.user.fullName;

    let completion:
      | (typeof users.$inferSelect)
      | undefined;

    try {
      completion = await db.transaction(async (tx) => {
        const [tokenRow] = await tx
          .update(userActionTokens)
          .set({ consumedAt: now })
          .where(
            and(
              eq(userActionTokens.id, inspection.record.token.id),
              isNull(userActionTokens.consumedAt),
            ),
          )
          .returning({ id: userActionTokens.id });

        if (!tokenRow) {
          throw new Error("This invite link has already been used.");
        }

        const [updatedUser] = await tx
          .update(users)
          .set({
            passwordHash,
            fullName: normalizedFullName,
            status: "ACTIVE",
            mfaRequired: true,
            updatedAt: now,
          })
          .where(eq(users.id, inspection.record.user.id))
          .returning();

        await tx
          .update(userSessions)
          .set({ revokedAt: now })
          .where(
            and(
              eq(userSessions.userId, inspection.record.user.id),
              isNull(userSessions.revokedAt),
            ),
          );

        await tx.insert(auditLogs).values({
          tenantId: inspection.record.tenant.id,
          userId: inspection.record.user.id,
          eventType: "user.updated",
          resourceType: "USER",
          resourceId: inspection.record.user.id,
          ipAddress: request.ip,
          userAgent: normalizeUserAgent(request.headers["user-agent"]),
          metadata: {
            action: "invite_accepted",
          },
        });

        return updatedUser;
      });
    } catch (error) {
      return reply.code(409).send({
        error: "ACTION_TOKEN_CONSUMED",
        message:
          error instanceof Error
            ? error.message
            : "This invite link can no longer be used.",
      });
    }

    return {
      message: "Invitation accepted. Sign in from the workspace to continue.",
      tenant: {
        id: inspection.record.tenant.id,
        clientName: inspection.record.tenant.clientName,
        slug: inspection.record.tenant.slug,
      },
      user: completion
        ? {
            id: completion.id,
            email: completion.email,
            fullName: completion.fullName,
          }
        : {
            id: inspection.record.user.id,
            email: inspection.record.user.email,
            fullName: normalizedFullName,
          },
    };
  });

  fastify.post(
    "/api/v1/auth/password-reset/confirm",
    async (request, reply) => {
      const input = passwordResetSchema.parse(request.body);
      const inspection = await inspectUserActionToken(
        input.token,
        "PASSWORD_RESET",
      );

      if (!inspection.ok) {
        return reply.code(getActionTokenReplyCode(inspection.code)).send({
          error: inspection.code,
          message: inspection.message,
        });
      }

      const now = new Date();
      const passwordHash = await hashPassword(input.password);

      try {
        await db.transaction(async (tx) => {
          const [tokenRow] = await tx
            .update(userActionTokens)
            .set({ consumedAt: now })
            .where(
              and(
                eq(userActionTokens.id, inspection.record.token.id),
                isNull(userActionTokens.consumedAt),
              ),
            )
            .returning({ id: userActionTokens.id });

          if (!tokenRow) {
            throw new Error(
              "This password reset link has already been used.",
            );
          }

          await tx
            .update(users)
            .set({
              passwordHash,
              updatedAt: now,
            })
            .where(eq(users.id, inspection.record.user.id));

          await tx
            .update(userSessions)
            .set({ revokedAt: now })
            .where(
              and(
                eq(userSessions.userId, inspection.record.user.id),
                isNull(userSessions.revokedAt),
              ),
            );

          await tx.insert(auditLogs).values({
            tenantId: inspection.record.tenant.id,
            userId: inspection.record.user.id,
            eventType: "user.password_reset_completed",
            resourceType: "USER",
            resourceId: inspection.record.user.id,
            ipAddress: request.ip,
            userAgent: normalizeUserAgent(request.headers["user-agent"]),
            metadata: {
              action: "password_reset_completed",
            },
          });
        });
      } catch (error) {
        return reply.code(409).send({
          error: "ACTION_TOKEN_CONSUMED",
          message:
            error instanceof Error
              ? error.message
              : "This password reset link can no longer be used.",
        });
      }

      return {
        message: "Password reset complete. Sign in with the new password.",
        tenant: {
          id: inspection.record.tenant.id,
          clientName: inspection.record.tenant.clientName,
          slug: inspection.record.tenant.slug,
        },
        user: {
          id: inspection.record.user.id,
          email: inspection.record.user.email,
          fullName: inspection.record.user.fullName,
        },
      };
    },
  );

  fastify.post("/api/v1/auth/mfa/totp/enroll", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, request.user.sub),
          eq(users.tenantId, request.user.tenantId),
          eq(users.status, "ACTIVE"),
        ),
      )
      .limit(1);

    if (!user) {
      return reply.code(404).send({
        error: "USER_NOT_FOUND",
        message: "Authenticated user no longer exists.",
      });
    }

    const enrollment = await createTotpEnrollment({
      email: user.email,
      issuer: platformName,
    });

    await db.transaction(async (tx) => {
      await tx
        .delete(mfaEnrollments)
        .where(
          and(
            eq(mfaEnrollments.userId, user.id),
            eq(mfaEnrollments.method, "TOTP"),
          ),
        );

      await tx.insert(mfaEnrollments).values({
        userId: user.id,
        method: "TOTP",
        totpSecretEncrypted: enrollment.encryptedSecret,
        backupCodesHash: enrollment.hashedBackupCodes,
        isVerified: false,
      });
    });

    return {
      message: "Authenticator enrollment generated.",
      enrollment: {
        method: "TOTP",
        qrDataUrl: enrollment.qrDataUrl,
        manualEntryKey: enrollment.secret,
        backupCodes: enrollment.backupCodes,
      },
    };
  });

  fastify.post("/api/v1/auth/mfa/totp/verify", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
    }

    const input = mfaVerificationSchema.parse(request.body);

    const [enrollment] = await db
      .select()
      .from(mfaEnrollments)
      .where(
        and(
          eq(mfaEnrollments.userId, request.user.sub),
          eq(mfaEnrollments.method, "TOTP"),
        ),
      )
      .orderBy(desc(mfaEnrollments.createdAt))
      .limit(1);

    if (!enrollment?.totpSecretEncrypted) {
      return reply.code(404).send({
        error: "MFA_ENROLLMENT_NOT_FOUND",
        message: "Start authenticator enrollment before verifying it.",
      });
    }

    const isValid = verifyTotpCode({
      secret: decryptSecret(enrollment.totpSecretEncrypted),
      code: input.code,
    });

    if (!isValid) {
      return reply.code(400).send({
        error: "MFA_INVALID",
        message: "The authenticator code could not be verified.",
      });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(mfaEnrollments)
        .set({ isVerified: true })
        .where(eq(mfaEnrollments.id, enrollment.id));

      await tx
        .update(users)
        .set({
          mfaEnabled: true,
          mfaRequired: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, request.user.sub));
    });

    const [updatedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, request.user.sub))
      .limit(1);

    if (!updatedUser) {
      return reply.code(404).send({
        error: "USER_NOT_FOUND",
        message: "Authenticated user no longer exists.",
      });
    }

    return {
      message: "Authenticator MFA is now enabled.",
      user: buildSessionUser(updatedUser),
      backupCodesRemaining: enrollment.backupCodesHash.length,
    };
  });

  fastify.get("/api/v1/auth/me", async (request, reply) => {
    if (!(await ensureAuthenticated(request, reply))) {
      return;
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

    const [tenant] = await db
      .select({
        id: tenants.id,
        clientName: tenants.clientName,
        slug: tenants.slug,
      })
      .from(tenants)
      .where(eq(tenants.id, user.tenantId))
      .limit(1);

    return { user, tenant: tenant ?? null };
  });
};

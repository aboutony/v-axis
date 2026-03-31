import { and, eq, isNull } from "drizzle-orm";

import { db } from "@vaxis/db";
import { tenants, userActionTokens, users } from "@vaxis/db/schema";
import type { AuthActionPurpose } from "@vaxis/domain";

import { apiEnv } from "../config";
import { generateRefreshToken, hashToken } from "./auth";

const actionTtlHours: Record<AuthActionPurpose, number> = {
  INVITE: 72,
  PASSWORD_RESET: 2,
};

export function buildUserActionLink(token: string) {
  const url = new URL("/access", apiEnv.APP_BASE_URL);
  url.searchParams.set("token", token);
  return url.toString();
}

export function buildUserActionExpiry(
  purpose: AuthActionPurpose,
  now = new Date(),
) {
  const expiry = new Date(now);
  expiry.setHours(expiry.getHours() + actionTtlHours[purpose]);
  return expiry;
}

export async function issueUserActionToken(input: {
  tenantId: string;
  userId: string;
  issuedBy?: string | null;
  purpose: AuthActionPurpose;
}) {
  const token = generateRefreshToken();
  const tokenHash = hashToken(token);
  const expiresAt = buildUserActionExpiry(input.purpose);

  await db.transaction(async (tx) => {
    await tx
      .update(userActionTokens)
      .set({
        consumedAt: new Date(),
      })
      .where(
        and(
          eq(userActionTokens.userId, input.userId),
          eq(userActionTokens.purpose, input.purpose),
          isNull(userActionTokens.consumedAt),
        ),
      );

    await tx.insert(userActionTokens).values({
      tenantId: input.tenantId,
      userId: input.userId,
      issuedBy: input.issuedBy ?? null,
      purpose: input.purpose,
      tokenHash,
      expiresAt,
    });
  });

  return {
    token,
    purpose: input.purpose,
    expiresAt,
    link: buildUserActionLink(token),
  };
}

export async function inspectUserActionToken(
  token: string,
  expectedPurpose?: AuthActionPurpose,
) {
  const tokenHash = hashToken(token.trim());
  const [record] = await db
    .select({
      token: userActionTokens,
      user: users,
      tenant: tenants,
    })
    .from(userActionTokens)
    .innerJoin(users, eq(users.id, userActionTokens.userId))
    .innerJoin(tenants, eq(tenants.id, userActionTokens.tenantId))
    .where(eq(userActionTokens.tokenHash, tokenHash))
    .limit(1);

  if (!record) {
    return {
      ok: false as const,
      code: "ACTION_TOKEN_NOT_FOUND",
      message: "This access link is invalid or no longer available.",
    };
  }

  if (expectedPurpose && record.token.purpose !== expectedPurpose) {
    return {
      ok: false as const,
      code: "ACTION_TOKEN_INVALID",
      message: "This access link cannot be used for the requested action.",
    };
  }

  if (record.token.consumedAt) {
    return {
      ok: false as const,
      code: "ACTION_TOKEN_CONSUMED",
      message: "This access link has already been used.",
    };
  }

  if (record.token.expiresAt <= new Date()) {
    return {
      ok: false as const,
      code: "ACTION_TOKEN_EXPIRED",
      message: "This access link has expired. Generate a fresh one.",
    };
  }

  if (record.user.deletedAt || record.user.status !== "ACTIVE") {
    return {
      ok: false as const,
      code: "ACTION_USER_UNAVAILABLE",
      message: "This user is no longer available for access.",
    };
  }

  return {
    ok: true as const,
    record,
  };
}

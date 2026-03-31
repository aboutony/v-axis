import type { FastifyPluginAsync } from "fastify";
import { isNull, sql } from "drizzle-orm";

import { db } from "@vaxis/db";
import { tenants } from "@vaxis/db/schema";
import {
  categorySlots,
  defaultPermissionsByRole,
  permissionFlags,
  platformName,
  platformTagline,
  seededDocumentTypes,
  userRoles,
} from "@vaxis/domain";

export const platformRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/api/v1/platform/bootstrap", async () => {
    let tenantCount = 0;
    let databaseReady = true;
    let startupIssue: string | null = null;

    try {
      const [tenantSummary] = await db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(tenants)
        .where(isNull(tenants.deletedAt));

      tenantCount = tenantSummary?.count ?? 0;
    } catch (error) {
      databaseReady = false;
      startupIssue =
        "The production database schema has not been initialized yet.";

      fastify.log.error(
        {
          error,
        },
        "Platform bootstrap could not inspect tenant state.",
      );
    }

    return {
      platform: {
        name: platformName,
        tagline: platformTagline,
        categorySlots: categorySlots.length,
      },
      platformState: {
        tenantCount,
        hasTenants: tenantCount > 0,
        databaseReady,
        startupIssue,
      },
      security: {
        auth: "JWT with refresh token rotation",
        encryption: "TLS 1.3 in transit, AES-256 at rest",
        residency: "GCC-ready",
      },
      roles: userRoles,
      permissions: permissionFlags,
      defaultPermissionsByRole,
      seededDocumentTypes,
      roadmap: [
        "Tenant bootstrap and identity",
        "Taxonomy and entity onboarding",
        "Document intake and governance tracking",
        "Predictive alerts and command center",
        "Hybrid vault, integrations, and enterprise hardening",
      ],
    };
  });
};

import type { FastifyPluginAsync } from "fastify";

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
  fastify.get("/api/v1/platform/bootstrap", async () => ({
    platform: {
      name: platformName,
      tagline: platformTagline,
      categorySlots: categorySlots.length,
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
  }));
};

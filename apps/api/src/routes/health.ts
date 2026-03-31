import type { FastifyPluginAsync } from "fastify";

import { platformName } from "@vaxis/domain";

import { apiEnv } from "../config";

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/health", async () => ({
    status: "ok",
    service: `${platformName} API`,
    environment: apiEnv.NODE_ENV,
    now: new Date().toISOString(),
  }));
};

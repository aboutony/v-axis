import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

import { platformName } from "@vaxis/domain";

import { apiEnv, jwtRuntime } from "./config";
import { auditRoutes } from "./routes/audit";
import { authRoutes } from "./routes/auth";
import { dashboardRoutes } from "./routes/dashboard";
import { documentRoutes } from "./routes/documents";
import { governanceRoutes } from "./routes/governance";
import { healthRoutes } from "./routes/health";
import { platformRoutes } from "./routes/platform";
import { taxonomyRoutes } from "./routes/taxonomy";
import { userRoutes } from "./routes/users";
import { webhookRoutes } from "./routes/webhooks";

export async function createApp() {
  const logger =
    apiEnv.NODE_ENV === "development"
      ? {
          transport: {
            target: "pino-pretty",
            options: {
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
            },
          },
        }
      : true;

  const app = Fastify({
    logger,
  });

  await app.register(cors, {
    origin: apiEnv.CORS_ORIGIN.split(",").map((entry) => entry.trim()),
    credentials: true,
  });

  await app.register(cookie, {
    secret: apiEnv.COOKIE_SECRET,
  });

  await app.register(jwt, jwtRuntime);

  await app.register(multipart, {
    limits: {
      files: 1,
      fileSize: 25 * 1024 * 1024,
      parts: 32,
    },
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: `${platformName} API`,
        version: "0.1.0",
        description:
          "Control-plane and governance API for the V-AXIS asset intelligence platform.",
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
  });

  await app.register(healthRoutes);
  await app.register(platformRoutes);
  await app.register(authRoutes);
  await app.register(auditRoutes);
  await app.register(userRoutes);
  await app.register(taxonomyRoutes);
  await app.register(documentRoutes);
  await app.register(dashboardRoutes);
  await app.register(governanceRoutes);
  await app.register(webhookRoutes);

  return app;
}

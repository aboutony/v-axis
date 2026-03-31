import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";
import { z } from "zod";

const currentDir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(currentDir, "../../../.env") });

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  COOKIE_SECRET: z.string().min(16).default("vaxis-cookie-secret-dev"),
  JWT_SECRET: z.string().min(16).default("vaxis-jwt-secret-dev"),
  JWT_PRIVATE_KEY: z.string().optional(),
  JWT_PUBLIC_KEY: z.string().optional(),
  MFA_ENCRYPTION_SECRET: z.string().min(16).default("vaxis-mfa-secret-dev"),
  VAULT_STORAGE_ROOT: z.string().default(".data/vault"),
});

function normalizeMultilineSecret(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.replace(/\\n/g, "\n");
}

export const apiEnv = envSchema.parse(process.env);

const privateKey = normalizeMultilineSecret(apiEnv.JWT_PRIVATE_KEY);
const publicKey = normalizeMultilineSecret(apiEnv.JWT_PUBLIC_KEY);

export const jwtRuntime =
  privateKey && publicKey
    ? {
        secret: {
          private: privateKey,
          public: publicKey,
        },
        sign: {
          algorithm: "RS256" as const,
          expiresIn: "15m",
        },
      }
    : {
        secret: apiEnv.JWT_SECRET,
        sign: {
          algorithm: "HS256" as const,
          expiresIn: "15m",
        },
      };

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
  REDIS_URL: z.string().min(1).default("redis://127.0.0.1:6379"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  COOKIE_SECRET: z.string().min(16).default("vaxis-cookie-secret-dev"),
  JWT_SECRET: z.string().min(16).default("vaxis-jwt-secret-dev"),
  JWT_PRIVATE_KEY: z.string().optional(),
  JWT_PUBLIC_KEY: z.string().optional(),
  MFA_ENCRYPTION_SECRET: z.string().min(16).default("vaxis-mfa-secret-dev"),
  APP_ENCRYPTION_SECRET: z.string().min(16).optional(),
  APP_BASE_URL: z.string().url().optional(),
  WEBHOOK_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  EMAIL_TRANSPORT: z.enum(["SMTP", "JSON"]).default("SMTP"),
  SMTP_HOST: z.string().default("127.0.0.1"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_SECURE: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .default(false)
    .transform((value) => value === true || value === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM_ADDRESS: z
    .string()
    .email()
    .default("no-reply@v-axis.local"),
  EMAIL_FROM_NAME: z.string().default("V-AXIS"),
  VAULT_STORAGE_ROOT: z.string().default(".data/vault"),
  JOB_DELIVERY_MODE: z.enum(["INLINE", "QUEUE"]).optional(),
  WORKER_DELIVERY_CONCURRENCY: z.coerce.number().int().positive().default(5),
  WORKER_GOVERNANCE_REFRESH_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000),
  WORKER_ESCALATION_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(5 * 60 * 1000),
});

function normalizeMultilineSecret(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.replace(/\\n/g, "\n");
}

const parsedEnv = envSchema.parse(process.env);

export const apiEnv = {
  ...parsedEnv,
  APP_ENCRYPTION_SECRET:
    parsedEnv.APP_ENCRYPTION_SECRET ?? parsedEnv.MFA_ENCRYPTION_SECRET,
  APP_BASE_URL:
    parsedEnv.APP_BASE_URL ??
    parsedEnv.CORS_ORIGIN.split(",")[0]?.trim() ??
    "http://localhost:5173",
  JOB_DELIVERY_MODE:
    parsedEnv.JOB_DELIVERY_MODE ??
    (parsedEnv.NODE_ENV === "test" ? "INLINE" : "QUEUE"),
};

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

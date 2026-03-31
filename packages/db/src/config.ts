import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";
import { z } from "zod";

const currentDir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(currentDir, "../../../.env") });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NODE_ENV: z.enum(["development", "test", "production"]).default(
    "development",
  ),
});

export const dbEnv = envSchema.parse(process.env);

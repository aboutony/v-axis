import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { dbEnv } from "./config";

export const pool = new Pool({
  connectionString: dbEnv.DATABASE_URL,
  max: 10,
});

export const db = drizzle({ client: pool });

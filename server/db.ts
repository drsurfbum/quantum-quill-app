import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 4000, max: 10 });
export const db = drizzle({ client: pool, schema });

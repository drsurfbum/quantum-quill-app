import pg from "pg";
import { readFile } from "node:fs/promises";
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  if (!process.env.DATABASE_URL) throw new Error();
  await client.connect(); await client.query("BEGIN");
  await client.query(await readFile(new URL("../migrations/0007_agent_access.sql", import.meta.url), "utf8"));
  await client.query("COMMIT"); console.log("MCP permission storage is ready. Existing writing is unchanged; access defaults to disabled.");
} catch { await client.query("ROLLBACK").catch(() => undefined); console.error("MCP storage migration failed. Check the selected local database configuration."); process.exitCode = 1; }
finally { await client.end(); }

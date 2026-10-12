import pg from "pg";
import { readFile } from "node:fs/promises";
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  await client.connect(); await client.query("BEGIN");
  await client.query(await readFile(new URL("../migrations/0004_wizards_and_scenes.sql", import.meta.url), "utf8"));
  await client.query("COMMIT");
  console.log("Wizard and scene storage is ready. Existing chapter prose is unchanged.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  console.error(error instanceof Error ? error.message : "Migration failed"); process.exitCode = 1;
} finally { await client.end(); }

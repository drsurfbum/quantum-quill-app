import pg from "pg";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

// Only for a brand-new alpha database. Never a replacement for the reviewed,
// additive migrations used on recovered writing or a future schema upgrade.
export async function initializeAlphaDatabase(connectionString, purpose) {
  if (purpose !== "fresh-alpha" || !connectionString) throw new Error("Fresh alpha database configuration is required");
  const sql = await readFile(new URL("../deployment/alpha-schema.sql", import.meta.url), "utf8");
  const checksum = createHash("sha256").update(sql).digest("hex");
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 4000 });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '10s'");
    await client.query("SET LOCAL statement_timeout = '60s'");
    await client.query("SELECT pg_advisory_xact_lock(716841, 1)");
    const marker = (await client.query("SELECT to_regclass('public.qq_alpha_schema') AS marker")).rows[0].marker;
    if (marker) {
      const versions = await client.query("SELECT version, checksum FROM public.qq_alpha_schema");
      if (versions.rowCount !== 1 || versions.rows[0].version !== 1 || versions.rows[0].checksum !== checksum) {
        throw new Error("Alpha schema differs. Apply a separately reviewed migration; bootstrap will not modify this database.");
      }
      await client.query("COMMIT");
      return "already-initialized";
    }
    const existing = await client.query("SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f') LIMIT 1");
    if (existing.rowCount) throw new Error("Database is not empty. Refusing to initialize or alter existing data.");
    await client.query(sql);
    await client.query("CREATE TABLE public.qq_alpha_schema (version integer PRIMARY KEY, checksum text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())");
    await client.query("INSERT INTO public.qq_alpha_schema (version, checksum) VALUES (1, $1)", [checksum]);
    await client.query("COMMIT");
    return "initialized";
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { await client.end(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  initializeAlphaDatabase(process.env.DATABASE_URL, process.env.QQ_DATABASE_PURPOSE)
    .then(status => console.log(`Quantum Quill alpha schema: ${status}`))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}

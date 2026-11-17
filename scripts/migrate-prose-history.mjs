import pg from "pg";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
const schema = await readFile(new URL("../migrations/0007_prose_versions.sql", import.meta.url), "utf8");
export async function migrateProseHistory(connectionString,purpose) {
 if (!connectionString || purpose !== 'apply-prose-history-v1') throw new Error('Explicit prose history migration approval and DATABASE_URL are required');
 const client = new pg.Client({connectionString,connectionTimeoutMillis:4000}); await client.connect();
 try {
  await client.query('BEGIN'); await client.query("SET LOCAL lock_timeout = '10s'");
  await client.query("SET LOCAL statement_timeout = '60s'");
  await client.query('SELECT pg_advisory_xact_lock(716841, 1)');
  if (!(await client.query("SELECT to_regclass('public.qq_alpha_schema') marker")).rows[0].marker) throw new Error('Not an initialized alpha database; no changes made');
  await client.query('CREATE TABLE IF NOT EXISTS public.qq_alpha_features (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  const checksum = createHash('sha256').update(schema).digest('hex');
  const existing = (await client.query("SELECT checksum FROM public.qq_alpha_features WHERE name='prose-history-v1'")).rows[0];
  if (existing) {
   if (existing.checksum !== checksum) throw new Error('Prose history migration changed; use a new reviewed migration');
   await client.query('SELECT id,project_id,resource,document_id,revision,title,content,saved_at,captured_at,kind,restored_from_id,request_id FROM public.prose_versions LIMIT 0');
  } else {
   if ((await client.query("SELECT to_regclass('public.prose_versions') marker")).rows[0].marker) throw new Error('Untracked prose history table exists; refusing to replace it');
   await client.query(schema);
   await client.query('INSERT INTO public.qq_alpha_features(name,checksum) VALUES ($1,$2)',['prose-history-v1',checksum]);
  }
  await client.query('COMMIT'); return existing ? 'already-applied' : 'applied';
 } catch (error) { await client.query('ROLLBACK'); throw error; }
 finally { await client.end(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
 migrateProseHistory(process.env.DATABASE_URL,process.env.QQ_PROSE_HISTORY_MIGRATION).then(value=>console.log('Prose history migration:',value)).catch(error=>{console.error(error.message);process.exitCode=1;});
}

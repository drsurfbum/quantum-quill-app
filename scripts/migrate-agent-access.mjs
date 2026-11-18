import pg from "pg";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
const schema = await readFile(new URL("../migrations/0009_agent_access.sql", import.meta.url), "utf8");
export async function migrateAgentAccess(connectionString,purpose) {
 if (!connectionString || purpose !== 'apply-local-agent-access-v1') throw new Error('Explicit local MCP migration approval and DATABASE_URL are required');
 const url = new URL(connectionString);
 if (!['postgres:','postgresql:'].includes(url.protocol) || url.searchParams.has('host') || url.searchParams.has('hostaddr') || !['127.0.0.1','localhost','[::1]'].includes(url.hostname)) throw new Error('Local MCP migration requires a loopback database address');
 const client = new pg.Client({connectionString,connectionTimeoutMillis:4000}); await client.connect();
 try {
  await client.query('BEGIN'); await client.query("SET LOCAL lock_timeout = '10s'");
  await client.query("SET LOCAL statement_timeout = '60s'");
  await client.query('SELECT pg_advisory_xact_lock(716841, 1)');
  if (!(await client.query("SELECT to_regclass('public.qq_alpha_schema') marker")).rows[0].marker) throw new Error('Not an initialized alpha database; no changes made');
  await client.query('CREATE TABLE IF NOT EXISTS public.qq_alpha_features (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  const checksum = createHash('sha256').update(schema).digest('hex');
  const existing = (await client.query("SELECT checksum FROM public.qq_alpha_features WHERE name='local-agent-access-v1'")).rows[0];
  if (existing) {
   if (existing.checksum !== checksum) throw new Error('Local MCP migration changed; use a new reviewed migration');
   await client.query('SELECT user_id,revision,permissions,token_hash FROM public.agent_access LIMIT 0');
  } else {
   if ((await client.query("SELECT count(*)::int n FROM public.qq_alpha_features WHERE name IN ('prose-history-v1','prose-retention-v1')")).rows[0].n !== 2) throw new Error('Apply the reviewed history and retention migrations first');
   if ((await client.query("SELECT to_regclass('public.agent_access') marker")).rows[0].marker) throw new Error('Untracked agent access table exists; review it explicitly before migration');
   await client.query(schema);
   await client.query('INSERT INTO public.qq_alpha_features(name,checksum) VALUES ($1,$2)',['local-agent-access-v1',checksum]);
  }
  await client.query('COMMIT'); return existing ? 'already-applied' : 'applied';
 } catch (error) { await client.query('ROLLBACK'); throw error; }
 finally { await client.end(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
 migrateAgentAccess(process.env.DATABASE_URL,process.env.QQ_AGENT_ACCESS_MIGRATION).then(value=>console.log('Local MCP migration:',value)).catch(error=>{console.error(error.message);process.exitCode=1;});
}

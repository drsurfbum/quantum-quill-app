import pg from "pg";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
const schema = `CREATE TABLE public.feedback_reports (
 id serial PRIMARY KEY, user_id integer NOT NULL REFERENCES public.users(id),
 request_id text NOT NULL, category text NOT NULL CHECK (category IN ('bug','idea','confusing','other')),
 summary text NOT NULL CHECK (length(summary) BETWEEN 3 AND 160),
 details text NOT NULL CHECK (length(details) BETWEEN 10 AND 6000),
 area text NOT NULL CHECK (area IN ('Write','Story Bible','Storyboard','Outline','Overview','Projects','Other')),
 device text NOT NULL DEFAULT '' CHECK (length(device) <= 300),
 allow_contact boolean NOT NULL DEFAULT false,
 status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','reviewing','planned','resolved')),
 created_at timestamp NOT NULL DEFAULT now());
 CREATE UNIQUE INDEX feedback_user_request_unique ON public.feedback_reports(user_id,request_id);
 CREATE INDEX feedback_user_created ON public.feedback_reports(user_id,created_at);`;
export async function migrateFeedback(connectionString,purpose) {
 if (!connectionString || purpose !== 'fresh-alpha') throw new Error('Fresh alpha database configuration is required');
 const client = new pg.Client({connectionString,connectionTimeoutMillis:4000}); await client.connect();
 try {
  await client.query('BEGIN'); await client.query("SET LOCAL lock_timeout = '10s'");
  await client.query("SET LOCAL statement_timeout = '60s'");
  await client.query('SELECT pg_advisory_xact_lock(716841, 1)');
  if (!(await client.query("SELECT to_regclass('public.qq_alpha_schema') marker")).rows[0].marker) throw new Error('Not an initialized alpha database; no changes made');
  await client.query('CREATE TABLE IF NOT EXISTS public.qq_alpha_features (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  const checksum = createHash('sha256').update(schema).digest('hex');
  const existing = (await client.query("SELECT checksum FROM public.qq_alpha_features WHERE name='feedback-v1'")).rows[0];
  if (existing) {
   if (existing.checksum !== checksum) throw new Error('Feedback migration changed; use a new reviewed migration');
   await client.query('SELECT id,user_id,request_id,category,summary,details,area,device,allow_contact,status,created_at FROM public.feedback_reports LIMIT 0');
  } else {
   if ((await client.query("SELECT to_regclass('public.feedback_reports') marker")).rows[0].marker) throw new Error('Untracked feedback table exists; refusing to replace it');
   await client.query(schema);
   await client.query('INSERT INTO public.qq_alpha_features(name,checksum) VALUES ($1,$2)',['feedback-v1',checksum]);
  }
  await client.query('COMMIT'); return existing ? 'already-applied' : 'applied';
 } catch (error) { await client.query('ROLLBACK'); throw error; }
 finally { await client.end(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
 migrateFeedback(process.env.DATABASE_URL,process.env.QQ_DATABASE_PURPOSE).then(value=>console.log('Feedback migration:',value)).catch(error=>{console.error(error.message);process.exitCode=1;});
}

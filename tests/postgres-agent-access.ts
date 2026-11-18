import assert from 'node:assert/strict';
import pg from 'pg';
import session from 'express-session';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { initializeAlphaDatabase } from '../scripts/init-alpha-db.mjs';
import { migrateProseHistory } from '../scripts/migrate-prose-history.mjs';
import { migrateProseRetention } from '../scripts/migrate-prose-retention.mjs';
import { migrateAgentAccess } from '../scripts/migrate-agent-access.mjs';
// Explicit disposable test server only. Never load .env or a recovered writing DB.
if(!process.env.QQ_TEST_PG_ADMIN_URL)throw new Error('QQ_TEST_PG_ADMIN_URL must point to a disposable test PostgreSQL server');
const admin=new pg.Client({connectionString:process.env.QQ_TEST_PG_ADMIN_URL});await admin.connect();
const name=`qq_agent_test_${randomUUID().replaceAll('-','')}`;
let pool:pg.Pool|undefined,http:ReturnType<typeof createServer>|undefined;
try{
  await admin.query(`CREATE DATABASE "${name}"`);
  const url=new URL(process.env.QQ_TEST_PG_ADMIN_URL);url.pathname='/'+name;process.env.DATABASE_URL=url.toString();
  await assert.rejects(()=>migrateAgentAccess('postgresql://example.test/test','apply-local-agent-access-v1'),/loopback/);
  await assert.rejects(()=>migrateAgentAccess('postgresql://127.0.0.1/test?host=example.test','apply-local-agent-access-v1'),/loopback/);
  await initializeAlphaDatabase(process.env.DATABASE_URL,'fresh-alpha');
  await assert.rejects(()=>migrateAgentAccess(process.env.DATABASE_URL,'apply-local-agent-access-v1'),/history and retention/);
  await migrateProseHistory(process.env.DATABASE_URL,'apply-prose-history-v1');
  await migrateProseRetention(process.env.DATABASE_URL,'apply-prose-retention-v1');
  const client=new pg.Client({connectionString:process.env.DATABASE_URL});await client.connect();
  const schema=await readFile(new URL('../deployment/alpha-schema.sql',import.meta.url),'utf8'),migration=await readFile(new URL('../migrations/0009_agent_access.sql',import.meta.url),'utf8');
  const ledgerBefore=(await client.query('SELECT * FROM qq_alpha_features ORDER BY name')).rows;
  await client.query('BEGIN');await client.query(migration);await client.query('ROLLBACK');assert.equal((await client.query("select to_regclass('agent_access') value")).rows[0].value,null);
  await assert.rejects(()=>migrateAgentAccess(process.env.DATABASE_URL,undefined),/Explicit/);
  await client.query(migration);
  await assert.rejects(()=>migrateAgentAccess(process.env.DATABASE_URL,'apply-local-agent-access-v1'),/Untracked/);
  await client.query('DROP TABLE agent_access');
  assert.deepEqual((await Promise.all([migrateAgentAccess(process.env.DATABASE_URL,'apply-local-agent-access-v1'),migrateAgentAccess(process.env.DATABASE_URL,'apply-local-agent-access-v1')])).sort(),['already-applied','applied']);
  assert.deepEqual((await client.query("SELECT * FROM qq_alpha_features WHERE name <> 'local-agent-access-v1' ORDER BY name")).rows,ledgerBefore);
  await client.query("UPDATE qq_alpha_features SET checksum='synthetic-corruption' WHERE name='local-agent-access-v1'");
  await assert.rejects(()=>migrateAgentAccess(process.env.DATABASE_URL,'apply-local-agent-access-v1'),/changed/);
  await client.query("UPDATE qq_alpha_features SET checksum=$1 WHERE name='local-agent-access-v1'",[(await import('node:crypto')).createHash('sha256').update(migration).digest('hex')]);
  await client.end();
  const database=await import('../server/db');pool=database.pool;
  const {DatabaseStorage}=await import('../server/database-storage');const {createApp}=await import('../server/app');
  const storage=new DatabaseStorage(database.db,new session.MemoryStore());
  http=createServer(createApp({storage,secret:'fictional-postgres-agent-test-secret-only'})).listen(0,'127.0.0.1');await once(http,'listening');
  const origin=`http://127.0.0.1:${(http.address() as any).port}`;
  const reg=await fetch(origin+'/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'pg-fictional-writer',password:'fictional-postgres-password',email:'pg@example.test'})});assert.equal(reg.status,201);
  const cookie=reg.headers.get('set-cookie')!.split(';')[0],user=await reg.json();
  const p=await storage.createProject({userId:user.id,title:'Fictional durable permissions'});
  async function browser(path:string,body:any){const r=await fetch(origin+path,{method:path.endsWith('/key')?'POST':'PUT',headers:{Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
  const settings={enabled:true,allProjects:false,projectIds:[p.id],allowWrites:true,allowManuscript:true,revision:0};
  const concurrent=await Promise.all([browser('/api/agent-settings',settings),browser('/api/agent-settings',settings)]);assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);
  const issued=await browser('/api/agent-settings/key',{revision:1});assert.equal(issued.status,200);const token=issued.body.key;
  const renewed=new DatabaseStorage(database.db,new session.MemoryStore());assert.equal((await renewed.getAgentAccess(user.id)).revision,2);
  async function call(name:string,args:any){const r=await fetch(origin+'/api/mcp/call',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({name,arguments:args})});return {status:r.status,body:await r.json()};}
  const a={projectId:p.id,requestId:randomUUID(),title:'Durable chapter',content:'<p>Original fictional text</p>'};
  const created=await call('qq_create_chapter',a);assert.equal(created.status,200);const id=created.body.data.id;
  assert.equal((await call('qq_create_chapter',a)).body.data.id,id);assert.equal((await renewed.getProjectChapters(p.id)).length,1);
  const updates=await Promise.all([call('qq_update_chapter',{projectId:p.id,chapterId:id,revision:0,patch:{content:'<p>Version A</p>'}}),call('qq_update_chapter',{projectId:p.id,chapterId:id,revision:0,patch:{content:'<p>Version B</p>'}})]);assert.deepEqual(updates.map(r=>r.status).sort(),[200,409]);assert.equal((await renewed.getChapter(id))!.revision,1);
  // MCP and ordinary saves share the same transactional prose/history path.
  const originalHistory=await storage.listProseVersions(p.id,'chapters',id);
  assert.equal(originalHistory.length,2);
  assert.equal((await storage.getProseVersion(p.id,'chapters',id,originalHistory[1].id))!.content,a.content);
  const linkedEntry=await storage.createStoryBibleEntry({projectId:p.id,title:'Mira',entryType:'characters',content:'Fictional astronomer'});
  const formatted=`<p>A <strong>bright</strong> <span data-qq-entry="${linkedEntry.id}">Mira</span>.</p>`;
  assert.equal((await call('qq_update_chapter',{projectId:p.id,chapterId:id,revision:1,patch:{content:formatted}})).status,200);
  assert.equal((await storage.getChapter(id))!.content,formatted);
  const historyBeforeTitle=await storage.listProseVersions(p.id,'chapters',id);
  assert.equal((await call('qq_update_chapter',{projectId:p.id,chapterId:id,revision:2,patch:{title:'Renamed only'}})).status,200);
  assert.equal((await storage.listProseVersions(p.id,'chapters',id)).length,historyBeforeTitle.length);
  const sceneChapter=await storage.createChapter({projectId:p.id,title:'Scene container',writingMode:'scenes',content:'',order:1});
  const scene=await storage.createScene({projectId:p.id,chapterId:sceneChapter.id,title:'Night signal',content:formatted,order:0});
  const mixed=await Promise.all([
    call('qq_update_scene',{projectId:p.id,sceneId:scene.id,revision:0,patch:{content:formatted+'<p>Agent save.</p>'}}),
    fetch(origin+'/api/scenes/'+scene.id,{method:'PUT',headers:{Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({_revision:0,content:formatted+'<p>Writer save.</p>'})}).then(async r=>({status:r.status,body:await r.json()})),
  ]);
  assert.deepEqual(mixed.map(r=>r.status).sort(),[200,409]);
  assert.equal((await storage.getScene(scene.id))!.revision,1);
  assert.equal((await storage.listProseVersions(p.id,'scenes',scene.id)).length,2);
  const recordsBeforeFailure=[await storage.getChapter(id),await storage.getScene(scene.id)];
  const historyBeforeFailure=(await pool.query('SELECT * FROM prose_versions ORDER BY id')).rows;
  await pool.query("CREATE FUNCTION reject_agent_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fictional history failure'; END; $$; CREATE TRIGGER reject_agent_history BEFORE INSERT ON prose_versions FOR EACH ROW EXECUTE FUNCTION reject_agent_history();");
  assert.equal((await call('qq_update_chapter',{projectId:p.id,chapterId:id,revision:3,patch:{content:'Must roll back chapter'}})).status,500);
  assert.equal((await call('qq_update_scene',{projectId:p.id,sceneId:scene.id,revision:1,patch:{content:'Must roll back scene'}})).status,500);
  assert.deepEqual([await storage.getChapter(id),await storage.getScene(scene.id)],recordsBeforeFailure);
  assert.deepEqual((await pool.query('SELECT * FROM prose_versions ORDER BY id')).rows,historyBeforeFailure);
  await pool.query('DROP TRIGGER reject_agent_history ON prose_versions; DROP FUNCTION reject_agent_history();');
  const foreignOwner=await storage.createUser({username:'foreign-agent-fixture',email:'foreign@example.test',password:'not-a-real-login'});
  const foreignProject=await storage.createProject({userId:foreignOwner.id,title:'Foreign fictional project'});
  const foreignEntry=await storage.createStoryBibleEntry({projectId:foreignProject.id,title:'Foreign entry',entryType:'characters'});
  assert.equal((await call('qq_update_scene',{projectId:p.id,sceneId:scene.id,revision:1,patch:{content:`<p><span data-qq-entry="${foreignEntry.id}">Invalid foreign link</span></p>`}})).status,400);
  assert.deepEqual(await storage.getScene(scene.id),recordsBeforeFailure[1]);
  assert.deepEqual((await pool.query('SELECT * FROM prose_versions ORDER BY id')).rows,historyBeforeFailure);
  const before=await renewed.getAgentAccess(user.id);
  await assert.rejects(()=>renewed.withAgentLock(user.id,async s=>{await s.putAgentAccess({...before,enabled:false});throw new Error('fictional transaction failure');}));assert.deepEqual(await renewed.getAgentAccess(user.id),before);
  // A failed receipt insert must roll back a newly inserted Bible row too.
  await pool.query("CREATE FUNCTION reject_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fictional receipt failure'; END; $$; CREATE TRIGGER reject_receipt BEFORE INSERT ON creation_requests FOR EACH ROW EXECUTE FUNCTION reject_receipt();");
  assert.equal((await call('qq_create_story_bible_entry',{projectId:p.id,requestId:randomUUID(),entry:{title:'Rolled back',entryType:'characters',content:'Fictional'}})).status,500);
  assert.equal((await storage.getProjectStoryBible(p.id)).length,1);
  await pool.query('DROP TRIGGER reject_receipt ON creation_requests; DROP FUNCTION reject_receipt();');
  assert.equal((await browser('/api/agent-settings',{...settings,enabled:false,revision:2})).status,200);assert.equal((await call('qq_get_project',{projectId:p.id})).status,403);
  await fetch(origin+'/api/agent-settings/key',{method:'DELETE',headers:{Cookie:cookie}});
  assert.equal((await call('qq_get_project',{projectId:p.id})).status,401);
  console.log('PASS: history baseline/save, mixed app/MCP race, chapter/scene rollback on history failure, formatting/inline links, foreign-link denial, ledger guards, revocation; additive migration/rollback, durable permissions, stale-settings conflict, concurrent prose revisions, idempotent creation, transaction rollback, permission disable. Fictional database only.');
}finally{
  if(http){await new Promise<void>(r=>{http!.close(()=>r());http!.closeAllConnections();});}
  await pool?.end();await admin.query(`DROP DATABASE IF EXISTS "${name}"`);await admin.end();
}

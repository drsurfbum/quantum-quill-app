// Synthetic-only migration, rollback, concurrency, and physical storage rehearsal.
import pg from "pg";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import session from "express-session";
import { initializeAlphaDatabase } from "../scripts/init-alpha-db.mjs";
import { migrateProseHistory } from "../scripts/migrate-prose-history.mjs";
const adminURL=process.env.QQ_TEST_PG_ADMIN_URL;
if(!adminURL) throw new Error("Provide a disposable PostgreSQL admin URL; no working database is used.");
const name=`qq_history_test_${randomUUID().replaceAll('-','')}`, url=new URL(adminURL);url.pathname=`/${name}`;
const admin=new pg.Client({connectionString:adminURL});await admin.connect();
let pool:pg.Pool|undefined, client:pg.Client|undefined;
try {
  await admin.query(`CREATE DATABASE "${name}"`);
  await initializeAlphaDatabase(url.href,"fresh-alpha");
  client=new pg.Client({connectionString:url.href});await client.connect();
  const fingerprints=async()=> (await client!.query("SELECT id,title,content,revision FROM chapters ORDER BY id")).rows;
  await client.query("INSERT INTO users(username,password,email) VALUES ('synthetic-history','no-real-login','synthetic@example.test'); INSERT INTO projects(title,user_id) VALUES ('Synthetic history',1); INSERT INTO chapters(title,project_id,content,\"order\") VALUES ('Original',1,'Untouched Ω',0)");
  const original=await fingerprints();
  await client.query('BEGIN');
  await client.query(await readFile(new URL('../migrations/0007_prose_versions.sql',import.meta.url),'utf8'));
  await client.query('ROLLBACK');
  assert.equal((await client.query("SELECT to_regclass('prose_versions') value")).rows[0].value,null);
  assert.deepEqual(await fingerprints(),original);
  assert.deepEqual((await Promise.all([migrateProseHistory(url.href,"apply-prose-history-v1"),migrateProseHistory(url.href,"apply-prose-history-v1")])).sort(),["already-applied","applied"]);
  assert.deepEqual(await fingerprints(),original);
  process.env.DATABASE_URL=url.href;
  const db=await import('../server/db');pool=db.pool;
  const {DatabaseStorage}=await import('../server/database-storage');
  const storage=new DatabaseStorage(db.db,new session.MemoryStore());
  const chapter=(await storage.getChapter(1))!;
  const results=await Promise.all([storage.updateChapter(1,{content:'First competitor'},{revision:0}),storage.updateChapter(1,{content:'Second competitor'},{revision:0})]);
  assert.equal(results.filter(Boolean).length,1);
  const versions=await storage.listProseVersions(1,'chapters',1);assert.equal(versions.length,2);
  assert.equal((await storage.getProseVersion(1,'chapters',1,versions[1].id))!.content,'Untouched Ω');
  const before=(await storage.getChapter(1))!;
  await client.query(`CREATE FUNCTION reject_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic snapshot failure'; END; $$; CREATE TRIGGER reject_history BEFORE INSERT ON prose_versions FOR EACH ROW EXECUTE FUNCTION reject_history();`);
  await assert.rejects(()=>storage.updateChapter(1,{content:'Must roll back'},{revision:1}),(error:any)=>error.cause?.message === "synthetic snapshot failure");
  assert.deepEqual(await storage.getChapter(1),before);assert.equal((await storage.listProseVersions(1,'chapters',1)).length,2);
  await client.query('DROP TRIGGER reject_history ON prose_versions; DROP FUNCTION reject_history()');
  const request={restoredFromId:versions[1].id,requestId:randomUUID()};
  const restores=await Promise.all([storage.updateChapter(1,{content:chapter.content},{revision:1},request),storage.updateChapter(1,{content:chapter.content},{revision:1},request)]);
  assert.equal(restores.filter(Boolean).length,1);assert.equal((await storage.getProseRestore(1,'chapters',1,request.requestId))!.revision,2);
  await assert.rejects(()=>storage.withProjectLock(1,async scoped=>{await scoped.updateChapter(1,{content:'Outer rollback'},{revision:2});throw new Error('rollback');}),/rollback/);
  assert.equal((await storage.getChapter(1))!.content,chapter.content);assert.equal((await storage.listProseVersions(1,'chapters',1)).length,3);
  const sceneChapter=await storage.createChapter({projectId:1,title:'Scene container',writingMode:'scenes',order:1});
  const scene=await storage.createScene({projectId:1,chapterId:sceneChapter.id,title:'Scene',order:0,content:'Scene original',summary:'Plan'});
  await storage.updateScene(scene.id,{content:'Scene new'},{revision:0});assert.equal((await storage.listProseVersions(1,'scenes',scene.id)).length,2);
  const second=await storage.createProject({userId:1,title:'Separate project'});
  assert.equal((await storage.listProseVersions(second.id,'scenes',scene.id)).length,0);
  // Representative synthetic vocabulary, varied paragraphs, incremental edits.
  // Full document snapshots; PG TOAST compression is measured, not assumed.
  const vocabulary=Array.from({length:2048},(_,i)=>createHash('sha256').update(`synthetic-word-${i}`).digest('hex').slice(0,9));
  const samples=[];
  for(const bytes of [10_000,50_000,200_000]) {
    const record=await storage.createChapter({projectId:1,title:`Synthetic ${bytes} bytes`,order:2,content:''});
    const text=Array.from({length:Math.ceil(bytes/10)},(_,i)=>vocabulary[(i*7919)%vocabulary.length]).join(' ').slice(0,bytes);
    const physicalBefore=Number((await client.query("SELECT pg_total_relation_size('prose_versions') bytes")).rows[0].bytes);
    const count=120;
    for(let revision=0;revision<count;revision++) {
      const content=`<p>${text}</p><p>Revision ${revision}: ${vocabulary[revision]} Ω</p>`;
      await storage.updateChapter(record.id,{content},{revision});
    }
    const size=(await client.query("SELECT count(*)::int versions,sum(octet_length(coalesce(content,'')))::bigint logical_bytes,sum(pg_column_size(content))::bigint stored_content_bytes FROM prose_versions WHERE resource='chapters' AND document_id=$1",[record.id])).rows[0];
    const physicalAfter=Number((await client.query("SELECT pg_total_relation_size('prose_versions') bytes")).rows[0].bytes);
    samples.push({documentBytes:bytes,saves:count,versions:size.versions,logicalBytes:Number(size.logical_bytes),storedContentBytes:Number(size.stored_content_bytes),tableGrowthBytes:physicalAfter-physicalBefore,bytesPerSave:Math.round((physicalAfter-physicalBefore)/count)});
    const unchanged=(await storage.getChapter(record.id))!;await storage.updateChapter(record.id,{content:unchanged.content},{revision:unchanged.revision});
    assert.equal(Number((await client.query('SELECT count(*) n FROM prose_versions WHERE resource=$1 AND document_id=$2',['chapters',record.id])).rows[0].n),count+1);
  }
  const report={syntheticOnly:true,postgres:(await client.query('SHOW server_version')).rows[0].server_version,checks:['migration rollback','additive concurrent migration','original fields preserved','competing saves','snapshot failure atomic rollback','restore idempotency','outer transaction rollback','scene isolation','unchanged-body deduplication'],samples};
  await mkdir('artifacts/history',{recursive:true});await writeFile('artifacts/history/storage-growth.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
} finally {
  await pool?.end();await client?.end();
  assert.match(name,/^qq_history_test_[a-f0-9]{32}$/);await admin.query(`DROP DATABASE IF EXISTS "${name}"`);await admin.end();
}

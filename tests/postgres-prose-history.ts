// Synthetic-only migration, rollback, concurrency, and physical storage rehearsal.
import pg from "pg";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import session from "express-session";
import { initializeAlphaDatabase } from "../scripts/init-alpha-db.mjs";
import { migrateProseHistory } from "../scripts/migrate-prose-history.mjs";
import { migrateProseRetention } from "../scripts/migrate-prose-retention.mjs";
import { retentionReport, reportArguments } from "../scripts/prose-retention-report";
import { planProseRetention } from "../shared/prose-retention";
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
  // Exercise v1 restores before applying new metadata; payloads must be byte-for-byte intact.
  await client.query("INSERT INTO chapters(title,project_id,content,\"order\",revision) VALUES ('Legacy restore',1,'Legacy original Ω',1,3)");
  await client.query(`INSERT INTO prose_versions(project_id,resource,document_id,revision,title,content,saved_at,kind,restored_from_id,request_id) VALUES
    (1,'chapters',2,0,'Legacy','Legacy original Ω',now()-interval '800 days','baseline',null,null),
    (1,'chapters',2,1,'Legacy','Legacy source Ω',now()-interval '799 days','save',null,null),
    (1,'chapters',2,2,'Legacy','Legacy outgoing Ω',now()-interval '798 days','save',null,null),
    (1,'chapters',2,3,'Legacy','Legacy source Ω',now()-interval '797 days','restore',2,'11111111-1111-4111-8111-111111111111')`);
  const payloads=async()=> (await client!.query('SELECT id,title,content,revision,saved_at,kind,restored_from_id FROM prose_versions ORDER BY id')).rows;
  const legacy=await payloads();
  await client.query('BEGIN');await client.query(await readFile(new URL('../migrations/0008_prose_retention.sql',import.meta.url),'utf8'));await client.query('ROLLBACK');
  assert.deepEqual(await payloads(),legacy);
  assert.equal((await client.query("SELECT count(*)::int n FROM information_schema.columns WHERE table_name='prose_versions' AND column_name='kept_at'")).rows[0].n,0);
  await assert.rejects(()=>migrateProseRetention(url.href,undefined),/Explicit/);
  assert.deepEqual((await Promise.all([migrateProseRetention(url.href,'apply-prose-retention-v1'),migrateProseRetention(url.href,'apply-prose-retention-v1')])).sort(),['already-applied','applied']);
  assert.deepEqual(await payloads(),legacy);
  assert.deepEqual((await client.query('SELECT id FROM prose_versions WHERE restore_protected ORDER BY id')).rows.map(r=>r.id),[2,3,4]);
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
  assert.ok((await storage.listProseVersions(1,'chapters',1)).every(v=>v.restoreProtected));
  const keepId=versions[0].id;
  const concurrentKeeps=await Promise.all([storage.keepProseVersion(1,'chapters',1,keepId),storage.keepProseVersion(1,'chapters',1,keepId)]);
  assert.ok(concurrentKeeps[0]!.keptAt);assert.deepEqual(concurrentKeeps[0]!.keptAt,concurrentKeeps[1]!.keptAt);
  assert.equal(await storage.keepProseVersion(999,'chapters',1,keepId),undefined);
  assert.equal(await storage.checkpointProseSession(1,'chapters',1,1),undefined);
  assert.ok((await storage.checkpointProseSession(1,'chapters',1,2))!.sessionCheckpoint);
  // Roll back canonical prose AND protection metadata when a restored snapshot fails.
  await storage.updateChapter(1,{content:'Fresh unprotected source'},{revision:2});
  const fresh=(await storage.listProseVersions(1,'chapters',1))[0];
  await storage.updateChapter(1,{content:'Fresh outgoing'},{revision:3});
  const preFailure=(await client.query('SELECT * FROM prose_versions ORDER BY id')).rows;
  const currentBeforeFailure=await storage.getChapter(1);
  await client.query(`CREATE FUNCTION reject_restore() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind='restore' THEN RAISE EXCEPTION 'synthetic restore failure'; END IF; RETURN NEW; END; $$; CREATE TRIGGER reject_restore BEFORE INSERT ON prose_versions FOR EACH ROW EXECUTE FUNCTION reject_restore();`);
  await assert.rejects(()=>storage.updateChapter(1,{content:'Fresh unprotected source'},{revision:4},{restoredFromId:fresh.id,requestId:randomUUID()}));
  assert.deepEqual((await client.query('SELECT * FROM prose_versions ORDER BY id')).rows,preFailure);assert.deepEqual(await storage.getChapter(1),currentBeforeFailure);
  await client.query('DROP TRIGGER reject_restore ON prose_versions; DROP FUNCTION reject_restore()');
  await Promise.all([storage.keepProseVersion(1,'chapters',1,fresh.id),storage.updateChapter(1,{content:'Fresh unprotected source'},{revision:4},{restoredFromId:fresh.id,requestId:randomUUID()})]);
  assert.ok((await storage.getProseVersion(1,'chapters',1,fresh.id))!.keptAt);assert.ok((await storage.getProseVersion(1,'chapters',1,fresh.id))!.restoreProtected);
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
    // Review a controlled two-hour timeline, including a writer-kept older intermediate.
    await client.query("UPDATE prose_versions SET saved_at=now()-interval '20 hours'+revision*interval '1 minute' WHERE resource='chapters' AND document_id=$1",[record.id]);
    const first=(await storage.getProseRetentionRows(1,'chapters',record.id))[1];await storage.keepProseVersion(1,'chapters',record.id,first.id);
    const review=planProseRetention(await storage.getProseRetentionRows(1,'chapters',record.id),count);
    samples.push({documentBytes:bytes,saves:count,versions:size.versions,logicalBytes:Number(size.logical_bytes),storedContentBytes:Number(size.stored_content_bytes),tableGrowthBytes:physicalAfter-physicalBefore,bytesPerSave:Math.round((physicalAfter-physicalBefore)/count),dryRunWouldExpire:review.wouldExpireVersions,dryRunLogicalCandidateBytes:review.wouldExpireLogicalBytes,reclaimedBytes:0});
    const unchanged=(await storage.getChapter(record.id))!;await storage.updateChapter(record.id,{content:unchanged.content},{revision:unchanged.revision});
    assert.equal(Number((await client.query('SELECT count(*) n FROM prose_versions WHERE resource=$1 AND document_id=$2',['chapters',record.id])).rows[0].n),count+1);
  }
  const beforeReport=(await client.query('SELECT * FROM prose_versions ORDER BY id')).rows;
  assert.throws(()=>reportArguments(['--project-id','1','--apply','1']),/only reports/);
  assert.throws(()=>reportArguments([]),/project-id/);
  const cli=await retentionReport(url.href,1,1);
  assert.equal(cli.mode,'dry-run');assert.equal(cli.deletedVersions,0);assert.equal(cli.reclaimedBytes,0);assert.equal(cli.capacity!.level,'urgent');
  assert.ok(cli.documents.some(d=>d.wouldExpireVersions>0));
  assert.ok(!JSON.stringify(cli).includes('Legacy source'));assert.deepEqual((await client.query('SELECT * FROM prose_versions ORDER BY id')).rows,beforeReport);
  await mkdir('artifacts/history',{recursive:true});await writeFile('artifacts/history/retention-dry-run.json',JSON.stringify(cli,null,2)+'\n');
  const report={syntheticOnly:true,postgres:(await client.query('SHOW server_version')).rows[0].server_version,checks:['migration rollback','additive concurrent migration','original fields preserved','competing saves','snapshot failure atomic rollback','restore idempotency','outer transaction rollback','scene isolation','unchanged-body deduplication','retention migration rollback and legacy restore backfill','idempotent concurrent keep','revision-checked session marker','restore protection rollback','concurrent keep and restore','metadata-only dry-run leaves every version unchanged'],samples};
  await mkdir('artifacts/history',{recursive:true});await writeFile('artifacts/history/storage-growth.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
} finally {
  await pool?.end();await client?.end();
  assert.match(name,/^qq_history_test_[a-f0-9]{32}$/);await admin.query(`DROP DATABASE IF EXISTS "${name}"`);await admin.end();
}

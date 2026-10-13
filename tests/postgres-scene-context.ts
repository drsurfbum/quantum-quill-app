// This rehearsal only writes to a uniquely named disposable restore.
import pg from "pg";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {execFileSync} from "node:child_process";
import {readFile} from "node:fs/promises";
import session from "express-session";
if(!process.argv[2]) throw new Error("Pass a local backup.");
const name=`qq_context_${randomUUID().replaceAll('-','')}`;
const config={host:'/tmp/quantum-quill-501',port:55432,user:'qq_local'};
const admin=new pg.Client({...config,database:'postgres'});await admin.connect();let pool:pg.Pool|undefined,client:pg.Client|undefined;
try{
 await admin.query(`CREATE DATABASE "${name}"`);
 execFileSync('/opt/homebrew/opt/postgresql@16/bin/pg_restore',['-h',config.host,'-p','55432','-U',config.user,'--no-owner','--no-privileges','-d',name,process.argv[2]],{stdio:'pipe'});
 client=new pg.Client({...config,database:name});await client.connect();
 const originalTables=(await client.query("select tablename from pg_tables where schemaname='public' and tablename != 'session' order by tablename")).rows.map(r=>r.tablename as string);
 const fingerprints=async()=>{
  const result:Record<string,unknown>={};
  for(const table of originalTables){assert.match(table,/^[a-z_]+$/);result[table]=(await client!.query(`select count(*)::int count,md5(coalesce(string_agg(to_jsonb(t)::text,',' order by to_jsonb(t)::text),'')) hash from "${table}" t`)).rows[0];}
  return result;
 };
 const before=await fingerprints(),migration=await readFile(new URL('../migrations/0006_scene_bible_context.sql',import.meta.url),'utf8');
 const existed=originalTables.includes('scene_bible_contexts');
 await client.query('BEGIN');await client.query(migration);await client.query('ROLLBACK');
 assert.equal((await client.query("select to_regclass('scene_bible_contexts') value")).rows[0].value!==null,existed);
 assert.deepEqual(await fingerprints(),before);
 await client.query(migration);await client.query(migration);assert.deepEqual(await fingerprints(),before);
 process.env.DATABASE_URL=`postgresql://qq_local@localhost:55432/${name}?host=${config.host}`;
 const db=await import('../server/db');pool=db.pool;
 const {DatabaseStorage}=await import('../server/database-storage');
 const {readSceneContext,saveSceneContext,sceneUses}=await import('../server/scene-context');
 const {deleteBibleEntry,updateBibleEntry}=await import('../server/story-bible');
 const storage=new DatabaseStorage(db.db,new session.MemoryStore());
 const user=await storage.createUser({username:`synthetic-${randomUUID()}`,password:'not-a-real-login',email:'synthetic@example.test'});
 const project=await storage.createProject({userId:user.id,title:'Synthetic context transaction'});
 const chapter=await storage.createChapter({projectId:project.id,title:'A',writingMode:'scenes',order:0});
 const scene=await storage.createScene({projectId:project.id,chapterId:chapter.id,title:'X',order:0,content:'<p>Original X Ω</p>'});
 const entry=await storage.createStoryBibleEntry({projectId:project.id,title:'Mara',entryType:'characters',content:'Original character'});
 const links=[{entryId:entry.id,role:'viewpoint',note:'First context'}];
 assert.equal((await readSceneContext(storage,scene)).revision,0);
 const results=await Promise.allSettled([saveSceneContext(storage,scene,{links},{revision:0,links:[]}),saveSceneContext(storage,scene,{links:[{...links[0],note:'Other device'}]},{revision:0,links:[]}),storage.updateScene(scene.id,{content:'<p>Concurrent prose survives Ω</p>'},{revision:0})]);
 assert.equal(results.slice(0,2).filter(r=>r.status==='fulfilled').length,1);
 assert.equal(results[2].status,'fulfilled');assert.equal((await storage.getScene(scene.id))?.content,'<p>Concurrent prose survives Ω</p>');
 await assert.rejects(()=>deleteBibleEntry(storage,entry.id),/used in 1 scene/);
 await updateBibleEntry(storage,entry.id,{title:'Mara Vale',isArchived:true},{revision:0});
 assert.equal((await sceneUses(storage,project.id,entry.id))[0].sceneTitle,'X');
 const current=await readSceneContext(storage,scene);
 await saveSceneContext(storage,scene,{links:[{...current.links[0],note:'Retained archived context'}]},{revision:current.revision});
 await assert.rejects(()=>saveSceneContext(storage,scene,{links:[...current.links,{...links[0],role:'cast'}]},{revision:2}),/Restore the archived/);
 // A write error leaves the entire reference document at its previous revision.
 await client.query(`CREATE FUNCTION fail_context_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic context failure'; END; $$; CREATE TRIGGER fail_context_write BEFORE UPDATE ON scene_bible_contexts FOR EACH ROW EXECUTE FUNCTION fail_context_write();`);
 await assert.rejects(()=>saveSceneContext(storage,scene,{links:[]},{revision:2}),/synthetic context failure/);
 assert.equal((await readSceneContext(storage,scene)).revision,2);
 await client.query('DROP TRIGGER fail_context_write ON scene_bible_contexts; DROP FUNCTION fail_context_write();');
 await saveSceneContext(storage,scene,{links:[]},{revision:2});await deleteBibleEntry(storage,entry.id);
 await client.query('delete from scene_bible_contexts where project_id=$1',[project.id]);await client.query('delete from scenes where project_id=$1',[project.id]);await client.query('delete from chapters where project_id=$1',[project.id]);await client.query('delete from projects where id=$1',[project.id]);await client.query('delete from users where id=$1',[user.id]);
 assert.deepEqual(await fingerprints(),before);
 // Rehearse removal of the unused additive table only on this disposable copy.
 if(!existed){await client.query('DROP TABLE scene_bible_contexts');assert.deepEqual(await fingerprints(),before);}
 console.log(JSON.stringify({migrationRollback:'PASS',idempotentMigration:'PASS',concurrentContexts:'PASS',concurrentProse:'PASS',archivedLinks:'PASS',deleteGuard:'PASS',failedWriteRollback:'PASS',originalTablesUnchanged:originalTables.length}));
}finally{await pool?.end();await client?.end();assert.match(name,/^qq_context_[a-f0-9]{32}$/);await admin.query(`DROP DATABASE IF EXISTS "${name}"`);await admin.end();}

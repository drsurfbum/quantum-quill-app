// All mutations occur in a uniquely named disposable restored database.
import pg from "pg";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {execFileSync} from "node:child_process";
import session from "express-session";
if(!process.argv[2]) throw new Error("Pass a local backup.");
const name=`qq_manuscript_${randomUUID().replaceAll('-','')}`;
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
 const before=await fingerprints();
 process.env.DATABASE_URL=`postgresql://qq_local@localhost:55432/${name}?host=${config.host}`;
 const db=await import('../server/db');pool=db.pool;
 const {DatabaseStorage}=await import('../server/database-storage');
 const {manuscriptStructure,organizeManuscript}=await import('../server/manuscript');
 const {collectExport,renderExport,exportOptions}=await import('../server/export');
 const storage=new DatabaseStorage(db.db,new session.MemoryStore());
 const user=await storage.createUser({username:`synthetic-${randomUUID()}`,password:'not-a-real-login',email:'synthetic@example.test'});
 const project=await storage.createProject({userId:user.id,title:'Synthetic manuscript transaction'});
 const a=await storage.createChapter({projectId:project.id,title:'A',writingMode:'scenes',order:0}),b=await storage.createChapter({projectId:project.id,title:'B',writingMode:'scenes',order:1});
 const x=await storage.createScene({projectId:project.id,chapterId:a.id,title:'X',order:0,content:'<p>Original X Ω</p>'}),y=await storage.createScene({projectId:project.id,chapterId:a.id,title:'Y',order:1,content:'<p>Original Y</p>'});
 const source=await manuscriptStructure(storage,project.id);
 const arrangement={snapshot:source.snapshot,chapters:[{id:b.id,sceneIds:[y.id,x.id]},{id:a.id,sceneIds:[]}]};
 // A trigger failure after chapter ordering has begun must roll back everything.
 await client.query(`CREATE FUNCTION fail_manuscript_move() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id = ${x.id} AND NEW.chapter_id != OLD.chapter_id THEN RAISE EXCEPTION 'synthetic move failure'; END IF; RETURN NEW; END; $$; CREATE TRIGGER fail_manuscript_move BEFORE UPDATE ON scenes FOR EACH ROW EXECUTE FUNCTION fail_manuscript_move();`);
 await assert.rejects(()=>organizeManuscript(storage,project.id,arrangement),/synthetic move failure/);
 assert.deepEqual(await manuscriptStructure(storage,project.id),source);
 await client.query('DROP TRIGGER fail_manuscript_move ON scenes; DROP FUNCTION fail_manuscript_move();');
 await Promise.all([organizeManuscript(storage,project.id,arrangement),storage.updateScene(x.id,{content:'<p>Concurrent prose survives Ω</p>'},{revision:0})]);
 assert.equal((await storage.getScene(x.id))?.chapterId,b.id);assert.equal((await storage.getScene(x.id))?.content,'<p>Concurrent prose survives Ω</p>');
 await organizeManuscript(storage,project.id,arrangement);
 const current=await manuscriptStructure(storage,project.id);
 assert.equal(current.chapters[0].scenes[0].id,y.id);
 // Repeatable-read export must not mix a later edit into an already-open snapshot.
 await storage.withReadSnapshot(async scoped=>{
  const first=await scoped.getScene(x.id);
  await storage.updateScene(x.id,{content:'<p>Later version</p>'},{revision:first!.revision});
  assert.equal((await scoped.getScene(x.id))?.content,first?.content);
  const opts=exportOptions.parse({format:'docx'});
  assert.ok((await renderExport(await collectExport(scoped,project,opts),opts)).body.length>1000);
 });
 // Remove only this fixture, then prove every restored original row is unchanged.
 await client.query('delete from scenes where project_id=$1',[project.id]);await client.query('delete from chapters where project_id=$1',[project.id]);await client.query('delete from projects where id=$1',[project.id]);await client.query('delete from users where id=$1',[user.id]);
 assert.deepEqual(await fingerprints(),before);
 console.log(JSON.stringify({atomicRollback:'PASS',concurrentProse:'PASS',idempotentRetry:'PASS',readSnapshot:'PASS',wordExport:'PASS',originalTablesUnchanged:originalTables.length}));
}finally{await pool?.end();await client?.end();assert.match(name,/^qq_manuscript_[a-f0-9]{32}$/);await admin.query(`DROP DATABASE IF EXISTS "${name}"`);await admin.end();}

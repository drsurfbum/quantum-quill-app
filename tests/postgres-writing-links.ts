// Restores an explicit backup into an isolated, temporary PostgreSQL cluster.
// No connection to the working/recovered database; stop and remove only this cluster.
import pg from "pg";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {mkdtemp,readFile,rm,chmod} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import session from "express-session";
const backup=process.argv[2];if(!backup)throw new Error("Pass a local backup to restore into a disposable cluster.");
const root=await mkdtemp(path.join(tmpdir(),"qq-writing-check-")),data=path.join(root,"data"),bin="/opt/homebrew/opt/postgresql@16/bin/";
let started=false,pool:pg.Pool|undefined,client:pg.Client|undefined;
try {
 await chmod(root,0o700);
 execFileSync(bin+"initdb",["-D",data,"-U","qq_workspace","--encoding=UTF8","--locale=C","--auth-local=trust","--auth-host=reject"],{stdio:"pipe"});
 execFileSync(bin+"pg_ctl",["-D",data,"-l",path.join(root,"postgres.log"),"-o",`-k ${root} -p 55439 -h ''`,"start"],{stdio:"pipe"});started=true;
 const config={host:root,port:55439,user:"qq_workspace",database:"postgres"};client=new pg.Client(config);await client.connect();
 execFileSync(bin+"pg_restore",["-h",root,"-p","55439","-U","qq_workspace","--no-owner","--no-privileges","--exit-on-error","-d","postgres",backup],{stdio:"pipe"});
 const tables=(await client.query("select tablename from pg_tables where schemaname='public' and tablename!='session' order by tablename")).rows.map(r=>r.tablename as string);
 const fingerprints=async()=>{const result:Record<string,unknown>={};for(const table of tables){assert.match(table,/^[a-z_]+$/);result[table]=(await client!.query(`select count(*)::int count,md5(coalesce(string_agg(to_jsonb(t)::text,',' order by to_jsonb(t)::text),'')) hash from "${table}" t`)).rows[0];}return result;};
 const before=await fingerprints();
 await client.query(await readFile(new URL("../migrations/0006_scene_bible_context.sql",import.meta.url),"utf8"));
 process.env.DATABASE_URL=`postgresql://qq_workspace@localhost:55439/postgres?host=${encodeURIComponent(root)}`;
 const db=await import("../server/db");pool=db.pool;
 const {DatabaseStorage}=await import("../server/database-storage");
 const {validateWritingLinks,writingUses}=await import("../server/writing-links");
 const {createBibleStub,deleteBibleEntry,updateBibleEntry}=await import("../server/story-bible");
 const storage=new DatabaseStorage(db.db,new session.MemoryStore());
 const user=await storage.createUser({username:`workspace-test-${Date.now()}`,password:"synthetic-only",email:"synthetic@example.test"});
 const project=await storage.createProject({userId:user.id,title:"Workspace fixture"});
 const chapter=await storage.createChapter({projectId:project.id,title:"Chapter",writingMode:"scenes",order:0});
 const scene=await storage.createScene({projectId:project.id,chapterId:chapter.id,title:"Arrival",order:0,content:"Original"});
 const stubs=await Promise.all([createBibleStub(storage,project.id,"Mara","characters"),createBibleStub(storage,project.id,"Mara","characters")]);assert.equal(stubs[0].id,stubs[1].id);
 const entry=stubs[0],linked=`<p><span data-qq-entry="${entry.id}">the navigator</span> arrived.</p>`;
 const save=(content:string,revision:number)=>storage.withProjectLock(project.id,async scoped=>{const current=await scoped.getScene(scene.id);await validateWritingLinks(scoped,project.id,content,current?.content);return scoped.updateScene(scene.id,{content},{revision});});
 const writes=await Promise.all([save(linked,0),save(linked+"<p>Other device</p>",0)]);assert.equal(writes.filter(Boolean).length,1);
 assert.equal((await writingUses(storage,project.id,entry.id)).length,1);
 await assert.rejects(()=>deleteBibleEntry(storage,entry.id),/mentioned/);
 await updateBibleEntry(storage,entry.id,{title:"Mara Vale",isArchived:true},{revision:0});
 assert.ok((await storage.getScene(scene.id))?.content?.includes("the navigator"));
 await save(linked+"<p>More prose</p>",1);
 await save("<p>the navigator arrived.</p>",2);await deleteBibleEntry(storage,entry.id);
 // A racing deletion and mention insertion are serialized by the same real PG lock.
 const second=await createBibleStub(storage,project.id,"Harbor","locations");
 const race=await Promise.allSettled([save(`<p><span data-qq-entry="${second.id}">port</span></p>`,3),deleteBibleEntry(storage,second.id)]);
 assert.equal(race.filter(r=>r.status==="fulfilled").length,1);
 if((await storage.getScene(scene.id))?.content?.includes("data-qq-entry"))assert.ok(await storage.getStoryBibleEntry(second.id));
 await client.query("delete from scenes where project_id=$1",[project.id]);await client.query("delete from chapters where project_id=$1",[project.id]);await client.query("delete from story_bible_entries where project_id=$1",[project.id]);await client.query("delete from projects where id=$1",[project.id]);await client.query("delete from users where id=$1",[user.id]);
 assert.deepEqual(await fingerprints(),before);
 console.log(JSON.stringify({concurrentProse:"PASS",stubRetry:"PASS",inlineDeleteGuard:"PASS",archivedMention:"PASS",renameKeepsWords:"PASS",deleteRace:"PASS",originalTablesUnchanged:tables.length}));
} finally {await pool?.end();await client?.end();if(started)execFileSync(bin+"pg_ctl",["-D",data,"stop","-m","fast"],{stdio:"pipe"});await rm(root,{recursive:true,force:true});}

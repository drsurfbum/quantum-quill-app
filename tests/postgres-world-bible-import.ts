// An explicit backup + reviewed import plan are rehearsed in a disposable cluster.
import pg from 'pg';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp,readFile,rm,chmod} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import session from 'express-session';
import {importWorldBible,importPlanSchema} from '../scripts/import-world-bible';
import {canonical} from '../shared/draft';
import {prepareBiblePatch} from '../shared/story-bible';
import {imageType} from '../server/upload-access';
import {createHash} from 'node:crypto';
const [backup,planPath,ownerValue]=process.argv.slice(2);if(!backup||!planPath||!ownerValue)throw new Error('Pass backup, plan, and existing owner ID.');
const input=JSON.parse(await readFile(planPath,'utf8')),plan=importPlanSchema.parse(input),owner=Number(ownerValue);
const root=await mkdtemp(path.join(tmpdir(),'qq-import-check-')),data=path.join(root,'data'),bin='/opt/homebrew/opt/postgresql@16/bin/';
let started=false,pool:pg.Pool|undefined,client:pg.Client|undefined;
try{
 await chmod(root,0o700);
 execFileSync(bin+'initdb',['-D',data,'-U','qq_import','--encoding=UTF8','--locale=C','--auth-local=trust','--auth-host=reject'],{stdio:'pipe'});
 execFileSync(bin+'pg_ctl',['-D',data,'-l',path.join(root,'postgres.log'),'-o',`-k ${root} -p 55439 -h ''`,'start'],{stdio:'pipe'});started=true;
 client=new pg.Client({host:root,port:55439,user:'qq_import',database:'postgres'});await client.connect();
 execFileSync(bin+'pg_restore',['-h',root,'-p','55439','-U','qq_import','--no-owner','--no-privileges','--exit-on-error','-d','postgres',backup],{stdio:'pipe'});
 const tables=(await client.query("select tablename from pg_tables where schemaname='public' and tablename!='session' order by tablename")).rows.map(r=>r.tablename as string);
 const fingerprint=async()=>{const result:Record<string,unknown>={};for(const table of tables){assert.match(table,/^[a-z_]+$/);result[table]=(await client!.query(`select count(*)::int count,md5(coalesce(string_agg(to_jsonb(t)::text,',' order by to_jsonb(t)::text),'')) hash from "${table}" t`)).rows[0];}return result;};
 const before=await fingerprint();
 process.env.DATABASE_URL=`postgresql://qq_import@localhost:55439/postgres?host=${encodeURIComponent(root)}`;
 const db=await import('../server/db');pool=db.pool;
 const {DatabaseStorage}=await import('../server/database-storage');const storage=new DatabaseStorage(db.db,new session.MemoryStore());
 const result=await importWorldBible(storage,owner,input);
 const entries=await storage.getProjectStoryBible(result.projectId);
 assert.equal(entries.length,plan.entries.length);
 for(const e of plan.entries){const row=entries.find(r=>r.id===result.entries[e.sourceId])!;const expected={...e.data,...prepareBiblePatch({},e.data)};for(const [key,value] of Object.entries(expected))assert.equal(canonical((row as any)[key]),canonical(value),key);assert.equal(row.title,e.data.title);assert.equal(row.entryType,e.data.entryType);assert.equal(row.isArchived,e.data.isArchived);assert.equal(canonical((row.metadata as any)._notionImport),canonical((e.data.metadata as any)._notionImport));}
 const links=await storage.getBibleRelationships(result.projectId);assert.equal(links.length,plan.relationships.length);
 assert.ok(links.every(l=>entries.some(e=>e.id===l.sourceId)&&entries.some(e=>e.id===l.targetId)));
 assert.equal((await storage.getProjectChapters(result.projectId)).length,0);assert.equal((await storage.getProjectScenes(result.projectId)).length,0);
 assert.deepEqual(await importWorldBible(storage,owner,input),result);
 const changed=structuredClone(input);changed.project.title+=' changed';await assert.rejects(()=>importWorldBible(storage,owner,changed),/different data/);
 for(const asset of plan.assets){const bytes=await readFile(asset.sourcePath);assert.ok(imageType(bytes));assert.ok(bytes.length<=5*1024*1024);assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);}
 // Rehearse a failure after all data has been staged: the outer transaction must undo it.
 const failed=structuredClone(input);failed.requestId='4083be2b-7655-455e-8e83-2576a7f59a75';
 const withImport=await fingerprint();await assert.rejects(()=>importWorldBible(storage,owner,failed,async()=>{throw new Error('simulated attachment failure');}),/simulated attachment failure/);assert.deepEqual(await fingerprint(),withImport);
 await client.query('delete from bible_relationships where project_id=$1',[result.projectId]);await client.query('delete from story_bible_entries where project_id=$1',[result.projectId]);await client.query('delete from creation_requests where scope=$1 and request_id=$2',[-owner,plan.requestId]);await client.query('delete from projects where id=$1',[result.projectId]);
 assert.deepEqual(await fingerprint(),before);
 console.log(JSON.stringify({entries:entries.length,relationships:links.length,images:plan.assets.length,originalPayloads:'PASS',idempotentRetry:'PASS',failedImportRollback:'PASS',rollbackOriginalTables:tables.length,writingCreated:0}));
}finally{await pool?.end();await client?.end();if(started)execFileSync(bin+'pg_ctl',['-D',data,'stop','-m','fast'],{stdio:'pipe'});await rm(root,{recursive:true,force:true});}

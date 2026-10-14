/** Local, reviewed import plans only. Not an HTTP endpoint or an auth bypass.
 * Creates a new project atomically; it never updates existing writing or entries. */
import {z} from 'zod';
import {createHash} from 'node:crypto';
import {canonical} from '../shared/draft';
import {insertStoryBibleEntrySchema,insertProjectSchema} from '../shared/schema';
import {BIBLE_TYPES} from '../shared/bible-catalog';
import {relationshipInput} from '../shared/relationships';
import {createBibleEntry} from '../server/story-bible';
import {createRelationship} from '../server/relationships';
import {previewBibleDocument} from '../shared/bible-contract';
import type {IStorage} from '../server/storage';
import {pathToFileURL} from 'node:url';
const sourceId=z.string().regex(/^[a-f0-9]{32}$/);
export const importPlanSchema=z.object({
 version:z.literal(1),requestId:z.string().uuid(),sourceArchiveSha256:z.string().regex(/^[a-f0-9]{64}$/),
 project:insertProjectSchema.omit({userId:true}),
 entries:z.array(z.object({sourceId,data:insertStoryBibleEntrySchema.omit({projectId:true}).extend({entryType:z.enum(BIBLE_TYPES)})})).min(1),
 relationships:z.array(relationshipInput.omit({sourceId:true,targetId:true}).extend({source:sourceId,target:sourceId,sourceProperties:z.array(z.string())})),
 assets:z.array(z.object({filename:z.string(),sourcePath:z.string(),sha256:z.string().regex(/^[a-f0-9]{64}$/)})),
 retainedReferences:z.array(z.record(z.unknown())).default([]),
});
export type WorldBiblePlan=z.infer<typeof importPlanSchema>;
export type ImportResult={projectId:number;entries:Record<string,number>;entryCount:number;relationshipCount:number;sourceArchiveSha256:string};
export async function importWorldBible(storage:IStorage,owner:number,input:unknown,beforeCommit?:(projectId:number,plan:WorldBiblePlan)=>Promise<void>):Promise<ImportResult> {
 const plan=importPlanSchema.parse(input),hash=createHash('sha256').update(canonical(plan)).digest('hex');
 const ids=new Set(plan.entries.map(e=>e.sourceId));
 if(ids.size!==plan.entries.length)throw new Error('Duplicate source IDs in import plan.');
 for(const link of plan.relationships)if(!ids.has(link.source)||!ids.has(link.target))throw new Error('Unresolved relationship target in import plan.');
 for(const entry of plan.entries){
  const source=(entry.data.metadata as any)?._notionImport;
  if(source?.sourceId!==entry.sourceId || source.archiveSha256!==plan.sourceArchiveSha256 || createHash('sha256').update(source.originalMarkdown).digest('hex')!==source.originalSha256)throw new Error('Original source checksum mismatch.');
 }
 return storage.withCreationTransaction(-owner,async scoped=>{
  if(!await scoped.getUser(owner))throw new Error('Choose an existing project owner.');
  const prior=await scoped.getCreationRequest(-owner,plan.requestId);
  if(prior){
   if(prior.kind!=='world-bible-import'||prior.requestHash!==hash)throw new Error('Import request has already been used with different data.');
   const result=prior.result as ImportResult,project=await scoped.getProject(result.projectId);
   if(!project || project.userId!==owner)throw new Error('Previously imported project is unavailable.');
   return result;
  }
  const project=await scoped.createProject({...plan.project,userId:owner});
  const mapped:Record<string,number>={};
  for(const entry of plan.entries){
   const row=await createBibleEntry(scoped,{...entry.data,projectId:project.id});mapped[entry.sourceId]=row.id;
   const preview=previewBibleDocument(row);
   if(preview.issues.length||preview.mappings.some(m=>!m.preserved))throw new Error(`Import validation failed for ${entry.sourceId}: ${preview.issues.join('; ')}`);
   const original=(row.metadata as any)._notionImport;
   if(canonical(original)!==canonical((entry.data.metadata as any)._notionImport))throw new Error('Original import payload changed.');
  }
  for(const [index,link] of plan.relationships.entries()){
   const {source,target,sourceProperties,...values}=link;
   await createRelationship(scoped,project.id,{...values,sourceId:mapped[source],targetId:mapped[target]},`${plan.requestId}:${index}`);
  }
  if(beforeCommit)await beforeCommit(project.id,plan);
  const result={projectId:project.id,entries:mapped,entryCount:plan.entries.length,relationshipCount:plan.relationships.length,sourceArchiveSha256:plan.sourceArchiveSha256};
  await scoped.putCreationRequest({scope:-owner,requestId:plan.requestId,kind:'world-bible-import',requestHash:hash,result,createdAt:new Date()});
  return result;
 });
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
 const [planPath,ownerValue,expectedUsername,sourceRoot,uploadDir,reportPath]=process.argv.slice(2);
 if(!planPath||!ownerValue||!expectedUsername||!sourceRoot||!uploadDir||!reportPath)throw new Error('Usage: import-world-bible.ts plan.json ownerId expectedUsername sourceRoot uploadDir report.json. DATABASE_URL must name the intended local database.');
 const fs=await import('node:fs/promises'),path=await import('node:path'),session=(await import('express-session')).default;
 const {db,pool}=await import('../server/db'),{DatabaseStorage}=await import('../server/database-storage'),{imageType,safeImageName}=await import('../server/upload-access');
 const storage=new DatabaseStorage(db,new session.MemoryStore());
 const made:string[]=[];let committed=false;
 try {
  const owner=Number(ownerValue);if(!Number.isSafeInteger(owner)||owner<1||(await storage.getUser(owner))?.username!==expectedUsername)throw new Error('The selected owner does not match the reviewed account.');
  const input=JSON.parse(await fs.readFile(planPath,'utf8')),root=await fs.realpath(sourceRoot);
  const result=await importWorldBible(storage,owner,input,async(projectId,plan)=>{
   await fs.mkdir(path.join(uploadDir,'.access'),{recursive:true,mode:0o700});
   for(const asset of plan.assets){
    const source=await fs.realpath(asset.sourcePath);if(!source.startsWith(root+path.sep)||!safeImageName(asset.filename))throw new Error('Unsafe import asset path.');
    const bytes=await fs.readFile(source);if(!imageType(bytes)||bytes.length>5*1024*1024||createHash('sha256').update(bytes).digest('hex')!==asset.sha256)throw new Error('Image validation failed.');
    const access=path.join(uploadDir,'.access',asset.filename+'.json'),target=path.join(uploadDir,asset.filename);
    await fs.writeFile(access,JSON.stringify({version:1,projectIds:[projectId]}),{flag:'wx',mode:0o600});made.push(access);
    await fs.writeFile(target,bytes,{flag:'wx',mode:0o600});made.push(target);
   }
  });
  committed=true;await fs.writeFile(reportPath,JSON.stringify(result,null,2),{mode:0o600});console.log(JSON.stringify(result));
 }catch(error){for(const file of (committed ? [] : made.reverse()))await fs.unlink(file).catch(()=>{});throw error;}finally{await pool.end();}
}

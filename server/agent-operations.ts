import { createHash } from "node:crypto";
import type { IStorage } from "./storage";
import { canonical } from "@shared/draft";
import { legacyClassification, previewBibleDocument } from "@shared/bible-contract";
import { insertStoryBibleEntrySchema } from "@shared/schema";
import { createBibleEntry, updateBibleEntry } from "./story-bible";
import { createSceneSafely } from "./planning";
import { validateWritingLinks } from "./writing-links";

export function agentFail(status: number, code: string, message: string): never { throw Object.assign(new Error(message), { status, code }); }
const conflict = () => agentFail(409, "REVISION_CONFLICT", "This record changed. Read its current revision and review your changes before retrying.");
function page<T extends { id: number }>(rows: T[], a: any) {
  const remaining = rows.filter(row => row.id > a.afterId).sort((a,b) => a.id-b.id), items = remaining.slice(0,a.limit);
  return { items, nextAfterId: remaining.length > a.limit ? items.at(-1)!.id : null };
}
function record<T extends { projectId: number }>(row: T | undefined, projectId: number): T {
  if (!row || row.projectId !== projectId) agentFail(404,"RECORD_UNAVAILABLE","Record unavailable in this project.");
  return row;
}
function patch(a: any, row: { revision: number }) {
  if (!Object.keys(a.patch).length) agentFail(400,"EMPTY_PATCH","Choose at least one field to change.");
  if (a.revision !== row.revision) conflict();
}
// Only a small receipt is persisted. No copy of manuscript content in the receipt.
async function creation(storage: IStorage, owner: number, name: string, a: any, create: (s: IStorage) => Promise<{ id: number; revision: number }>) {
  return storage.withCreationTransaction(-owner, async s => {
    const requestHash = createHash("sha256").update(canonical({name,arguments:a})).digest("hex");
    const prior = await s.getCreationRequest(-owner,a.requestId);
    if (prior) {
      if (prior.kind !== name || prior.requestHash !== requestHash) agentFail(409,"REQUEST_REUSED","This request ID was already used with different arguments.");
      return { ...(prior.result as object), replayed: true };
    }
    const row = await create(s), receipt = { id:row.id, revision:row.revision, projectId:a.projectId };
    await s.putCreationRequest({scope:-owner,requestId:a.requestId,kind:name,requestHash,result:receipt,createdAt:new Date()});
    return receipt;
  });
}
export async function runAgentOperation(storage: IStorage, owner: number, name: string, a: any) {
  if (name === "qq_list_projects") {
    const access = await storage.getAgentAccess(owner);
    return page((await storage.getUserProjects(owner)).filter(p => !p.isTrashed && (access.allProjects || access.projectIds.includes(p.id)))
      .map(({id,title,isArchived})=>({id,title,isArchived})),a);
  }
  const p = a.projectId;
  switch(name) {
    case "qq_get_project": { const row = (await storage.getProject(p))!; return {id:row.id,title:row.title,description:row.description,isArchived:row.isArchived}; }
    case "qq_list_outline": return page((await storage.getProjectOutline(p)).map(({content:_,...row})=>row),a);
    case "qq_get_outline_item": return record(await storage.getOutlineItem(a.itemId),p);
    case "qq_list_story_bible": return page((await storage.getProjectStoryBible(p)).map(row=>{
      const c=legacyClassification(row);return {id:row.id,revision:row.revision,title:row.title,entryType:row.entryType,archived:c.archived,
        category:typeof c.category==='string'?c.category:null,subcategory:typeof c.subcategory==='string'?c.subcategory:null,tags:c.tags.filter((v:unknown)=>typeof v==='string')};
    }),a);
    case "qq_get_story_bible_entry": { const row=record(await storage.getStoryBibleEntry(a.entryId),p);return {id:row.id,revision:row.revision,...previewBibleDocument(row)}; }
    case "qq_create_outline_item": return creation(storage,owner,name,a,async s=>{
      if(a.parentId)record(await s.getOutlineItem(a.parentId),p);
      const rows=await s.getProjectOutline(p);
      return s.createOutlineItem({projectId:p,title:a.title,content:a.content,parentId:a.parentId,order:rows.length?Math.max(...rows.map(r=>r.order))+1:0});
    });
    case "qq_update_outline_item": { const row=record(await storage.getOutlineItem(a.itemId),p);patch(a,row);return await storage.updateOutlineItem(row.id,a.patch,{revision:a.revision}) || conflict(); }
    case "qq_create_story_bible_entry": return creation(storage,owner,name,a,s=>createBibleEntry(s,insertStoryBibleEntrySchema.parse({projectId:p,...a.entry})));
    case "qq_update_story_bible_entry": { const row=record(await storage.getStoryBibleEntry(a.entryId),p);patch(a,row);return await updateBibleEntry(storage,row.id,a.patch,{revision:a.revision}) || conflict(); }
    case "qq_list_chapters": return page((await storage.getProjectChapters(p)).map(({id,title,revision,order,writingMode})=>({id,title,revision,order,writingMode})),a);
    case "qq_get_chapter": return record(await storage.getChapter(a.chapterId),p);
    case "qq_create_chapter": return creation(storage,owner,name,a,s=>s.withProjectLock(p,async scoped=>{
      if(a.writingMode==='scenes'&&a.content)agentFail(409,"CHAPTER_PROSE_PROTECTED","Scene-mode chapters keep prose in their scenes.");
      await validateWritingLinks(scoped,p,a.content);
      const rows=await scoped.getProjectChapters(p);
      return scoped.createChapter({projectId:p,title:a.title,content:a.content,writingMode:a.writingMode,order:rows.length?Math.max(...rows.map(r=>r.order))+1:0});
    }));
    case "qq_update_chapter": return storage.withProjectLock(p,async s=>{
      const row=record(await s.getChapter(a.chapterId),p);patch(a,row);
      if(row.writingMode==='scenes'&&a.patch.content)agentFail(409,"CHAPTER_PROSE_PROTECTED","Write in the scenes of this chapter.");
      await validateWritingLinks(s,p,a.patch.content,row.content);
      return await s.updateChapter(row.id,a.patch,{revision:a.revision}) || conflict();
    });
    case "qq_list_scenes": return page((await storage.getProjectScenes(p)).map(({id,title,revision,order,chapterId})=>({id,title,revision,order,chapterId})),a);
    case "qq_get_scene": return record(await storage.getScene(a.sceneId),p);
    case "qq_create_scene": {
      const {projectId:_,...body}=a;
      const row=await createSceneSafely(storage,p,body);return {id:row.id,revision:row.revision,projectId:p};
    }
    case "qq_update_scene": return storage.withProjectLock(p,async s=>{
      const row=record(await s.getScene(a.sceneId),p);patch(a,row);await validateWritingLinks(s,p,a.patch.content,row.content);
      return await s.updateScene(row.id,a.patch,{revision:a.revision}) || conflict();
    });
    default: agentFail(400,"UNKNOWN_TOOL","Unknown tool.");
  }
}

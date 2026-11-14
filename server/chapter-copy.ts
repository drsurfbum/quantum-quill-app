import { createHash, randomUUID } from "node:crypto";
import { canonical } from "@shared/draft";
import { chapterCopyRequest, type ChapterCopyResult } from "@shared/chapter-copy";
import { sceneBeatsSchema } from "@shared/planning";
import { sceneLinksSchema, SCENE_ROLES } from "@shared/scene-context";
import { legacyClassification } from "@shared/bible-contract";
import { validateWritingLinks } from "./writing-links";
import type { IStorage } from "./storage";

const hash = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
function fail(message: string, code = "CHAPTER_COPY_CHANGED"): never { throw Object.assign(new Error(message), { status: 409, code }); }
async function source(storage: IStorage, projectId: number, chapterId: number) {
  const chapters = (await storage.getProjectChapters(projectId)).sort((a,b) => a.order-b.order || a.id-b.id);
  const chapter = chapters.find(c => c.id === chapterId);
  if (!chapter) fail("The original chapter is no longer available.", "CHAPTER_COPY_UNAVAILABLE");
  const allScenes = await storage.getProjectScenes(projectId);
  const scenes = allScenes.filter(s => s.chapterId === chapterId).sort((a,b) => a.order-b.order || a.id-b.id);
  if ((chapter.writingMode === "chapter" && scenes.length) || (chapter.writingMode === "scenes" && chapter.content)) {
    fail("This chapter contains mixed chapter and scene prose. Resolve its writing mode before duplicating; nothing was copied.", "CHAPTER_COPY_MIXED_MODE");
  }
  const contexts = await Promise.all(scenes.map(s => storage.getSceneContext(s.id)));
  const snapshot = hash({ chapter, scenes, contexts, order: chapters.map(c => [c.id,c.order,c.writingMode]), sceneOrder: allScenes.map(s => [s.id,s.chapterId,s.order]) });
  return { chapter, chapters, scenes, contexts, snapshot };
}
/** The caller supplies an authenticated, owned project; reads never mutate writing. */
export async function chapterCopySource(storage: IStorage, projectId: number, chapterId: number) {
  return storage.withProjectLock(projectId, async scoped => ({snapshot:(await source(scoped,projectId,chapterId)).snapshot}));
}
export async function duplicateChapter(storage: IStorage, projectId: number, chapterId: number, body: unknown): Promise<ChapterCopyResult> {
  const input = chapterCopyRequest.parse(body), requestHash = hash({chapterId,...input});
  return storage.withCreationTransaction(projectId, async scoped => {
    const prior = await scoped.getCreationRequest(projectId,input.requestId);
    if (prior) {
      if (prior.kind !== "duplicate-chapter" || prior.requestHash !== requestHash) fail("This copy request was already used for different details.","REQUEST_REUSED");
      const result = prior.result as ChapterCopyResult, copy = await scoped.getChapter(result.chapterId);
      if (!copy || copy.projectId !== projectId) fail("The copy from this request is no longer available. Review the manuscript before starting another copy.","CREATED_RESULT_MISSING");
      return result;
    }
    const current = await source(scoped,projectId,chapterId);
    if (input.snapshot !== current.snapshot) fail("The chapter, its scenes, or manuscript order changed. Review the latest writing and try Duplicate Chapter again; nothing was copied.");
    const {chapter,chapters,scenes,contexts} = current;
    // Validate all references before inserting. Never silently discard unavailable links.
    await validateWritingLinks(scoped,projectId,chapter.content);
    for (const [i,scene] of scenes.entries()) {
      await validateWritingLinks(scoped,projectId,scene.content);
      sceneBeatsSchema.parse(scene.storyBeats);
      const context = contexts[i];
      if (context && context.projectId !== projectId) fail("This scene has an invalid reference scope. Repair it before duplicating.","CHAPTER_COPY_REFERENCES");
      for (const link of sceneLinksSchema.parse(context?.links || [])) {
        const entry = await scoped.getStoryBibleEntry(link.entryId);
        if (!entry || entry.projectId !== projectId || !(SCENE_ROLES[link.role].types as readonly string[]).includes(entry.entryType) || legacyClassification(entry).archived) {
          fail("A scene reference is unavailable, archived, or no longer valid for its role. Review the original scene’s references before duplicating; nothing was copied.","CHAPTER_COPY_REFERENCES");
        }
      }
    }
    const titles = new Set(chapters.map(c => c.title.toLocaleLowerCase()));
    let title = "", suffix = 1;
    do { const ending = suffix === 1 ? " (copy)" : ` (copy ${suffix})`; title = chapter.title.slice(0,500-ending.length)+ending; suffix++; } while (titles.has(title.toLocaleLowerCase()));
    const copy = await scoped.createChapter({projectId,title,writingMode:chapter.writingMode,content:chapter.content,order:chapter.order+1,isDraft:true});
    let firstSceneId: number | null = null;
    for (const [i,scene] of scenes.entries()) {
      const created = await scoped.createScene({projectId,chapterId:copy.id,title:scene.title,summary:scene.summary,content:scene.content,order:scene.order,
        linkedSectionId:null,storyBeats:scene.storyBeats.map(beat => ({id:randomUUID(),text:beat.text}))});
      firstSceneId ??= created.id;
      if (contexts[i]) await scoped.putSceneContext({sceneId:created.id,projectId,revision:0,links:contexts[i]!.links.map(link => ({...link}))});
    }
    const order = chapters.map(c => ({id:c.id,sceneIds:[] as number[]}));
    order.splice(order.findIndex(c => c.id === chapterId)+1,0,{id:copy.id,sceneIds:[]});
    // Same structural operation as Organize: existing prose/revisions are untouched.
    await scoped.applyManuscriptOrder(projectId,order);
    const result = {chapterId:copy.id,firstSceneId,title};
    await scoped.putCreationRequest({scope:projectId,requestId:input.requestId,kind:"duplicate-chapter",requestHash,result,createdAt:new Date()});
    return result;
  });
}

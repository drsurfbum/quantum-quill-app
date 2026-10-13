import { sceneContextPatch, SCENE_ROLES, type SceneContext, type SceneUse } from "@shared/scene-context";
import { legacyClassification } from "@shared/bible-contract";
import { matchesBase } from "@shared/draft";
import type { IStorage } from "./storage";
import type { Scene } from "@shared/schema";
function fail(status: number, message: string, code = "INVALID_SCENE_CONTEXT"): never { throw Object.assign(new Error(message), {status, code}); }

/** A missing row is an empty revision-0 document. Reads never insert or rewrite a scene. */
export async function readSceneContext(storage: IStorage, scene: Scene): Promise<SceneContext> {
  const row = await storage.getSceneContext(scene.id);
  return {id:scene.id, sceneId:scene.id, projectId:scene.projectId, title:`Story Bible · ${scene.title}`, revision:row?.revision || 0, links:row?.links || []};
}
export async function saveSceneContext(storage: IStorage, scene: Scene, patch: unknown, base: Record<string,unknown>) {
  const data = sceneContextPatch.parse(patch);
  return storage.withProjectLock(scene.projectId, async scoped => {
    const latestScene = await scoped.getScene(scene.id);
    if (!latestScene || latestScene.projectId !== scene.projectId) fail(404,"Scene no longer available.");
    const current = await readSceneContext(scoped, latestScene);
    if (!matchesBase(current, base)) fail(409,"This scene’s Story Bible connections changed elsewhere. Review both versions before restoring your draft.","REVISION_CONFLICT");
    for (const link of data.links) {
      const target = await scoped.getStoryBibleEntry(link.entryId);
      if (!target || target.projectId !== scene.projectId) fail(400,"Choose a Story Bible entry in this project.");
      if (!(SCENE_ROLES[link.role].types as readonly string[]).includes(target.entryType)) fail(400,`${SCENE_ROLES[link.role].label} requires ${link.role === "location" ? "a location" : "a character"}.`);
      if (legacyClassification(target).archived && !current.links.some(old => old.entryId === link.entryId && old.role === link.role)) fail(400,"Restore the archived entry before adding it to a scene.");
    }
    const row = await scoped.putSceneContext({sceneId:scene.id, projectId:scene.projectId, revision:current.revision + 1, links:data.links});
    return {...current, ...row};
  });
}
export async function sceneUses(storage: IStorage, projectId: number, entryId: number): Promise<SceneUse[]> {
  const contexts = await storage.getProjectSceneContexts(projectId);
  const chapters = await storage.getProjectChapters(projectId), scenes = await storage.getProjectScenes(projectId);
  return chapters.sort((a,b)=>a.order-b.order || a.id-b.id).flatMap(chapter => scenes.filter(scene=>scene.chapterId===chapter.id).sort((a,b)=>a.order-b.order || a.id-b.id).flatMap(scene => {
    const links = contexts.find(row=>row.sceneId===scene.id)?.links.filter(link=>link.entryId===entryId) || [];
    return links.length ? [{sceneId:scene.id, chapterId:chapter.id, sceneTitle:scene.title, chapterTitle:chapter.title, links}] : [];
  }));
}

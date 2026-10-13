import { createHash } from "node:crypto";
import { manuscriptOrderSchema, type ManuscriptStructure } from "@shared/manuscript";
import type { IStorage } from "./storage";
function fail(message: string, status = 400): never { throw Object.assign(new Error(message), { status, code: status === 409 ? "MANUSCRIPT_CHANGED" : "INVALID_MANUSCRIPT_ORDER" }); }
export async function manuscriptStructure(storage: IStorage, projectId: number): Promise<ManuscriptStructure> {
  const chapters = (await storage.getProjectChapters(projectId)).sort((a,b) => a.order-b.order || a.id-b.id);
  const scenes = (await storage.getProjectScenes(projectId)).sort((a,b) => a.order-b.order || a.id-b.id);
  const snapshot = createHash("sha256").update(JSON.stringify({ chapters: chapters.map(c => [c.id,c.order,c.writingMode]), scenes: scenes.map(s => [s.id,s.chapterId,s.order]) })).digest("hex");
  return { snapshot, chapters: chapters.map(c => ({ id: c.id, title: c.title, writingMode: c.writingMode, scenes: scenes.filter(s => s.chapterId === c.id).map(s => ({ id:s.id, title:s.title })) })) };
}
export async function organizeManuscript(storage: IStorage, projectId: number, body: unknown) {
  const input = manuscriptOrderSchema.parse(body);
  return storage.withProjectLock(projectId, async scoped => {
    const current = await manuscriptStructure(scoped, projectId);
    const sameSet = (a: number[], b: number[]) => a.length === b.length && new Set(a).size === a.length && [...a].sort((x,y)=>x-y).every((id,i) => id === [...b].sort((x,y)=>x-y)[i]);
    if (!sameSet(input.chapters.map(c=>c.id), current.chapters.map(c=>c.id)) || !sameSet(input.chapters.flatMap(c=>c.sceneIds), current.chapters.flatMap(c=>c.scenes.map(s=>s.id)))) fail("Include every chapter and scene exactly once from this project.");
    if (input.chapters.some(c => c.sceneIds.length && current.chapters.find(x=>x.id===c.id)?.writingMode !== "scenes")) fail("Move scenes into a scene chapter. Existing chapter prose is kept intact.");
    // A repeat after an uncertain network response is harmless if the requested order is already current.
    const desired = JSON.stringify(input.chapters), actual = JSON.stringify(current.chapters.map(c=>({ id:c.id, sceneIds:c.scenes.map(s=>s.id) })));
    if (desired === actual) return current;
    if (input.snapshot !== current.snapshot) fail("The manuscript order changed in another tab. Reload the organization view before applying your changes.",409);
    await scoped.applyManuscriptOrder(projectId,input.chapters);
    return manuscriptStructure(scoped,projectId);
  });
}

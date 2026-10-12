import { createHash } from "node:crypto";
import { canonical } from "@shared/draft";
import { blueprintSchema, newProjectSchema, sceneCreateSchema, type BlueprintSource, type BlueprintResult } from "@shared/planning";
import type { IStorage } from "./storage";

function fail(status: number, message: string, code = "INVALID_PLAN"): never { throw Object.assign(new Error(message), { status, code }); }
const hash = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
async function creation<T>(storage: IStorage, scope: number, kind: string, input: { requestId: string }, work: (scoped: IStorage) => Promise<T>): Promise<T> {
  return storage.withCreationTransaction(scope, async scoped => {
    const requestHash = hash(input), prior = await scoped.getCreationRequest(scope, input.requestId);
    if (prior) {
      if (prior.kind !== kind || prior.requestHash !== requestHash) fail(409, "This creation request already completed with different details. Review the created result before starting another.", "REQUEST_REUSED");
      return prior.result as T;
    }
    const result = await work(scoped);
    await scoped.putCreationRequest({ scope, requestId: input.requestId, kind, requestHash, result, createdAt: new Date() });
    return result;
  });
}
export async function createProjectFromWizard(storage: IStorage, owner: number, body: unknown) {
  const input = newProjectSchema.parse(body);
  const result = await creation(storage, -owner, "project", input, async scoped => {
    const { requestId: _, ...data } = input;
    const project = await scoped.createProject({ ...data, userId: owner });
    return { projectId: project.id };
  });
  const project = await storage.getProject(result.projectId);
  if (!project || project.userId !== owner) fail(409, "The project from this request is no longer available.", "CREATED_RESULT_MISSING");
  return project;
}
export async function createSceneSafely(storage: IStorage, projectId: number, body: unknown) {
  const input = sceneCreateSchema.parse(body);
  const result = await creation(storage, projectId, "scene", input, async scoped => {
    const chapter = await scoped.getChapter(input.chapterId);
    if (!chapter || chapter.projectId !== projectId) fail(400, "Choose a chapter in this project.");
    if (chapter.writingMode !== "scenes") fail(409, "This chapter holds existing chapter text. Create a scene chapter to keep that writing intact.", "CHAPTER_PROSE_PROTECTED");
    if (input.linkedSectionId) {
      const section = await scoped.getPlotStructureSection(input.linkedSectionId);
      const structure = section && await scoped.getPlotStructure(section.plotStructureId);
      if (!structure || structure.projectId !== projectId) fail(400, "The plot beat must belong to this project.");
    }
    const siblings = (await scoped.getProjectScenes(projectId)).filter(s => s.chapterId === chapter.id);
    const scene = await scoped.createScene({ projectId, chapterId: chapter.id, title: input.title, summary: input.summary, linkedSectionId: input.linkedSectionId,
      order: siblings.length ? Math.max(...siblings.map(s => s.order)) + 1 : 0 });
    return { sceneId: scene.id };
  });
  const scene = await storage.getScene(result.sceneId);
  if (!scene || scene.projectId !== projectId) fail(409, "The scene from this request is no longer available.", "CREATED_RESULT_MISSING");
  return scene;
}
export async function blueprintSource(storage: IStorage, projectId: number, structureId: number): Promise<BlueprintSource> {
  const structure = await storage.getPlotStructure(structureId);
  if (!structure || structure.projectId !== projectId) fail(404, "Choose a plot structure in this project.");
  const sections = await storage.getPlotStructureSections(structure.id);
  const chapters = await storage.getProjectChapters(projectId);
  const template = await storage.getPlotStructureTemplate(structure.templateId);
  let guidance: any = template?.sections;
  if (typeof guidance === "string") { try { guidance = JSON.parse(guidance); } catch { guidance = []; } }
  return {
    structure: { id: structure.id, name: structure.name, revision: structure.revision },
    sections: sections.map(s => ({ id: s.id, title: s.title, content: s.content, revision: s.revision,
      guidance: Array.isArray(guidance) ? String(guidance.find(g => g.key === s.sectionKey || g.sectionKey === s.sectionKey)?.description || "") : "" })),
    chapters: chapters.map(c => ({ id: c.id, title: c.title, order: c.order, revision: c.revision })),
    snapshot: hash({ structure: [structure.id, structure.revision], sections: sections.map(s => [s.id,s.revision,s.order]), chapters: chapters.map(c => [c.id,c.revision,c.order]) }),
  };
}
export async function buildBlueprint(storage: IStorage, projectId: number, body: unknown): Promise<BlueprintResult> {
  const input = blueprintSchema.parse(body);
  return creation(storage, projectId, "blueprint", input, async scoped => {
    const source = await blueprintSource(scoped, projectId, input.structureId);
    if (source.snapshot !== input.snapshot) fail(409, "Your plot or chapters changed after this preview. Review the latest source before building; your scene plan is kept.", "BLUEPRINT_STALE");
    const sectionIds = new Set(source.sections.map(s => s.id));
    for (const chapter of input.chapters) for (const scene of chapter.scenes) {
      if (!sectionIds.has(scene.sectionId)) fail(400, "Every scene must reference a beat from this plot structure.");
    }
    const titles = new Set(source.chapters.map(c => c.title.trim().toLocaleLowerCase()));
    for (const chapter of input.chapters) {
      const normalized = chapter.title.toLocaleLowerCase();
      if (titles.has(normalized)) fail(409, `A chapter named “${chapter.title}” already exists in this plan or project. Choose a distinct title.`, "CHAPTER_TITLE_EXISTS");
      titles.add(normalized);
    }
    const result: BlueprintResult = { projectId, chapterIds: [], sceneIds: [] };
    let order = source.chapters.length ? Math.max(...source.chapters.map(c => c.order)) + 1 : 0;
    for (const plan of input.chapters) {
      const chapter = await scoped.createChapter({ projectId, title: plan.title, writingMode: "scenes", content: "", order: order++, isDraft: true });
      result.chapterIds.push(chapter.id);
      for (let index = 0; index < plan.scenes.length; index++) {
        const scene = plan.scenes[index];
        const created = await scoped.createScene({ projectId, chapterId: chapter.id, title: scene.title, summary: scene.summary, linkedSectionId: scene.sectionId, order: index });
        result.sceneIds.push(created.id);
      }
    }
    return result;
  });
}

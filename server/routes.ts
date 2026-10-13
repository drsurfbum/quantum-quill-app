import { readSceneContext, saveSceneContext, sceneUses } from "./scene-context";
import { imageType, safeImageName, readProjectImage, userCanReadImage } from "./upload-access";
import { manuscriptStructure, organizeManuscript } from "./manuscript";
import { collectExport, exportOptions, renderExport } from "./export";
import { createProjectFromWizard, createSceneSafely, blueprintSource, buildBlueprint } from "./planning";
import { scenePatchSchema } from "@shared/planning";
import { relationshipInput } from "@shared/relationships";
import { createRelationship, changeRelationship, projectRelationships } from "./relationships";
import { BIBLE_TYPES } from "@shared/bible-catalog";
import { previewBibleDocument } from "@shared/bible-contract";
import { saveWritingStyleSchema } from "@shared/writing-styles";
import { createBibleEntry, updateBibleEntry, deleteBibleEntry } from "./story-bible";
import express, { type Express, type Request, type RequestHandler } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import type { IStorage } from "./storage";
import {
  type Chapter, type Whiteboard, type OutlineItem, type StoryBibleEntry, type PlotStructure,
  insertProjectSchema, insertChapterSchema, insertWhiteboardSchema,
  insertOutlineItemSchema, insertStoryBibleEntrySchema, insertPlotStructureSchema,
  insertPlotStructureSectionSchema,
} from "@shared/schema";
import { z } from "zod";
import { requireUser } from "./auth";

function fail(status: number, message: string, code?: string): never { throw Object.assign(new Error(message), { status, code }); }
const idSchema = z.number().int().positive().max(2147483647);
function routeId(value: string) { if (!/^\d+$/.test(value)) fail(400, "Invalid ID"); return idSchema.parse(Number(value)); }
const title = z.string().trim().min(1).max(500);
const handler = (fn: (req: Request, res: express.Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => { Promise.resolve(fn(req, res)).catch(next); };

// Every writing update must name the version the writer actually loaded.
// Field bases remain an additional check, never a substitute for a revision.
function draftBody(body: unknown) {
  const { _base, _revision, ...patch } = z.record(z.unknown()).parse(body);
  const revision = _revision === undefined ? undefined : z.number().int().min(0).max(2147483647).parse(_revision);
  let base: Record<string, unknown> | undefined;
  if (_base !== undefined) {
    base = z.record(z.unknown()).parse(_base);
    const fields = Object.keys(patch).sort();
    if (!fields.length || JSON.stringify(fields) !== JSON.stringify(Object.keys(base).sort())) fail(400, "Draft base must cover every changed field");
  }
  return { patch, base, revision };
}
function checkedBase(base: Record<string, unknown> | undefined, revision: number | undefined) {
  if (revision === undefined) fail(428, "Reload this record before saving. A server revision is required; your local draft is kept.", "REVISION_REQUIRED");
  return { ...base, revision };
}

type Child = { id: number; projectId: number };
type Resource<T extends Child, C> = {
  route: string; listRoute: string; schema: z.ZodType<C>;
  updateSchema: z.ZodType<Partial<T>>;
  get: (id: number) => Promise<T | undefined>;
  list: (projectId: number) => Promise<T[]>;
  create: (data: C) => Promise<T>;
  update: (id: number, data: Partial<T>, base?: Record<string, unknown>) => Promise<T | undefined>;
  remove: (id: number) => Promise<boolean>;
  validate?: (data: C | Partial<T>, projectId: number, id?: number) => Promise<void>;
  beforeDelete?: (item: T) => Promise<void>;
  lockWrites?: boolean;
};

export function registerRoutes(app: Express, storage: IStorage, directory = path.join(process.cwd(), "uploads")) {
  app.use("/api", requireUser);
  const projectFor = async (req: Request, id: number) => {
    const project = await storage.getProject(id);
    if (!project) fail(404, "Project not found");
    if (project.userId !== req.user!.id) fail(403, "Forbidden");
    return project;
  };
  const structureFor = async (req: Request, id: number) => {
    const structure = await storage.getPlotStructure(id);
    if (!structure) fail(404, "Plot structure not found");
    await projectFor(req, structure.projectId);
    return structure;
  };

  app.get("/api/projects/:projectId/manuscript", handler(async (req,res) => {
    const project = await projectFor(req,routeId(req.params.projectId));
    res.json(await storage.withReadSnapshot(scoped => manuscriptStructure(scoped,project.id)));
  }));
  app.put("/api/projects/:projectId/manuscript", handler(async (req,res) => {
    const project = await projectFor(req,routeId(req.params.projectId));
    res.json(await organizeManuscript(storage,project.id,req.body));
  }));
  app.post("/api/projects/:projectId/export", handler(async (req, res) => {
    const project = await projectFor(req, routeId(req.params.projectId));
    const options = exportOptions.parse(req.body);
    const data = await storage.withReadSnapshot(scoped => collectExport(scoped, project, options, async url => {
      const match = /^\/uploads\/([^/?#]+)$/.exec(url);
      if (!match) return undefined;
      const image = await readProjectImage(directory, match[1], project.id);
      return image ? `data:${image.mime};base64,${image.bytes.toString("base64")}` : undefined;
    }));
    const output = await renderExport(data, options);
    const name = project.title.replace(/[^a-zA-Z0-9 _-]/g, "").trim().slice(0,100) || "Quantum Quill";
    res.setHeader("Content-Disposition", `attachment; filename="${name}.${options.format}"`);
    res.type(output.type).send(output.body);
  }));

  app.get("/api/writing-styles", handler(async (req, res) => res.json(await storage.getWritingStyles(req.user!.id))));
  app.post("/api/writing-styles", handler(async (req, res) => {
    res.json(await storage.saveWritingStyle(req.user!.id, saveWritingStyleSchema.parse(req.body)));
  }));
  app.delete("/api/writing-styles/:id", handler(async (req, res) => {
    if (!await storage.deleteWritingStyle(req.user!.id, routeId(req.params.id))) fail(404, "Style not found");
    res.status(204).end();
  }));

  // All project child operations go through the same ownership check.
  function resource<T extends Child, C extends { projectId: number }>(configure: Resource<T, C> | ((scoped: IStorage) => Resource<T, C>)) {
    const using = (scoped: IStorage) => typeof configure === "function" ? configure(scoped) : configure;
    const config = using(storage);
    const owned = async (req: Request) => {
      const item = await config.get(routeId(req.params.id));
      if (!item) fail(404, "Not found");
      await projectFor(req, item.projectId);
      return item;
    };
    app.get(`/api/projects/:projectId/${config.listRoute}`, handler(async (req, res) => {
      const projectId = routeId(req.params.projectId);
      await projectFor(req, projectId);
      res.json(await config.list(projectId));
    }));
    app.get(`/api/${config.route}/:id`, handler(async (req, res) => res.json(await owned(req))));
    app.post(`/api/${config.route}`, handler(async (req, res) => {
      const data = config.schema.parse(req.body);
      await projectFor(req, data.projectId);
      const create = async (scoped = storage) => { const config = using(scoped); await config.validate?.(data, data.projectId); return config.create(data); };
      res.status(201).json(await (config.lockWrites ? storage.withProjectLock(data.projectId, create) : create()));
    }));
    app.put(`/api/${config.route}/:id`, handler(async (req, res) => {
      const item = await owned(req);
      const { patch, base, revision } = draftBody(req.body);
      const data = config.updateSchema.parse(patch);
      const update = async (scoped = storage) => { const config = using(scoped); await config.validate?.(data, item.projectId, item.id); return config.update(item.id, data, checkedBase(base, revision)); };
      const result = await (config.lockWrites ? storage.withProjectLock(item.projectId, update) : update());
      if (!result) fail(409, "This record changed elsewhere. Review both versions before restoring your draft.", "REVISION_CONFLICT");
      res.json(result);
    }));
    app.delete(`/api/${config.route}/:id`, handler(async (req, res) => {
      const item = await owned(req);
      const remove = async (scoped = storage) => {
        const config = using(scoped); await config.beforeDelete?.(item);
        if (config.route === "chapters") {
          const {_revision} = z.object({_revision:z.number().int().nonnegative().optional()}).strict().parse(req.body || {});
          if (_revision === undefined) fail(428,"Review the current chapter before deleting it.","REVISION_REQUIRED");
          const current = await config.get(item.id) as (T & {revision:number}) | undefined;
          if (!current || current.revision !== _revision) fail(409,"This chapter changed after you opened the deletion dialog. Review it again; nothing was deleted.","REVISION_CONFLICT");
        }
        await config.remove(item.id);
      };
      if (config.lockWrites) await storage.withProjectLock(item.projectId, remove); else await remove();
      res.status(204).end();
    }));
  }

  // Reject cross-project links and cycles without changing historical data.
  async function validateParent(
    parentId: number | null | undefined, projectId: number, id: number | undefined,
    get: (id: number) => Promise<(Child & { parentId: number | null }) | undefined>,
  ) {
    const seen = new Set<number>(id === undefined ? [] : [id]);
    let current = parentId;
    while (current != null) {
      idSchema.parse(current);
      if (seen.has(current)) fail(400, "Parent would create a cycle");
      seen.add(current);
      const parent = await get(current);
      if (!parent || parent.projectId !== projectId) fail(400, "Parent must belong to this project");
      current = parent.parentId;
    }
  }

  app.post("/api/project-setup", handler(async (req, res) => {
    res.status(201).json(await createProjectFromWizard(storage, req.user!.id, req.body));
  }));
  app.get("/api/projects/:projectId/scenes", handler(async (req, res) => {
    const projectId = routeId(req.params.projectId); await projectFor(req, projectId);
    res.json(await storage.getProjectScenes(projectId));
  }));
  const sceneFor = async (req: Request) => {
    const scene = await storage.getScene(routeId(req.params.id));
    if (!scene) fail(404, "Scene not found"); await projectFor(req, scene.projectId); return scene;
  };
  app.get("/api/scenes/:id/context", handler(async (req,res) => res.json(await readSceneContext(storage,await sceneFor(req)))));
  app.put("/api/scenes/:id/context", handler(async (req,res) => {
    const scene = await sceneFor(req), {patch,base,revision} = draftBody(req.body);
    res.json(await saveSceneContext(storage,scene,patch,checkedBase(base,revision)));
  }));
  app.get("/api/story-bible/:id/scene-uses", handler(async (req,res) => {
    const entry = await storage.getStoryBibleEntry(routeId(req.params.id));
    if (!entry) fail(404,"Entry not found");
    await projectFor(req,entry.projectId);
    res.json(await storage.withReadSnapshot(scoped=>sceneUses(scoped,entry.projectId,entry.id)));
  }));
  app.get("/api/scenes/:id", handler(async (req, res) => res.json(await sceneFor(req))));
  app.post("/api/projects/:projectId/scenes", handler(async (req, res) => {
    const projectId = routeId(req.params.projectId); await projectFor(req, projectId);
    res.status(201).json(await createSceneSafely(storage, projectId, req.body));
  }));
  app.put("/api/scenes/:id", handler(async (req, res) => {
    const scene = await sceneFor(req), { patch, base, revision } = draftBody(req.body);
    const result = await storage.updateScene(scene.id, scenePatchSchema.parse(patch), checkedBase(base, revision));
    if (!result) fail(409, "This scene changed elsewhere. Review both versions before restoring your draft.", "REVISION_CONFLICT");
    res.json(result);
  }));
  app.get("/api/projects/:projectId/blueprint/:structureId", handler(async (req, res) => {
    const projectId = routeId(req.params.projectId); await projectFor(req, projectId);
    res.json(await storage.withProjectLock(projectId, scoped => blueprintSource(scoped, projectId, routeId(req.params.structureId))));
  }));
  app.post("/api/projects/:projectId/blueprint", handler(async (req, res) => {
    const projectId = routeId(req.params.projectId); await projectFor(req, projectId);
    res.status(201).json(await buildBlueprint(storage, projectId, req.body));
  }));

  const projectCreate = insertProjectSchema.omit({ userId: true, settings: true }).extend({ title }).strict();
  const projectUpdate = projectCreate.partial().extend({ isArchived: z.boolean().optional() }).strict();
  app.get("/api/projects", handler(async (req, res) => res.json(await storage.getUserProjects(req.user!.id))));
  app.get("/api/projects/:id", handler(async (req, res) => res.json(await projectFor(req, routeId(req.params.id)))));
  app.post("/api/projects", handler(async (req, res) => {
    res.status(201).json(await storage.createProject({ ...projectCreate.parse(req.body), userId: req.user!.id }));
  }));
  app.put("/api/projects/:id", handler(async (req, res) => {
    const project = await projectFor(req, routeId(req.params.id));
    res.json(await storage.updateProject(project.id, projectUpdate.parse(req.body)));
  }));
  for (const action of ["trash", "restore"] as const) app.put(`/api/projects/:id/${action}`, handler(async (req, res) => {
    const project = await projectFor(req, routeId(req.params.id));
    res.json(await (action === "trash" ? storage.trashProject(project.id) : storage.restoreProject(project.id)));
  }));
  app.delete("/api/projects/:id", handler(async (req, res) => {
    const project = await projectFor(req, routeId(req.params.id));
    const children = await Promise.all([
      storage.getProjectChapters(project.id), storage.getProjectWhiteboards(project.id),
      storage.getProjectOutline(project.id), storage.getProjectStoryBible(project.id), storage.getProjectPlotStructures(project.id),
    ]);
    if (children.some(items => items.length)) fail(409, "This project contains writing. Move it to trash instead.");
    await storage.deleteProject(project.id);
    res.status(204).end();
  }));

  const chapter = insertChapterSchema.extend({ projectId: idSchema, title, writingMode: z.enum(["chapter", "scenes"]).optional() }).strict();
  resource<Chapter, z.infer<typeof chapter>>(storage => ({ lockWrites: true, route: "chapters", listRoute: "chapters", schema: chapter,
    updateSchema: chapter.omit({ projectId: true, writingMode: true, order: true }).partial().strict(),
    get: storage.getChapter.bind(storage), list: storage.getProjectChapters.bind(storage),
    create: storage.createChapter.bind(storage), update: storage.updateChapter.bind(storage), remove: storage.deleteChapter.bind(storage),
    validate: async (data, projectId, id) => {
      const mode = id ? (await storage.getChapter(id))?.writingMode : data.writingMode;
      if (mode === "scenes" && data.content) fail(409, "Write in the scenes of this chapter. Chapter prose cannot be mixed with scenes.", "CHAPTER_PROSE_PROTECTED");
    },
    beforeDelete: async item => { if ((await storage.getProjectScenes(item.projectId)).some(scene => scene.chapterId === item.id)) fail(409, "This chapter contains scenes. Keep it to preserve their writing.", "CHAPTER_HAS_SCENES"); },
  }));
  const whiteboard = insertWhiteboardSchema.extend({ projectId: idSchema, name: title }).strict();
  resource<Whiteboard, z.infer<typeof whiteboard>>({ route: "whiteboards", listRoute: "whiteboards", schema: whiteboard,
    updateSchema: whiteboard.omit({ projectId: true }).partial().strict(),
    get: storage.getWhiteboard.bind(storage), list: storage.getProjectWhiteboards.bind(storage),
    create: storage.createWhiteboard.bind(storage), update: storage.updateWhiteboard.bind(storage), remove: storage.deleteWhiteboard.bind(storage) });
  const outline = insertOutlineItemSchema.extend({ projectId: idSchema, title, parentId: idSchema.nullable().optional() }).strict();
  resource<OutlineItem, z.infer<typeof outline>>({ route: "outline", listRoute: "outline", schema: outline,
    updateSchema: outline.omit({ projectId: true }).partial().strict(),
    get: storage.getOutlineItem.bind(storage), list: storage.getProjectOutline.bind(storage),
    create: storage.createOutlineItem.bind(storage), update: storage.updateOutlineItem.bind(storage), remove: storage.deleteOutlineItem.bind(storage),
    validate: async (data, projectId, id) => validateParent(data.parentId, projectId, id, storage.getOutlineItem.bind(storage)),
    beforeDelete: async (item) => {
      if ((await storage.getProjectOutline(item.projectId)).some(child => child.parentId === item.id)) fail(409, "Move or remove child outline items first");
    },
  });
  const bible = insertStoryBibleEntrySchema.extend({ projectId: idSchema, title,
    metadata: z.record(z.unknown()).nullable().optional(), relatedEntryIds: z.array(idSchema).nullable().optional(),
  }).strict();
  resource<StoryBibleEntry, z.infer<typeof bible>>({ route: "story-bible", listRoute: "story-bible", schema: bible.extend({ entryType: z.enum(BIBLE_TYPES) }),
    updateSchema: bible.omit({ projectId: true }).partial().strict(),
    get: storage.getStoryBibleEntry.bind(storage), list: storage.getProjectStoryBible.bind(storage),
    create: data => createBibleEntry(storage, data), update: (id, data, base) => updateBibleEntry(storage, id, data, base), remove: id => deleteBibleEntry(storage, id),
  });
  app.get("/api/projects/:projectId/relationships", handler(async (req, res) => {
    const projectId = routeId(req.params.projectId); await projectFor(req, projectId);
    res.json(await projectRelationships(storage, projectId));
  }));
  const linkCreate = relationshipInput.omit({ targetId: true }).extend({ targetId: idSchema.optional(), requestId: z.string().uuid(), stub: z.object({ title, entryType: z.enum(BIBLE_TYPES) }).strict().optional() }).strict()
    .refine(data => !!data.targetId !== !!data.stub, "Choose an existing target or create one stub, not both.");
  app.post("/api/projects/:projectId/relationships", handler(async (req, res) => {
    const projectId = routeId(req.params.projectId); await projectFor(req, projectId);
    const { requestId, stub, ...input } = linkCreate.parse(req.body);
    res.status(201).json(await createRelationship(storage, projectId, input, requestId, stub));
  }));
  app.put("/api/projects/:projectId/relationships/:linkId", handler(async (req, res) => {
    const projectId = routeId(req.params.projectId); await projectFor(req, projectId);
    const { _version, ...input } = relationshipInput.extend({ _version: z.string().min(1).max(100) }).strict().parse(req.body);
    res.json(await changeRelationship(storage, projectId, req.params.linkId, _version, input));
  }));
  app.delete("/api/projects/:projectId/relationships/:linkId", handler(async (req, res) => {
    const projectId = routeId(req.params.projectId); await projectFor(req, projectId);
    const { _version } = z.object({ _version: z.string().min(1).max(100) }).strict().parse(req.body);
    await changeRelationship(storage, projectId, req.params.linkId, _version); res.status(204).end();
  }));
  app.get("/api/story-bible/:id/contract", handler(async (req, res) => {
    const entry = await storage.getStoryBibleEntry(routeId(req.params.id));
    if (!entry) fail(404, "Entry not found");
    await projectFor(req, entry.projectId);
    res.json(previewBibleDocument(entry));
  }));
  app.post("/api/story-bible/:id/conversion-preview", handler(async (req, res) => {
    const { targetType, _revision } = z.object({ targetType: z.enum(BIBLE_TYPES), _revision: z.number().int().nonnegative() }).strict().parse(req.body);
    const entry = await storage.getStoryBibleEntry(routeId(req.params.id));
    if (!entry) fail(404, "Entry not found");
    await projectFor(req, entry.projectId);
    if (entry.revision !== _revision) fail(409, "This entry changed. Reload it before previewing a conversion.", "REVISION_CONFLICT");
    res.json({ ...previewBibleDocument(entry, targetType), sourceRevision: entry.revision, canApply: false,
      notice: "Preview only. The original entry is unchanged. Applying conversions is gated on migration review." });
  }));
  app.get("/api/plot-templates", handler(async (_req, res) => res.json(await storage.getAllPlotStructureTemplates())));
  app.get("/api/plot-templates/:id", handler(async (req, res) => {
    const template = await storage.getPlotStructureTemplate(routeId(req.params.id));
    if (!template) fail(404, "Template not found");
    res.json(template);
  }));
  const plot = insertPlotStructureSchema.extend({ projectId: idSchema, templateId: idSchema, name: title, parentId: idSchema.nullable().optional() }).strict();
  resource<PlotStructure, z.infer<typeof plot>>(storage => ({ lockWrites: true, route: "plot-structures", listRoute: "plot-structures", schema: plot,
    updateSchema: plot.omit({ projectId: true, templateId: true }).partial().strict(),
    get: storage.getPlotStructure.bind(storage), list: storage.getProjectPlotStructures.bind(storage),
    create: storage.createPlotStructure.bind(storage), update: storage.updatePlotStructure.bind(storage), remove: storage.deletePlotStructure.bind(storage),
    validate: async (data, projectId, id) => {
      if ("templateId" in data && data.templateId && !await storage.getPlotStructureTemplate(data.templateId)) fail(400, "Template not found");
      await validateParent(data.parentId, projectId, id, storage.getPlotStructure.bind(storage));
    },
    beforeDelete: async (item) => {
      if ((await storage.getPlotStructureSections(item.id)).length || (await storage.getProjectPlotStructures(item.projectId)).some(child => child.parentId === item.id)) fail(409, "Remove sections and nested structures first");
    },
  }));

  const sectionCreate = insertPlotStructureSectionSchema.extend({ plotStructureId: idSchema, title }).strict();
  const sectionUpdate = sectionCreate.omit({ plotStructureId: true, sectionKey: true }).partial().strict();
  const sectionFor = async (req: Request) => {
    const section = await storage.getPlotStructureSection(routeId(req.params.id));
    if (!section) fail(404, "Section not found");
    await structureFor(req, section.plotStructureId);
    return section;
  };
  app.get("/api/plot-structures/:structureId/sections", handler(async (req, res) => {
    const structure = await structureFor(req, routeId(req.params.structureId));
    res.json(await storage.getPlotStructureSections(structure.id));
  }));
  app.get("/api/plot-structure-sections/:id", handler(async (req, res) => res.json(await sectionFor(req))));
  app.post("/api/plot-structure-sections", handler(async (req, res) => {
    const data = sectionCreate.parse(req.body);
    const structure = await structureFor(req, data.plotStructureId);
    res.status(201).json(await storage.withProjectLock(structure.projectId, scoped => scoped.createPlotStructureSection(data)));
  }));
  app.put("/api/plot-structure-sections/:id", handler(async (req, res) => {
    const section = await sectionFor(req);
    const { patch, base, revision } = draftBody(req.body);
    const data = sectionUpdate.parse(patch);
    const structure = await structureFor(req, section.plotStructureId);
    const result = await storage.withProjectLock(structure.projectId, scoped => scoped.updatePlotStructureSection(section.id, data, checkedBase(base, revision)));
    if (!result) fail(409, "This section changed elsewhere. Review both versions before restoring your draft.", "REVISION_CONFLICT");
    res.json(result);
  }));
  app.delete("/api/plot-structure-sections/:id", handler(async (req, res) => {
    const section = await sectionFor(req);
    const structure = await structureFor(req, section.plotStructureId);
    await storage.withProjectLock(structure.projectId, async scoped => {
      if ((await scoped.getProjectScenes(structure.projectId)).some(scene => scene.linkedSectionId === section.id)) fail(409, "This beat is linked to manuscript scenes and cannot be deleted.", "BEAT_HAS_SCENES");
      await scoped.deletePlotStructureSection(section.id);
    });
    res.status(204).end();
  }));

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0, parts: 1 } });
  app.post("/api/upload", (req,res,next) => {
    Promise.resolve().then(() => projectFor(req, routeId(req.get("X-QQ-Project") || ""))).then(() => next(),next);
  });
  // Validate access before buffering any file. This middleware must call next.
  app.post("/api/upload", upload.single("image"), handler(async (req,res) => {
    const projectId = routeId(req.get("X-QQ-Project") || "");
    await projectFor(req,projectId);
    if (!req.file) fail(400,"Choose an image to upload.");
    const type = imageType(req.file.buffer);
    if (!type || type.mime !== req.file.mimetype) fail(400,"The file contents must be a PNG, JPEG, GIF, or WebP image matching its type.");
    const filename = `${randomUUID()}.${type.ext}`;
    await fs.promises.mkdir(path.join(directory,".access"),{recursive:true,mode:0o700});
    const metadata = path.join(directory,".access",`${filename}.json`);
    await fs.promises.writeFile(metadata,JSON.stringify({version:1,projectIds:[projectId]}),{flag:"wx",mode:0o600});
    try { await fs.promises.writeFile(path.join(directory,filename),req.file.buffer,{flag:"wx",mode:0o600}); }
    catch(error) { await fs.promises.unlink(metadata); throw error; }
    res.json({success:true,url:`/uploads/${filename}`,filename,originalName:req.file.originalname});
  }));
  app.get("/uploads/:filename", requireUser, handler(async (req,res) => {
    const name = req.params.filename;
    if (!safeImageName(name) || !await userCanReadImage(storage,directory,name,req.user!.id)) fail(404,"Image not found");
    const file=await fs.promises.readFile(path.join(directory,name)).catch(()=>undefined);
    const type=file && imageType(file);
    if (!file || !type) fail(404,"Image not found");
    res.setHeader("Cache-Control","private, no-store");
    res.setHeader("Cross-Origin-Resource-Policy","same-origin");
    res.type(type.mime).send(file);
  }));
}

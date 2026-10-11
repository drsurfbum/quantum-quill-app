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

  app.get("/api/writing-styles", handler(async (req, res) => res.json(await storage.getWritingStyles(req.user!.id))));
  app.post("/api/writing-styles", handler(async (req, res) => {
    res.json(await storage.saveWritingStyle(req.user!.id, saveWritingStyleSchema.parse(req.body)));
  }));
  app.delete("/api/writing-styles/:id", handler(async (req, res) => {
    if (!await storage.deleteWritingStyle(req.user!.id, routeId(req.params.id))) fail(404, "Style not found");
    res.status(204).end();
  }));

  // All project child operations go through the same ownership check.
  function resource<T extends Child, C extends { projectId: number }>(config: Resource<T, C>) {
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
      await config.validate?.(data, data.projectId);
      res.status(201).json(await config.create(data));
    }));
    app.put(`/api/${config.route}/:id`, handler(async (req, res) => {
      const item = await owned(req);
      const { patch, base, revision } = draftBody(req.body);
      const data = config.updateSchema.parse(patch);
      await config.validate?.(data, item.projectId, item.id);
      const result = await config.update(item.id, data, checkedBase(base, revision));
      if (!result) fail(409, "This record changed elsewhere. Review both versions before restoring your draft.", "REVISION_CONFLICT");
      res.json(result);
    }));
    app.delete(`/api/${config.route}/:id`, handler(async (req, res) => {
      const item = await owned(req);
      await config.beforeDelete?.(item);
      await config.remove(item.id);
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

  const projectCreate = insertProjectSchema.omit({ userId: true }).extend({ title }).strict();
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

  const chapter = insertChapterSchema.extend({ projectId: idSchema, title }).strict();
  resource<Chapter, z.infer<typeof chapter>>({ route: "chapters", listRoute: "chapters", schema: chapter,
    updateSchema: chapter.omit({ projectId: true }).partial().strict(),
    get: storage.getChapter.bind(storage), list: storage.getProjectChapters.bind(storage),
    create: storage.createChapter.bind(storage), update: storage.updateChapter.bind(storage), remove: storage.deleteChapter.bind(storage) });
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
  resource<StoryBibleEntry, z.infer<typeof bible>>({ route: "story-bible", listRoute: "story-bible", schema: bible,
    updateSchema: bible.omit({ projectId: true }).partial().strict(),
    get: storage.getStoryBibleEntry.bind(storage), list: storage.getProjectStoryBible.bind(storage),
    create: data => createBibleEntry(storage, data), update: (id, data, base) => updateBibleEntry(storage, id, data, base), remove: id => deleteBibleEntry(storage, id),
  });
  app.get("/api/plot-templates", handler(async (_req, res) => res.json(await storage.getAllPlotStructureTemplates())));
  app.get("/api/plot-templates/:id", handler(async (req, res) => {
    const template = await storage.getPlotStructureTemplate(routeId(req.params.id));
    if (!template) fail(404, "Template not found");
    res.json(template);
  }));
  const plot = insertPlotStructureSchema.extend({ projectId: idSchema, templateId: idSchema, name: title, parentId: idSchema.nullable().optional() }).strict();
  resource<PlotStructure, z.infer<typeof plot>>({ route: "plot-structures", listRoute: "plot-structures", schema: plot,
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
  });

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
    await structureFor(req, data.plotStructureId);
    res.status(201).json(await storage.createPlotStructureSection(data));
  }));
  app.put("/api/plot-structure-sections/:id", handler(async (req, res) => {
    const section = await sectionFor(req);
    const { patch, base, revision } = draftBody(req.body);
    const data = sectionUpdate.parse(patch);
    const result = await storage.updatePlotStructureSection(section.id, data, checkedBase(base, revision));
    if (!result) fail(409, "This section changed elsewhere. Review both versions before restoring your draft.", "REVISION_CONFLICT");
    res.json(result);
  }));
  app.delete("/api/plot-structure-sections/:id", handler(async (req, res) => {
    const section = await sectionFor(req);
    await storage.deletePlotStructureSection(section.id);
    res.status(204).end();
  }));

  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, done) => fs.mkdir(directory, { recursive: true }, error => done(error, directory)),
      filename: (_req, file, done) => done(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
    }),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, done) => {
      if (!/^\.(jpe?g|png|gif|webp)$/i.test(path.extname(file.originalname)) || !/^image\/(jpeg|png|gif|webp)$/.test(file.mimetype)) {
        done(Object.assign(new Error("Only image files are allowed"), { status: 400 }));
      } else done(null, true);
    },
  });
  app.post("/api/upload", upload.single("image"), (req, res) => {
    if (!req.file) { res.status(400).json({ message: "No image uploaded" }); return; }
    res.json({ success: true, url: `/uploads/${req.file.filename}`, filename: req.file.filename, originalName: req.file.originalname });
  });
  // Historical files have no ownership metadata; require login pending a storage migration.
  app.use("/uploads", requireUser, express.static(directory, { dotfiles: "deny" }));
}

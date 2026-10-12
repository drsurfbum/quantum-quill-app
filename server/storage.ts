import type { BibleRelationshipRow } from "@shared/schema";
import type { SaveWritingStyle } from "@shared/writing-styles";
import type { SavedWritingStyle } from "@shared/schema";
import { matchesBase } from "@shared/draft";
import {
  type User, type InsertUser,
  type Project, type InsertProject,
  type Chapter, type InsertChapter,
  type Whiteboard, type InsertWhiteboard,
  type OutlineItem, type InsertOutlineItem,
  type StoryBibleEntry, type InsertStoryBibleEntry,
  type PlotStructureTemplate, type InsertPlotStructureTemplate,
  type PlotStructure, type InsertPlotStructure,
  type PlotStructureSection, type InsertPlotStructureSection,
  users, projects, chapters, whiteboards, outlineItems, storyBibleEntries,
  plotStructureTemplates, plotStructures, plotStructureSections
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

export interface IStorage {
  withProjectLock<T>(projectId: number, work: (storage: IStorage) => Promise<T>): Promise<T>;
  // Session store
  sessionStore: session.Store;
  
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getWritingStyles(userId: number): Promise<SavedWritingStyle[]>;
  saveWritingStyle(userId: number, style: SaveWritingStyle): Promise<SavedWritingStyle>;
  deleteWritingStyle(userId: number, id: number): Promise<boolean>;

  // Project methods
  getProject(id: number): Promise<Project | undefined>;
  getUserProjects(userId: number): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  trashProject(id: number): Promise<Project | undefined>;
  restoreProject(id: number): Promise<Project | undefined>;

  // Chapter methods
  getChapter(id: number): Promise<Chapter | undefined>;
  getProjectChapters(projectId: number): Promise<Chapter[]>;
  createChapter(chapter: InsertChapter): Promise<Chapter>;
  updateChapter(id: number, chapter: Partial<Chapter>, base?: Record<string, unknown>): Promise<Chapter | undefined>;
  deleteChapter(id: number): Promise<boolean>;

  // Whiteboard methods
  getWhiteboard(id: number): Promise<Whiteboard | undefined>;
  getProjectWhiteboards(projectId: number): Promise<Whiteboard[]>;
  createWhiteboard(whiteboard: InsertWhiteboard): Promise<Whiteboard>;
  updateWhiteboard(id: number, whiteboard: Partial<Whiteboard>, base?: Record<string, unknown>): Promise<Whiteboard | undefined>;
  deleteWhiteboard(id: number): Promise<boolean>;

  // Outline methods
  getOutlineItem(id: number): Promise<OutlineItem | undefined>;
  getProjectOutline(projectId: number): Promise<OutlineItem[]>;
  createOutlineItem(outlineItem: InsertOutlineItem): Promise<OutlineItem>;
  updateOutlineItem(id: number, outlineItem: Partial<OutlineItem>, base?: Record<string, unknown>): Promise<OutlineItem | undefined>;
  deleteOutlineItem(id: number): Promise<boolean>;

  getBibleRelationships(projectId: number): Promise<BibleRelationshipRow[]>;
  putBibleRelationship(row: BibleRelationshipRow): Promise<BibleRelationshipRow>;

  // Story Bible methods
  getStoryBibleEntry(id: number): Promise<StoryBibleEntry | undefined>;
  getProjectStoryBible(projectId: number): Promise<StoryBibleEntry[]>;
  createStoryBibleEntry(entry: InsertStoryBibleEntry): Promise<StoryBibleEntry>;
  updateStoryBibleEntry(id: number, entry: Partial<StoryBibleEntry>, base?: Record<string, unknown>): Promise<StoryBibleEntry | undefined>;
  deleteStoryBibleEntry(id: number): Promise<boolean>;
  
  // Plot Structure Template methods
  getPlotStructureTemplate(id: number): Promise<PlotStructureTemplate | undefined>;
  getAllPlotStructureTemplates(): Promise<PlotStructureTemplate[]>;
  createPlotStructureTemplate(template: InsertPlotStructureTemplate): Promise<PlotStructureTemplate>;
  updatePlotStructureTemplate(id: number, template: Partial<PlotStructureTemplate>): Promise<PlotStructureTemplate | undefined>;
  deletePlotStructureTemplate(id: number): Promise<boolean>;
  
  // Plot Structure methods
  getPlotStructure(id: number): Promise<PlotStructure | undefined>;
  getProjectPlotStructures(projectId: number): Promise<PlotStructure[]>;
  createPlotStructure(structure: InsertPlotStructure): Promise<PlotStructure>;
  updatePlotStructure(id: number, structure: Partial<PlotStructure>, base?: Record<string, unknown>): Promise<PlotStructure | undefined>;
  deletePlotStructure(id: number): Promise<boolean>;
  
  // Plot Structure Section methods
  getPlotStructureSection(id: number): Promise<PlotStructureSection | undefined>;
  getPlotStructureSections(plotStructureId: number): Promise<PlotStructureSection[]>;
  createPlotStructureSection(section: InsertPlotStructureSection): Promise<PlotStructureSection>;
  updatePlotStructureSection(id: number, section: Partial<PlotStructureSection>, base?: Record<string, unknown>): Promise<PlotStructureSection | undefined>;
  deletePlotStructureSection(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private relationshipRows = new Map<string, BibleRelationshipRow>();
  async getBibleRelationships(projectId: number) { return Array.from(this.relationshipRows.values()).filter(row => row.projectId === projectId); }
  async putBibleRelationship(row: BibleRelationshipRow) { this.relationshipRows.set(`${row.projectId}:${row.id}`, row); return row; }
  private projectLocks = new Map<number, Promise<void>>();
  async withProjectLock<T>(projectId: number, work: (storage: IStorage) => Promise<T>): Promise<T> {
    const previous = this.projectLocks.get(projectId) || Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>(resolve => { release = resolve; });
    this.projectLocks.set(projectId, next);
    await previous;
    try { return await work(this); } finally { release(); if (this.projectLocks.get(projectId) === next) this.projectLocks.delete(projectId); }
  }
  sessionStore: session.Store;
  private usersMap: Map<number, User>;
  private projectsMap: Map<number, Project>;
  private chaptersMap: Map<number, Chapter>;
  private whiteboardsMap: Map<number, Whiteboard>;
  private outlineItemsMap: Map<number, OutlineItem>;
  private storyBibleEntriesMap: Map<number, StoryBibleEntry>;
  private plotStructureTemplatesMap: Map<number, PlotStructureTemplate>;
  private plotStructuresMap: Map<number, PlotStructure>;
  private plotStructureSectionsMap: Map<number, PlotStructureSection>;
  
  private userId: number;
  private projectId: number;
  private chapterId: number;
  private whiteboardId: number;
  private outlineItemId: number;
  private storyBibleEntryId: number;
  private plotStructureTemplateId: number;
  private plotStructureId: number;
  private plotStructureSectionId: number;

  constructor() {
    // Create memory session store
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    this.usersMap = new Map();
    this.projectsMap = new Map();
    this.chaptersMap = new Map();
    this.whiteboardsMap = new Map();
    this.outlineItemsMap = new Map();
    this.storyBibleEntriesMap = new Map();
    this.plotStructureTemplatesMap = new Map();
    this.plotStructuresMap = new Map();
    this.plotStructureSectionsMap = new Map();
    
    this.userId = 1;
    this.projectId = 1;
    this.chapterId = 1;
    this.whiteboardId = 1;
    this.outlineItemId = 1;
    this.storyBibleEntryId = 1;
    this.plotStructureTemplateId = 1;
    this.plotStructureId = 1;
    this.plotStructureSectionId = 1;

  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.usersMap.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersMap.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: now 
    };
    this.usersMap.set(id, user);
    return user;
  }

  private writingStylesMap = new Map<number, SavedWritingStyle>();
  private writingStyleId = 1;
  async getWritingStyles(userId: number) {
    return [...this.writingStylesMap.values()].filter(style => style.userId === userId).sort((a, b) => a.name.localeCompare(b.name));
  }
  async saveWritingStyle(userId: number, style: SaveWritingStyle) {
    const existing = [...this.writingStylesMap.values()].find(value => value.userId === userId && value.name === style.name);
    const saved = { ...style, userId, id: existing?.id ?? this.writingStyleId++, createdAt: existing?.createdAt ?? new Date(), updatedAt: new Date() };
    this.writingStylesMap.set(saved.id, saved);
    return saved;
  }
  async deleteWritingStyle(userId: number, id: number) {
    return this.writingStylesMap.get(id)?.userId === userId && this.writingStylesMap.delete(id);
  }

  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    return this.projectsMap.get(id);
  }

  async getUserProjects(userId: number): Promise<Project[]> {
    return Array.from(this.projectsMap.values()).filter(
      (project) => project.userId === userId && !project.isTrashed
    );
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.projectId++;
    const now = new Date();
    const project: Project = {
      ...insertProject,
      id,
      createdAt: now,
      updatedAt: now,
      isArchived: false,
      isTrashed: false,
      description: insertProject.description || null
    };
    this.projectsMap.set(id, project);
    return project;
  }

  async updateProject(id: number, projectUpdate: Partial<Project>): Promise<Project | undefined> {
    const project = await this.getProject(id);
    if (!project) return undefined;

    const updatedProject = {
      ...project,
      ...projectUpdate,
      updatedAt: new Date()
    };
    this.projectsMap.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    return this.projectsMap.delete(id);
  }

  async trashProject(id: number): Promise<Project | undefined> {
    return this.updateProject(id, { isTrashed: true });
  }

  async restoreProject(id: number): Promise<Project | undefined> {
    return this.updateProject(id, { isTrashed: false });
  }

  // Chapter methods
  async getChapter(id: number): Promise<Chapter | undefined> {
    return this.chaptersMap.get(id);
  }

  async getProjectChapters(projectId: number): Promise<Chapter[]> {
    return Array.from(this.chaptersMap.values())
      .filter(chapter => chapter.projectId === projectId)
      .sort((a, b) => a.order - b.order);
  }

  async createChapter(insertChapter: InsertChapter): Promise<Chapter> {
    const id = this.chapterId++;
    const now = new Date();
    const chapter: Chapter = {
      ...insertChapter,
      id,
      revision: 0,
      createdAt: now,
      updatedAt: now,
      content: insertChapter.content || "",
      isDraft: insertChapter.isDraft !== undefined ? insertChapter.isDraft : true
    };
    this.chaptersMap.set(id, chapter);
    return chapter;
  }

  async updateChapter(id: number, chapterUpdate: Partial<Chapter>, base?: Record<string, unknown>): Promise<Chapter | undefined> {
    const chapter = this.chaptersMap.get(id);
    if (!chapter || !matchesBase(chapter, base)) return undefined;

    const updatedChapter = {
      ...chapter,
      ...chapterUpdate,
      revision: chapter.revision + 1,
      updatedAt: new Date()
    };
    this.chaptersMap.set(id, updatedChapter);
    return updatedChapter;
  }

  async deleteChapter(id: number): Promise<boolean> {
    return this.chaptersMap.delete(id);
  }

  // Whiteboard methods
  async getWhiteboard(id: number): Promise<Whiteboard | undefined> {
    return this.whiteboardsMap.get(id);
  }

  async getProjectWhiteboards(projectId: number): Promise<Whiteboard[]> {
    return Array.from(this.whiteboardsMap.values())
      .filter(whiteboard => whiteboard.projectId === projectId);
  }

  async createWhiteboard(insertWhiteboard: InsertWhiteboard): Promise<Whiteboard> {
    const id = this.whiteboardId++;
    const now = new Date();
    const whiteboard: Whiteboard = {
      ...insertWhiteboard,
      id,
      revision: 0,
      createdAt: now,
      updatedAt: now,
      canvasData: insertWhiteboard.canvasData || {}
    };
    this.whiteboardsMap.set(id, whiteboard);
    return whiteboard;
  }

  async updateWhiteboard(id: number, whiteboardUpdate: Partial<Whiteboard>, base?: Record<string, unknown>): Promise<Whiteboard | undefined> {
    const whiteboard = this.whiteboardsMap.get(id);
    if (!whiteboard || !matchesBase(whiteboard, base)) return undefined;

    const updatedWhiteboard = {
      ...whiteboard,
      ...whiteboardUpdate,
      revision: whiteboard.revision + 1,
      updatedAt: new Date()
    };
    this.whiteboardsMap.set(id, updatedWhiteboard);
    return updatedWhiteboard;
  }

  async deleteWhiteboard(id: number): Promise<boolean> {
    return this.whiteboardsMap.delete(id);
  }

  // Outline methods
  async getOutlineItem(id: number): Promise<OutlineItem | undefined> {
    return this.outlineItemsMap.get(id);
  }

  async getProjectOutline(projectId: number): Promise<OutlineItem[]> {
    return Array.from(this.outlineItemsMap.values())
      .filter(item => item.projectId === projectId)
      .sort((a, b) => a.order - b.order);
  }

  async createOutlineItem(insertOutlineItem: InsertOutlineItem): Promise<OutlineItem> {
    const id = this.outlineItemId++;
    const now = new Date();
    const outlineItem: OutlineItem = {
      ...insertOutlineItem,
      id,
      revision: 0,
      createdAt: now,
      updatedAt: now,
      content: insertOutlineItem.content || "",
      parentId: insertOutlineItem.parentId || null,
      isCompleted: insertOutlineItem.isCompleted ?? null
    };
    this.outlineItemsMap.set(id, outlineItem);
    return outlineItem;
  }

  async updateOutlineItem(id: number, outlineItemUpdate: Partial<OutlineItem>, base?: Record<string, unknown>): Promise<OutlineItem | undefined> {
    const outlineItem = this.outlineItemsMap.get(id);
    if (!outlineItem || !matchesBase(outlineItem, base)) return undefined;

    const updatedOutlineItem = {
      ...outlineItem,
      ...outlineItemUpdate,
      revision: outlineItem.revision + 1,
      updatedAt: new Date()
    };
    this.outlineItemsMap.set(id, updatedOutlineItem);
    return updatedOutlineItem;
  }

  async deleteOutlineItem(id: number): Promise<boolean> {
    return this.outlineItemsMap.delete(id);
  }

  // Story Bible methods
  async getStoryBibleEntry(id: number): Promise<StoryBibleEntry | undefined> {
    return this.storyBibleEntriesMap.get(id);
  }

  async getProjectStoryBible(projectId: number): Promise<StoryBibleEntry[]> {
    return Array.from(this.storyBibleEntriesMap.values())
      .filter(entry => entry.projectId === projectId);
  }

  async createStoryBibleEntry(insertEntry: InsertStoryBibleEntry): Promise<StoryBibleEntry> {
    const id = this.storyBibleEntryId++;
    const now = new Date();
    const entry: StoryBibleEntry = {
      ...insertEntry,
      id,
      revision: 0,
      createdAt: now,
      updatedAt: now,
      content: insertEntry.content || "",
      category: insertEntry.category || null,
      subcategory: insertEntry.subcategory || null,
      tags: insertEntry.tags || null,
      relatedEntryIds: insertEntry.relatedEntryIds || null,
      metadata: insertEntry.metadata || {},
      isArchived: insertEntry.isArchived || false,
      priority: insertEntry.priority || 0
    };
    this.storyBibleEntriesMap.set(id, entry);
    return entry;
  }

  async updateStoryBibleEntry(id: number, entryUpdate: Partial<StoryBibleEntry>, base?: Record<string, unknown>): Promise<StoryBibleEntry | undefined> {
    const entry = this.storyBibleEntriesMap.get(id);
    if (!entry || !matchesBase(entry, base)) return undefined;

    const updatedEntry = {
      ...entry,
      ...entryUpdate,
      revision: entry.revision + 1,
      updatedAt: new Date()
    };
    this.storyBibleEntriesMap.set(id, updatedEntry);
    return updatedEntry;
  }

  async deleteStoryBibleEntry(id: number): Promise<boolean> {
    return this.storyBibleEntriesMap.delete(id);
  }
  
  // Plot Structure Template methods
  async getPlotStructureTemplate(id: number): Promise<PlotStructureTemplate | undefined> {
    return this.plotStructureTemplatesMap.get(id);
  }
  
  async getAllPlotStructureTemplates(): Promise<PlotStructureTemplate[]> {
    return Array.from(this.plotStructureTemplatesMap.values());
  }
  
  async createPlotStructureTemplate(template: InsertPlotStructureTemplate): Promise<PlotStructureTemplate> {
    const id = this.plotStructureTemplateId++;
    const now = new Date();
    
    // Create the template with all required fields explicitly set
    const newTemplate: PlotStructureTemplate = {
      id,
      name: template.name,
      templateType: template.templateType,
      sections: template.sections,
      description: template.description || null,
      isDefault: template.isDefault || null,
      createdAt: now,
      updatedAt: now
    };
    
    this.plotStructureTemplatesMap.set(id, newTemplate);
    return newTemplate;
  }
  
  async updatePlotStructureTemplate(id: number, templateUpdate: Partial<PlotStructureTemplate>): Promise<PlotStructureTemplate | undefined> {
    const template = await this.getPlotStructureTemplate(id);
    if (!template) return undefined;

    const updatedTemplate = {
      ...template,
      ...templateUpdate,
      updatedAt: new Date()
    };
    this.plotStructureTemplatesMap.set(id, updatedTemplate);
    return updatedTemplate;
  }
  
  async deletePlotStructureTemplate(id: number): Promise<boolean> {
    return this.plotStructureTemplatesMap.delete(id);
  }
  
  // Plot Structure methods
  async getPlotStructure(id: number): Promise<PlotStructure | undefined> {
    return this.plotStructuresMap.get(id);
  }
  
  async getProjectPlotStructures(projectId: number): Promise<PlotStructure[]> {
    return Array.from(this.plotStructuresMap.values())
      .filter(structure => structure.projectId === projectId);
  }
  
  async createPlotStructure(structure: InsertPlotStructure): Promise<PlotStructure> {
    const id = this.plotStructureId++;
    const now = new Date();
    
    // Create the structure with all required fields explicitly set
    const newStructure: PlotStructure = {
      id,
      revision: 0,
      projectId: structure.projectId,
      templateId: structure.templateId,
      name: structure.name,
      description: structure.description || null,
      parentId: structure.parentId || null,
      order: structure.order || null,
      createdAt: now,
      updatedAt: now
    };
    
    this.plotStructuresMap.set(id, newStructure);
    return newStructure;
  }
  
  async updatePlotStructure(id: number, structureUpdate: Partial<PlotStructure>, base?: Record<string, unknown>): Promise<PlotStructure | undefined> {
    const structure = this.plotStructuresMap.get(id);
    if (!structure || !matchesBase(structure, base)) return undefined;

    const updatedStructure = {
      ...structure,
      ...structureUpdate,
      revision: structure.revision + 1,
      updatedAt: new Date()
    };
    this.plotStructuresMap.set(id, updatedStructure);
    return updatedStructure;
  }
  
  async deletePlotStructure(id: number): Promise<boolean> {
    return this.plotStructuresMap.delete(id);
  }
  
  // Plot Structure Section methods
  async getPlotStructureSection(id: number): Promise<PlotStructureSection | undefined> {
    return this.plotStructureSectionsMap.get(id);
  }
  
  async getPlotStructureSections(plotStructureId: number): Promise<PlotStructureSection[]> {
    return Array.from(this.plotStructureSectionsMap.values())
      .filter(section => section.plotStructureId === plotStructureId)
      .sort((a, b) => a.order - b.order);
  }
  
  async createPlotStructureSection(section: InsertPlotStructureSection): Promise<PlotStructureSection> {
    const id = this.plotStructureSectionId++;
    const now = new Date();
    
    // Create the section with all required fields explicitly set
    const newSection: PlotStructureSection = {
      id,
      revision: 0,
      plotStructureId: section.plotStructureId,
      sectionKey: section.sectionKey,
      title: section.title,
      content: section.content || "",
      order: section.order,
      createdAt: now,
      updatedAt: now
    };
    
    this.plotStructureSectionsMap.set(id, newSection);
    return newSection;
  }
  
  async updatePlotStructureSection(id: number, sectionUpdate: Partial<PlotStructureSection>, base?: Record<string, unknown>): Promise<PlotStructureSection | undefined> {
    const section = this.plotStructureSectionsMap.get(id);
    if (!section || !matchesBase(section, base)) return undefined;

    const updatedSection = {
      ...section,
      ...sectionUpdate,
      revision: section.revision + 1,
      updatedAt: new Date()
    };
    this.plotStructureSectionsMap.set(id, updatedSection);
    return updatedSection;
  }
  
  async deletePlotStructureSection(id: number): Promise<boolean> {
    return this.plotStructureSectionsMap.delete(id);
  }
}

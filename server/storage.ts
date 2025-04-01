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
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import createMemoryStore from "memorystore";

export interface IStorage {
  // Session store
  sessionStore: session.Store;
  
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

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
  updateChapter(id: number, chapter: Partial<Chapter>): Promise<Chapter | undefined>;
  deleteChapter(id: number): Promise<boolean>;

  // Whiteboard methods
  getWhiteboard(id: number): Promise<Whiteboard | undefined>;
  getProjectWhiteboards(projectId: number): Promise<Whiteboard[]>;
  createWhiteboard(whiteboard: InsertWhiteboard): Promise<Whiteboard>;
  updateWhiteboard(id: number, whiteboard: Partial<Whiteboard>): Promise<Whiteboard | undefined>;
  deleteWhiteboard(id: number): Promise<boolean>;

  // Outline methods
  getOutlineItem(id: number): Promise<OutlineItem | undefined>;
  getProjectOutline(projectId: number): Promise<OutlineItem[]>;
  createOutlineItem(outlineItem: InsertOutlineItem): Promise<OutlineItem>;
  updateOutlineItem(id: number, outlineItem: Partial<OutlineItem>): Promise<OutlineItem | undefined>;
  deleteOutlineItem(id: number): Promise<boolean>;

  // Story Bible methods
  getStoryBibleEntry(id: number): Promise<StoryBibleEntry | undefined>;
  getProjectStoryBible(projectId: number): Promise<StoryBibleEntry[]>;
  createStoryBibleEntry(entry: InsertStoryBibleEntry): Promise<StoryBibleEntry>;
  updateStoryBibleEntry(id: number, entry: Partial<StoryBibleEntry>): Promise<StoryBibleEntry | undefined>;
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
  updatePlotStructure(id: number, structure: Partial<PlotStructure>): Promise<PlotStructure | undefined>;
  deletePlotStructure(id: number): Promise<boolean>;
  
  // Plot Structure Section methods
  getPlotStructureSection(id: number): Promise<PlotStructureSection | undefined>;
  getPlotStructureSections(plotStructureId: number): Promise<PlotStructureSection[]>;
  createPlotStructureSection(section: InsertPlotStructureSection): Promise<PlotStructureSection>;
  updatePlotStructureSection(id: number, section: Partial<PlotStructureSection>): Promise<PlotStructureSection | undefined>;
  deletePlotStructureSection(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
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

    // Add demo user
    this.createUser({
      username: "demo",
      password: "password",
      email: "demo@example.com",
    });
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
      createdAt: now,
      updatedAt: now,
      content: insertChapter.content || "",
      isDraft: insertChapter.isDraft !== undefined ? insertChapter.isDraft : true
    };
    this.chaptersMap.set(id, chapter);
    return chapter;
  }

  async updateChapter(id: number, chapterUpdate: Partial<Chapter>): Promise<Chapter | undefined> {
    const chapter = await this.getChapter(id);
    if (!chapter) return undefined;

    const updatedChapter = {
      ...chapter,
      ...chapterUpdate,
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
      createdAt: now,
      updatedAt: now,
      canvasData: insertWhiteboard.canvasData || {}
    };
    this.whiteboardsMap.set(id, whiteboard);
    return whiteboard;
  }

  async updateWhiteboard(id: number, whiteboardUpdate: Partial<Whiteboard>): Promise<Whiteboard | undefined> {
    const whiteboard = await this.getWhiteboard(id);
    if (!whiteboard) return undefined;

    const updatedWhiteboard = {
      ...whiteboard,
      ...whiteboardUpdate,
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
      createdAt: now,
      updatedAt: now,
      content: insertOutlineItem.content || "",
      parentId: insertOutlineItem.parentId || null
    };
    this.outlineItemsMap.set(id, outlineItem);
    return outlineItem;
  }

  async updateOutlineItem(id: number, outlineItemUpdate: Partial<OutlineItem>): Promise<OutlineItem | undefined> {
    const outlineItem = await this.getOutlineItem(id);
    if (!outlineItem) return undefined;

    const updatedOutlineItem = {
      ...outlineItem,
      ...outlineItemUpdate,
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
      createdAt: now,
      updatedAt: now,
      content: insertEntry.content || "",
      category: insertEntry.category || null,
      tags: insertEntry.tags || null,
      relatedEntryIds: insertEntry.relatedEntryIds || null
    };
    this.storyBibleEntriesMap.set(id, entry);
    return entry;
  }

  async updateStoryBibleEntry(id: number, entryUpdate: Partial<StoryBibleEntry>): Promise<StoryBibleEntry | undefined> {
    const entry = await this.getStoryBibleEntry(id);
    if (!entry) return undefined;

    const updatedEntry = {
      ...entry,
      ...entryUpdate,
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
  
  async updatePlotStructure(id: number, structureUpdate: Partial<PlotStructure>): Promise<PlotStructure | undefined> {
    const structure = await this.getPlotStructure(id);
    if (!structure) return undefined;

    const updatedStructure = {
      ...structure,
      ...structureUpdate,
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
  
  async updatePlotStructureSection(id: number, sectionUpdate: Partial<PlotStructureSection>): Promise<PlotStructureSection | undefined> {
    const section = await this.getPlotStructureSection(id);
    if (!section) return undefined;

    const updatedSection = {
      ...section,
      ...sectionUpdate,
      updatedAt: new Date()
    };
    this.plotStructureSectionsMap.set(id, updatedSection);
    return updatedSection;
  }
  
  async deletePlotStructureSection(id: number): Promise<boolean> {
    return this.plotStructureSectionsMap.delete(id);
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({ 
      pool,
      createTableIfMissing: true,
      tableName: 'session',
      ttl: 60 * 60 * 24 * 7, // 7 days expiration, matches cookie in auth.ts
      pruneSessionInterval: 60 // Prune every minute for development
    });
    console.log("DatabaseStorage: Using PostgreSQL session store");
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getUserProjects(userId: number): Promise<Project[]> {
    return db.select().from(projects).where(
      and(
        eq(projects.userId, userId),
        eq(projects.isTrashed, false)
      )
    );
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: number, projectUpdate: Partial<Project>): Promise<Project | undefined> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...projectUpdate, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return !!result;
  }

  async trashProject(id: number): Promise<Project | undefined> {
    return this.updateProject(id, { isTrashed: true });
  }

  async restoreProject(id: number): Promise<Project | undefined> {
    return this.updateProject(id, { isTrashed: false });
  }

  // Chapter methods
  async getChapter(id: number): Promise<Chapter | undefined> {
    const [chapter] = await db.select().from(chapters).where(eq(chapters.id, id));
    return chapter;
  }

  async getProjectChapters(projectId: number): Promise<Chapter[]> {
    return db
      .select()
      .from(chapters)
      .where(eq(chapters.projectId, projectId))
      .orderBy(chapters.order);
  }

  async createChapter(chapter: InsertChapter): Promise<Chapter> {
    const [newChapter] = await db.insert(chapters).values(chapter).returning();
    return newChapter;
  }

  async updateChapter(id: number, chapterUpdate: Partial<Chapter>): Promise<Chapter | undefined> {
    const [updatedChapter] = await db
      .update(chapters)
      .set({ ...chapterUpdate, updatedAt: new Date() })
      .where(eq(chapters.id, id))
      .returning();
    return updatedChapter;
  }

  async deleteChapter(id: number): Promise<boolean> {
    const result = await db.delete(chapters).where(eq(chapters.id, id));
    return !!result;
  }

  // Whiteboard methods
  async getWhiteboard(id: number): Promise<Whiteboard | undefined> {
    const [whiteboard] = await db.select().from(whiteboards).where(eq(whiteboards.id, id));
    return whiteboard;
  }

  async getProjectWhiteboards(projectId: number): Promise<Whiteboard[]> {
    return db
      .select()
      .from(whiteboards)
      .where(eq(whiteboards.projectId, projectId));
  }

  async createWhiteboard(whiteboard: InsertWhiteboard): Promise<Whiteboard> {
    const [newWhiteboard] = await db.insert(whiteboards).values(whiteboard).returning();
    return newWhiteboard;
  }

  async updateWhiteboard(id: number, whiteboardUpdate: Partial<Whiteboard>): Promise<Whiteboard | undefined> {
    const [updatedWhiteboard] = await db
      .update(whiteboards)
      .set({ ...whiteboardUpdate, updatedAt: new Date() })
      .where(eq(whiteboards.id, id))
      .returning();
    return updatedWhiteboard;
  }

  async deleteWhiteboard(id: number): Promise<boolean> {
    const result = await db.delete(whiteboards).where(eq(whiteboards.id, id));
    return !!result;
  }

  // Outline methods
  async getOutlineItem(id: number): Promise<OutlineItem | undefined> {
    const [outlineItem] = await db.select().from(outlineItems).where(eq(outlineItems.id, id));
    return outlineItem;
  }

  async getProjectOutline(projectId: number): Promise<OutlineItem[]> {
    return db
      .select()
      .from(outlineItems)
      .where(eq(outlineItems.projectId, projectId))
      .orderBy(outlineItems.order);
  }

  async createOutlineItem(outlineItem: InsertOutlineItem): Promise<OutlineItem> {
    const [newOutlineItem] = await db.insert(outlineItems).values(outlineItem).returning();
    return newOutlineItem;
  }

  async updateOutlineItem(id: number, outlineItemUpdate: Partial<OutlineItem>): Promise<OutlineItem | undefined> {
    const [updatedOutlineItem] = await db
      .update(outlineItems)
      .set({ ...outlineItemUpdate, updatedAt: new Date() })
      .where(eq(outlineItems.id, id))
      .returning();
    return updatedOutlineItem;
  }

  async deleteOutlineItem(id: number): Promise<boolean> {
    const result = await db.delete(outlineItems).where(eq(outlineItems.id, id));
    return !!result;
  }

  // Story Bible methods
  async getStoryBibleEntry(id: number): Promise<StoryBibleEntry | undefined> {
    const [entry] = await db.select().from(storyBibleEntries).where(eq(storyBibleEntries.id, id));
    return entry;
  }

  async getProjectStoryBible(projectId: number): Promise<StoryBibleEntry[]> {
    return db
      .select()
      .from(storyBibleEntries)
      .where(eq(storyBibleEntries.projectId, projectId));
  }

  async createStoryBibleEntry(entry: InsertStoryBibleEntry): Promise<StoryBibleEntry> {
    const [newEntry] = await db.insert(storyBibleEntries).values(entry).returning();
    return newEntry;
  }

  async updateStoryBibleEntry(id: number, entryUpdate: Partial<StoryBibleEntry>): Promise<StoryBibleEntry | undefined> {
    const [updatedEntry] = await db
      .update(storyBibleEntries)
      .set({ ...entryUpdate, updatedAt: new Date() })
      .where(eq(storyBibleEntries.id, id))
      .returning();
    return updatedEntry;
  }

  async deleteStoryBibleEntry(id: number): Promise<boolean> {
    const result = await db.delete(storyBibleEntries).where(eq(storyBibleEntries.id, id));
    return !!result;
  }
  
  // Plot Structure Template methods
  async getPlotStructureTemplate(id: number): Promise<PlotStructureTemplate | undefined> {
    const [template] = await db.select().from(plotStructureTemplates).where(eq(plotStructureTemplates.id, id));
    return template;
  }
  
  async getAllPlotStructureTemplates(): Promise<PlotStructureTemplate[]> {
    return db.select().from(plotStructureTemplates);
  }
  
  async createPlotStructureTemplate(template: InsertPlotStructureTemplate): Promise<PlotStructureTemplate> {
    const [newTemplate] = await db.insert(plotStructureTemplates).values(template).returning();
    return newTemplate;
  }
  
  async updatePlotStructureTemplate(id: number, templateUpdate: Partial<PlotStructureTemplate>): Promise<PlotStructureTemplate | undefined> {
    const [updatedTemplate] = await db
      .update(plotStructureTemplates)
      .set({ ...templateUpdate, updatedAt: new Date() })
      .where(eq(plotStructureTemplates.id, id))
      .returning();
    return updatedTemplate;
  }
  
  async deletePlotStructureTemplate(id: number): Promise<boolean> {
    const result = await db.delete(plotStructureTemplates).where(eq(plotStructureTemplates.id, id));
    return !!result;
  }
  
  // Plot Structure methods
  async getPlotStructure(id: number): Promise<PlotStructure | undefined> {
    const [structure] = await db.select().from(plotStructures).where(eq(plotStructures.id, id));
    return structure;
  }
  
  async getProjectPlotStructures(projectId: number): Promise<PlotStructure[]> {
    return db
      .select()
      .from(plotStructures)
      .where(eq(plotStructures.projectId, projectId));
  }
  
  async createPlotStructure(structure: InsertPlotStructure): Promise<PlotStructure> {
    const [newStructure] = await db.insert(plotStructures).values(structure).returning();
    return newStructure;
  }
  
  async updatePlotStructure(id: number, structureUpdate: Partial<PlotStructure>): Promise<PlotStructure | undefined> {
    const [updatedStructure] = await db
      .update(plotStructures)
      .set({ ...structureUpdate, updatedAt: new Date() })
      .where(eq(plotStructures.id, id))
      .returning();
    return updatedStructure;
  }
  
  async deletePlotStructure(id: number): Promise<boolean> {
    const result = await db.delete(plotStructures).where(eq(plotStructures.id, id));
    return !!result;
  }
  
  // Plot Structure Section methods
  async getPlotStructureSection(id: number): Promise<PlotStructureSection | undefined> {
    const [section] = await db.select().from(plotStructureSections).where(eq(plotStructureSections.id, id));
    return section;
  }
  
  async getPlotStructureSections(plotStructureId: number): Promise<PlotStructureSection[]> {
    return db
      .select()
      .from(plotStructureSections)
      .where(eq(plotStructureSections.plotStructureId, plotStructureId))
      .orderBy(plotStructureSections.order);
  }
  
  async createPlotStructureSection(section: InsertPlotStructureSection): Promise<PlotStructureSection> {
    const [newSection] = await db.insert(plotStructureSections).values(section).returning();
    return newSection;
  }
  
  async updatePlotStructureSection(id: number, sectionUpdate: Partial<PlotStructureSection>): Promise<PlotStructureSection | undefined> {
    const [updatedSection] = await db
      .update(plotStructureSections)
      .set({ ...sectionUpdate, updatedAt: new Date() })
      .where(eq(plotStructureSections.id, id))
      .returning();
    return updatedSection;
  }
  
  async deletePlotStructureSection(id: number): Promise<boolean> {
    const result = await db.delete(plotStructureSections).where(eq(plotStructureSections.id, id));
    return !!result;
  }
}

export const storage = new DatabaseStorage();
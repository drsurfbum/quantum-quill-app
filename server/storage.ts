import {
  type User, type InsertUser,
  type Project, type InsertProject,
  type Chapter, type InsertChapter,
  type Whiteboard, type InsertWhiteboard,
  type OutlineItem, type InsertOutlineItem,
  type StoryBibleEntry, type InsertStoryBibleEntry
} from "@shared/schema";

export interface IStorage {
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projects: Map<number, Project>;
  private chapters: Map<number, Chapter>;
  private whiteboards: Map<number, Whiteboard>;
  private outlineItems: Map<number, OutlineItem>;
  private storyBibleEntries: Map<number, StoryBibleEntry>;
  
  private userId: number;
  private projectId: number;
  private chapterId: number;
  private whiteboardId: number;
  private outlineItemId: number;
  private storyBibleEntryId: number;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.chapters = new Map();
    this.whiteboards = new Map();
    this.outlineItems = new Map();
    this.storyBibleEntries = new Map();
    
    this.userId = 1;
    this.projectId = 1;
    this.chapterId = 1;
    this.whiteboardId = 1;
    this.outlineItemId = 1;
    this.storyBibleEntryId = 1;

    // Add demo user
    this.createUser({
      username: "demo",
      password: "password",
      email: "demo@example.com",
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
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
    this.users.set(id, user);
    return user;
  }

  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getUserProjects(userId: number): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(
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
      isTrashed: false
    };
    this.projects.set(id, project);
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
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    return this.projects.delete(id);
  }

  async trashProject(id: number): Promise<Project | undefined> {
    return this.updateProject(id, { isTrashed: true });
  }

  async restoreProject(id: number): Promise<Project | undefined> {
    return this.updateProject(id, { isTrashed: false });
  }

  // Chapter methods
  async getChapter(id: number): Promise<Chapter | undefined> {
    return this.chapters.get(id);
  }

  async getProjectChapters(projectId: number): Promise<Chapter[]> {
    return Array.from(this.chapters.values())
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
      updatedAt: now
    };
    this.chapters.set(id, chapter);
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
    this.chapters.set(id, updatedChapter);
    return updatedChapter;
  }

  async deleteChapter(id: number): Promise<boolean> {
    return this.chapters.delete(id);
  }

  // Whiteboard methods
  async getWhiteboard(id: number): Promise<Whiteboard | undefined> {
    return this.whiteboards.get(id);
  }

  async getProjectWhiteboards(projectId: number): Promise<Whiteboard[]> {
    return Array.from(this.whiteboards.values())
      .filter(whiteboard => whiteboard.projectId === projectId);
  }

  async createWhiteboard(insertWhiteboard: InsertWhiteboard): Promise<Whiteboard> {
    const id = this.whiteboardId++;
    const now = new Date();
    const whiteboard: Whiteboard = {
      ...insertWhiteboard,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.whiteboards.set(id, whiteboard);
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
    this.whiteboards.set(id, updatedWhiteboard);
    return updatedWhiteboard;
  }

  async deleteWhiteboard(id: number): Promise<boolean> {
    return this.whiteboards.delete(id);
  }

  // Outline methods
  async getOutlineItem(id: number): Promise<OutlineItem | undefined> {
    return this.outlineItems.get(id);
  }

  async getProjectOutline(projectId: number): Promise<OutlineItem[]> {
    return Array.from(this.outlineItems.values())
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
      updatedAt: now
    };
    this.outlineItems.set(id, outlineItem);
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
    this.outlineItems.set(id, updatedOutlineItem);
    return updatedOutlineItem;
  }

  async deleteOutlineItem(id: number): Promise<boolean> {
    return this.outlineItems.delete(id);
  }

  // Story Bible methods
  async getStoryBibleEntry(id: number): Promise<StoryBibleEntry | undefined> {
    return this.storyBibleEntries.get(id);
  }

  async getProjectStoryBible(projectId: number): Promise<StoryBibleEntry[]> {
    return Array.from(this.storyBibleEntries.values())
      .filter(entry => entry.projectId === projectId);
  }

  async createStoryBibleEntry(insertEntry: InsertStoryBibleEntry): Promise<StoryBibleEntry> {
    const id = this.storyBibleEntryId++;
    const now = new Date();
    const entry: StoryBibleEntry = {
      ...insertEntry,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.storyBibleEntries.set(id, entry);
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
    this.storyBibleEntries.set(id, updatedEntry);
    return updatedEntry;
  }

  async deleteStoryBibleEntry(id: number): Promise<boolean> {
    return this.storyBibleEntries.delete(id);
  }
}

export const storage = new MemStorage();

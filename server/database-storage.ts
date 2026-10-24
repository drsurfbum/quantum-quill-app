import type { FeedbackInput, FeedbackInboxQuery, FeedbackStatus } from "@shared/feedback";
import { feedbackReports } from "@shared/schema";
import { sceneBibleContexts, type SceneContextRow } from "@shared/schema";
import type { ManuscriptOrder } from "@shared/manuscript";
import { scenes, creationRequests, type Scene, type InsertScene, type CreationRequest } from "@shared/schema";
import { bibleRelationships, type BibleRelationshipRow } from "@shared/schema";
import type { SaveWritingStyle } from "@shared/writing-styles";
import { writingStyles } from "@shared/schema";
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
import { eq, and, sql, getTableColumns } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

import type { IStorage } from "./storage";

// The field comparison and update are one SQL statement. Concurrent writers
// cannot both replace the same base value, and unrelated field edits can merge.
function baseCondition(table: any, base?: Record<string, unknown>) {
  const columns = getTableColumns(table);
  return base && and(...Object.entries(base).map(([key, value]) => {
    if (!columns[key]) throw new Error("Unknown draft field");
    return sql`coalesce(to_jsonb(${columns[key]}), 'null'::jsonb) = ${JSON.stringify(value ?? null)}::jsonb`;
  }));
}

export class DatabaseStorage implements IStorage {
  async listFeedback(query: FeedbackInboxQuery) {
    return this.database.select({id:feedbackReports.id, category:feedbackReports.category, summary:feedbackReports.summary, area:feedbackReports.area, status:feedbackReports.status, createdAt:feedbackReports.createdAt}).from(feedbackReports).where(and(
      query.status ? eq(feedbackReports.status,query.status) : undefined,
      query.category ? eq(feedbackReports.category,query.category) : undefined,
      query.before ? sql`${feedbackReports.id} < ${query.before}` : undefined,
      query.q ? sql`strpos(lower(${feedbackReports.summary} || E'\n' || ${feedbackReports.details}), lower(${query.q})) > 0` : undefined,
    )).orderBy(sql`${feedbackReports.id} desc`).limit(51);
  }
  async getFeedback(id: number) { const [row] = await this.database.select().from(feedbackReports).where(eq(feedbackReports.id,id)); return row; }
  async updateFeedbackStatus(id: number, status: FeedbackStatus, expectedStatus: FeedbackStatus) {
    const [row] = await this.database.update(feedbackReports).set({status}).where(and(eq(feedbackReports.id,id),eq(feedbackReports.status,expectedStatus))).returning(); return row;
  }
  async getFeedbackByRequest(userId: number, requestId: string) { const [row] = await this.database.select().from(feedbackReports).where(and(eq(feedbackReports.userId,userId),eq(feedbackReports.requestId,requestId))); return row; }
  async getUserFeedback(userId: number) { return this.database.select().from(feedbackReports).where(eq(feedbackReports.userId,userId)).orderBy(sql`${feedbackReports.id} desc`).limit(50); }
  async countRecentFeedback(userId: number, since: Date) { const [row] = await this.database.select({count:sql<number>`count(*)::int`}).from(feedbackReports).where(and(eq(feedbackReports.userId,userId),sql`${feedbackReports.createdAt} >= ${since}`)); return row.count; }
  async createFeedback(userId: number, input: FeedbackInput) { const [row] = await this.database.insert(feedbackReports).values({...input,userId}).returning(); return row; }

  async getSceneContext(sceneId: number) { const [row] = await this.database.select().from(sceneBibleContexts).where(eq(sceneBibleContexts.sceneId,sceneId)); return row; }
  async getProjectSceneContexts(projectId: number) { return this.database.select().from(sceneBibleContexts).where(eq(sceneBibleContexts.projectId,projectId)); }
  // Only called under the same project lock used by Bible updates/deletion.
  async putSceneContext(row: SceneContextRow) { const [result] = await this.database.insert(sceneBibleContexts).values(row).onConflictDoUpdate({target:sceneBibleContexts.sceneId,set:row}).returning(); return result; }
  sessionStore: session.Store;

  constructor(private database: Pick<typeof db, "select" | "insert" | "update" | "delete" | "transaction" | "execute"> = db, store?: session.Store) {
    if (store) { this.sessionStore = store; return; }
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

  // Called only within the project transaction. Structural writes deliberately do
  // not advance prose revisions or touch content, beats, titles, or their baselines.
  async applyManuscriptOrder(projectId: number, order: ManuscriptOrder): Promise<void> {
    for (const [index, chapter] of order.entries()) {
      await this.database.update(chapters).set({ order:index }).where(and(eq(chapters.projectId,projectId),eq(chapters.id,chapter.id)));
      for (const [position,id] of chapter.sceneIds.entries()) await this.database.update(scenes).set({ chapterId:chapter.id,order:position }).where(and(eq(scenes.projectId,projectId),eq(scenes.id,id)));
    }
  }
  async withReadSnapshot<T>(work: (storage: IStorage) => Promise<T>): Promise<T> {
    return this.database.transaction(tx => work(new DatabaseStorage(tx, this.sessionStore)), { isolationLevel: "repeatable read", accessMode: "read only" });
  }

  async withProjectLock<T>(projectId: number, work: (storage: IStorage) => Promise<T>): Promise<T> {
    return this.database.transaction(async transaction => {
      // Project-scoped advisory lock serializes link validation + writes/deletes
      // across processes. It touches no user data and releases on commit/rollback.
      await transaction.execute(sql`select pg_advisory_xact_lock(5329233, ${projectId})`);
      return work(new DatabaseStorage(transaction, this.sessionStore));
    });
  }

  async getBibleRelationships(projectId: number) {
    return this.database.select().from(bibleRelationships).where(eq(bibleRelationships.projectId, projectId));
  }
  async putBibleRelationship(row: BibleRelationshipRow) {
    const [result] = await this.database.insert(bibleRelationships).values(row)
      .onConflictDoUpdate({ target: [bibleRelationships.projectId, bibleRelationships.id], set: row }).returning();
    return result;
  }

  async withCreationTransaction<T>(scope: number, work: (storage: IStorage) => Promise<T>) { return this.withProjectLock(scope, work); }
  async getCreationRequest(scope: number, requestId: string) {
    const [row] = await this.database.select().from(creationRequests).where(and(eq(creationRequests.scope, scope), eq(creationRequests.requestId, requestId))); return row;
  }
  async putCreationRequest(row: CreationRequest) { await this.database.insert(creationRequests).values(row); }
  async getScene(id: number) { const [row] = await this.database.select().from(scenes).where(eq(scenes.id, id)); return row; }
  async getProjectScenes(projectId: number) { return this.database.select().from(scenes).where(eq(scenes.projectId, projectId)).orderBy(scenes.order, scenes.id); }
  async createScene(scene: InsertScene) { const [row] = await this.database.insert(scenes).values(scene).returning(); return row; }
  async updateScene(id: number, patch: Partial<Scene>, base?: Record<string, unknown>) {
    const [row] = await this.database.update(scenes).set({ ...patch, revision: sql`${scenes.revision} + 1`, updatedAt: new Date() })
      .where(and(eq(scenes.id, id), baseCondition(scenes, base))).returning(); return row;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await this.database.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await this.database.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await this.database.insert(users).values(insertUser).returning();
    return user;
  }

  async getWritingStyles(userId: number) {
    return this.database.select().from(writingStyles).where(eq(writingStyles.userId, userId)).orderBy(writingStyles.name);
  }
  async saveWritingStyle(userId: number, style: SaveWritingStyle) {
    const [saved] = await this.database.insert(writingStyles).values({ ...style, userId })
      .onConflictDoUpdate({ target: [writingStyles.userId, writingStyles.name], set: { definition: style.definition, updatedAt: new Date() } }).returning();
    return saved;
  }
  async deleteWritingStyle(userId: number, id: number) {
    const removed = await this.database.delete(writingStyles).where(and(eq(writingStyles.userId, userId), eq(writingStyles.id, id))).returning({ id: writingStyles.id });
    return removed.length > 0;
  }

  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await this.database.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getUserProjects(userId: number): Promise<Project[]> {
    return this.database.select().from(projects).where(
      and(
        eq(projects.userId, userId),
        eq(projects.isTrashed, false)
      )
    );
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await this.database.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: number, projectUpdate: Partial<Project>): Promise<Project | undefined> {
    const [updatedProject] = await this.database
      .update(projects)
      .set({ ...projectUpdate, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await this.database.delete(projects).where(eq(projects.id, id));
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
    const [chapter] = await this.database.select().from(chapters).where(eq(chapters.id, id));
    return chapter;
  }

  async getProjectChapters(projectId: number): Promise<Chapter[]> {
    return this.database
      .select()
      .from(chapters)
      .where(eq(chapters.projectId, projectId))
      .orderBy(chapters.order);
  }

  async createChapter(chapter: InsertChapter): Promise<Chapter> {
    const [newChapter] = await this.database.insert(chapters).values(chapter).returning();
    return newChapter;
  }

  async updateChapter(id: number, chapterUpdate: Partial<Chapter>, base?: Record<string, unknown>): Promise<Chapter | undefined> {
    const [updatedChapter] = await this.database
      .update(chapters)
      .set({ ...chapterUpdate, revision: sql`${chapters.revision} + 1`, updatedAt: new Date() })
      .where(and(eq(chapters.id, id), baseCondition(chapters, base)))
      .returning();
    return updatedChapter;
  }

  async deleteChapter(id: number): Promise<boolean> {
    const result = await this.database.delete(chapters).where(eq(chapters.id, id));
    return !!result;
  }

  // Whiteboard methods
  async getWhiteboard(id: number): Promise<Whiteboard | undefined> {
    const [whiteboard] = await this.database.select().from(whiteboards).where(eq(whiteboards.id, id));
    return whiteboard;
  }

  async getProjectWhiteboards(projectId: number): Promise<Whiteboard[]> {
    return this.database
      .select()
      .from(whiteboards)
      .where(eq(whiteboards.projectId, projectId));
  }

  async createWhiteboard(whiteboard: InsertWhiteboard): Promise<Whiteboard> {
    const [newWhiteboard] = await this.database.insert(whiteboards).values(whiteboard).returning();
    return newWhiteboard;
  }

  async updateWhiteboard(id: number, whiteboardUpdate: Partial<Whiteboard>, base?: Record<string, unknown>): Promise<Whiteboard | undefined> {
    const [updatedWhiteboard] = await this.database
      .update(whiteboards)
      .set({ ...whiteboardUpdate, revision: sql`${whiteboards.revision} + 1`, updatedAt: new Date() })
      .where(and(eq(whiteboards.id, id), baseCondition(whiteboards, base)))
      .returning();
    return updatedWhiteboard;
  }

  async deleteWhiteboard(id: number): Promise<boolean> {
    const result = await this.database.delete(whiteboards).where(eq(whiteboards.id, id));
    return !!result;
  }

  // Outline methods
  async getOutlineItem(id: number): Promise<OutlineItem | undefined> {
    const [outlineItem] = await this.database.select().from(outlineItems).where(eq(outlineItems.id, id));
    return outlineItem;
  }

  async getProjectOutline(projectId: number): Promise<OutlineItem[]> {
    return this.database
      .select()
      .from(outlineItems)
      .where(eq(outlineItems.projectId, projectId))
      .orderBy(outlineItems.order);
  }

  async createOutlineItem(outlineItem: InsertOutlineItem): Promise<OutlineItem> {
    const [newOutlineItem] = await this.database.insert(outlineItems).values(outlineItem).returning();
    return newOutlineItem;
  }

  async updateOutlineItem(id: number, outlineItemUpdate: Partial<OutlineItem>, base?: Record<string, unknown>): Promise<OutlineItem | undefined> {
    const [updatedOutlineItem] = await this.database
      .update(outlineItems)
      .set({ ...outlineItemUpdate, revision: sql`${outlineItems.revision} + 1`, updatedAt: new Date() })
      .where(and(eq(outlineItems.id, id), baseCondition(outlineItems, base)))
      .returning();
    return updatedOutlineItem;
  }

  async deleteOutlineItem(id: number): Promise<boolean> {
    const result = await this.database.delete(outlineItems).where(eq(outlineItems.id, id));
    return !!result;
  }

  // Story Bible methods
  async getStoryBibleEntry(id: number): Promise<StoryBibleEntry | undefined> {
    const [entry] = await this.database.select().from(storyBibleEntries).where(eq(storyBibleEntries.id, id));
    return entry;
  }

  async getProjectStoryBible(projectId: number): Promise<StoryBibleEntry[]> {
    return this.database
      .select()
      .from(storyBibleEntries)
      .where(eq(storyBibleEntries.projectId, projectId));
  }

  async createStoryBibleEntry(entry: InsertStoryBibleEntry): Promise<StoryBibleEntry> {
    const [newEntry] = await this.database.insert(storyBibleEntries).values(entry).returning();
    return newEntry;
  }

  async updateStoryBibleEntry(id: number, entryUpdate: Partial<StoryBibleEntry>, base?: Record<string, unknown>): Promise<StoryBibleEntry | undefined> {
    const [updatedEntry] = await this.database
      .update(storyBibleEntries)
      .set({ ...entryUpdate, revision: sql`${storyBibleEntries.revision} + 1`, updatedAt: new Date() })
      .where(and(eq(storyBibleEntries.id, id), baseCondition(storyBibleEntries, base)))
      .returning();
    return updatedEntry;
  }

  async deleteStoryBibleEntry(id: number): Promise<boolean> {
    const result = await this.database.delete(storyBibleEntries).where(eq(storyBibleEntries.id, id));
    return !!result;
  }
  
  // Plot Structure Template methods
  async getPlotStructureTemplate(id: number): Promise<PlotStructureTemplate | undefined> {
    const [template] = await this.database.select().from(plotStructureTemplates).where(eq(plotStructureTemplates.id, id));
    return template;
  }
  
  async getAllPlotStructureTemplates(): Promise<PlotStructureTemplate[]> {
    return this.database.select().from(plotStructureTemplates);
  }
  
  async createPlotStructureTemplate(template: InsertPlotStructureTemplate): Promise<PlotStructureTemplate> {
    const [newTemplate] = await this.database.insert(plotStructureTemplates).values(template).returning();
    return newTemplate;
  }
  
  async updatePlotStructureTemplate(id: number, templateUpdate: Partial<PlotStructureTemplate>): Promise<PlotStructureTemplate | undefined> {
    const [updatedTemplate] = await this.database
      .update(plotStructureTemplates)
      .set({ ...templateUpdate, updatedAt: new Date() })
      .where(eq(plotStructureTemplates.id, id))
      .returning();
    return updatedTemplate;
  }
  
  async deletePlotStructureTemplate(id: number): Promise<boolean> {
    const result = await this.database.delete(plotStructureTemplates).where(eq(plotStructureTemplates.id, id));
    return !!result;
  }
  
  // Plot Structure methods
  async getPlotStructure(id: number): Promise<PlotStructure | undefined> {
    const [structure] = await this.database.select().from(plotStructures).where(eq(plotStructures.id, id));
    return structure;
  }
  
  async getProjectPlotStructures(projectId: number): Promise<PlotStructure[]> {
    return this.database
      .select()
      .from(plotStructures)
      .where(eq(plotStructures.projectId, projectId));
  }
  
  async createPlotStructure(structure: InsertPlotStructure): Promise<PlotStructure> {
    const [newStructure] = await this.database.insert(plotStructures).values(structure).returning();
    return newStructure;
  }
  
  async updatePlotStructure(id: number, structureUpdate: Partial<PlotStructure>, base?: Record<string, unknown>): Promise<PlotStructure | undefined> {
    const [updatedStructure] = await this.database
      .update(plotStructures)
      .set({ ...structureUpdate, revision: sql`${plotStructures.revision} + 1`, updatedAt: new Date() })
      .where(and(eq(plotStructures.id, id), baseCondition(plotStructures, base)))
      .returning();
    return updatedStructure;
  }
  
  async deletePlotStructure(id: number): Promise<boolean> {
    const result = await this.database.delete(plotStructures).where(eq(plotStructures.id, id));
    return !!result;
  }
  
  // Plot Structure Section methods
  async getPlotStructureSection(id: number): Promise<PlotStructureSection | undefined> {
    const [section] = await this.database.select().from(plotStructureSections).where(eq(plotStructureSections.id, id));
    return section;
  }
  
  async getPlotStructureSections(plotStructureId: number): Promise<PlotStructureSection[]> {
    return this.database
      .select()
      .from(plotStructureSections)
      .where(eq(plotStructureSections.plotStructureId, plotStructureId))
      .orderBy(plotStructureSections.order);
  }
  
  async createPlotStructureSection(section: InsertPlotStructureSection): Promise<PlotStructureSection> {
    const [newSection] = await this.database.insert(plotStructureSections).values(section).returning();
    return newSection;
  }
  
  async updatePlotStructureSection(id: number, sectionUpdate: Partial<PlotStructureSection>, base?: Record<string, unknown>): Promise<PlotStructureSection | undefined> {
    const [updatedSection] = await this.database
      .update(plotStructureSections)
      .set({ ...sectionUpdate, revision: sql`${plotStructureSections.revision} + 1`, updatedAt: new Date() })
      .where(and(eq(plotStructureSections.id, id), baseCondition(plotStructureSections, base)))
      .returning();
    return updatedSection;
  }
  
  async deletePlotStructureSection(id: number): Promise<boolean> {
    const result = await this.database.delete(plotStructureSections).where(eq(plotStructureSections.id, id));
    return !!result;
  }
}


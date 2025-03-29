import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Project schema
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isArchived: boolean("is_archived").default(false),
  isTrashed: boolean("is_trashed").default(false),
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  title: true,
  description: true,
  userId: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Chapter schema
export const chapters = pgTable("chapters", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").default(""),
  projectId: integer("project_id").notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isDraft: boolean("is_draft").default(true),
});

export const insertChapterSchema = createInsertSchema(chapters).pick({
  title: true,
  content: true,
  projectId: true,
  order: true,
  isDraft: true,
});

export type InsertChapter = z.infer<typeof insertChapterSchema>;
export type Chapter = typeof chapters.$inferSelect;

// Whiteboard schema - stores canvas objects as JSON
export const whiteboards = pgTable("whiteboards", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  name: text("name").notNull(),
  canvasData: jsonb("canvas_data").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWhiteboardSchema = createInsertSchema(whiteboards).pick({
  projectId: true,
  name: true,
  canvasData: true,
});

export type InsertWhiteboard = z.infer<typeof insertWhiteboardSchema>;
export type Whiteboard = typeof whiteboards.$inferSelect;

// Outline schema - hierarchical structure for story outlining
export const outlineItems = pgTable("outline_items", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  title: text("title").notNull(),
  content: text("content").default(""),
  parentId: integer("parent_id"),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOutlineItemSchema = createInsertSchema(outlineItems).pick({
  projectId: true,
  title: true,
  content: true,
  parentId: true,
  order: true,
});

export type InsertOutlineItem = z.infer<typeof insertOutlineItemSchema>;
export type OutlineItem = typeof outlineItems.$inferSelect;

// Story Bible schema - for storing character/setting/etc. info
export const storyBibleEntries = pgTable("story_bible_entries", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  entryType: text("entry_type").notNull(), // character, location, item, etc.
  title: text("title").notNull(),
  content: text("content").default(""),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertStoryBibleEntrySchema = createInsertSchema(storyBibleEntries).pick({
  projectId: true,
  entryType: true,
  title: true,
  content: true,
});

export type InsertStoryBibleEntry = z.infer<typeof insertStoryBibleEntrySchema>;
export type StoryBibleEntry = typeof storyBibleEntries.$inferSelect;

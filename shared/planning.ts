import { z } from "zod";

export const GENRES = ["Fantasy", "Science Fiction", "Mystery", "Thriller", "Romance", "Horror", "Historical", "Literary Fiction", "Nonfiction", "Other"] as const;
export const projectSettingsSchema = z.object({
  author: z.string().trim().max(200).default(""),
  genre: z.union([z.enum(GENRES), z.literal("")]).default(""),
  targetWordCount: z.number().int().min(1).max(2000000).default(80000),
}).strict();
export type ProjectSettings = z.infer<typeof projectSettingsSchema>;
const title = z.string().trim().min(1, "Enter a title.").max(500);
export const positiveId = z.number().int().positive().max(2147483647);
export const newProjectSchema = z.object({
  requestId: z.string().uuid(), title, description: z.string().max(10000).default(""), settings: projectSettingsSchema,
}).strict();
export type NewProjectInput = z.infer<typeof newProjectSchema>;
export const sceneCreateSchema = z.object({
  requestId: z.string().uuid(), chapterId: positiveId, title,
  summary: z.string().max(20000).default(""), linkedSectionId: positiveId.nullable().default(null),
}).strict();
export const scenePatchSchema = z.object({ title: title.optional(), content: z.string().max(5000000).optional(), summary: z.string().max(20000).optional() }).strict();
export const blueprintSchema = z.object({
  requestId: z.string().uuid(), structureId: positiveId, snapshot: z.string().length(64),
  chapters: z.array(z.object({ title, scenes: z.array(z.object({
    title, summary: z.string().max(20000), sectionId: positiveId,
  }).strict()).min(1).max(100) }).strict()).min(1).max(100),
}).strict().refine(value => value.chapters.reduce((sum, chapter) => sum + chapter.scenes.length, 0) <= 500, "Build at most 500 scenes at a time.");
export type BlueprintInput = z.infer<typeof blueprintSchema>;
export interface BlueprintSource {
  structure: { id: number; name: string; revision: number };
  sections: Array<{ id: number; title: string; content: string | null; revision: number; guidance: string }>;
  chapters: Array<{ id: number; title: string; order: number; revision: number }>;
  snapshot: string;
}
export interface BlueprintResult { projectId: number; chapterIds: number[]; sceneIds: number[] }

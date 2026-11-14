import { z } from "zod";

export const chapterCopyRequest = z.object({ requestId: z.string().uuid(), snapshot: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
export type ChapterCopyRequest = z.infer<typeof chapterCopyRequest>;
export type ChapterCopySource = { snapshot: string };
export type ChapterCopyResult = { chapterId: number; firstSceneId: number | null; title: string };

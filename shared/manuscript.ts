import { z } from "zod";
import { positiveId } from "./planning";
export const manuscriptOrderSchema = z.object({
  snapshot: z.string().length(64),
  chapters: z.array(z.object({ id: positiveId, sceneIds: z.array(positiveId).max(10000) }).strict()).max(10000),
}).strict();
export type ManuscriptOrder = z.infer<typeof manuscriptOrderSchema>["chapters"];
export interface ManuscriptStructure {
  snapshot: string;
  chapters: Array<{ id: number; title: string; writingMode: "chapter" | "scenes"; scenes: Array<{ id: number; title: string }> }>;
}

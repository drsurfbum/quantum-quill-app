import { z } from "zod";

export const pickerKind = z.enum(["plan", "plot", "bible", "outline"]);
export const sourceKind = z.enum(["brief", ...pickerKind.options, "scene", "chapter"]);
export type PickerKind = z.infer<typeof pickerKind>;
export type SourceKind = z.infer<typeof sourceKind>;
export const sourceLabels: Record<SourceKind, string> = {
  brief: "Project brief",
  plan: "Scene plan",
  plot: "Plot point",
  bible: "Bible entry",
  outline: "Outline note",
  scene: "Saved scene prose",
  chapter: "Saved chapter prose",
};
const id = z.number().int().positive().max(2147483647);
export const sourceRef = z.object({ kind: sourceKind, id }).strict();
export type SourceRef = z.infer<typeof sourceRef>;
export const MAX_SOURCES = 4;
export const SOURCE_CHARS = 2400;
export const QUESTION_CHARS = 1500;
export const ANSWER_CHARS = 6000;
export type Snapshot = SourceRef & { title: string; version: string; text: string; digest: string };
const chosen = sourceRef.extend({ digest: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
export const questionSchema = z
  .object({
    workspace: z.enum(["Write", "Outline", "Storyboard", "Story Bible", "Overview"]),
    question: z.string().trim().min(1).max(QUESTION_CHARS),
    manuscript: z.boolean(),
    sources: z.array(chosen).max(MAX_SOURCES),
    passage: z
      .object({ kind: z.enum(["chapter", "scene"]), id, text: z.string().trim().min(1).max(SOURCE_CHARS) })
      .strict()
      .optional(),
  })
  .strict()
  .refine(
    (q) =>
      q.sources.length + Number(!!q.passage) <= MAX_SOURCES &&
      new Set(q.sources.map((s) => s.kind + s.id)).size === q.sources.length &&
      (q.manuscript || (!q.passage && !q.sources.some((s) => isProse(s.kind)))),
    "Check manuscript consent and source limits.",
  );
export type Question = z.infer<typeof questionSchema>;
export type Workspace = Question["workspace"];
export const isProse = (kind: SourceKind) => kind === "chapter" || kind === "scene";
export type AssistantEvent =
  | { type: "sources"; sources: Snapshot[] }
  | { type: "text"; text: string }
  | { type: "done" }
  | { type: "error" };

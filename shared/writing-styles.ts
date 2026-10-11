import { z } from "zod";

export const WRITING_FONTS = [
  { id: "sans", name: "Modern Sans", family: 'Arial, Helvetica, sans-serif' },
  { id: "book", name: "Book Serif", family: 'Georgia, "Times New Roman", serif' },
  { id: "literary", name: "Literary", family: '"Palatino Linotype", "Book Antiqua", Palatino, serif' },
  { id: "classic", name: "Classic", family: 'Baskerville, "Times New Roman", serif' },
  { id: "manuscript", name: "Manuscript", family: '"Times New Roman", Times, serif' },
  { id: "typewriter", name: "Typewriter", family: '"Courier New", Courier, monospace' },
] as const;
const color = z.string().regex(/^#[0-9a-f]{6}$/i).nullable();
export const writingStyleSchema = z.object({
  font: z.enum(["sans", "book", "literary", "classic", "manuscript", "typewriter"]),
  size: z.number().int().min(8).max(72),
  bold: z.boolean(), italic: z.boolean(), underline: z.boolean(), strike: z.boolean(),
  color, highlight: color,
  alignment: z.enum(["left", "center", "right", "justify"]),
  lineHeight: z.enum(["1", "1.15", "1.5", "1.7", "2"]),
  spaceAfter: z.enum(["0", "8", "16", "24"]),
  firstLine: z.boolean(),
}).strict();
export type WritingStyle = z.infer<typeof writingStyleSchema>;
export const saveWritingStyleSchema = z.object({ name: z.string().trim().min(1).max(80), definition: writingStyleSchema }).strict();
export type SaveWritingStyle = z.infer<typeof saveWritingStyleSchema>;
export const DEFAULT_WRITING_STYLE: WritingStyle = {
  font: "sans", size: 12, bold: false, italic: false, underline: false, strike: false,
  color: null, highlight: null, alignment: "left", lineHeight: "1.7", spaceAfter: "16", firstLine: false,
};
export const QUILL_STYLES: Array<{ id: string; name: string; mood: string; sample: string; definition: WritingStyle }> = [
  { id: "austen", name: "Austen · Correspondence", mood: "Poised serif · a little room for wit", sample: "The invitation arrived with entirely too much confidence.", definition: { ...DEFAULT_WRITING_STYLE, font: "classic", size: 13, lineHeight: "1.7", firstLine: true } },
  { id: "poe", name: "Poe · Midnight", mood: "Literary serif · intimate and atmospheric", sample: "At midnight, the house remembered a voice.", definition: { ...DEFAULT_WRITING_STYLE, font: "literary", size: 13, italic: true, lineHeight: "1.7" } },
  { id: "hemingway", name: "Hemingway · Dispatch", mood: "Clean manuscript · spare and direct", sample: "The rain stopped. We went down to the water.", definition: { ...DEFAULT_WRITING_STYLE, font: "manuscript", size: 12, lineHeight: "1.5", spaceAfter: "8" } },
  { id: "fantasy", name: "Epic · Chronicle", mood: "Bookish serif · space for a larger world", sample: "Beyond the last watchtower, the old road began.", definition: { ...DEFAULT_WRITING_STYLE, font: "literary", size: 14, lineHeight: "1.7", firstLine: true } },
  { id: "noir", name: "Noir · Casefile", mood: "Typewriter · a crisp, hard-boiled rhythm", sample: "She left a key, a matchbook, and no explanation.", definition: { ...DEFAULT_WRITING_STYLE, font: "typewriter", size: 12, lineHeight: "1.5", spaceAfter: "8" } },
  { id: "scifi", name: "Orbital · Logbook", mood: "Modern sans · precise and open", sample: "Day 41. A second signal answered from the dark.", definition: { ...DEFAULT_WRITING_STYLE, font: "sans", size: 12, lineHeight: "1.5", spaceAfter: "16" } },
];

/** Stable IDs only. Display words are manuscript text, never copied entry data. */
export const BIBLE_LINK_ATTRIBUTE = "data-qq-entry";
export function bibleLinkId(value: unknown): number | null {
  if (!/^[1-9]\d*$/.test(String(value ?? ""))) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
}
export type WritingUse = { resource: "chapters" | "scenes"; id: number; chapterId: number; title: string; chapterTitle: string };

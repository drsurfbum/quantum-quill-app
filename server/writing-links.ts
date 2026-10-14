import { parseDocument } from "htmlparser2";
import { BIBLE_LINK_ATTRIBUTE, bibleLinkId, type WritingUse } from "@shared/writing-links";
import { legacyClassification } from "@shared/bible-contract";
import type { IStorage } from "./storage";

export function writingLinkCounts(content: string | null | undefined) {
  const counts = new Map<number, number>();
  const visit = (node: any) => {
    if (node.name === "span" && BIBLE_LINK_ATTRIBUTE in node.attribs) {
      const id = bibleLinkId(node.attribs[BIBLE_LINK_ATTRIBUTE]);
      if (!id) throw Object.assign(new Error("An inline Story Bible link has an invalid ID. Remove that link and choose an entry again."), {status:400});
      counts.set(id, (counts.get(id) || 0) + 1);
    }
    for (const child of node.children || []) visit(child);
  };
  visit(parseDocument(content || ""));
  return counts;
}
/** Called under the project lock, shared with entry deletion/archive. No original is rewritten. */
export async function validateWritingLinks(storage: IStorage, projectId: number, content: string | null | undefined, previous?: string | null) {
  if (content === undefined) return;
  const before = writingLinkCounts(previous);
  for (const [id] of writingLinkCounts(content)) {
    const entry = await storage.getStoryBibleEntry(id);
    if (!entry || entry.projectId !== projectId) throw Object.assign(new Error("Inline links must point to an existing Story Bible entry in this project. Remove the unavailable link; your words can stay."), {status:400,code:"INVALID_WRITING_LINK"});
    if (legacyClassification(entry).archived && !before.has(id)) throw Object.assign(new Error("Restore the archived entry before adding another inline link to it."), {status:400,code:"ARCHIVED_WRITING_LINK"});
  }
}
export async function writingUses(storage: IStorage, projectId: number, entryId: number): Promise<WritingUse[]> {
  const chapters = (await storage.getProjectChapters(projectId)).sort((a,b)=>a.order-b.order || a.id-b.id);
  const scenes = await storage.getProjectScenes(projectId);
  return chapters.flatMap(chapter => [
    ...(writingLinkCounts(chapter.content).has(entryId) ? [{resource:"chapters" as const,id:chapter.id,chapterId:chapter.id,title:chapter.title,chapterTitle:chapter.title}] : []),
    ...scenes.filter(s=>s.chapterId===chapter.id).sort((a,b)=>a.order-b.order || a.id-b.id).filter(s=>writingLinkCounts(s.content).has(entryId)).map(s=>({resource:"scenes" as const,id:s.id,chapterId:chapter.id,title:s.title,chapterTitle:chapter.title})),
  ]);
}

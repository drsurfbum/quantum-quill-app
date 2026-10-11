import { matchesBase } from "@shared/draft";
import type { IStorage } from "./storage";
import type { StoryBibleEntry } from "@shared/schema";
import { bibleLinks, prepareBiblePatch, type BibleLink } from "@shared/story-bible";
function reject(message: string): never { throw Object.assign(new Error(message), { status: 400 }); }
const signature = (link: BibleLink) => `${link.field}:${link.targetId}:${link.targetType || ""}`;
async function validateLinks(storage: IStorage, current: Partial<StoryBibleEntry>, next: Partial<StoryBibleEntry>) {
  const previous = new Set(bibleLinks(current).map(signature));
  for (const link of bibleLinks(next)) {
    // Existing broken legacy references do not block unrelated writing. New or
    // changed references must be valid; removing old broken links is always safe.
    if (previous.has(signature(link))) continue;
    if (!Number.isSafeInteger(link.targetId) || link.targetId <= 0) reject("Relationship must reference a valid entry ID");
    if (link.targetId === next.id) reject("An entry cannot link to itself");
    const target = await storage.getStoryBibleEntry(link.targetId);
    if (!target || target.projectId !== next.projectId) reject("Linked entries must belong to this project");
    if (link.targetType && target.entryType !== link.targetType) reject(`This relationship requires an entry of type ${link.targetType}`);
    if (link.parent) {
      const seen = new Set<number>();
      const visit = async (entry: StoryBibleEntry): Promise<void> => {
        if (entry.id === next.id) reject("Parent would create a cycle");
        if (seen.has(entry.id)) return;
        seen.add(entry.id);
        for (const parent of bibleLinks(entry).filter(item => item.parent)) {
          const ancestor = await storage.getStoryBibleEntry(parent.targetId);
          if (ancestor && ancestor.projectId === next.projectId) await visit(ancestor);
        }
      };
      await visit(target);
    }
  }
  if (current.entryType && next.entryType !== current.entryType) {
    const incoming = (await storage.getProjectStoryBible(next.projectId!)).flatMap(bibleLinks).filter(link => link.targetId === current.id);
    if (incoming.some(link => link.targetType && link.targetType !== next.entryType)) reject("Remove typed relationships before changing this entry's type");
  }
}
export async function createBibleEntry(storage: IStorage, data: any) {
  return storage.withProjectLock(data.projectId, async scoped => {
    const prepared = { ...data, ...prepareBiblePatch({}, data) };
    await validateLinks(scoped, {}, prepared);
    return scoped.createStoryBibleEntry(prepared);
  });
}
export async function updateBibleEntry(storage: IStorage, id: number, patch: Partial<StoryBibleEntry>, base?: Record<string, unknown>) {
  const entry = await storage.getStoryBibleEntry(id); if (!entry) return;
  return storage.withProjectLock(entry.projectId, async scoped => {
    const current = await scoped.getStoryBibleEntry(id); if (!current) return;
    if (!matchesBase(current, base)) return;
    const prepared = prepareBiblePatch(current, patch);
    await validateLinks(scoped, current, { ...current, ...prepared });
    // Derived mirrored fields participate in the same atomic update too.
    const expected = base && { ...Object.fromEntries(Object.keys(prepared).map(key => [key, current[key as keyof StoryBibleEntry]])), ...base };
    return scoped.updateStoryBibleEntry(id, prepared, expected);
  });
}
export async function deleteBibleEntry(storage: IStorage, id: number) {
  const entry = await storage.getStoryBibleEntry(id); if (!entry) return false;
  return storage.withProjectLock(entry.projectId, async scoped => {
    const incoming = (await scoped.getProjectStoryBible(entry.projectId)).filter(other => other.id !== id && bibleLinks(other).some(link => link.targetId === id));
    if (incoming.length) throw Object.assign(new Error(`Remove incoming relationships first (${incoming.length} linked entries). You can archive this entry instead.`), { status: 409 });
    return scoped.deleteStoryBibleEntry(id);
  });
}

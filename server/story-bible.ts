import { insertStoryBibleEntrySchema } from "@shared/schema";
import { writingUses } from "./writing-links";
import { assertHierarchy, projectRelationships } from "./relationships";
import { resolvedRelationships } from "@shared/relationships";
import { legacyClassification } from "@shared/bible-contract";
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
    if (legacyClassification(target).archived) reject("Restore the archived target before adding a relationship");
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
    if (patch.entryType && patch.entryType !== current.entryType) throw Object.assign(new Error("Changing entry type requires a conversion preview. Use Preview conversion; the original record will be retained."), { status: 400, code: "CONVERSION_REQUIRED" });
    if (!matchesBase(current, base)) return;
    const prepared = prepareBiblePatch(current, patch);
    // Validate new parent changes against both the overlay and legacy formats.
    const next = { ...current, ...prepared };
    if (JSON.stringify(bibleLinks(current).filter(link => link.parent || link.field.endsWith("childElements"))) !== JSON.stringify(bibleLinks(next).filter(link => link.parent || link.field.endsWith("childElements")))) {
      const entries = await scoped.getProjectStoryBible(current.projectId);
      assertHierarchy(resolvedRelationships(entries.map(entry => entry.id === id ? next : entry), await scoped.getBibleRelationships(current.projectId)));
    }
    await validateLinks(scoped, current, { ...current, ...prepared });
    // Derived mirrored fields participate in the same atomic update too.
    const expected = base && { ...Object.fromEntries(Object.keys(prepared).map(key => [key, current[key as keyof StoryBibleEntry]])), ...base };
    return scoped.updateStoryBibleEntry(id, prepared, expected);
  });
}
export async function deleteBibleEntry(storage: IStorage, id: number) {
  const entry = await storage.getStoryBibleEntry(id); if (!entry) return false;
  return storage.withProjectLock(entry.projectId, async scoped => {
    const mentions = await writingUses(scoped, entry.projectId, id);
    if (mentions.length) throw Object.assign(new Error(`This entry is mentioned in ${mentions.length} writing document(s). Remove those inline links first, or archive it to preserve the references.`), {status:409,code:"ENTRY_LINKED"});
    const sceneLinks = (await scoped.getProjectSceneContexts(entry.projectId)).filter(row=>row.links.some(link=>link.entryId===id));
    if (sceneLinks.length) throw Object.assign(new Error(`This entry is used in ${sceneLinks.length} scene(s). Remove those scene references first, or archive the entry to preserve them.`), {status:409,code:"ENTRY_LINKED"});
    const connected = (await projectRelationships(scoped, entry.projectId)).filter(link => link.sourceId === id || link.targetId === id);
    if (connected.length) throw Object.assign(new Error(`Remove incoming relationships and outgoing links first (${connected.length} relationships). Archive this entry to preserve its connections instead.`), { status: 409, code: "ENTRY_LINKED" });
    return scoped.deleteStoryBibleEntry(id);
  });
}

/** A retry with the same name/type reuses the active stub under the project lock. */
export async function createBibleStub(storage:IStorage, projectId:number, title:string, entryType:string) {
  return storage.withProjectLock(projectId,async scoped=>{
    const matches=(await scoped.getProjectStoryBible(projectId)).filter(entry=>entry.entryType===entryType && entry.title.trim().toLocaleLowerCase()===title.trim().toLocaleLowerCase());
    if(matches.length>1) throw Object.assign(new Error("Several entries already have this name. Choose the intended entry from search."),{status:409});
    if(matches[0]) {
      if(legacyClassification(matches[0]).archived) throw Object.assign(new Error("An archived entry already has this name. Restore it in Story Bible or use a different name."),{status:409});
      return matches[0];
    }
    const data={projectId,title,entryType,content:"",metadata:{}};
    return scoped.createStoryBibleEntry(insertStoryBibleEntrySchema.parse({...data,...prepareBiblePatch({},data)}));
  });
}

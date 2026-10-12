import { createHash } from "node:crypto";
import { canonical } from "@shared/draft";
import type { IStorage } from "./storage";
import type { StoryBibleEntry, BibleRelationshipRow } from "@shared/schema";
import { availableRelationshipTypes, targetTypes, resolvedRelationships, type Relationship, type RelationshipInput } from "@shared/relationships";
import { legacyClassification } from "@shared/bible-contract";

function reject(status: number, message: string, code = "INVALID_RELATIONSHIP"): never { throw Object.assign(new Error(message), { status, code }); }
export async function projectRelationships(storage: IStorage, projectId: number) {
  return resolvedRelationships(await storage.getProjectStoryBible(projectId), await storage.getBibleRelationships(projectId));
}
export function validateRelationship(input: RelationshipInput, entries: StoryBibleEntry[], links: Relationship[], exceptId?: string) {
  const source = entries.find(entry => entry.id === input.sourceId), target = entries.find(entry => entry.id === input.targetId);
  if (!source || !target || source.projectId !== target.projectId) reject(400, "Both entries must belong to this project.");
  if (source.id === target.id) reject(400, "An entry cannot link to itself.");
  if (legacyClassification(source).archived || legacyClassification(target).archived) reject(409, "Restore archived entries before adding or editing their relationships. Existing links remain available.", "ENTRY_ARCHIVED");
  if (!availableRelationshipTypes(source.entryType).includes(input.relationshipType)) reject(400, `This relationship is not available for ${source.entryType}.`);
  if (!targetTypes(input.relationshipType, source.entryType).includes(target.entryType)) reject(400, `Choose a target of type ${targetTypes(input.relationshipType, source.entryType).join(" or ")}.`);
  const other = links.filter(link => link.id !== exceptId);
  if (other.some(link => link.sourceId === input.sourceId && link.targetId === input.targetId && link.relationshipType === input.relationshipType && link.startDate === input.startDate && link.endDate === input.endDate)) reject(409, "This relationship already exists. Edit its role or context instead.", "DUPLICATE_RELATIONSHIP");
  if (input.relationshipType === "parent") {
    if (other.some(link => link.sourceId === input.sourceId && link.relationshipType === "parent" && link.targetId !== input.targetId)) reject(409, "Remove or edit the current parent before choosing another.");
    assertHierarchy([...other, input]);
  }
}
export function assertHierarchy(links: Array<Pick<RelationshipInput, "sourceId" | "targetId" | "relationshipType">>) {
  const edges = new Map<number, number[]>();
  for (const link of links) if (link.relationshipType === "parent") edges.set(link.sourceId, [...(edges.get(link.sourceId) || []), link.targetId]);
  const done = new Set<number>(), active = new Set<number>();
  const visit = (id: number) => {
    if (active.has(id)) reject(400, "Parent would create a hierarchy cycle.", "RELATIONSHIP_CYCLE");
    if (done.has(id)) return;
    active.add(id); for (const target of edges.get(id) || []) visit(target); active.delete(id); done.add(id);
  };
  for (const id of edges.keys()) visit(id);
}
function stored(link: Relationship, revision: number, isDeleted = false, requestHash: string | null = null): BibleRelationshipRow {
  return { id: link.id, projectId: link.projectId, sourceId: link.sourceId, targetId: link.targetId, relationshipType: link.relationshipType, role: link.role, context: link.context, startDate: link.startDate, endDate: link.endDate,
    revision, isDeleted, requestHash, legacyPayload: link.legacy || null };
}
export async function createRelationship(storage: IStorage, projectId: number, input: Omit<RelationshipInput, "targetId"> & { targetId?: number }, requestId: string, stub?: { title: string; entryType: string }) {
  return storage.withProjectLock(projectId, async scoped => {
    const id = `link:${requestId}`;
    const requestHash = createHash("sha256").update(canonical({ input, stub })).digest("hex");
    const rows = await scoped.getBibleRelationships(projectId);
    const prior = rows.find(row => row.id === id);
    // Retry after a lost response must never create a second stub or resurrect a removal.
    if (prior) {
      if (prior.requestHash !== requestHash || prior.isDeleted || prior.sourceId !== input.sourceId || prior.relationshipType !== input.relationshipType) reject(409, "This request has already been used. Refresh relationships before retrying.");
      return (await projectRelationships(scoped, projectId)).find(link => link.id === id)!;
    }
    const entries = await scoped.getProjectStoryBible(projectId);
    const links = resolvedRelationships(entries, rows);
    let targetId = input.targetId;
    if (stub) {
      if (entries.some(entry => entry.entryType === stub.entryType && entry.title.trim().toLocaleLowerCase() === stub.title.trim().toLocaleLowerCase())) reject(409, "An entry with this name and type already exists. Choose it from search.", "STUB_EXISTS");
      // Validate all constraints before creating anything (also protects MemStorage).
      const temporary = { id: -1, projectId, entryType: stub.entryType, isArchived: false, metadata: {}, content: "" } as StoryBibleEntry;
      validateRelationship({ ...input, targetId: -1 }, [...entries, temporary], links);
      const target = await scoped.createStoryBibleEntry({ projectId, entryType: stub.entryType, title: stub.title, metadata: { _stub: true }, content: "" });
      entries.push(target); targetId = target.id;
    }
    const data = { ...input, targetId: targetId! };
    validateRelationship(data, entries, links);
    const link: Relationship = { ...data, id, projectId, revision: 1, version: "stored:1" };
    await scoped.putBibleRelationship(stored(link, 1, false, requestHash));
    return link;
  });
}
export async function changeRelationship(storage: IStorage, projectId: number, id: string, version: string, input?: RelationshipInput) {
  return storage.withProjectLock(projectId, async scoped => {
    const entries = await scoped.getProjectStoryBible(projectId), rows = await scoped.getBibleRelationships(projectId);
    const links = resolvedRelationships(entries, rows), current = links.find(link => link.id === id);
    if (!current) reject(404, "This relationship is no longer available.");
    if (current.version !== version) reject(409, "This relationship changed elsewhere. Reload relationships and review your edits before saving again.", "REVISION_CONFLICT");
    if (input && input.sourceId !== current.sourceId) reject(400, "A relationship's source cannot be changed. Remove it and create a new link.");
    if (input) validateRelationship(input, entries, links, current.id);
    const next = { ...current, ...input, revision: current.revision + 1 };
    await scoped.putBibleRelationship(stored(next, next.revision, !input, rows.find(row => row.id === id)?.requestHash || null));
    return { ...next, version: `stored:${next.revision}` };
  });
}

import { legacyClassification } from "./bible-contract";
import { z } from "zod";
import type { StoryBibleEntry } from "./schema";
import { canonical } from "./draft";
import { ENHANCED_TAXONOMY } from "./enhanced-taxonomy";
export const BIBLE_SCHEMA_VERSION = 1;
export const structuredTypes = new Set(["events", "world_elements", "details", "research"]);
const narrativeFields: Record<string, string> = { events: "narrativeContext", world_elements: "shortNotes", details: "content", research: "detailedNotes" };
export function objectData(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}
export function parseContent(content: string | null | undefined): Record<string, any> | undefined {
  try { const data = JSON.parse(content || ""); return data && typeof data === "object" && !Array.isArray(data) ? data : undefined; } catch { return undefined; }
}
/** Compatibility reader: never mutates or rewrites a recovered record. */
export function readBibleFields(entry: Pick<StoryBibleEntry, "entryType" | "content" | "metadata" | "tags" | "isArchived">) {
  if (!structuredTypes.has(entry.entryType)) return objectData(entry.metadata);
  const parsed = parseContent(entry.content);
  const classification = legacyClassification(entry);
  return { ...objectData(entry.metadata), ...(parsed || (entry.content ? { [narrativeFields[entry.entryType]]: entry.content } : {})), tags: classification.tags, isArchived: classification.archived };
}
export { bibleFieldSchemas } from "./bible-field-schemas";
import { bibleFieldSchemas, bibleMetadataSchemas } from "./bible-field-schemas";
/** Validate changed known fields, retaining unknown and malformed historical fields
 * that were not edited. The version identifies the compatible envelope, not a migration.
 */
function validateChanged(type: string, previous: Record<string, any>, next: Record<string, any>, metadata = false) {
  const schema = (metadata ? bibleMetadataSchemas : bibleFieldSchemas)[type]; if (!schema) return;
  for (const [key, value] of Object.entries(next)) {
    if (canonical(previous[key]) === canonical(value)) continue;
    const validator = Object.hasOwn(schema.shape, key) ? schema.shape[key] as z.ZodTypeAny : undefined;
    if (validator) {
      const checked = validator.safeParse(value);
      if (!checked.success) throw new z.ZodError(checked.error.issues.map(issue => ({ ...issue, path: [type, key, ...issue.path] })));
    }
  }
}
export function prepareBiblePatch(previous: Partial<StoryBibleEntry>, patch: Partial<StoryBibleEntry>) {
  const result = { ...patch }; const type = patch.entryType || previous.entryType || "";
  if (patch.metadata === null) throw new z.ZodError([{ code: "custom", path: [type, "metadata"], message: "Use an object patch; null would discard retained legacy fields." }]);
  if (patch.metadata !== undefined && patch.metadata !== null) {
    const old = objectData(previous.metadata);
    if (old._schemaVersion !== undefined) z.literal(1).parse(old._schemaVersion);
    const next = { ...old, ...objectData(patch.metadata) };
    // Generic legacy editors also store taxonomy fields in metadata for JSON types.
    validateChanged(type, old, next, true);
    next._schemaVersion = BIBLE_SCHEMA_VERSION; result.metadata = next;
  }
  if (structuredTypes.has(type)) {
    const old = parseContent(previous.content); const next = parseContent(patch.content);
    if (old && patch.content !== undefined && !next) throw new z.ZodError([{ code: "custom", path: [type, "content"], message: "Edit narrative fields inside the structured object; replacing it with prose would remove other fields." }]);
    for (const field of ["tags", "isArchived"] as const) {
      if (next && field in next && patch[field] !== undefined && canonical(next[field]) !== canonical(patch[field] ?? (field === "tags" ? [] : false))) throw new z.ZodError([{ code: "custom", path: [type, field], message: "The structured and top-level values disagree. Send one consistent value." }]);
    }
    if (old?._schemaVersion !== undefined && (next || patch.tags !== undefined || patch.isArchived !== undefined)) z.literal(1).parse(old._schemaVersion);
    if (next || ((patch.tags !== undefined || patch.isArchived !== undefined) && old)) {
      const merged = { ...(old || {}), ...(next || {}) };
      if (!old && previous.content && next) merged._legacyContent = previous.content;
      if (patch.tags !== undefined) merged.tags = patch.tags || [];
      if (patch.isArchived !== undefined) merged.isArchived = !!patch.isArchived;
      validateChanged(type, old || {}, merged);
      merged._schemaVersion = BIBLE_SCHEMA_VERSION;
      result.content = JSON.stringify(merged);
      if (Array.isArray(merged.tags)) result.tags = merged.tags;
      if (typeof merged.isArchived === "boolean") result.isArchived = merged.isArchived;
    }
  }
  return result;
}
export type BibleLink = { field: string; targetId: number; targetType?: string; parent?: boolean };
function linkId(value: any) { const raw = typeof value === "object" ? value?.id : value; return typeof raw === "number" || typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : NaN; }
/** A single relationship index over both existing storage formats. Free-text names
 * (alliances, subgroups, lore) remain prose; they are never guessed into ID links.
 */
export function bibleLinks(entry: Partial<StoryBibleEntry>): BibleLink[] {
  const links: BibleLink[] = [];
  const add = (field: string, value: any, targetType?: string, parent = false) => {
    if (value === undefined || value === null || value === "") return;
    for (const item of Array.isArray(value) ? value : [value]) links.push({ field, targetId: linkId(item), targetType: targetType === "any" ? undefined : targetType, parent });
  };
  add("relatedEntryIds", entry.relatedEntryIds);
  const metadata = objectData(entry.metadata);
  const taxonomy = Object.values(ENHANCED_TAXONOMY).find(item => item.key === entry.entryType);
  const fields = { ...taxonomy?.fields, ...taxonomy?.categoryFields?.[metadata.category] };
  for (const [key, field] of Object.entries(fields)) if (field.type.endsWith("-linked")) add(`metadata.${key}`, metadata[key], field.linkedTo, ["parentGroup", "parentLocation", "parentElement"].includes(key));
  if (entry.entryType === "locations") add("metadata.nearbyLocations", metadata.nearbyLocations, "locations");
  const data = parseContent(entry.content); if (!data || !structuredTypes.has(entry.entryType || "")) return links;
  const types: Record<string, string> = { locations: "locations", charactersInvolved: "characters", groupsRacesInvolved: "groups_races", worldElements: "world_elements", linkedEvents: "events", majorEvents: "events", affectedLocations: "locations", linkedCharacters: "characters", linkedLocations: "locations", researchReferences: "research", parentElement: "world_elements", childElements: "world_elements" };
  for (const [key, type] of Object.entries(types)) add(`content.${key}`, data[key], type, key === "parentElement");
  for (const key of ["linkedElements", "users"]) if (Array.isArray(data[key])) for (const item of data[key]) {
    const targetType = ({ character: "characters", group: "groups_races" } as Record<string, string>)[item.type] || item.type;
    add(`content.${key}`, item, targetType);
  }
  return links;
}
export function linkedTitle(entries: StoryBibleEntry[] | undefined, id: number, fallback?: string) {
  return entries?.find(entry => entry.id === id)?.title || `${fallback || `Entry ${id}`} (unavailable)`;
}

import { z } from "zod";
import { BIBLE_TYPES } from "./bible-catalog";
import { bibleLinks, objectData, parseContent } from "./story-bible";
import type { StoryBibleEntry, BibleRelationshipRow } from "./schema";

// Direction is always source -> target. Inverse views are backlinks, not copies.
type Definition = { label: string; sources?: readonly string[]; targets?: readonly string[]; hierarchy?: boolean; single?: boolean };
export const RELATIONSHIP_TYPES = {
  related: { label: "Related entry" },
  participant: { label: "Participant", sources: ["events"], targets: ["characters", "groups_races"] },
  consequence: { label: "Consequence / follow-up", sources: ["events"], targets: ["events", "world_elements", "locations", "details"] },
  occurs_at: { label: "Event location", sources: ["events"], targets: ["locations"] },
  member: { label: "Member", sources: ["groups_races"], targets: ["characters"] },
  leader: { label: "Leader", sources: ["groups_races"], targets: ["characters"] },
  affiliation: { label: "Affiliation", sources: ["characters"], targets: ["groups_races"] },
  home: { label: "Home location", sources: ["groups_races", "characters"], targets: ["locations"] },
  ally: { label: "Allied group", sources: ["groups_races"], targets: ["groups_races"] },
  rival: { label: "Rival group", sources: ["groups_races"], targets: ["groups_races"] },
  governed_by: { label: "Governed by", sources: ["locations"], targets: ["characters", "groups_races"] },
  inhabitant: { label: "Inhabitant", sources: ["locations"], targets: ["characters", "groups_races"] },
  nearby: { label: "Nearby location", sources: ["locations"], targets: ["locations"] },
  history: { label: "Historical event", targets: ["events"] },
  used_by: { label: "Used by", sources: ["world_elements"], targets: ["characters", "groups_races"] },
  affects: { label: "Affects location", sources: ["world_elements"], targets: ["locations"] },
  associated: { label: "Associated entry" },
  reference: { label: "Research reference", targets: ["research"] },
  application: { label: "Linked application", sources: ["details", "research"] },
  parent: { label: "Parent", sources: ["groups_races", "locations", "world_elements"], hierarchy: true, single: true },
} satisfies Record<string, Definition>;
export type RelationshipType = keyof typeof RELATIONSHIP_TYPES;
export const relationshipTypes = Object.keys(RELATIONSHIP_TYPES) as RelationshipType[];
export function relationshipDefinition(type: RelationshipType): Definition { return RELATIONSHIP_TYPES[type]; }
export function availableRelationshipTypes(sourceType: string) { return relationshipTypes.filter(type => !relationshipDefinition(type).sources || relationshipDefinition(type).sources!.includes(sourceType)); }
export function targetTypes(type: RelationshipType, sourceType: string): readonly string[] { return type === "parent" ? [sourceType] : relationshipDefinition(type).targets || BIBLE_TYPES; }
const id = z.number().int().positive().max(2147483647);
const shortText = z.string().trim().max(500);
export const relationshipInput = z.object({ sourceId: id, targetId: id, relationshipType: z.enum(relationshipTypes as [RelationshipType, ...RelationshipType[]]), role: shortText.default(""), context: z.string().max(20000).default(""), startDate: shortText.default(""), endDate: shortText.default("") }).strict();
export type RelationshipInput = z.infer<typeof relationshipInput>;
export type Relationship = RelationshipInput & { id: string; projectId: number; revision: number; version: string; legacy?: { field: string; ownerId: number }; unavailable?: boolean };
// Dates are intentional free text: invented calendars, approximate years, and eras
// must remain usable. No Gregorian ordering is guessed.
export function relationshipTypeFor(field: string, type: string): RelationshipType {
  const key = field.split(".").at(-1)!;
  if (["parentGroup", "parentLocation", "parentElement", "childElements"].includes(key)) return "parent";
  if (["charactersInvolved", "groupsRacesInvolved", "groupsInvolved"].includes(key)) return "participant";
  if (key === "locations" && type === "events") return "occurs_at";
  if (["linkedEvents", "worldElements"].includes(key) && type === "events") return "consequence";
  if (key === "notableMembers" || key === "members") return "member";
  if (key === "leaders") return "leader";
  if (key === "affiliation") return "affiliation";
  if (key === "homeLocation") return "home";
  if (key === "nearbyLocations") return "nearby";
  if (["dominantGroups", "notableCharacters"].includes(key)) return "inhabitant";
  if (["governedBy", "controllingGroups"].includes(key)) return "governed_by";
  if (["majorEvents", "historicalEvents", "associatedEvents", "linkedEvents"].includes(key)) return "history";
  if (key === "users") return "used_by";
  if (key === "affectedLocations") return "affects";
  if (key === "researchReferences") return "reference";
  if (key === "linkedElements") return "application";
  return key === "relatedEntryIds" ? "related" : "associated";
}
const textValue = (value: unknown) => typeof value === "string" ? value : "";
/** Projects legacy links without mutating payloads or trusting copied names. */
export function legacyRelationships(entries: StoryBibleEntry[]): Relationship[] {
  return entries.flatMap(entry => {
    const metadata = objectData(entry.metadata), content = parseContent(entry.content) || {};
    const links = bibleLinks(entry);
    // Older specialized Location editors declared these but never indexed them.
    for (const field of ["dominantGroups", "notableCharacters", "governedBy", "historicalEvents"]) {
      const values = metadata[field];
      if (Array.isArray(values)) for (const value of values) {
        const targetId = Number(typeof value === "object" ? value?.id : value);
        if (Number.isSafeInteger(targetId) && targetId > 0) links.push({ field: `metadata.${field}`, targetId });
      }
    }
    const unique = new Set<string>();
    return links.filter(link => Number.isSafeInteger(link.targetId) && link.targetId > 0).flatMap(link => {
      const key = `legacy:${entry.id}:${link.field}:${link.targetId}`;
      if (unique.has(key)) return []; unique.add(key);
      const value = link.field.startsWith("metadata.") ? metadata[link.field.slice(9)] : link.field.startsWith("content.") ? content[link.field.slice(8)] : entry.relatedEntryIds;
      const items = Array.isArray(value) ? value : [value];
      const item = objectData(items.find(item => Number(typeof item === "object" ? item?.id : item) === link.targetId));
      const inverse = link.field === "content.childElements";
      return [{ id: key, projectId: entry.projectId, sourceId: inverse ? link.targetId : entry.id, targetId: inverse ? entry.id : link.targetId,
        relationshipType: relationshipTypeFor(link.field, entry.entryType), role: textValue(item.role || item.relationship), context: textValue(item.context || item.impact || item.notes), startDate: textValue(item.startDate), endDate: textValue(item.endDate),
        revision: 0, version: `legacy:${entry.revision}`, legacy: { field: link.field, ownerId: entry.id },
      } satisfies Relationship];
    });
  });
}
export function resolvedRelationships(entries: StoryBibleEntry[], rows: BibleRelationshipRow[]): Relationship[] {
  const overridden = new Set(rows.map(row => row.id));
  const legacy = legacyRelationships(entries).filter(link => !overridden.has(link.id));
  const stored: Relationship[] = rows.filter(row => !row.isDeleted).map(({ isDeleted, legacyPayload, requestHash, ...row }) => ({ ...row, version: `stored:${row.revision}`, ...(legacyPayload ? { legacy: legacyPayload as Relationship["legacy"] } : {}) }));
  const ids = new Set(entries.map(entry => entry.id));
  return [...legacy, ...stored].map(link => ({ ...link, unavailable: !ids.has(link.sourceId) || !ids.has(link.targetId) }));
}

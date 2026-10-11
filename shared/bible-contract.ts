import { z } from "zod";
import { BIBLE_TYPES, isBibleType, type BibleType } from "./bible-catalog";
import { bibleFieldSchemas } from "./bible-field-schemas";
import { canonical } from "./draft";

export const BIBLE_DOCUMENT_VERSION = 2;
type Source = Record<string, any>;
const object = (value: unknown): Source => value && typeof value === "object" && !Array.isArray(value) ? value as Source : {};
function parsed(content: unknown) { try { return object(JSON.parse(String(content))); } catch { return {}; } }
const hasObjectContent = (entry: Source) => Object.keys(parsed(entry.content)).length > 0 || entry.content?.trim() === "{}";
export const TYPE_ALIASES: Record<string, { type: BibleType; category?: string }> = {
  character: { type: "characters" }, location: { type: "locations" }, event: { type: "events" }, "world-element": { type: "world_elements" },
  group: { type: "groups_races" }, race: { type: "groups_races", category: "species" }, government: { type: "groups_races", category: "government" }, magicSystem: { type: "world_elements", category: "Magic System" },
};
export function proposedType(type: string): BibleType | undefined { return isBibleType(type) ? type : TYPE_ALIASES[type]?.type; }
export const NARRATIVE_FIELDS = new Set(("content notes biography backstory shortSummary shortNotes tagline narrativeContext writerNotes hiddenDetails alternativeVersions researchReminders explanation outcomeNotes detailedNotes nextSteps incorporationPlans teamNotes discoveryOrigin loreHooks idioms rumors nicheFacts culturalNotes purpose ideology physiology leadershipStructure beliefs motivations conflicts personalityTraits appearance clothingStyle distinguishingFeatures summary originStories limitations significance").split(" "));
const defaultNarrative: Record<BibleType, string> = { characters: "biography", groups_races: "history", locations: "description", events: "narrativeContext", world_elements: "description", details: "content", research: "detailedNotes" };
const fieldAliases: Record<string, Record<string, string>> = { groups_races: { foundingDate: "eraEstablished" }, events: { groupsFactions: "groupsRacesInvolved" }, world_elements: { categorySpecific: "categoryDetails" } };
export const classificationFields: Record<string, string> = { category: "category", subcategory: "subcategory", groupCategory: "category", locationType: "category", type: "type", eventType: "type", sourceType: "type", status: "status", visibility: "visibility" };
const jsonTypes = new Set(["events", "world_elements", "details", "research"]);

/** Single precedence rule for OLD representations. It preserves the currently
 * visible embedded value; every disagreement is reported and originals retained.
 * A v2 document has only one tags/archive/classification namespace. */
export function legacyClassification(entry: Source) {
  const data = jsonTypes.has(entry.entryType) ? parsed(entry.content) : {};
  const meta = object(entry.metadata);
  return {
    tags: Array.isArray(data.tags) ? data.tags : Array.isArray(entry.tags) ? entry.tags : Array.isArray(meta.tags) ? meta.tags : [],
    archived: typeof data.isArchived === "boolean" ? data.isArchived : typeof entry.isArchived === "boolean" ? entry.isArchived : typeof meta.isArchived === "boolean" ? meta.isArchived : false,
    category: data.category ?? meta.groupCategory ?? meta.locationType ?? meta.category ?? entry.category ?? null,
    subcategory: entry.subcategory ?? meta.subcategory ?? data.subcategory ?? null,
  };
}
const legacySchema = z.object({ original: z.record(z.unknown()), unmapped: z.record(z.unknown()), conflicts: z.array(z.string()) }).strict();
const documentBase = z.object({
  schemaVersion: z.literal(2), type: z.enum(BIBLE_TYPES), title: z.string(),
  narrative: z.record(z.string()), fields: z.record(z.unknown()),
  classification: z.object({ category: z.string().nullable(), subcategory: z.string().nullable(), type: z.string().optional(), status: z.string().optional(), visibility: z.string().optional() }).strict(),
  tags: z.array(z.string()), archived: z.boolean(), relatedEntryIds: z.array(z.number().int().positive()),
  legacy: legacySchema,
}).strict();
export const bibleDocumentSchema = documentBase.superRefine((value, ctx) => {
  for (const key of Object.keys(value.fields)) {
    if (NARRATIVE_FIELDS.has(key) || Object.hasOwn(classificationFields, key) || ["tags", "isArchived", "_schemaVersion"].includes(key)) ctx.addIssue({ code: "custom", path: ["fields", key], message: "Use the narrative, classification, tags or archived namespace; duplicate sources of truth are not allowed." });
    else if (!Object.hasOwn(bibleFieldSchemas[value.type].shape, key)) ctx.addIssue({ code: "custom", path: ["fields", key], message: "Unknown fields must be retained under legacy, not invented in the structured contract." });
  }
  const checked = bibleFieldSchemas[value.type].safeParse(value.fields);
  if (!checked.success) for (const issue of checked.error.issues) ctx.addIssue({ ...issue, path: ["fields", ...issue.path] });
});
export type BibleDocument = z.infer<typeof bibleDocumentSchema>;
export type FieldMapping = { source: string; destination: string; preserved: boolean };
export type ContractPreview = { sourceType: string; targetType: BibleType | null; needsReview: boolean; issues: string[]; document: BibleDocument | null; original: Source; mappings: FieldMapping[] };
function leafPaths(value: any, prefix = ""): Array<[string, unknown]> {
  if (value && typeof value === "object" && Object.keys(value).length) return Object.entries(value).flatMap(([key, child]) => leafPaths(child, prefix ? `${prefix}.${key}` : key));
  return [[prefix, value]];
}
function at(value: any, path: string) { return !path ? value : path.split(".").reduce((v, key) => v?.[key], value); }

/** Pure compatibility reader/preview. No database, mutation or silent conversion.
 * Unknown types require an explicit target; e.g. timeline and lore are ambiguous. */
export function previewBibleDocument(entry: Source, requestedType?: BibleType): ContractPreview {
  const original = JSON.parse(JSON.stringify(entry));
  const type = requestedType || proposedType(entry.entryType);
  if (!type) return { sourceType: entry.entryType, targetType: null, needsReview: true, issues: [`Choose a destination for legacy type ${entry.entryType}; its complete payload is retained.`], document: null, original, mappings: leafPaths(original).map(([source]) => ({ source, destination: `original.${source}`, preserved: true })) };
  const data = parsed(entry.content), metadata = object(entry.metadata);
  const order = jsonTypes.has(type) ? [["metadata", metadata], ["contentJSON", data]] as const : [["contentJSON", data], ["metadata", metadata]] as const;
  const classification = legacyClassification({ ...entry, entryType: type });
  const document: BibleDocument = { schemaVersion: 2, type, title: String(entry.title || ""), narrative: {}, fields: {},
    classification: { category: classification.category, subcategory: classification.subcategory }, tags: classification.tags, archived: classification.archived,
    relatedEntryIds: Array.isArray(entry.relatedEntryIds) && entry.relatedEntryIds.every((id: any) => Number.isInteger(id) && id > 0) ? entry.relatedEntryIds : [],
    legacy: { original, unmapped: {}, conflicts: [] } };
  const destinations = new Map<string, string>(); const issues: string[] = [];
  if (!hasObjectContent(entry) && typeof entry.content === "string") { document.narrative[defaultNarrative[type]] = entry.content; destinations.set("content", `narrative.${defaultNarrative[type]}`); }
  for (const [container, values] of order) for (const [key, value] of Object.entries(values)) {
    const source = `${container}.${key}`, aliases = fieldAliases[type] || {}, name = Object.hasOwn(aliases, key) ? aliases[key] : key;
    if (["_schemaVersion", "_legacyContent", "tags", "isArchived"].includes(name)) continue;
    let destination: string | undefined;
    if (Object.hasOwn(classificationFields, name) && typeof value === "string") destination = `classification.${classificationFields[name]}`;
    else if (NARRATIVE_FIELDS.has(name) && typeof value === "string") destination = `narrative.${name}`;
    else if (Object.hasOwn(bibleFieldSchemas[type].shape, name) && bibleFieldSchemas[type].shape[name].safeParse(value).success) destination = `fields.${name}`;
    if (!destination) { document.legacy.unmapped[source] = value; continue; }
    const [bucket, field] = destination.split("."); const target = document[bucket as "fields"] as Source;
    if (target[field] !== undefined && target[field] !== null && canonical(target[field]) !== canonical(value)) document.legacy.conflicts.push(source);
    target[field] = value; destinations.set(source, destination);
  }
  // Explicit type suggestions are not permitted to overwrite an existing category.
  if (!document.classification.category && TYPE_ALIASES[entry.entryType]?.category) document.classification.category = TYPE_ALIASES[entry.entryType].category!;
  for (const field of ["tags", "isArchived", "category", "subcategory"]) {
    const effective = field === "isArchived" ? document.archived : field === "tags" ? document.tags : document.classification[field as "category" | "subcategory"];
    for (const [source, value] of [[field, entry[field]], [`metadata.${field}`, metadata[field]], [`contentJSON.${field}`, data[field]]] as const) {
      if (value != null && canonical(value) !== canonical(effective)) document.legacy.conflicts.push(source);
    }
  }
  if (data._schemaVersion !== undefined && data._schemaVersion !== 1 || metadata._schemaVersion !== undefined && metadata._schemaVersion !== 1) issues.push("Future or unrecognized legacy schema version: retain payload and review before conversion.");
  const valid = bibleDocumentSchema.safeParse(document);
  if (!valid.success) issues.push(...valid.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`));
  const mappings: FieldMapping[] = leafPaths(original).map(([source, value]) => {
    const direct = source === "title" ? "title" : (source === "tags" || source.startsWith("tags.")) ? source : source === "isArchived" ? "archived" : (source === "relatedEntryIds" || source.startsWith("relatedEntryIds.")) ? source : source === "category" || source === "subcategory" ? `classification.${source}` : destinations.get(source);
    return direct && canonical(at(document, direct)) === canonical(value) ? { source, destination: `document.${direct}`, preserved: true } : { source, destination: `document.legacy.original.${source}`, preserved: canonical(at(document.legacy.original, source)) === canonical(value) };
  });
  if (hasObjectContent(entry)) for (const [source, value] of leafPaths(data, "contentJSON")) {
    const first = source.split(".").slice(0, 2).join("."), dest = destinations.get(first);
    const destination = dest && dest + source.slice(first.length);
    // JSON content's exact original string is retained even when a parsed field maps elsewhere.
    mappings.push({ source, destination: destination && canonical(at(document, destination)) === canonical(value) ? `document.${destination}` : "document.legacy.original.content (JSON)", preserved: canonical(at(parsed(original.content), source.slice(12))) === canonical(value) });
  }
  return { sourceType: entry.entryType, targetType: type, needsReview: entry.entryType !== type || !!issues.length || !!document.legacy.conflicts.length, issues, document, original, mappings };
}
export function readBibleDocument(value: unknown): BibleDocument { return bibleDocumentSchema.parse(value); }

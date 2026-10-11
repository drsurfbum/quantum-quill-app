import { z } from "zod";
import { BIBLE_TAXONOMY } from "./bible-catalog";
const text = z.string(); const texts = z.array(text); const id = z.number().int().positive();
export const bibleReference = z.object({ id, name: text.optional(), type: text.optional(), role: text.optional(), context: text.optional(), relationship: text.optional(), impact: text.optional(), notes: text.optional() }).passthrough();
const refs = z.array(bibleReference);
const strings = (names: string) => Object.fromEntries(names.split(" ").map(name => [name, text.optional()]));
const common = { _schemaVersion: z.literal(1).optional(), tags: texts.optional(), isArchived: z.boolean().optional(), imageUrl: text.optional(), imageDescription: text.optional() };
export const bibleFieldSchemas: Record<string, z.ZodObject<any>> = {
  characters: z.object({ ...common, ...strings("age gender species origin primaryRole eyeColor hairColor build clothingStyle distinguishingFeatures personalityTraits beliefs motivations conflicts"), abilities: texts.optional() }).passthrough(),
  groups_races: z.object({ ...common, ...strings("groupCategory status tagline eraEstablished eraDissolved leadershipStructure homeworld physiology purpose ideology resources culturalNotes notes"), subGroups: texts.optional(), alliances: texts.optional(), rivalries: texts.optional(), parentGroup: z.union([id, text]).nullable().optional() }).passthrough(),
  locations: z.object({ ...common, ...strings("locationType status tagline coordinates size gravity atmosphere capacity layout purpose eraEstablished statusChanges notes"), environment: z.union([text, texts]).optional(), keyFeatures: texts.optional(), worldElements: texts.optional(), nearbyLocations: z.array(id).optional(), parentLocation: z.union([id, text]).nullable().optional() }).passthrough(),
  events: z.object({ ...common, ...strings("era eventType status shortSummary narrativeContext writerNotes hiddenDetails alternativeVersions researchReminders outcomeType"), date: z.object({ ...strings("year month day fictionalDate"), isApproximate: z.boolean().optional() }).passthrough().optional(), locations: refs.optional(), charactersInvolved: refs.optional(), groupsRacesInvolved: refs.optional(), linkedEvents: refs.optional(), worldElements: refs.optional(), outcomeTags: texts.optional(), includeOnTimeline: z.boolean().optional() }).passthrough(),
  world_elements: z.object({ ...common, ...strings("category status shortNotes discoveryOrigin loreHooks idioms rumors nicheFacts"), categoryDetails: z.record(z.unknown()).optional(), majorEvents: refs.optional(), users: refs.optional(), affectedLocations: refs.optional(), linkedCharacters: refs.optional(), linkedLocations: refs.optional(), linkedEvents: refs.optional(), researchReferences: refs.optional(), parentElement: bibleReference.nullable().optional(), childElements: refs.optional() }).passthrough(),
  details: z.object({ ...common, ...strings("type status shortSummary content explanation visibility outcomeNotes"), linkedElements: refs.optional() }).passthrough(),
  research: z.object({ ...common, ...strings("sourceType status urlOrReference shortSummary detailedNotes nextSteps incorporationPlans teamNotes"), topics: texts.optional(), linkedElements: refs.optional() }).passthrough(),
};

// Include fields formerly declared only in generic forms. Draft records may be
// incomplete, but every newly changed known value has a type contract.
for (const category of Object.values(BIBLE_TAXONOMY)) {
  const existing = bibleFieldSchemas[category.key];
  const fields: Record<string, z.ZodTypeAny> = {};
  for (const [key, field] of Object.entries(category.fields)) {
    if (existing?.shape[key]) continue;
    fields[key] = (field.type === "checkbox" ? z.boolean() : field.type === "multi-select-linked" ? z.array(z.number().int().positive()) : field.type === "single-select-linked" ? z.union([z.number().int().positive(), z.literal(""), z.string().regex(/^\d+$/)]).nullable() : field.type === "multi-select" ? z.array(z.string()) : z.string()).optional();
  }
  bibleFieldSchemas[category.key] = existing.extend(fields);
}
bibleFieldSchemas.research = bibleFieldSchemas.research.extend({ keyPoints: z.array(z.string()).optional(), quotes: z.array(z.string()).optional(), reminders: z.array(z.string()).optional(), attachments: z.array(z.object({ name: z.string(), url: z.string().optional(), description: z.string().optional() }).passthrough()).optional() });

export const bibleMetadataSchemas: Record<string, z.ZodObject<any>> = {};
for (const category of Object.values(BIBLE_TAXONOMY)) {
  let schema = bibleFieldSchemas[category.key];
  if (["events", "world_elements", "details", "research"].includes(category.key)) {
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const [key, field] of Object.entries(category.fields)) {
      shape[key] = (field.type === "checkbox" ? z.boolean() : field.type === "multi-select-linked" ? z.array(id) : field.type === "single-select-linked" ? z.union([id, z.literal("")]).nullable() : field.type === "multi-select" ? texts : text).optional();
    }
    schema = schema.extend(shape);
  }
  bibleMetadataSchemas[category.key] = schema;
}

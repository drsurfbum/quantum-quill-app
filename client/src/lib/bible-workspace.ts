import type { StoryBibleEntry } from "@shared/schema";
import { BIBLE_TAXONOMY, fieldChoices } from "@shared/bible-catalog";
import { objectData, parseContent, structuredTypes } from "@shared/story-bible";
import { bibleEntryArchived, bibleEntrySearchText, structuredBibleData } from "./story-bible-data";

export const bibleTypes = Object.values(BIBLE_TAXONOMY);
export const bibleTypeName = (type: string) => bibleTypes.find(item => item.key === type)?.name || type;
export const bibleGuidance: Record<string, string> = {
  characters: "Start with who they are and what they want. Develop their appearance, motivations, abilities, and history as your story grows.",
  groups_races: "Define what unites this group, what it believes, and how it is organized. Connect members, allies, and rivals under Connections.",
  locations: "Establish what this place is and why it matters. Add its environment, inhabitants, and history when they become relevant.",
  events: "Describe what happened, when, and why it matters. Use Connections for participants, locations, and consequences.",
  world_elements: "Choose a category, then describe how this element works and affects your world. Category-specific fields are optional prompts.",
  details: "Keep a useful idea, clue, quote, or continuity note here. Connect it to the people, places, or events it concerns.",
  research: "Record the source and what you learned. Keep research separate from story facts, and connect it where you use it.",
};

/** Presentation only: compatibility readers never rewrite legacy or imported data. */
export function bibleText(value: unknown): string {
  if (typeof value !== "string") return "";
  if (!/<(?:p|h[1-6]|div|ul|ol|li|br|strong|em|a|span|script|style)\b[^>]*>/i.test(value)) return value.trim();
  const doc = new window.DOMParser().parseFromString(value, "text/html");
  doc.querySelectorAll("script,style").forEach(node => node.remove());
  doc.querySelectorAll("p,div,li,h1,h2,h3,br").forEach(node => node.append(doc.createTextNode("\n")));
  return (doc.body.textContent || "").trim();
}
export function bibleDescription(entry: StoryBibleEntry) {
  const fields = structuredBibleData(entry);
  const narrative = structuredTypes.has(entry.entryType) && parseContent(entry.content) ? "" : entry.content;
  return bibleText([fields.shortSummary, fields.shortNotes, fields.tagline, fields.description, fields.summary, fields.narrativeContext, fields.detailedNotes, fields.content, narrative].find(value => typeof value === "string" && value.trim()));
}
export function bibleCategory(entry: StoryBibleEntry) {
  const fields = structuredBibleData(entry);
  const key = ({characters:"category",groups_races:"groupCategory",locations:"locationType",events:"eventType",world_elements:"category",details:"type",research:"sourceType"} as Record<string,string>)[entry.entryType];
  const value = fields[key] || entry.category || "";
  return fieldChoices(entry.entryType,key).find(item => item.value === value)?.label || String(value);
}
export function bibleImage(entry: StoryBibleEntry) {
  const fields = structuredBibleData(entry);
  const value = fields.imageUrl || objectData(entry.metadata).imageUrl;
  // Only existing local uploads or explicitly web-hosted images; never executable URLs.
  return typeof value === "string" && /^(?:\/uploads\/|https?:\/\/)/.test(value) ? value : undefined;
}
export function hasImportedSource(entry: StoryBibleEntry) {
  const source = objectData(objectData(entry.metadata)._notionImport);
  return source.version === 1 && typeof source.originalMarkdown === "string";
}
export type BibleFilters = { query: string; type: string; archive: string; category: string; starred: boolean; sort: string };
export const defaultBibleFilters: BibleFilters = { query:"",type:"all",archive:"active",category:"all",starred:false,sort:"name" };
export function filterBibleEntries(entries: StoryBibleEntry[], filters: BibleFilters) {
  const query = filters.query.trim().toLocaleLowerCase();
  return entries.filter(entry => (filters.type === "all" || entry.entryType === filters.type)
    && (filters.archive === "all" || bibleEntryArchived(entry) === (filters.archive === "archived"))
    && (filters.category === "all" || bibleCategory(entry) === filters.category)
    && (!filters.starred || (entry.priority || 0) > 0)
    && (!query || bibleEntrySearchText(entry).includes(query)))
    .sort((a,b) => filters.sort === "recent" ? new Date(b.updatedAt || 0).getTime()-new Date(a.updatedAt || 0).getTime() || a.id-b.id : a.title.localeCompare(b.title) || a.id-b.id);
}

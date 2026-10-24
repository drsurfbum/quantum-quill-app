import type { StoryBibleEntry } from "@shared/schema";
import { BIBLE_TAXONOMY, fieldChoices } from "@shared/bible-catalog";
import { objectData, parseContent, structuredTypes } from "@shared/story-bible";
import { bibleEntryArchived, bibleEntrySearchText, structuredBibleData } from "./story-bible-data";
import { BIBLE_GUIDES } from "@shared/bible-guidance";

export const bibleTypes = Object.values(BIBLE_TAXONOMY);
export const bibleTypeName = (type: string) => bibleTypes.find(item => item.key === type)?.name || type;
export const bibleGuidance: Record<string, string> = Object.fromEntries(Object.entries(BIBLE_GUIDES).map(([type,guide])=>[type,guide.purpose]));

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

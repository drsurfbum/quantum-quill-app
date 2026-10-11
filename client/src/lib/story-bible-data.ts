import type { StoryBibleEntry } from '@shared/schema';
import { readBibleFields, structuredTypes } from "@shared/story-bible";
import { legacyClassification } from "@shared/bible-contract";
export const structuredBibleData = readBibleFields;
export function bibleEntryArchived(entry: StoryBibleEntry) {
  return legacyClassification(entry).archived;
}
function textValues(value: unknown): string {
  if (Array.isArray(value)) return value.map(textValues).join(' ');
  if (value && typeof value === 'object') return Object.values(value).map(textValues).join(' ');
  return typeof value === 'string' ? value : '';
}
export function bibleEntrySearchText(entry: StoryBibleEntry) {
  const data = structuredBibleData(entry);
  let narrative = entry.content || '';
  if (structuredTypes.has(entry.entryType)) {
    try { const parsed = JSON.parse(narrative); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) narrative = ''; } catch { /* Preserve legacy prose alongside metadata. */ }
  }
  return [entry.title, entry.category, entry.subcategory, ...(entry.tags || []), textValues(data), narrative].join(' ').toLowerCase();
}

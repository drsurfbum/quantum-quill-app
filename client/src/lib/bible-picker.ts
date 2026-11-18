import type { StoryBibleEntry } from '@shared/schema';
import { compileBibleQuery, incompleteBibleOperatorQuery } from './bible-query';
import { bibleEntryArchived } from './story-bible-data';

export type BibleSelectionCounts = Record<string, number>;
const usageKey = (account: number, project: number) => `quantum-quill:bible-find-counts:v1:${account}:${project}`;

/** Only explicit Find selections, on this browser, for this writer/project. No prose or names. */
export function readBibleSelectionCounts(account: number | undefined, project: number): BibleSelectionCounts {
  if (!account) return {};
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(usageKey(account, project)) || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([id, count]) => /^\d+$/.test(id) && Number.isSafeInteger(count) && Number(count) > 0 && Number(count) <= 1_000_000));
  } catch { return {}; }
}

export function recordBibleSelection(account: number | undefined, project: number, entryId: number, entries: StoryBibleEntry[]) {
  if (!account || !entries.some(entry => entry.projectId === project && entry.id === entryId)) return;
  const counts = readBibleSelectionCounts(account, project);
  const currentIds = new Set(entries.filter(entry => entry.projectId === project).map(entry => String(entry.id)));
  const next = Object.fromEntries(Object.entries(counts).filter(([id]) => currentIds.has(id)));
  next[entryId] = Math.min(1_000_000, (next[entryId] || 0) + 1);
  try { window.localStorage.setItem(usageKey(account, project), JSON.stringify(next)); } catch { /* Stars/name ordering still works when storage is unavailable. */ }
}

export function biblePickerChoices(entries: StoryBibleEntry[], options: {
  query: string; types: readonly string[]; sourceId?: number; includeArchived?: boolean;
  projectId?: number; counts?: BibleSelectionCounts; ranked?: boolean;
}) {
  const query = (options.ranked ? options.query.trim() : options.query).toLocaleLowerCase();
  const evaluate = options.ranked ? compileBibleQuery(options.query) : undefined;
  const relevance = new Map<number, number>();
  const eligible = entries.filter(entry => (options.projectId === undefined || entry.projectId === options.projectId)
    && entry.id !== options.sourceId && options.types.includes(entry.entryType)
    && (options.includeArchived || !bibleEntryArchived(entry)));
  const filter = (evaluateQuery: ReturnType<typeof compileBibleQuery>) => eligible.filter(entry => {
    const result = evaluateQuery(entry.title);
    relevance.set(entry.id, result.rank);
    return result.matches;
  });
  let matches = evaluate ? filter(evaluate) : eligible.filter(entry => entry.title.toLocaleLowerCase().includes(query));
  const unfinished = options.ranked ? incompleteBibleOperatorQuery(options.query) : undefined;
  if (!matches.length && unfinished !== undefined) matches = filter(compileBibleQuery(unfinished));
  if (!options.ranked) return matches;
  return matches.sort((a, b) => (relevance.get(a.id) ?? 2) - (relevance.get(b.id) ?? 2)
      || Number((b.priority || 0) > 0) - Number((a.priority || 0) > 0)
      || (options.counts?.[b.id] || 0) - (options.counts?.[a.id] || 0)
      || a.title.localeCompare(b.title) || a.id - b.id);
}

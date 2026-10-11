import { z } from "zod";
import { canonical } from "@shared/draft";

const recordSchema = z.object({
  version: z.literal(1), id: z.string(), owner: z.number().int().positive(),
  projectId: z.number().int().positive().optional(), url: z.string().regex(/^\/api\/(chapters|outline|story-bible|plot-structure-sections)\/\d+$/),
  listUrl: z.string().optional(), title: z.string(), updatedAt: z.string(),
  baseRevision: z.number().int().nonnegative().optional(),
  base: z.record(z.unknown()), patch: z.record(z.unknown()),
});
export type DurableDraft = z.infer<typeof recordSchema>;
export const DRAFT_PREFIX = "quantum-quill:draft:v1:";

/** Each page gets its own journal IDs, so tabs cannot erase each other's drafts.
 * Synchronous writes precede network debounce, including edits during a request.
 * Nothing is evicted automatically. Storage errors leave the in-memory queue intact.
 */
export class DraftJournal {
  error: string | null = null;
  constructor(private storage: () => Storage) {}
  write(draft: DurableDraft) {
    try { this.storage().setItem(DRAFT_PREFIX + draft.id, JSON.stringify(recordSchema.parse(draft))); this.error = null; return true; }
    catch { this.error = "Draft recovery storage is unavailable or full. Keep this tab open until your changes save, or download your draft."; return false; }
  }
  read(owner: number, projectId?: number): DurableDraft[] {
    try {
      const storage = this.storage(); const drafts: DurableDraft[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key?.startsWith(DRAFT_PREFIX)) continue;
        try {
          const draft = recordSchema.parse(JSON.parse(storage.getItem(key)!));
          if (draft.owner === owner && (projectId === undefined || draft.projectId === projectId) && key === DRAFT_PREFIX + draft.id) drafts.push(draft);
        } catch { /* Preserve unreadable or future-format records for manual recovery. */ }
      }
      return drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } catch { this.error = "Draft recovery storage is unavailable. Keep this tab open until your changes save."; return []; }
  }
  remove(draft: DurableDraft) {
    try {
      const storage = this.storage(); const raw = storage.getItem(DRAFT_PREFIX + draft.id);
      // Never delete a newer edit made while the recovery dialog was open.
      if (raw && canonical(JSON.parse(raw)) !== canonical(draft)) throw new Error("Draft changed");
      storage.removeItem(DRAFT_PREFIX + draft.id); return true;
    } catch { this.error = "The draft changed or could not be removed. Review it again."; return false; }
  }
}
export const draftJournal = new DraftJournal(() => window.localStorage);

export function recoveryPlan(draft: DurableDraft, server: Record<string, unknown>) {
  const patch: Record<string, unknown> = {}; const base: Record<string, unknown> = {}; const conflicts: string[] = [];
  for (const [field, value] of Object.entries(draft.patch)) {
    if (canonical(server[field]) === canonical(value)) continue; // Lost acknowledgment, already saved.
    patch[field] = value; base[field] = server[field] ?? null;
    if (!(field in draft.base) || canonical(server[field]) !== canonical(draft.base[field])) conflicts.push(field);
  }
  return { patch, base, conflicts };
}

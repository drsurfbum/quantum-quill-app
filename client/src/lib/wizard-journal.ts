import { z } from "zod";
import { canonical } from "@shared/draft";

export const WIZARD_PREFIX = "quantum-quill:wizard:v1:";
const record = z.object({ version: z.literal(1), id: z.string().uuid(), owner: z.number().int().positive(), scope: z.string(), updatedAt: z.string(), value: z.unknown() });
export type WizardRecord = z.infer<typeof record>;
export class WizardJournal {
  constructor(private storage: () => Storage) {}
  write(draft: WizardRecord) { this.storage().setItem(WIZARD_PREFIX + draft.id, JSON.stringify(record.parse(draft))); }
  read(owner: number, scope: string) {
    const storage = this.storage(), found: WizardRecord[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key?.startsWith(WIZARD_PREFIX)) continue;
      try {
        const item = record.parse(JSON.parse(storage.getItem(key)!));
        if (item.owner === owner && item.scope === scope && key === WIZARD_PREFIX + item.id) found.push(item);
      } catch { /* Leave unknown/future drafts intact. */ }
    }
    return found.sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  remove(draft: WizardRecord) {
    const storage = this.storage(), key = WIZARD_PREFIX + draft.id, existing = storage.getItem(key);
    if (existing && canonical(JSON.parse(existing)) !== canonical(draft)) throw new Error("This saved draft changed. Review it again before discarding.");
    storage.removeItem(key);
  }
}

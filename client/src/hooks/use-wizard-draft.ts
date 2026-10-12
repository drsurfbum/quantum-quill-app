import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { z } from "zod";
import { currentAccount, queryClient } from "@/lib/queryClient";
import { WizardJournal, WIZARD_PREFIX, type WizardRecord } from "@/lib/wizard-journal";

const journal = new WizardJournal(() => window.localStorage);
export function useWizardDraft<T>(scope: string, initial: () => T, schema: z.ZodType<T, z.ZodTypeDef, any>) {
  const owner = useSyncExternalStore(listener => queryClient.getQueryCache().subscribe(listener), currentAccount, currentAccount);
  const make = () => ({ version: 1 as const, id: crypto.randomUUID(), owner: owner!, scope, updatedAt: new Date().toISOString(), value: initial() });
  const [active, setActive] = useState<WizardRecord>(make);
  const activeRef = useRef(active);
  const [recoverable, setRecoverable] = useState<WizardRecord[]>([]);
  const [error, setError] = useState("");
  const ready = !!owner && active.owner === owner && active.scope === scope;
  const assertOwner = () => { if (!owner || currentAccount() !== owner || activeRef.current.owner !== owner || activeRef.current.scope !== scope) throw new Error("Sign in to the account that owns this draft."); };
  const refresh = () => {
    try { setRecoverable(owner ? journal.read(owner, scope).filter(row => row.id !== activeRef.current.id && schema.safeParse(row.value).success) : []); }
    catch { setError("Draft storage is unavailable. Keep this window open or download your plan."); }
  };
  useEffect(() => {
    if (activeRef.current.owner !== owner || activeRef.current.scope !== scope) { const next = make(); activeRef.current = next; setActive(next); setError(""); }
    refresh();
    const changed = (event: StorageEvent) => { if (event.key?.startsWith(WIZARD_PREFIX)) refresh(); };
    window.addEventListener("storage", changed); return () => window.removeEventListener("storage", changed);
  }, [owner, scope]);
  useEffect(() => {
    if (!error) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", guard); return () => window.removeEventListener("beforeunload", guard);
  }, [error]);
  const update = (change: T | ((current: T) => T)) => {
    assertOwner();
    const value = typeof change === "function" ? (change as (current: T) => T)(activeRef.current.value as T) : change;
    const next = { ...activeRef.current, value, updatedAt: new Date().toISOString() };
    activeRef.current = next; setActive(next);
    try { journal.write(next); setError(""); return true; }
    catch { setError("Draft storage is unavailable or full. Keep this window open or download your plan."); return false; }
  };
  const discard = (draft: WizardRecord) => {
    assertOwner(); if (draft.owner !== owner || draft.scope !== scope) throw new Error("Draft belongs to another account or project.");
    try { journal.remove(draft); refresh(); } catch (e) { setError((e as Error).message); }
  };
  const restore = (draft: WizardRecord) => {
    assertOwner(); if (draft.owner !== owner || draft.scope !== scope) throw new Error("Draft belongs to another account or project.");
    // Preserve any work already in this tab as another recovery choice.
    const next = { ...make(), value: schema.parse(draft.value) };
    try {
      journal.write(next);
      activeRef.current = next; setActive(next); setError("");
      journal.remove(draft); refresh();
    } catch (e) { setError((e as Error).message); }
  };
  const finish = () => { assertOwner(); try { journal.remove(activeRef.current); } catch (e) { setError((e as Error).message); } };
  return { value: ready ? active.value as T : undefined, owner, error: ready ? error : "", recoverable: ready ? recoverable.filter(row => row.owner === owner && row.scope === scope) : [], update, restore, discard, finish };
}

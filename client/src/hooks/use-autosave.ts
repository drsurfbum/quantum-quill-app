import { useEffect, useSyncExternalStore } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { canonical } from "@shared/draft";
import { draftJournal, recoveryPlan, type DurableDraft } from "@/lib/draft-journal";
import { SaveQueue } from "@/lib/save-queue";

const queues = new Map<string, SaveQueue>();
const snapshots = new Map<string, Record<string, unknown>>();
const activeDrafts = new Map<string, DurableDraft>();
const pageId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
const listeners = new Set<() => void>();
let revision = 0;
const changed = () => { revision++; listeners.forEach(listener => listener()); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const getRevision = () => revision;

function ownerId() { return queryClient.getQueryData<{ id: number }>(["/api/user"])?.id; }
export function getSaveQueue(url: string, listUrl?: string) {
  const owner = ownerId();
  const key = `${owner}:${url}`;
  let queue = queues.get(key);
  if (!queue) {
    let base: Record<string, unknown> = {};
    let previous: DurableDraft | undefined;
    let dirty = false;
    const id = `${pageId}:${key}`;
    const cached = () => snapshots.get(key) || queryClient.getQueryData<Record<string, unknown>>([url]) ||
      queryClient.getQueryData<Record<string, unknown>[]>([listUrl || ""])?.find(item => String(item.id) === url.split("/").pop()) || {};
    queue = new SaveQueue(async (patch) => {
      if (!owner || ownerId() !== owner) throw new Error("Sign back in to save your changes");
      const expected = Object.fromEntries(Object.keys(patch).filter(field => field in base).map(field => [field, base[field]]));
      if (Object.keys(expected).length !== Object.keys(patch).length) throw new Error("The original version is unavailable. Review your saved draft before restoring it.");
      const response = await apiRequest("PUT", url, { ...patch, _base: expected });
      const result = await response.json();
      base = result;
      snapshots.set(key, result);
      // An old response must not populate a different account's cache.
      if (ownerId() !== owner) return result;
      await Promise.all([url, ...(listUrl ? [listUrl] : [])].map(key =>
        queryClient.cancelQueries({ queryKey: [key], exact: true })));
      if (ownerId() !== owner) return result;
      queryClient.setQueryData([url], result);
      if (listUrl) queryClient.setQueryData([listUrl], (old: { id: number }[] | undefined) =>
        old?.map(item => item.id === result.id ? result : item));
      return result;
    }, 750, 5000, patch => {
      if (!owner) return;
      if (!Object.keys(patch).length) {
        if (previous) draftJournal.remove(previous);
        previous = undefined; dirty = false; activeDrafts.delete(id); return;
      }
      if (!dirty) { base = { ...cached() }; dirty = true; }
      const source = cached();
      const projectId = Number(source.projectId || queryClient.getQueryData<{ projectId: number }>([`/api/plot-structures/${source.plotStructureId}`])?.projectId || listUrl?.match(/^\/api\/projects\/(\d+)\//)?.[1]);
      const draft: DurableDraft = { version: 1, id, owner, ...(projectId ? { projectId } : {}), url, listUrl,
        title: String(patch.title || source.title || source.name || url), updatedAt: new Date().toISOString(),
        base: Object.fromEntries(Object.keys(patch).filter(field => field in base).map(field => [field, base[field]])), patch };
      activeDrafts.set(id, draft);
      if (draftJournal.write(draft)) previous = draft;
    });
    queue.subscribe(changed);
    queues.set(key, queue);
  }
  return queue;
}
export function withPendingEdits<T extends object>(url: string, value: T): T {
  const key = `${ownerId()}:${url}`;
  const queue = queues.get(key);
  // Rendering fresh query data must not silently rebase an editor whose local
  // state still contains the previous version. Only our own acknowledgments or
  // an explicit recovery advance an already-loaded field's baseline.
  snapshots.set(key, { ...value, ...snapshots.get(key) });
  return { ...value, ...queue?.getDraft() };
}
export function useAutosave(url: string, listUrl?: string) {
  const queue = getSaveQueue(url, listUrl);
  const status = useSyncExternalStore(queue.subscribe, queue.getStatus, queue.getStatus);
  useEffect(() => () => { void queue.flush(); }, [queue]);
  return { status, save: queue.enqueue, flush: queue.flush, error: queue.error };
}
function currentQueues() {
  const prefix = `${ownerId()}:`;
  return [...queues.entries()].filter(([key]) => key.startsWith(prefix)).map(([, queue]) => queue);
}
export async function flushPendingSaves() {
  const results = await Promise.all(currentQueues().filter(queue => queue.getStatus() !== "saved").map(queue => queue.flush()));
  return results.every(Boolean);
}
export function usePendingSaves() {
  useSyncExternalStore(subscribe, getRevision, getRevision);
  const pending = currentQueues().filter(queue => queue.getStatus() !== "saved");
  return { storageError: draftJournal.error, pending: pending.length, failed: pending.some(queue => queue.getStatus() === "error"), retry: flushPendingSaves };
}
export function pendingSaveCount() { return [...queues.values()].filter(queue => queue.getStatus() !== "saved").length; }

export function useRecoverableDrafts() {
  useSyncExternalStore(subscribe, getRevision, getRevision);
  // Authentication changes must refresh the account-scoped recovery list too.
  useSyncExternalStore(listener => queryClient.getQueryCache().subscribe(listener), ownerId, ownerId);
  useEffect(() => { window.addEventListener("storage", changed); return () => window.removeEventListener("storage", changed); }, []);
  const owner = ownerId();
  const stored = owner ? draftJournal.read(owner) : [];
  const records = new Map(stored.map(draft => [draft.id, draft]));
  for (const draft of activeDrafts.values()) if (draft.owner === owner) records.set(draft.id, draft);
  return [...records.values()].filter(draft => !activeDrafts.has(draft.id) || queues.get(`${owner}:${draft.url}`)?.getStatus() === "error");
}
function assertCurrent(draft: DurableDraft) {
  if (ownerId() !== draft.owner) throw new Error("Sign in to the account that owns this draft");
  const stored = draftJournal.read(draft.owner).find(item => item.id === draft.id);
  if (stored && canonical(stored) !== canonical(draft)) throw new Error("This draft changed. Review the latest version.");
  const active = activeDrafts.get(draft.id);
  if (active && canonical(active.patch) !== canonical(draft.patch)) throw new Error("This draft changed. Review the latest version.");
  if (active && queues.get(`${draft.owner}:${draft.url}`)?.getStatus() !== "error") throw new Error("Wait for the current save to finish");
}
export async function inspectDraft(draft: DurableDraft) {
  assertCurrent(draft);
  const server = await (await apiRequest("GET", draft.url)).json();
  assertCurrent(draft);
  return { server, ...recoveryPlan(draft, server) };
}
export function discardDraft(draft: DurableDraft, server?: Record<string, unknown>) {
  assertCurrent(draft);
  if (!draftJournal.remove(draft)) throw new Error(draftJournal.error!);
  if (activeDrafts.has(draft.id)) queues.get(`${draft.owner}:${draft.url}`)?.discard();
  if (server) snapshots.set(`${draft.owner}:${draft.url}`, server);
  changed();
}
export async function restoreDraft(draft: DurableDraft, reviewed: Awaited<ReturnType<typeof inspectDraft>>) {
  assertCurrent(draft);
  if ([...activeDrafts.values()].some(item => item.owner === draft.owner && item.url === draft.url && item.id !== draft.id)) throw new Error("Save or discard your current edits to this entry before restoring an older draft.");
  const result = Object.keys(reviewed.patch).length ? await (await apiRequest("PUT", draft.url, { ...reviewed.patch, _base: reviewed.base })).json() : reviewed.server;
  assertCurrent(draft);
  discardDraft(draft);
  snapshots.set(`${draft.owner}:${draft.url}`, result);
  await queryClient.cancelQueries({ queryKey: [draft.url], exact: true });
  queryClient.setQueryData([draft.url], result);
  if (draft.listUrl) {
    await queryClient.cancelQueries({ queryKey: [draft.listUrl], exact: true });
    queryClient.setQueryData([draft.listUrl], (old: { id: number }[] | undefined) => old?.map(item => item.id === result.id ? result : item));
  }
}

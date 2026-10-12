import { z } from "zod";
import { createContext, useContext, useId, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest, currentAccount, queryClient } from "@/lib/queryClient";
import { useStoryBibleEntries } from "@/hooks/use-story-bible";
import { flushPendingSaves } from "@/hooks/use-autosave";
import { bibleEntryArchived } from "@/lib/story-bible-data";
import { relationshipInput, availableRelationshipTypes, relationshipDefinition, targetTypes, type Relationship, type RelationshipInput, type RelationshipType } from "@shared/relationships";
import type { StoryBibleEntry } from "@shared/schema";
import { BIBLE_TAXONOMY } from "@shared/bible-catalog";

export const RelationshipNavigation = createContext<(entry: StoryBibleEntry) => void>(() => {});
const relationshipPageId = crypto.randomUUID();
const nameOfType = (type: string) => Object.values(BIBLE_TAXONOMY).find(value => value.key === type)?.name || type;
const urlFor = (projectId: number) => `/api/projects/${projectId}/relationships`;
export function useRelationships(projectId: number) {
  return useQuery<Relationship[]>({ queryKey: [urlFor(projectId)], staleTime: 0, refetchOnWindowFocus: true });
}
async function refresh(projectId: number) {
  await Promise.all([queryClient.invalidateQueries({ queryKey: [urlFor(projectId)] }), queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/story-bible`] })]);
}
export function RelationshipTarget({ entry }: { entry?: StoryBibleEntry }) {
  const navigate = useContext(RelationshipNavigation);
  const [error, setError] = useState("");
  return entry ? <><button type="button" className="text-left font-medium underline underline-offset-4 break-words" onClick={async () => {
    try { if (!await flushPendingSaves()) { setError("Resolve pending drafts before navigating."); return; }
    const latest = await (await apiRequest("GET", `/api/story-bible/${entry.id}`)).json(); navigate(latest); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not open entry."); }
  }}>{entry.title}{bibleEntryArchived(entry) && <span className="ml-2 text-xs text-muted-foreground">Archived</span>}</button>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</> : <span className="text-muted-foreground">Unavailable entry</span>;
}

/** The same searchable target picker is used for every relationship kind. */
export function EntryPicker({ entries, sourceId, types, value, onChange, onStub }: { entries: StoryBibleEntry[]; sourceId: number; types: readonly string[]; value: number; onChange: (id: number) => void; onStub: (title: string) => void }) {
  const [search, setSearch] = useState("");
  const choices = entries.filter(entry => entry.id !== sourceId && types.includes(entry.entryType) && !bibleEntryArchived(entry) && entry.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const selected = entries.find(entry => entry.id === value);
  return <div className="space-y-2 rounded-md border p-3">
    <Input aria-label="Search entries" placeholder="Search by entry name…" value={search} onChange={event => setSearch(event.target.value)} />
    {selected && <p className="text-sm">Selected: <strong>{selected.title}</strong></p>}
    <div role="group" aria-label="Matching entries" className="max-h-40 overflow-y-auto space-y-1">
      {choices.map(entry => <button key={entry.id} type="button" aria-pressed={entry.id === value} className={`block w-full rounded px-2 py-2 text-left text-sm hover:bg-accent ${entry.id === value ? "bg-accent text-accent-foreground" : ""}`} onClick={() => onChange(entry.id)}>{entry.title}<span className="ml-2 text-xs text-muted-foreground">{nameOfType(entry.entryType)}</span></button>)}
      {!choices.length && <p className="text-sm text-muted-foreground">No active entries match this search.</p>}
    </div>
    <Button type="button" size="sm" variant="outline" onClick={() => onStub(search.trim())}>Create a new stub…</Button>
    <p className="text-xs text-muted-foreground">Archived entries stay linked, but cannot be added as new targets.</p>
  </div>;
}

type Form = RelationshipInput & { requestId: string; stub: boolean; stubTitle: string; stubType: string; baseVersion?: string };
const recoveredForm = relationshipInput.extend({ targetId: z.number().int().nonnegative(), requestId: z.string().uuid(), stub: z.boolean(), stubTitle: z.string(), stubType: z.string(), baseVersion: z.string().optional() });
function RelationshipForm({ entry, link, kinds, close }: { entry: StoryBibleEntry; link?: Relationship; kinds: RelationshipType[]; close: () => void }) {
  const { data: entries = [] } = useStoryBibleEntries(entry.projectId, { staleTime: 0 });
  const owner = useRef(currentAccount()).current;
  const prefix = `quantum-quill:relationship-draft:v1:${owner}:${entry.projectId}:${entry.id}:${link?.id || `new:${[...kinds].sort().join(",")}`}:`;
  const key = prefix + relationshipPageId;
  const restored = useRef<{ key: string; raw: string } | null>(null);
  const initial = (): Form => ({ sourceId: link?.sourceId || entry.id, targetId: link?.targetId || 0, relationshipType: link?.relationshipType || kinds[0], role: link?.role || "", context: link?.context || "", startDate: link?.startDate || "", endDate: link?.endDate || "", requestId: crypto.randomUUID(), stub: false, stubTitle: "", stubType: "", baseVersion: link?.version });
  const [form, setForm] = useState<Form>(initial);
  const [recovery, setRecovery] = useState<Array<{ key: string; raw: string; form: Form }>>(() => {
    try { return Object.keys(window.localStorage).filter(key => key.startsWith(prefix)).flatMap(key => {
      const raw = window.localStorage.getItem(key)!; const parsed = recoveredForm.safeParse(JSON.parse(raw));
      return parsed.success && parsed.data.sourceId === (link?.sourceId || entry.id) && kinds.includes(parsed.data.relationshipType) ? [{ key, raw, form: parsed.data }] : [];
    }); } catch { return []; }
  });
  const [review, setReview] = useState<Relationship | null>(null);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [storageError, setStorageError] = useState("");
  const formId = useId();
  const types = targetTypes(form.relationshipType, entries.find(value => value.id === form.sourceId)?.entryType || entry.entryType);

  const checkpoint = (next: Form) => {
    setForm(next);
    if (owner !== currentAccount()) return;
    try { window.localStorage.setItem(key, JSON.stringify(next)); setStorageError(""); } catch { setStorageError("This browser could not keep a recovery copy. Keep this dialog open or copy your context before leaving."); }
  };
  const update = (patch: Partial<Form>) => checkpoint({ ...form, ...patch, requestId: crypto.randomUUID() });
  const clear = () => { try {
    // A later draft from another tab must never be removed by this save.
    if (window.localStorage.getItem(key) === JSON.stringify(form)) window.localStorage.removeItem(key);
    if (restored.current && window.localStorage.getItem(restored.current.key) === restored.current.raw) window.localStorage.removeItem(restored.current.key);
  } catch { /* Keep the durable copy if removal fails. */ } };
  async function save() {
    setBusy(true); setError("");
    try {
      if (owner !== currentAccount()) throw new Error("Your account changed. Reopen this project before saving.");
      if (!await flushPendingSaves()) throw new Error("Resolve the pending entry draft first. Your relationship draft is kept.");
      const { requestId, stub, stubTitle, stubType, baseVersion, ...input } = form;
      if (link) await apiRequest("PUT", `${urlFor(entry.projectId)}/${encodeURIComponent(link.id)}`, { ...input, _version: baseVersion });
      else {
        const { targetId, ...rest } = input;
        await apiRequest("POST", urlFor(entry.projectId), { ...rest, requestId, ...(stub ? { stub: { title: stubTitle, entryType: stubType || types[0] } } : { targetId }) });
      }
      if (owner !== currentAccount()) return;
      clear(); await refresh(entry.projectId); close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this link. Your draft is kept.");
      if (link && (cause as { code?: string }).code === "REVISION_CONFLICT" && owner === currentAccount()) {
        try { const latest: Relationship[] = await (await apiRequest("GET", urlFor(entry.projectId))).json(); setReview(latest.find(item => item.id === link.id) || null); } catch { /* Keep the draft and original conflict message. */ }
      }
    }
    finally { setBusy(false); }
  }
  return <div className="space-y-4">
    {recovery.map(draft => <div key={draft.key} role="alert" className="border rounded p-3 space-y-2 text-sm"><p>A relationship draft is saved on this device. Restore or discard it before editing.</p><p className="line-clamp-3 whitespace-pre-wrap">{draft.form.context || draft.form.role || "Unfinished connection"}</p><Button size="sm" onClick={() => { restored.current = draft; checkpoint(draft.form); setRecovery([]); }}>Restore relationship draft</Button><Button size="sm" variant="ghost" onClick={() => { try { if (window.localStorage.getItem(draft.key) === draft.raw) window.localStorage.removeItem(draft.key); } catch { /* Keep other drafts. */ } setRecovery(recovery.filter(item => item.key !== draft.key)); }}>Discard draft</Button></div>)}
    <fieldset disabled={busy || recovery.length > 0} className="space-y-4">
      <label className="block text-sm font-medium" htmlFor={`${formId}-type`}>Relationship type</label>
      <select id={`${formId}-type`} className="w-full border rounded bg-background p-2" value={form.relationshipType} onChange={event => update({ relationshipType: event.target.value as RelationshipType, targetId: 0, stub: false, stubType: "" })}>
        {kinds.map(kind => <option key={kind} value={kind}>{relationshipDefinition(kind).label}</option>)}
      </select>
      {!form.stub ? <EntryPicker entries={entries} sourceId={form.sourceId} types={types} value={form.targetId} onChange={targetId => update({ targetId })} onStub={title => { if (link) { setError("Create a new relationship to create a stub. Existing links can be retargeted to an existing entry."); return; } update({ stub: true, stubTitle: title, stubType: types[0] }); }} /> : <div className="border rounded p-3 space-y-2">
        <p className="text-sm">Create a minimal entry and link it in one save.</p>
        <Input aria-label="Stub name" placeholder="Name of new entry" value={form.stubTitle} maxLength={500} onChange={event => update({ stubTitle: event.target.value })} />
        <select aria-label="Stub type" className="w-full border rounded bg-background p-2" value={form.stubType || types[0]} onChange={event => update({ stubType: event.target.value })}>{types.map(type => <option key={type} value={type}>{nameOfType(type)}</option>)}</select>
        <Button variant="ghost" size="sm" onClick={() => update({ stub: false })}>Choose existing instead</Button>
      </div>}
      <label className="block space-y-1 text-sm">Role<Input value={form.role} maxLength={500} placeholder="Witness, founder, ruler, discoverer…" onChange={event => update({ role: event.target.value })} /></label>
      <label className="block space-y-1 text-sm">Context<Textarea value={form.context} maxLength={20000} placeholder="Why this connection matters to the story…" onChange={event => update({ context: event.target.value })} /></label>
      <div className="grid grid-cols-2 gap-3"><label className="text-sm">From (optional)<Input value={form.startDate} maxLength={500} placeholder="Year, era, or fictional date" onChange={event => update({ startDate: event.target.value })} /></label><label className="text-sm">Until (optional)<Input value={form.endDate} maxLength={500} placeholder="Leave blank if ongoing" onChange={event => update({ endDate: event.target.value })} /></label></div>
      <p className="text-xs text-muted-foreground">Dates can use your world's calendar. Names always come from the linked entries.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {review && <div className="border rounded p-3 space-y-2 text-sm"><p className="font-medium">Current saved relationship</p><p>{entries.find(item => item.id === review.targetId)?.title || "Unavailable entry"} · {relationshipDefinition(review.relationshipType).label} · {review.role}</p><p className="whitespace-pre-wrap">{review.context || "No context"}</p><p>{review.startDate || "Unknown start"} → {review.endDate || "Ongoing"}</p><Button variant="outline" size="sm" onClick={() => { update({ baseVersion: review.version }); setReview(null); setError("Current version reviewed. Save relationship to apply your edits."); }}>Use this reviewed version as my base</Button></div>}
      {storageError && <p role="alert" className="text-sm text-destructive">{storageError}</p>}
      <div className="flex justify-end gap-2"><Button variant="ghost" onClick={close}>Close — keep draft</Button><Button onClick={() => void save()} disabled={form.stub ? !form.stubTitle.trim() : !form.targetId}>{busy ? "Saving…" : link ? "Save relationship" : form.stub ? "Create stub and link" : "Add relationship"}</Button></div>
    </fieldset>
  </div>;
}

export function RelationshipSection({ entry, kinds, title = "Relationships" }: { entry: StoryBibleEntry; kinds?: RelationshipType[]; title?: string }) {
  const { data: links = [], isError, refetch } = useRelationships(entry.projectId);
  const { data: entries = [] } = useStoryBibleEntries(entry.projectId, { staleTime: 0 });
  const choices = kinds || availableRelationshipTypes(entry.entryType);
  const current = entries.find(item => item.id === entry.id) || entry;
  const [edit, setEdit] = useState<Relationship | "new" | null>(null);
  const [removing, setRemoving] = useState<Relationship | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const outgoing = links.filter(link => link.sourceId === entry.id && choices.includes(link.relationshipType));
  const archived = bibleEntryArchived(current);
  async function remove() {
    if (!removing) return; setBusy(true); setError("");
    try { await apiRequest("DELETE", `${urlFor(entry.projectId)}/${encodeURIComponent(removing.id)}`, { _version: removing.version }); await refresh(entry.projectId); setRemoving(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not remove link."); } finally { setBusy(false); }
  }
  return <section className="rounded-lg border bg-card p-4 space-y-3" aria-label={title}>
    <div className="flex flex-wrap gap-2 items-center justify-between"><h3 className="font-semibold">{title}</h3><Button size="sm" variant="outline" disabled={archived || isError || !choices.length} onClick={() => setEdit("new")}>Add link</Button></div>
    {isError ? <p role="alert">Relationships could not load. <button className="underline" onClick={() => void refetch()}>Retry</button></p> : outgoing.length === 0 ? <p className="text-sm text-muted-foreground">No links yet.</p> : <ul className="space-y-3">{outgoing.map(link => <li key={link.id} className="border rounded p-3 space-y-1" data-relationship-id={link.id}>
      <RelationshipTarget entry={entries.find(item => item.id === link.targetId)} />
      <p className="text-xs text-muted-foreground">{relationshipDefinition(link.relationshipType).label}{link.role && ` · ${link.role}`}{link.legacy && " · Recovered link"}</p>
      {link.context && <p className="text-sm whitespace-pre-wrap break-words">{link.context}</p>}
      {(link.startDate || link.endDate) && <p className="text-xs">{link.startDate || "Unknown start"} → {link.endDate || "Ongoing"}</p>}
      <div className="flex gap-2"><Button size="sm" variant="ghost" disabled={archived || link.unavailable || entries.some(item => item.id === link.targetId && bibleEntryArchived(item))} onClick={() => setEdit(link)}>Edit link</Button><Button size="sm" variant="ghost" onClick={() => { setError(""); setRemoving(link); }}>Remove link</Button></div>
    </li>)}</ul>}
    {archived && <p className="text-sm text-muted-foreground">Archived. Connections are retained; restore this entry to add or edit links.</p>}
    <Dialog open={edit !== null} onOpenChange={open => { if (!open) setEdit(null); }}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{edit === "new" ? "Add relationship" : "Edit relationship"}</DialogTitle><DialogDescription>Connect entries in this project. Save explicitly; unfinished edits stay on this device.</DialogDescription></DialogHeader>{edit && <RelationshipForm key={edit === "new" ? "new" : edit.id} entry={entry} link={edit === "new" ? undefined : edit} kinds={choices} close={() => setEdit(null)} />}</DialogContent></Dialog>
    <Dialog open={!!removing} onOpenChange={open => { if (!open && !busy) setRemoving(null); }}><DialogContent><DialogHeader><DialogTitle>Remove relationship?</DialogTitle><DialogDescription>This removes the connection and its backlink. Both entries remain. Recovered source payloads are retained.</DialogDescription></DialogHeader>{error && <p role="alert">{error}</p>}<div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setRemoving(null)}>Cancel</Button><Button disabled={busy} onClick={() => void remove()}>Remove relationship</Button></div></DialogContent></Dialog>
  </section>;
}

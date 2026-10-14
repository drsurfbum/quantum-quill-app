import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Scene, StoryBibleEntry } from "@shared/schema";
import { SCENE_ROLES, sceneLinkKey, type SceneRole, type SceneContext, type SceneBibleLink } from "@shared/scene-context";
import { legacyClassification } from "@shared/bible-contract";
import { useStoryBibleEntries } from "@/hooks/use-story-bible";
import { useAutosave, useRecoverableDrafts, withPendingEdits } from "@/hooks/use-autosave";
import { useEditorDraft } from "@/hooks/use-editor-draft";
import { prepareManuscriptAction } from "@/lib/manuscript-actions";
import { bibleEntryArchived, structuredBibleData } from "@/lib/story-bible-data";
import { EntryPicker } from "./story-bible/relationships";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { SaveStatus } from "./save-status";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { BIBLE_TAXONOMY } from "@shared/bible-catalog";

/** A short, read-only card uses compatibility readers and text, never injected HTML. */
export function bibleCardSummary(entry: StoryBibleEntry) {
  const fields = structuredBibleData(entry);
  const candidates = [fields.shortSummary, fields.shortNotes, fields.tagline, fields.description, fields.summary, fields.biography, fields.backstory, fields.narrativeContext, fields.detailedNotes, fields.purpose, fields.history, fields.content, fields.notes, entry.content];
  const source = candidates.find(value => typeof value === "string" && value.trim() && !/^[\[{]/.test(value.trim()));
  if (!source) return "No summary yet. Open this entry to develop it.";
  // Preserve literal angle brackets in legacy plain text, just like the prose reader.
  if (!/<(p|h[1-6]|div|blockquote|ul|ol|li|table|pre|strong|em|span|b|i|u|s|a)\b[^>]*>[\s\S]*?<\/\1\s*>|<(?:br|hr|img)\b[^>]*\/?>/i.test(String(source))) return String(source).slice(0,340);
  const doc = new window.DOMParser().parseFromString(String(source), "text/html");
  doc.querySelectorAll("script,style").forEach(node=>node.remove());
  const text = (doc.body.textContent || "").replace(/\s+/g," ").trim();
  return text.length > 340 ? `${text.slice(0,340)}…` : text;
}
const roleList = Object.keys(SCENE_ROLES) as SceneRole[];
type CardOptions = {onOpenEntry?:(id:number)=>void;selectedEntryId?:number};
export default function SceneBibleContext({scene, compact = false, onOpenEntry, selectedEntryId}: {scene:Scene; compact?:boolean} & CardOptions) {
  const url = `/api/scenes/${scene.id}/context`;
  const context = useQuery<SceneContext>({queryKey:[url],staleTime:0,refetchOnWindowFocus:true});
  if (!context.data) return <div className="p-4">{context.error ? <><p role="alert" className="text-sm text-destructive">Scene references could not load. {context.error.message}</p><Button size="sm" variant="outline" onClick={()=>void context.refetch()}>Retry references</Button></> : <p className="text-sm text-muted-foreground">Loading scene references…</p>}</div>;
  return <ContextEditor key={scene.id} scene={scene} initial={context.data} compact={compact} onOpenEntry={onOpenEntry} selectedEntryId={selectedEntryId} />;
}
export function ContextEditor({scene, initial, compact = false, onOpenEntry, selectedEntryId}: {scene:Scene;initial:SceneContext;compact?:boolean} & CardOptions) {
  const url = `/api/scenes/${scene.id}/context`;
  const [value, update] = useEditorDraft(withPendingEdits(url,initial));
  const autosave = useAutosave(url);
  const recovery = useRecoverableDrafts().some(draft=>draft.url===url);
  const entriesQuery = useStoryBibleEntries(scene.projectId,{staleTime:0});
  const entries = entriesQuery.data || [];
  const [adding,setAdding] = useState<SceneRole|null>(null), [choice,setChoice] = useState(0), [error,setError] = useState("");
  const [,navigate] = useLocation();
  function change(fn: (links:SceneBibleLink[])=>SceneBibleLink[]) {
    const next = update(old=>({...old,links:fn(old.links)}));
    autosave.save({links:next.links});
  }
  function add() {
    if (!adding || !choice) return;
    const role = adding;
    change(links=>[...links.filter(link=>role==="viewpoint" ? link.role!=="viewpoint" : !(link.role===role && link.entryId===choice)),{entryId:choice,role,note:""}]);
    setAdding(null);setChoice(0);
  }
  async function openEntry(entry:StoryBibleEntry) {
    if(onOpenEntry) {onOpenEntry(entry.id);return;}
    setError("");
    try { await prepareManuscriptAction(scene.projectId); navigate(`/project/${scene.projectId}/story-bible?entry=${entry.id}&fromScene=${scene.id}`); }
    catch(cause) { setError(cause instanceof Error ? cause.message : "Resolve pending writing before opening the entry."); }
  }
  if (selectedEntryId) {
    const target=entries.find(entry=>entry.id===selectedEntryId);
    const links=value.links.filter(link=>link.entryId===selectedEntryId);
    return <section aria-label="Notes for this scene" className="space-y-3">
      <div className="flex items-center justify-between gap-2"><p className="text-xs text-muted-foreground">Only in this scene</p><SaveStatus status={autosave.status} retry={autosave.flush} stable /></div>
      {recovery && <p role="alert" className="text-sm">Review the saved reference draft before editing. <button className="underline" onClick={()=>window.dispatchEvent(new Event("qq:review-drafts"))}>Review draft</button></p>}
      <fieldset disabled={recovery} className="space-y-3">
        {!links.length && <><p className="text-sm text-muted-foreground">Pin this entry to add a scene note. Inline mentions stay separate.</p><Button size="sm" variant="outline" disabled={!target || bibleEntryArchived(target) || value.links.length>=200} onClick={()=>change(previous=>[...previous,{entryId:selectedEntryId,role:"reference",note:""}])}>Pin to scene</Button></>}
        {links.map(link=>{const key=sceneLinkKey(link),label=`Note for ${target?.title || "entry"} in ${SCENE_ROLES[link.role].label}`;return <div key={key} className="space-y-2"><div className="flex items-center justify-between gap-2"><label className="text-sm font-medium" htmlFor={`context-note-${scene.id}-${key}`}>{SCENE_ROLES[link.role].label}</label><button className="text-xs underline" aria-label={`Remove ${target?.title || "entry"} from ${SCENE_ROLES[link.role].label}`} onClick={()=>change(previous=>previous.filter(item=>sceneLinkKey(item)!==key))}>Unpin</button></div><Textarea aria-label={label} id={`context-note-${scene.id}-${key}`} value={link.note} maxLength={5000} placeholder="Why this matters in this scene…" onChange={event=>{const note=event.target.value;change(previous=>previous.map(item=>sceneLinkKey(item)===key ? {...item,note} : item));}} /></div>;})}
      </fieldset>
      {autosave.error && <p role="alert" className="text-sm text-destructive">{autosave.error.message}</p>}
    </section>;
  }
  return <section aria-label="Scene Story Bible" className={compact ? "space-y-3 p-3" : "space-y-4 p-4"}>
    <div className="flex items-center justify-between gap-2"><h3 className="font-semibold text-sm">Story Bible</h3><SaveStatus status={autosave.status} retry={autosave.flush} stable /></div>
    {!compact && <p className="text-xs text-muted-foreground">Choose who is here, where it happens, and what to keep in mind. These references stay separate from prose.</p>}
    {recovery && <div role="alert" className="rounded border p-3 text-sm">A scene-reference draft needs review. <button className="underline" onClick={()=>window.dispatchEvent(new Event("qq:review-drafts"))}>Review saved draft</button></div>}
    {entriesQuery.isError && <p role="alert" className="text-sm text-destructive">Bible entries could not refresh. Saved connections are retained. <button className="underline" onClick={()=>void entriesQuery.refetch()}>Retry</button></p>}

    <fieldset disabled={recovery} className="space-y-5 min-w-0">
      {roleList.map(role=><section key={role} aria-label={SCENE_ROLES[role].label} className="space-y-2">
        <div className="flex items-center justify-between gap-2"><h4 className="font-medium text-sm">{SCENE_ROLES[role].label}</h4><Button type="button" size="sm" variant="outline" disabled={entriesQuery.isLoading || entriesQuery.isError || value.links.length>=200} onClick={()=>{setAdding(role);setChoice(0);}}>{role==="viewpoint" && value.links.some(link=>link.role===role) ? "Change viewpoint" : `Add ${role === "cast" ? "character" : role === "location" ? "location" : role === "reference" ? "reference" : "viewpoint"}`}</Button></div>
        {!value.links.some(link=>link.role===role) && <p className="text-xs text-muted-foreground">{role==="viewpoint" ? "Optional · leave empty for an unspecified or omniscient viewpoint." : role==="reference" ? "Events, research, groups, details, and other entries relevant to this scene." : "No entries linked yet."}</p>}
        {value.links.filter(link=>link.role===role).map(link=>{
          const entry = entries.find(item=>item.id===link.entryId), key = sceneLinkKey(link);
          const label = entry?.title || `Unavailable entry #${link.entryId}`;
          const classification = entry && legacyClassification(entry);
          return <article key={key} className="rounded-lg border bg-background p-3 space-y-2 min-w-0">
            <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><h5 className="text-sm font-semibold break-words">{label}</h5>{entry && <p className="text-xs text-muted-foreground">{Object.values(BIBLE_TAXONOMY).find(type=>type.key===entry.entryType)?.name || entry.entryType}{classification?.category ? ` · ${classification.category}` : ""}{bibleEntryArchived(entry) ? " · Archived" : ""}</p>}</div><button type="button" className="text-xs underline shrink-0" aria-label={`Remove ${label} from ${SCENE_ROLES[role].label}`} onClick={()=>change(links=>links.filter(item=>sceneLinkKey(item)!==key))}>Remove</button></div>
            {entry && <><p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{bibleCardSummary(entry)}</p><Button type="button" size="sm" variant="ghost" className="px-0 h-auto text-xs underline" onClick={()=>void openEntry(entry)}>Open {entry.title} →</Button></>}
            <details><summary className="cursor-pointer text-xs text-muted-foreground">Scene-specific note{link.note ? " · added" : ""}</summary><label className="sr-only" htmlFor={`context-note-${scene.id}-${key}`}>Note for {label} in {SCENE_ROLES[role].label}</label><Textarea className="mt-2 text-sm" id={`context-note-${scene.id}-${key}`} maxLength={5000} value={link.note} placeholder="Why this matters in this scene…" onChange={e=>{const note=e.target.value;change(links=>links.map(item=>sceneLinkKey(item)===key ? {...item,note} : item));}} /></details>
          </article>;
        })}
      </section>)}
    </fieldset>
    {(error || autosave.error) && <p role="alert" className="text-sm text-destructive">{error || autosave.error?.message}</p>}
    <Dialog open={!!adding} onOpenChange={open=>{if(!open)setAdding(null);}}><DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>{adding ? `Scene ${SCENE_ROLES[adding].label.toLowerCase()}` : "Scene references"}</DialogTitle><DialogDescription>Link an existing entry from this project. Its name and reference card stay current when the entry changes.</DialogDescription></DialogHeader>{adding && <EntryPicker entries={entries.filter(entry=>adding==="viewpoint" || !value.links.some(link=>link.role===adding && link.entryId===entry.id))} types={SCENE_ROLES[adding].types} value={choice} onChange={setChoice}/>}<Button disabled={!choice || recovery} onClick={add}>Link to scene</Button></DialogContent></Dialog>
  </section>;
}

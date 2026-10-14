import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Editor } from "@tiptap/core";
import type { Scene, StoryBibleEntry } from "@shared/schema";
import type { SceneContext } from "@shared/scene-context";
import { BIBLE_TYPES, BIBLE_TAXONOMY } from "@shared/bible-catalog";
import { relationshipDefinition } from "@shared/relationships";
import { useStoryBibleEntries } from "@/hooks/use-story-bible";
import { useRecoverableDrafts, withPendingEdits } from "@/hooks/use-autosave";
import { bibleEntryArchived, structuredBibleData } from "@/lib/story-bible-data";
import { prepareManuscriptAction } from "@/lib/manuscript-actions";
import { useLocation } from "wouter";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { EntryPicker, RelationshipNavigation, useRelationships } from "./story-bible/relationships";
import { EntryEditor } from "./story-bible/entry-editor";
import SceneBibleContext, { bibleCardSummary } from "./scene-bible-context";
import ScenePlanEditor from "./scene-plan-editor";
import { linkWritingRange, mentionRanges } from "./rich-text-editor/bible-reference";
import { ArrowLeft, Search, X } from "lucide-react";

export default function WritingReferencePane({projectId,scene,editor,activeId,onOpen,onClose}: {projectId:number;scene?:Scene;editor:Editor|null;activeId:number|null;onOpen:(id:number|null)=>void;onClose:()=>void}) {
  const entries = useStoryBibleEntries(projectId,{staleTime:0});
  const relationships = useRelationships(projectId);
  const context = useQuery<SceneContext>({queryKey:[`/api/scenes/${scene?.id}/context`],enabled:!!scene,staleTime:0});
  const [tick,setTick] = useState(0),[tab,setTab] = useState("facts"),[finding,setFinding] = useState(false),[editing,setEditing] = useState(false),[planning,setPlanning] = useState(false),[scanning,setScanning] = useState(false),[error,setError] = useState("");
  const [,navigate] = useLocation();
  const recovery = useRecoverableDrafts().some(d=>d.url===`/api/story-bible/${activeId}`);
  useEffect(()=>{if(!editor)return;const update=()=>setTick(n=>n+1);editor.on("update",update);editor.on("selectionUpdate",update);return ()=>{editor.off("update",update);editor.off("selectionUpdate",update);};},[editor]);
  useEffect(()=>{setTab("facts");setError("");setEditing(false);},[activeId]);
  const ranges = editor && !editor.isDestroyed ? mentionRanges(editor) : [];
  const ids = [...new Set([...(context.data ? withPendingEdits(`/api/scenes/${scene?.id}/context`,context.data).links : []).map(l=>l.entryId),...ranges.map(r=>r.entryId)])];
  const entry = entries.data?.find(e=>e.id===activeId);
  const archived = entry && bibleEntryArchived(entry);
  function continueWriting() {editor?.commands.focus();}
  function findMention() {
    if(!editor || !entry) return;
    const matches = mentionRanges(editor,entry.id);
    const match = matches.find(r=>r.from > editor.state.selection.to) || matches[0];
    if(match) editor.chain().focus().setTextSelection(match).scrollIntoView().run();
  }
  function unlink() {
    if(!editor || !entry)return;
    const {from,to}=editor.state.selection;
    const match=mentionRanges(editor,entry.id).find(r=>r.from<=from && r.to>=to);
    if(match) editor.chain().focus().setTextSelection(match).unsetMark("bibleReference").run();
  }
  const selectedMention = !!entry && !!editor && ranges.some(r=>r.entryId===entry.id && r.from<=editor.state.selection.from && r.to>=editor.state.selection.to);
  async function fullEntry() {
    if(!entry)return;setError("");
    try {await prepareManuscriptAction(projectId);navigate(`/project/${projectId}/story-bible?entry=${entry.id}${scene ? `&fromScene=${scene.id}` : ""}`);}
    catch(cause){setError(cause instanceof Error ? cause.message : "Resolve saved drafts first.");}
  }
  return <aside aria-label="Writing references" className="writing-reference-pane shrink-0 min-h-0 border-l bg-background flex flex-col overflow-hidden">
    <div className="h-11 px-3 border-b flex items-center justify-between shrink-0"><h2 className="text-sm font-semibold">Writing context</h2><Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Close context" onClick={onClose}><X className="h-4 w-4" /></Button></div>
    <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-gutter:stable]">
      {scene && <details className="border-b group" open={!activeId || undefined}><summary className="px-4 py-3 cursor-pointer text-sm font-medium">Scene plan & beats</summary><div className="px-4 pb-4 space-y-3"><p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{scene.summary || "What changes in this scene? Add a plan when you need one."}</p>{!!scene.storyBeats?.length && <ol className="list-decimal pl-4 text-sm space-y-2">{scene.storyBeats.slice(0,4).map(beat=><li key={beat.id} className="whitespace-pre-wrap break-words">{beat.text || "Untitled beat"}</li>)}</ol>}<Button size="sm" variant="ghost" className="px-0" onClick={()=>setPlanning(true)}>Edit scene plan{(scene.storyBeats?.length || 0)>4 ? ` · ${scene.storyBeats.length} beats` : ""}</Button></div></details>}
      <section className="p-4 space-y-3" aria-label="Story Bible cards">
        <div className="flex items-center justify-between gap-2"><h3 className="font-semibold text-sm">Story Bible</h3><Button size="sm" variant="ghost" onClick={()=>setFinding(true)}><Search className="h-4 w-4 mr-1" />Find</Button></div>
        {scene && editor && <Button variant="outline" size="sm" className="w-full" onClick={()=>setScanning(true)}>Find missing connections</Button>}
        {entries.isLoading ? <p className="text-sm">Loading entries…</p> : entries.error ? <p role="alert" className="text-sm">Could not load entries. <button className="underline" onClick={()=>void entries.refetch()}>Retry</button></p> : activeId ? entry ? <>
          <Button size="sm" variant="ghost" className="px-0" onClick={()=>onOpen(null)}><ArrowLeft className="h-4 w-4 mr-1" />Scene references</Button>
          <div><p className="text-xs text-muted-foreground">{Object.values(BIBLE_TAXONOMY).find(t=>t.key===entry.entryType)?.name}{archived ? " · Archived" : ""}</p><h3 className="font-semibold text-lg break-words">{entry.title}</h3></div>
          <div role="tablist" aria-label="Reference card sections" className="flex border-b">{["facts","connections",...(scene ? ["scene note"] : [])].map(t=><button role="tab" aria-selected={tab===t} key={t} className={`px-2 py-2 text-xs capitalize ${tab===t ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`} onClick={()=>setTab(t)}>{t}</button>)}</div>
          <div role="tabpanel" aria-label={tab}>
          {tab==="facts" && <div className="space-y-3"><p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{bibleCardSummary(entry)}</p><dl className="text-sm space-y-2">{Object.entries(structuredBibleData(entry)).filter(([key,value])=>typeof value === "string" && value.trim() && !/content|summary|description|notes|history|image|url|id|schema|biography|backstory/i.test(key)).slice(0,16).map(([key,value])=><div key={key}><dt className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g," $1")}</dt><dd className="whitespace-pre-wrap break-words">{String(value)}</dd></div>)}</dl><Button size="sm" variant="outline" onClick={()=>setEditing(true)}>Edit entry here</Button></div>}
          {tab==="connections" && <div className="space-y-3">{relationships.error ? <p role="alert">Connections could not load. <button className="underline" onClick={()=>void relationships.refetch()}>Retry</button></p> : relationships.isLoading ? <p>Loading connections…</p> : <>{!(relationships.data || []).some(l=>l.sourceId===entry.id || l.targetId===entry.id) && <p className="text-sm text-muted-foreground">No relationships yet.</p>}{(relationships.data || []).filter(l=>l.sourceId===entry.id || l.targetId===entry.id).map(link=>{const other=entries.data?.find(e=>e.id===(link.sourceId===entry.id ? link.targetId : link.sourceId));return <div className="border rounded p-2" key={link.id}><p className="text-xs text-muted-foreground">{relationshipDefinition(link.relationshipType).label}{link.role ? ` · ${link.role}` : ""}</p><button className="text-sm font-medium underline text-left" disabled={!other} onClick={()=>other && onOpen(other.id)}>{other?.title || "Unavailable entry"}</button>{link.context && <p className="text-xs whitespace-pre-wrap">{link.context}</p>}</div>;})}<Button variant="outline" size="sm" onClick={()=>setEditing(true)}>Edit connections here</Button></>}</div>}
          {tab==="scene note" && scene && !scanning && <SceneBibleContext key={`${scene.id}:${entry.id}`} scene={scene} compact selectedEntryId={entry.id} onOpenEntry={onOpen} />}
          </div>
          <div className="border-t pt-3 flex flex-wrap gap-1">
            <Button size="sm" variant="ghost" disabled={!!archived || !editor} onClick={()=>editor && linkWritingRange(editor,editor.state.selection,entry.id,entry.title)}>Link at cursor</Button>
            <Button size="sm" variant="ghost" disabled={!ranges.some(r=>r.entryId===entry.id)} onClick={findMention}>Find in prose</Button>
            <Button size="sm" variant="ghost" disabled={!selectedMention} onClick={unlink}>Unlink selected mention</Button>
            <Button size="sm" variant="ghost" onClick={()=>void fullEntry()}>Open full entry →</Button>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </> : <><p className="text-sm">This entry is unavailable. Your manuscript words are kept.</p><Button variant="ghost" onClick={()=>onOpen(null)}>Back to references</Button></> : <>
          <p className="text-xs text-muted-foreground">Open a card to check facts or edit details while you write. Use @ to link an element in your prose.</p>
          {ids.map(id=>{const item=entries.data?.find(e=>e.id===id);return <button key={id} className="block w-full text-left border rounded-lg p-3 hover:bg-accent" onClick={()=>onOpen(id)}><span className="block text-sm font-medium">{item?.title || "Unavailable entry"}{item && bibleEntryArchived(item) ? " · Archived" : ""}</span><span className="block mt-1 text-xs text-muted-foreground">{ranges.some(r=>r.entryId===id) ? "Mentioned in prose" : "Scene reference"}</span></button>;})}
          {!ids.length && <p className="text-sm text-muted-foreground">No references yet. Find an entry, or link one as you write.</p>}
          {scene && !scanning && <details><summary className="cursor-pointer text-xs font-medium py-2">Manage cast, locations & references</summary><SceneBibleContext scene={scene} compact onOpenEntry={onOpen} /></details>}
        </>}
      </section>
    </div>
    <div className="shrink-0 p-2 border-t"><Button variant="ghost" className="w-full" onClick={continueWriting}>Continue writing</Button></div>
    {/* Only one context editor is mounted at a time, so the scan and manual notes share the same queued draft. */}
    <Dialog open={scanning} onOpenChange={setScanning}><DialogContent className="max-w-2xl max-h-[85dvh] overflow-y-auto" onCloseAutoFocus={e=>e.preventDefault()}><DialogHeader><DialogTitle>Find missing connections</DialogTitle><DialogDescription>Scan this scene’s current prose. Add reviewed matches to its Story Bible cards without changing any words or formatting.</DialogDescription></DialogHeader>{scanning && scene && editor && <SceneBibleContext key={`scan:${scene.id}`} scene={scene} scanEditor={editor} />}</DialogContent></Dialog>
    <Dialog open={planning} onOpenChange={setPlanning}><DialogContent className="max-w-2xl max-h-[85dvh] overflow-y-auto" onCloseAutoFocus={e=>e.preventDefault()}><DialogHeader><DialogTitle>Scene plan & beats</DialogTitle><DialogDescription>Planning notes stay separate from your prose. Changes save automatically.</DialogDescription></DialogHeader>{scene && <ScenePlanEditor key={scene.id} scene={scene}/>}</DialogContent></Dialog>
    <Dialog open={finding} onOpenChange={setFinding}><DialogContent><DialogHeader><DialogTitle>Find a Story Bible element</DialogTitle><DialogDescription>Open its card without leaving your writing.</DialogDescription></DialogHeader><EntryPicker entries={entries.data || []} types={BIBLE_TYPES} value={0} onChange={id=>{onOpen(id);setFinding(false);}} /></DialogContent></Dialog>
    <Dialog open={editing && !!entry} onOpenChange={setEditing}><DialogContent className="max-w-4xl max-h-[88dvh] overflow-y-auto" onCloseAutoFocus={e=>e.preventDefault()}><DialogHeader><DialogTitle>Edit {entry?.title}</DialogTitle><DialogDescription>Changes save automatically to the shared Story Bible entry. Your prose remains open behind this editor.</DialogDescription></DialogHeader>{entry && (recovery ? <p role="alert">This entry has a saved draft to review. <button className="underline" onClick={()=>{setEditing(false);window.dispatchEvent(new Event("qq:review-drafts"));}}>Review saved draft</button></p> : <RelationshipNavigation.Provider value={other=>onOpen(other.id)}><EntryEditor key={entry.id} entry={entry} projectId={projectId} onClose={()=>setEditing(false)} /></RelationshipNavigation.Provider>)}</DialogContent></Dialog>
  </aside>;
}

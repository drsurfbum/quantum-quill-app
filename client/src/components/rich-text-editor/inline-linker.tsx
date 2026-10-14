import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { useQuery } from "@tanstack/react-query";
import type { StoryBibleEntry } from "@shared/schema";
import { BIBLE_TYPES, BIBLE_TAXONOMY } from "@shared/bible-catalog";
import { EntryPicker } from "@/components/story-bible/relationships";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest, currentAccount, queryClient } from "@/lib/queryClient";
import { atQuery, linkWritingRange, type WritingRange } from "./bible-reference";

export default function InlineLinker({editor,projectId,request,onOpenEntry}: {editor:Editor;projectId:number;request:number;onOpenEntry?:(id:number)=>void}) {
  const [range,setRange] = useState<(WritingRange & {query?:string}) | null>(null);
  const [stub,setStub] = useState<string|null>(null),[type,setType] = useState<string>("characters"),[error,setError] = useState(""),[busy,setBusy] = useState(false);
  const dismissed = useRef<number|null>(null);
  const owner = useRef(currentAccount()).current;
  const entries = useQuery<StoryBibleEntry[]>({queryKey:[`/api/projects/${projectId}/story-bible`],enabled:!!range,staleTime:0});
  const open = (next: WritingRange & {query?:string}) => {setRange(next);setStub(null);setError("");};
  useEffect(()=>{if(request) open({from:editor.state.selection.from,to:editor.state.selection.to});},[request]);
  useEffect(()=>{
    const updated = () => { if (!editor.isFocused) return; const query = atQuery(editor); if(!query) dismissed.current=null;else if(query.from!==dismissed.current) open(query); };
    const composition = () => setTimeout(()=>{if(!editor.isDestroyed) updated();},0);
    editor.on("update",updated);editor.view.dom.addEventListener("compositionend",composition);
    return ()=>{editor.off("update",updated);editor.view.dom.removeEventListener("compositionend",composition);};
  },[editor]);
  function choose(entry: StoryBibleEntry) {
    if (!range || currentAccount() !== owner || entry.projectId !== projectId) return;
    linkWritingRange(editor,range,entry.id,entry.title,range.query !== undefined);
    setRange(null);onOpenEntry?.(entry.id);
  }
  async function create() {
    if (!stub?.trim() || busy) return;
    setBusy(true);setError("");
    try {
      if (currentAccount() !== owner) throw new Error("Your account changed. Reopen this project.");
      const entry = await (await apiRequest("POST",`/api/projects/${projectId}/bible-stubs`,{entryType:type,title:stub.trim()})).json();
      if (currentAccount() !== owner) return;
      await queryClient.invalidateQueries({queryKey:[`/api/projects/${projectId}/story-bible`]});choose(entry);
    } catch(cause) {setError(cause instanceof Error ? cause.message : "Could not create entry. Your prose is unchanged.");}
    finally {setBusy(false);}
  }
  return <Dialog open={!!range} onOpenChange={open=>{if(!open && !busy) {dismissed.current=range?.query !== undefined ? range.from : null;setRange(null);}}}><DialogContent onCloseAutoFocus={event=>{event.preventDefault();if(!editor.isDestroyed) editor.commands.focus();}}>
    <DialogHeader><DialogTitle>Link a Story Bible element</DialogTitle><DialogDescription>{range?.query !== undefined ? "Choose an entry to replace the @ search, or press Escape to keep what you typed." : range && range.from !== range.to ? "Your selected words stay exactly as written. The link opens a reference card here in Write." : "Insert an entry’s name at your cursor. You can edit the words afterward."}</DialogDescription></DialogHeader>
    {entries.error ? <p role="alert">Entries could not load. <Button onClick={()=>void entries.refetch()}>Retry</Button></p> : entries.isLoading ? <p>Loading entries…</p> : stub === null ? <EntryPicker key={range?.from} entries={entries.data || []} types={BIBLE_TYPES} value={0} initialSearch={range?.query} onChange={()=>{}} onChoose={id=>{const entry=entries.data?.find(e=>e.id===id);if(entry) choose(entry);}} onStub={setStub} /> : <div className="space-y-3">
      <label className="block text-sm">New entry name<Input maxLength={500} value={stub} onChange={e=>setStub(e.target.value)} /></label>
      <label className="block text-sm">Element type<select className="block w-full rounded border bg-background p-2" value={type} onChange={e=>setType(e.target.value)}>{Object.values(BIBLE_TAXONOMY).map(t=><option key={t.key} value={t.key}>{t.name}</option>)}</select></label>
      <p className="text-xs text-muted-foreground">Creates a named entry in this project, or uses an existing entry with the same name and type. Develop its details in the reference card whenever you’re ready.</p>
      <div className="flex gap-2"><Button disabled={busy || !stub.trim()} onClick={()=>void create()}>{busy ? "Creating…" : "Create and link"}</Button><Button disabled={busy} variant="ghost" onClick={()=>setStub(null)}>Choose existing</Button></div>
    </div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </DialogContent></Dialog>;
}

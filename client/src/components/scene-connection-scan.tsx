import { useEffect, useMemo, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import type { Scene, StoryBibleEntry } from '@shared/schema';
import { scanExistingConnections, appendScannedConnection } from '@shared/connection-scan';
import { type SceneBibleLink, type SceneRole } from '@shared/scene-context';
import { BIBLE_TAXONOMY } from '@shared/bible-catalog';
import { currentAccount } from '@/lib/queryClient';
import type { useAutosave } from '@/hooks/use-autosave';
import { Button } from './ui/button';
import { SaveStatus } from './save-status';
import { mentionRanges } from './rich-text-editor/bible-reference';

export default function SceneConnectionScan({scene,editor,entries,links,onChange,autosave,recovery,entriesError}: {
  scene:Scene;editor:Editor;entries:StoryBibleEntry[];links:SceneBibleLink[];
  onChange:(fn:(links:SceneBibleLink[])=>SceneBibleLink[])=>void;
  autosave:ReturnType<typeof useAutosave>;recovery:boolean;entriesError:boolean;
}) {
  const owner=useRef(currentAccount()).current;
  const [scan,setScan]=useState(()=>({text:editor.getText({blockSeparator:'\n\n'}),doc:editor.state.doc,inlineIds:mentionRanges(editor).map(r=>r.entryId)}));
  const [changed,setChanged]=useState(false),[dismissed,setDismissed]=useState<number[]>([]),[roles,setRoles]=useState<Record<number,SceneRole>>({}),[error,setError]=useState(''),[added,setAdded]=useState(0),[limit,setLimit]=useState(20);
  useEffect(()=>{const update=()=>setChanged(editor.state.doc!==scan.doc);editor.on('transaction',update);return()=>{editor.off('transaction',update);};},[editor,scan.doc]);
  const result=useMemo(()=>scanExistingConnections(scan.text,entries,scene.projectId,[...links.map(l=>l.entryId),...scan.inlineIds]),[scan,entries,scene.projectId,links]);
  const visible=result.suggestions.filter(s=>!dismissed.includes(s.entryId));
  const accountChanged=!owner || currentAccount()!==owner;
  const blocked=accountChanged || recovery || entriesError || changed || editor.isDestroyed;
  function rescan(){if(editor.isDestroyed || accountChanged)return;setScan({text:editor.getText({blockSeparator:'\n\n'}),doc:editor.state.doc,inlineIds:mentionRanges(editor).map(r=>r.entryId)});setChanged(false);setDismissed([]);setError('');setLimit(20);}
  function add(id:number){
    if(blocked)return;
    if(editor.state.doc!==scan.doc){setChanged(true);return;}
    const entry=entries.find(e=>e.id===id);if(!entry)return;
    try{onChange(previous=>appendScannedConnection(previous,entry,scene.projectId,roles[id]||'reference'));setAdded(n=>n+1);setError('');}
    catch(cause){setError(cause instanceof Error ? cause.message : 'Could not add this connection.');}
  }
  if(accountChanged)return <p role="alert">Your account changed. Reopen the project to scan its writing.</p>;
  return <section aria-label="Connection suggestions" className="space-y-4">
    <p className="text-sm text-muted-foreground">Matches names and nicknames against this project’s existing Story Bible. Review the passage before adding a card. A mention may be a memory or a destination, rather than someone or somewhere present.</p>
    <div className="flex items-center justify-between gap-2 flex-wrap"><span className="text-xs text-muted-foreground">{result.suggestions.length} to review · {result.alreadyConnected} already connected</span><Button variant="outline" size="sm" onClick={rescan} disabled={editor.isDestroyed}>Scan again</Button></div>
    {changed && <p role="alert" className="text-sm">The prose changed since this scan. Scan again to review current passages.</p>}
    {entriesError && <p role="alert" className="text-sm">Story Bible entries could not refresh. Close and reopen this scan to retry.</p>}
    {recovery && <p role="alert" className="text-sm">Review the saved reference draft before adding connections. <button className="underline" onClick={()=>window.dispatchEvent(new Event('qq:review-drafts'))}>Review saved draft</button></p>}
    <div className="space-y-3">
      {visible.slice(0,limit).map(s=> <article key={s.entryId} aria-label={`Suggestion: ${s.title}`} className="rounded-lg border p-3 space-y-3">
        <div><h3 className="font-medium break-words">{s.title}</h3><p className="text-xs text-muted-foreground">{Object.values(BIBLE_TAXONOMY).find(t=>t.key===s.entryType)?.name} · {s.count} {s.count===1 ? 'mention' : 'mentions'}{s.variation ? ' · Shortened name' : ''}</p></div>
        {s.ambiguous && <p className="text-xs font-medium">This name also matches another entry. Check which one the passage means.</p>}
        {s.excerpts.map((excerpt,i)=><blockquote key={i} className="border-l-2 pl-3 text-sm text-muted-foreground break-words">{excerpt}</blockquote>)}
        <fieldset disabled={blocked} className="flex flex-wrap items-end gap-2 min-w-0">
          <label className="text-xs flex-1 min-w-32">Add as<select aria-label={`Role for ${s.title}`} className="mt-1 block w-full border rounded bg-background p-2 text-sm" value={roles[s.entryId]||'reference'} onChange={e=>setRoles(old=>({...old,[s.entryId]:e.target.value as SceneRole}))}>
            <option value="reference">Reference · mentioned</option>{s.entryType==='characters' && <option value="cast">Cast · participates</option>}{s.entryType==='locations' && <option value="location">Location · scene setting</option>}
          </select></label>
          <Button size="sm" aria-label={`Add connection to ${s.title}`} onClick={()=>add(s.entryId)} disabled={links.length>=200}>Add connection</Button>
          <Button size="sm" variant="ghost" aria-label={`Skip ${s.title}`} onClick={()=>setDismissed(old=>[...old,s.entryId])}>Skip</Button>
        </fieldset>
      </article>)}
      {visible.length>limit && <Button variant="outline" onClick={()=>setLimit(n=>n+20)}>Show more suggestions</Button>}
      {!visible.length && <p className="text-sm">{!scan.text.trim() ? 'This scene has no prose to scan yet.' : result.suggestions.length ? 'All remaining suggestions were skipped for this scan.' : 'No unconnected names found.'} This scan checks named entries, not pronouns or implied connections.</p>}
    </div>
    <div className="border-t pt-3 flex items-center justify-between gap-2"><p role="status" className="text-sm">{added ? `${added} ${added===1 ? 'connection' : 'connections'} added. ` : ''}Prose stays unchanged.</p><SaveStatus status={autosave.status} retry={autosave.flush} stable /></div>
    {(error || autosave.error) && <p role="alert" className="text-sm text-destructive">{error || autosave.error?.message}</p>}
  </section>;
}

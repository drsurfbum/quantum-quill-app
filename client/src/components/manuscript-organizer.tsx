import { useState } from "react";
import { ArrowDown, ArrowUp, ListTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { prepareManuscriptAction } from "@/lib/manuscript-actions";
import type { ManuscriptStructure } from "@shared/manuscript";

export default function ManuscriptOrganizer({ projectId }: { projectId: number }) {
  const [open,setOpen] = useState(false), [busy,setBusy] = useState(false), [error,setError] = useState("");
  const [plan,setPlan] = useState<ManuscriptStructure>(), [dirty,setDirty] = useState(false);
  const load = async () => {
    setBusy(true); setError("");
    try { await prepareManuscriptAction(projectId); setPlan(await (await apiRequest("GET",`/api/projects/${projectId}/manuscript`)).json()); setDirty(false); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const change = (chapters: ManuscriptStructure["chapters"]) => { setPlan({...plan!,chapters}); setDirty(true); };
  const swap = <T,>(items:T[],index:number,offset:number) => { const result=[...items]; [result[index],result[index+offset]]=[result[index+offset],result[index]]; return result; };
  const save = async () => {
    if (!plan) return; setBusy(true); setError("");
    try {
      await prepareManuscriptAction(projectId);
      await apiRequest("PUT",`/api/projects/${projectId}/manuscript`, { snapshot:plan.snapshot,chapters:plan.chapters.map(c=>({id:c.id,sceneIds:c.scenes.map(s=>s.id)})) });
      await Promise.all([`/api/projects/${projectId}/chapters`,`/api/projects/${projectId}/scenes`].map(url=>queryClient.invalidateQueries({queryKey:[url]})));
      await queryClient.invalidateQueries({predicate:q=>/^\/api\/(chapters|scenes)\//.test(String(q.queryKey[0]))});
      setOpen(false); setDirty(false);
    } catch(e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={value=>{if(!busy){setOpen(value);if(value){setPlan(undefined);void load();}}}}>
    <DialogTrigger asChild><Button variant="outline" size="sm" className="gap-1"><ListTree className="h-4 w-4"/>Organize</Button></DialogTrigger>
    <DialogContent className="max-w-3xl max-h-[90dvh] flex flex-col"><DialogHeader><DialogTitle>Organize chapters & scenes</DialogTitle><DialogDescription>Reorder chapters and scenes, or move a scene to another scene chapter. Writing, beats, and source links stay attached to each scene. Apply saves the whole arrangement together.</DialogDescription></DialogHeader>
      <div className="overflow-y-auto min-h-0 space-y-4 pr-2">
        {!plan && !error && <p>Loading manuscript…</p>}
        {plan?.chapters.length === 0 && <p>No chapters yet. Add one in Write or Outline.</p>}
        {plan?.chapters.map((chapter,i)=><section key={chapter.id} className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2"><h3 className="font-semibold flex-1 min-w-0 break-words">{i+1}. {chapter.title}</h3><Button variant="ghost" size="icon" aria-label={`Move chapter ${chapter.title} up`} disabled={busy||i===0} onClick={()=>change(swap(plan.chapters,i,-1))}><ArrowUp className="h-4 w-4"/></Button><Button variant="ghost" size="icon" aria-label={`Move chapter ${chapter.title} down`} disabled={busy||i===plan.chapters.length-1} onClick={()=>change(swap(plan.chapters,i,1))}><ArrowDown className="h-4 w-4"/></Button></div>
          {chapter.writingMode === "chapter" ? <p className="text-xs text-muted-foreground">Chapter prose</p> : chapter.scenes.length === 0 ? <p className="text-xs text-muted-foreground">Empty scene chapter</p> : chapter.scenes.map((scene,j)=><div key={scene.id} className="border-t pt-2 flex flex-wrap items-center gap-2"><span className="flex-1 min-w-32 text-sm break-words">{j+1}. {scene.title}</span><Button variant="ghost" size="icon" aria-label={`Move scene ${scene.title} up`} disabled={busy||j===0} onClick={()=>change(plan.chapters.map(c=>c.id===chapter.id?{...c,scenes:swap(c.scenes,j,-1)}:c))}><ArrowUp className="h-4 w-4"/></Button><Button variant="ghost" size="icon" aria-label={`Move scene ${scene.title} down`} disabled={busy||j===chapter.scenes.length-1} onClick={()=>change(plan.chapters.map(c=>c.id===chapter.id?{...c,scenes:swap(c.scenes,j,1)}:c))}><ArrowDown className="h-4 w-4"/></Button>
            <select aria-label={`Chapter for ${scene.title}`} value={chapter.id} disabled={busy} className="bg-background border rounded p-2 max-w-56 text-sm" onChange={e=>{const target=Number(e.target.value);change(plan.chapters.map(c=>c.id===chapter.id?{...c,scenes:c.scenes.filter(s=>s.id!==scene.id)}:c.id===target?{...c,scenes:[...c.scenes,scene]}:c));}}>{plan.chapters.filter(c=>c.writingMode==="scenes").map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select>
          </div>)}
        </section>)}
      </div>
      {error && <div role="alert" className="text-sm text-destructive">{error}<Button variant="outline" size="sm" disabled={busy} onClick={()=>void load()} className="ml-2">Reload organization</Button></div>}
      <DialogFooter><Button variant="outline" disabled={busy} onClick={()=>setOpen(false)}>Cancel</Button><Button disabled={busy||!dirty||!plan} onClick={()=>void save()}>{busy?"Working…":"Apply organization"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

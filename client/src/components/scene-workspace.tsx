import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Plus } from "lucide-react";
import type { Chapter, Scene } from "@shared/schema";
import WritingDocument from "./writing-document";
import AddScene from "./add-scene";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

export default function SceneWorkspace({chapter,controls}: {chapter:Chapter;controls?:ReactNode}) {
  const {data=[],isLoading,error} = useQuery<Scene[]>({queryKey:[`/api/projects/${chapter.projectId}/scenes`]});
  const scenes = data.filter(s=>s.chapterId===chapter.id).sort((a,b)=>a.order-b.order || a.id-b.id);
  const selectedId = Number(new URLSearchParams(useSearch()).get("scene"));
  const selected = scenes.find(s=>s.id===selectedId) || (!selectedId ? scenes[0] : undefined);
  const [,navigate] = useLocation();
  const [adding,setAdding] = useState(false);
  const select = (id:number)=>navigate(`/project/${chapter.projectId}/write?chapter=${chapter.id}&scene=${id}`);
  const actions = <>{controls}<select aria-label="Current scene" className="h-8 min-w-0 max-w-32 border rounded bg-background text-xs px-1 hidden sm:block" value={selected?.id || ""} onChange={e=>select(Number(e.target.value))}>{!selected && <option value="">Choose a scene</option>}{scenes.map((scene,i)=><option key={scene.id} value={scene.id}>{i+1}. {scene.title}</option>)}</select><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Add scene" onClick={()=>setAdding(true)}><Plus className="h-4 w-4" /></Button></>;
  return <div className="flex flex-col flex-1 min-h-0 min-w-0">
    {error ? <p role="alert" className="p-4">{error.message}</p> : isLoading ? <p className="p-4">Loading scenes…</p> : selected ? <WritingDocument key={selected.id} chapter={chapter} scene={selected} controls={actions} /> : <div className="p-6 space-y-3">{controls}<p>{selectedId ? "This scene is unavailable here. Choose it from the manuscript list or Outline." : "Add your first scene, or start with the Blueprint Wizard in Storyboard."}</p><Button onClick={()=>setAdding(true)}>Add scene</Button></div>}
    <Dialog open={adding} onOpenChange={setAdding}><DialogContent><DialogHeader><DialogTitle>New scene</DialogTitle><DialogDescription>Your plan is optional; you can go straight to writing.</DialogDescription></DialogHeader><AddScene projectId={chapter.projectId} chapter={chapter} onClose={()=>setAdding(false)} onCreated={scene=>{setAdding(false);select(scene.id);}} /></DialogContent></Dialog>
  </div>;
}

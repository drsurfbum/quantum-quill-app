import SceneBibleContext from "./scene-bible-context";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch, Link } from "wouter";
import type { Chapter, Scene } from "@shared/schema";
import RichTextEditor from "./rich-text-editor";
import ScenePlanEditor from "./scene-plan-editor";
import AddScene from "./add-scene";
import { Button } from "./ui/button";
import { Label } from "./ui/label";

export function SceneEditor({ scene }: { scene: Scene }) {
  const [contextOpen,setContextOpen] = useState(false);
  return <div className="flex flex-col flex-1 min-h-0 min-w-0">
    <details className="border-b bg-muted/20 p-3 shrink-0 max-h-[35vh] overflow-y-auto">
      <summary className="cursor-pointer text-sm font-medium">Scene plan & story beats · {scene.title}</summary>
      <div className="pt-3"><ScenePlanEditor scene={scene} /></div>
    </details>
    <div className="border-b px-3 py-1 shrink-0 flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">Scene references stay alongside your writing.</span><Button variant="ghost" size="sm" aria-expanded={contextOpen} aria-controls="scene-bible-panel" onClick={()=>setContextOpen(open=>!open)}>{contextOpen ? "Hide Story Bible" : "Show Story Bible"}</Button></div>
    <div className="relative flex xl:flex-row flex-1 min-h-0 min-w-0">
      <div className="flex flex-col flex-1 min-h-0 min-w-0"><RichTextEditor chapterId={scene.id} resource="scenes" projectId={scene.projectId} content={scene.content} title={scene.title} revision={scene.revision} /></div>
      {contextOpen && <aside id="scene-bible-panel" aria-label="Story Bible beside writing" className="absolute inset-y-0 right-0 z-20 xl:static xl:z-auto shrink-0 border-l w-80 max-w-full h-full overflow-y-auto [scrollbar-gutter:stable] bg-background shadow-xl xl:shadow-none"><div className="xl:hidden sticky top-0 z-10 bg-background border-b p-2 text-right"><Button variant="ghost" size="sm" onClick={()=>setContextOpen(false)}>Close Story Bible</Button></div><SceneBibleContext scene={scene}/></aside>}
    </div>
  </div>;
}
export default function SceneWorkspace({ chapter }: { chapter: Chapter }) {
  const { data = [], isLoading, error } = useQuery<Scene[]>({ queryKey: [`/api/projects/${chapter.projectId}/scenes`] });
  const scenes = data.filter(scene => scene.chapterId === chapter.id).sort((a, b) => a.order - b.order || a.id - b.id);
  const selectedId = Number(new URLSearchParams(useSearch()).get("scene"));
  const selected = scenes.find(scene => scene.id === selectedId) || (!selectedId ? scenes[0] : undefined);
  const [, navigate] = useLocation();
  const [adding, setAdding] = useState(false);
  const select = (id: number) => navigate(`/project/${chapter.projectId}/write?chapter=${chapter.id}&scene=${id}`);
  return <div className="flex flex-col flex-1 min-h-0 min-w-0">
    <div className="flex items-center gap-2 p-3 border-b shrink-0"><Label htmlFor="current-scene" className="shrink-0">Scene</Label><select id="current-scene" className="min-w-0 flex-1 rounded-md border border-input bg-background p-2" value={selected?.id || ""} onChange={e => select(Number(e.target.value))}>{!selected && <option value="">{scenes.length ? "Choose a scene" : "No scenes yet"}</option>}{scenes.map((scene, i) => <option key={scene.id} value={scene.id}>{i + 1}. {scene.title}</option>)}</select>{selected && <Button asChild variant="ghost" size="sm"><Link href={`/project/${chapter.projectId}/outline?scene=${selected.id}`}>Outline & beats</Link></Button>}<Button variant="outline" size="sm" onClick={() => setAdding(true)}>Add scene</Button></div>
    {adding && <AddScene projectId={chapter.projectId} chapter={chapter} onClose={() => setAdding(false)} onCreated={scene => { setAdding(false); select(scene.id); }} />}
    {error ? <p role="alert" className="p-4 text-destructive">{error.message}</p> : isLoading ? <p className="p-4">Loading scenes…</p> : selected ? <SceneEditor key={selected.id} scene={selected} /> : <div className="p-8 text-center text-muted-foreground">{selectedId ? "This scene is unavailable in this chapter. It may have moved; open Outline to find it, or choose a scene above." : "Add your first scene, or use the Blueprint Wizard in Storyboard to plan chapters and scenes together."}</div>}
  </div>;
}

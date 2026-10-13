import SceneBibleContext from "./scene-bible-context";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { PanelRightClose, PanelRightOpen, Plus, X } from "lucide-react";
import type { Chapter, Scene } from "@shared/schema";
import RichTextEditor from "./rich-text-editor";
import ScenePlanEditor from "./scene-plan-editor";
import AddScene from "./add-scene";
import { Button } from "./ui/button";
import { Label } from "./ui/label";

export function SceneEditor({ scene, sidebarOpen = true, onCloseSidebar }: { scene: Scene; sidebarOpen?: boolean; onCloseSidebar?: () => void }) {
  return <div className="relative flex flex-1 min-h-0 min-w-0">
    {/* Keep the prose editor in the same position when reference panels are toggled. */}
    <div className="flex flex-col flex-1 min-h-0 min-w-0"><RichTextEditor chapterId={scene.id} resource="scenes" projectId={scene.projectId} content={scene.content} title={scene.title} revision={scene.revision} /></div>
    {sidebarOpen && <aside id="scene-reference-sidebar" aria-label="Scene planning and references" className="absolute inset-y-0 right-0 z-20 xl:static xl:z-auto flex flex-col shrink-0 border-l w-80 2xl:w-96 max-w-full min-h-0 bg-background shadow-xl xl:shadow-none">
      {onCloseSidebar && <div className="xl:hidden border-b px-3 py-1 flex items-center justify-between shrink-0"><span className="text-sm font-medium">Scene workspace</span><Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Close scene sidebar" onClick={onCloseSidebar}><X className="h-4 w-4" /></Button></div>}
      <div className="grid grid-rows-2 flex-1 min-h-0">
        <section aria-label="Scene planning" className="min-h-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] border-b p-3"><ScenePlanEditor scene={scene} compact /></section>
        <div aria-label="Scene references" role="region" className="min-h-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"><SceneBibleContext scene={scene} compact /></div>
      </div>
    </aside>}
  </div>;
}
export default function SceneWorkspace({ chapter }: { chapter: Chapter }) {
  const { data = [], isLoading, error } = useQuery<Scene[]>({ queryKey: [`/api/projects/${chapter.projectId}/scenes`] });
  const scenes = data.filter(scene => scene.chapterId === chapter.id).sort((a, b) => a.order - b.order || a.id - b.id);
  const selectedId = Number(new URLSearchParams(useSearch()).get("scene"));
  const selected = scenes.find(scene => scene.id === selectedId) || (!selectedId ? scenes[0] : undefined);
  const [, navigate] = useLocation();
  const [adding, setAdding] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.matchMedia("(min-width: 1280px)").matches);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1280px)");
    const resize = () => setSidebarOpen(media.matches);
    media.addEventListener("change", resize);
    return () => media.removeEventListener("change", resize);
  }, []);
  const select = (id: number) => navigate(`/project/${chapter.projectId}/write?chapter=${chapter.id}&scene=${id}`);
  return <div className="flex flex-col flex-1 min-h-0 min-w-0">
    <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30 shrink-0 min-w-0">
      <h2 className="text-sm font-semibold truncate max-w-[35%]" title={`${chapter.title} (${chapter.isDraft ? "Draft" : "Completed"})`}>{chapter.title} <span className="font-normal text-muted-foreground hidden sm:inline">({chapter.isDraft ? "Draft" : "Completed"})</span></h2>
      <span className="h-5 border-l mx-1" aria-hidden="true" />
      <Label htmlFor="current-scene" className="sr-only">Current scene</Label>
      <select id="current-scene" className="min-w-0 flex-1 h-8 rounded-md border border-input bg-background px-2 text-sm" value={selected?.id || ""} onChange={e => select(Number(e.target.value))}>{!selected && <option value="">{scenes.length ? "Choose a scene" : "No scenes yet"}</option>}{scenes.map((scene, i) => <option key={scene.id} value={scene.id}>Scene {i + 1} · {scene.title}</option>)}</select>
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Add scene" title="Add scene" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={sidebarOpen ? "Hide scene sidebar" : "Show scene sidebar"} title={sidebarOpen ? "Hide scene sidebar" : "Show scene sidebar"} aria-expanded={sidebarOpen} aria-controls="scene-reference-sidebar" onClick={() => setSidebarOpen(open => !open)}>{sidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}</Button>
    </div>
    {adding && <AddScene projectId={chapter.projectId} chapter={chapter} onClose={() => setAdding(false)} onCreated={scene => { setAdding(false); select(scene.id); }} />}
    {error ? <p role="alert" className="p-4 text-destructive">{error.message}</p> : isLoading ? <p className="p-4">Loading scenes…</p> : selected ? <SceneEditor key={selected.id} scene={selected} sidebarOpen={sidebarOpen} onCloseSidebar={() => setSidebarOpen(false)} /> : <div className="p-8 text-center text-muted-foreground">{selectedId ? "This scene is unavailable in this chapter. It may have moved; open Outline to find it, or choose a scene above." : "Add your first scene, or use the Blueprint Wizard in Storyboard to plan chapters and scenes together."}</div>}
  </div>;
}

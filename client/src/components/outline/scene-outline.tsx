import SceneBibleContext from "@/components/scene-bible-context";
import ManuscriptOrganizer from "@/components/manuscript-organizer";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useSearch } from "wouter";
import type { Chapter, Scene, PlotStructure } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import ScenePlanEditor from "@/components/scene-plan-editor";
import AddScene from "@/components/add-scene";
import BlueprintWizard from "@/components/blueprint-wizard";

export default function SceneOutline({ projectId }: { projectId: number }) {
  const chaptersQuery = useQuery<Chapter[]>({ queryKey: [`/api/projects/${projectId}/chapters`] });
  const scenesQuery = useQuery<Scene[]>({ queryKey: [`/api/projects/${projectId}/scenes`] });
  const plotsQuery = useQuery<PlotStructure[]>({ queryKey: [`/api/projects/${projectId}/plot-structures`] });
  const [adding, setAdding] = useState(false), [wizard, setWizard] = useState(false), [plotId, setPlotId] = useState("");
  const [, navigate] = useLocation();
  const selectedId = Number(new URLSearchParams(useSearch()).get("scene"));
  const chapters = [...(chaptersQuery.data || [])].sort((a,b) => a.order - b.order || a.id - b.id);
  const scenes = chapters.flatMap(chapter => (scenesQuery.data || []).filter(scene => scene.chapterId === chapter.id).sort((a,b) => a.order - b.order || a.id - b.id));
  const selected = scenes.find(scene => scene.id === selectedId) || (!selectedId ? scenes[0] : undefined);
  const plots = plotsQuery.data || [], sourceId = plots.some(plot => plot.id === Number(plotId)) ? Number(plotId) : plots[0]?.id;
  const select = (id: number) => navigate(`/project/${projectId}/outline?scene=${id}`);
  const error = chaptersQuery.error || scenesQuery.error;
  return <div className="flex flex-1 min-h-0 flex-col">
    <div className="border-b p-4 shrink-0 space-y-3">
      <p className="text-sm text-muted-foreground">Storyboard plot points → Outline scenes → Scene story beats → Write prose</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setAdding(true)}>Add scene</Button><ManuscriptOrganizer projectId={projectId} />
        {plots.length > 0 ? <><Label className="sr-only" htmlFor="outline-source-plot">Source plot structure</Label><select id="outline-source-plot" className="max-w-full rounded-md border border-input bg-background p-2 text-sm" value={sourceId} onChange={e => setPlotId(e.target.value)}>{plots.map(plot => <option key={plot.id} value={plot.id}>{plot.name}</option>)}</select><Button variant="outline" onClick={() => setWizard(true)}>Bring plot points into Outline</Button></> : <Button asChild variant="outline"><Link href={`/project/${projectId}/storyboard`}>Start in Storyboard</Link></Button>}
        <Button asChild variant="ghost"><Link href={`/project/${projectId}/write`}>Skip planning · Write now</Link></Button>
      </div>
      {plotsQuery.error && <p role="alert" className="text-sm text-destructive">Could not load plot structures: {plotsQuery.error.message}</p>}
    </div>
    {wizard && sourceId && <BlueprintWizard projectId={projectId} structureId={sourceId} onClose={() => setWizard(false)} />}
    {adding && <AddScene projectId={projectId} onClose={() => setAdding(false)} onCreated={scene => { setAdding(false); select(scene.id); }} />}
    {error ? <p role="alert" className="p-6 text-destructive">{error.message}</p> : chaptersQuery.isLoading || scenesQuery.isLoading ? <p className="p-6">Loading your scene outline…</p> : <div className="flex flex-1 min-h-0 flex-col md:flex-row">
      <aside aria-label="Outline chapters and scenes" className="md:w-72 md:shrink-0 md:max-h-none max-h-48 overflow-y-auto border-b md:border-b-0 md:border-r p-3 space-y-4">
        {!chapters.length && <p className="text-sm text-muted-foreground">No chapters yet. Add a scene or bring in your plot points to begin.</p>}
        {chapters.map(chapter => <section key={chapter.id} className="space-y-2"><h3 className="font-semibold text-sm break-words">{chapter.title}</h3>
          {chapter.writingMode === "scenes" ? <>{scenes.filter(s => s.chapterId === chapter.id).map((scene,i) => <button key={scene.id} aria-current={selected?.id === scene.id ? "true" : undefined} onClick={() => select(scene.id)} className={`w-full text-left rounded-md border px-3 py-2 text-sm ${selected?.id === scene.id ? "bg-accent text-accent-foreground border-primary" : "hover:bg-muted"}`}><span className="block break-words">{i+1}. {scene.title}</span><span className="text-xs text-muted-foreground">{(scene.storyBeats || []).length} scene beats</span></button>)}{!scenes.some(s => s.chapterId === chapter.id) && <p className="text-xs text-muted-foreground">No scenes yet.</p>}</> : <Button asChild size="sm" variant="ghost"><Link href={`/project/${projectId}/write?chapter=${chapter.id}`}>Open chapter prose →</Link></Button>}
        </section>)}
      </aside>
      <section aria-label="Scene outline editor" className="flex-1 min-w-0 min-h-0 overflow-y-auto [scrollbar-gutter:stable] p-4 sm:p-6" key={selected?.id || "empty"}>
        {selected ? <div className="max-w-3xl mx-auto space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-semibold">Plan this scene</h2><Button asChild><Link href={`/project/${projectId}/write?chapter=${selected.chapterId}&scene=${selected.id}`}>Write this scene →</Link></Button></div><ScenePlanEditor key={selected.id} scene={selected} /><div className="rounded-lg border"><SceneBibleContext scene={selected}/></div></div> : <div className="max-w-xl mx-auto py-8 space-y-4"><h2 className="text-xl font-semibold">{selectedId ? "Scene unavailable" : "Build your scene outline"}</h2><p className="text-muted-foreground">{selectedId ? "Choose another scene from this project's outline." : "Bring Storyboard plot points through the Blueprint Wizard, or add scenes from scratch. Flesh out each scene with a summary and optional story beats, then open it in Write."}</p><p className="text-sm text-muted-foreground">You can begin writing at any point. Planning is optional.</p></div>}
      </section>
    </div>}
  </div>;
}

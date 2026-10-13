import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { Scene, PlotStructure, PlotStructureSection } from "@shared/schema";
import type { SceneBeat } from "@shared/planning";
import { useAutosave, withPendingEdits } from "@/hooks/use-autosave";
import { useEditorDraft } from "@/hooks/use-editor-draft";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { SaveStatus } from "./save-status";

function PlotPointLink({ sectionId, projectId }: { sectionId: number; projectId: number }) {
  const section = useQuery<PlotStructureSection>({ queryKey: [`/api/plot-structure-sections/${sectionId}`] });
  const structure = useQuery<PlotStructure>({ queryKey: [`/api/plot-structures/${section.data?.plotStructureId}`], enabled: !!section.data });
  return <div className="rounded-md bg-muted/40 p-3 text-sm">
    <p className="text-xs text-muted-foreground mb-1">Source plot point</p>
    {section.error || structure.error ? <p role="alert">The linked plot point could not be loaded.</p> : <>
      <p>{structure.data?.name ? `${structure.data.name} / ` : ""}{section.data?.title || "Loading…"}</p>
      {section.data && <Link className="underline text-xs" href={`/project/${projectId}/storyboard?structure=${section.data.plotStructureId}`}>Open in Storyboard</Link>}
    </>}
  </div>;
}
/** Outline and Write edit the same scene record and share its durable save queue. */
export default function ScenePlanEditor({ scene, compact = false }: { scene: Scene; compact?: boolean }) {
  const url = `/api/scenes/${scene.id}`;
  const [value, update] = useEditorDraft(withPendingEdits(url, scene));
  const autosave = useAutosave(url, `/api/projects/${scene.projectId}/scenes`);
  const field = (patch: Partial<Pick<Scene, "title" | "summary">>) => { update(old => ({ ...old, ...patch })); autosave.save(patch); };
  function beats(change: (previous: SceneBeat[]) => SceneBeat[]) {
    const next = update(old => ({ ...old, storyBeats: change(old.storyBeats || []) }));
    autosave.save({ storyBeats: next.storyBeats });
  }
  function move(id: string, delta: number) {
    beats(previous => {
      const items = [...previous], index = items.findIndex(item => item.id === id), target = index + delta;
      if (index < 0 || target < 0 || target >= items.length) return previous;
      [items[index], items[target]] = [items[target], items[index]];
      return items;
    });
  }
  const details = <>
    <div className="space-y-2"><Label htmlFor={`scene-title-${scene.id}`}>Scene title</Label><Input id={`scene-title-${scene.id}`} value={value.title} maxLength={500} onChange={e => field({ title: e.target.value })} /></div>
    {value.linkedSectionId && <PlotPointLink sectionId={value.linkedSectionId} projectId={scene.projectId} />}
  </>;
  return <div className={compact ? "space-y-3" : "space-y-5"}>
    <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">Scene plan</h3><SaveStatus status={autosave.status} retry={autosave.flush} stable /></div>
    {compact ? <details><summary className="cursor-pointer text-xs text-muted-foreground">Scene details & outline</summary><div className="space-y-3 pt-3">{details}<Link className="text-xs underline" href={`/project/${scene.projectId}/outline?scene=${scene.id}`}>Open scene in Outline →</Link></div></details> : details}
    <div className="space-y-2"><Label htmlFor={`scene-summary-${scene.id}`}>{compact ? "Scene summary / notes" : "Scene summary"}</Label><Textarea id={`scene-summary-${scene.id}`} value={value.summary} maxLength={20000} onChange={e => field({ summary: e.target.value })} placeholder="What changes in this scene?" /></div>
    <section aria-label="Scene story beats" className="space-y-3">
      <div><h3 className="font-semibold text-sm">Scene story beats</h3>{!compact && <p className="text-sm text-muted-foreground">The moments within this scene, in order. These notes stay separate from your prose.</p>}</div>
      {!(value.storyBeats || []).length && <p className="text-sm text-muted-foreground">Add the first action, discovery, or turning point—or go straight to writing.</p>}
      <ol className="space-y-3">{(value.storyBeats || []).map((beat, i) => <li key={beat.id} className="border rounded-lg p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-1"><Label className="mr-auto" htmlFor={`scene-beat-${beat.id}`}>Beat {i + 1}</Label>
          <Button variant="ghost" size="sm" aria-label={`Move beat ${i + 1} up`} disabled={i === 0} onClick={() => move(beat.id, -1)}>↑</Button>
          <Button variant="ghost" size="sm" aria-label={`Move beat ${i + 1} down`} disabled={i === (value.storyBeats || []).length - 1} onClick={() => move(beat.id, 1)}>↓</Button>
          <Button variant="ghost" size="sm" aria-label={`Remove beat ${i + 1}`} onClick={() => beats(items => items.filter(item => item.id !== beat.id))}>Remove</Button>
        </div>
        <Textarea id={`scene-beat-${beat.id}`} value={beat.text} maxLength={10000} onChange={e => { const text = e.target.value; beats(items => items.map(item => item.id === beat.id ? { ...item, text } : item)); }} placeholder="What happens in this moment?" />
      </li>)}</ol>
      <Button variant="outline" disabled={(value.storyBeats || []).length >= 100} onClick={() => beats(items => [...items, { id: crypto.randomUUID(), text: "" }])}>Add story beat</Button>
    </section>
    {autosave.error && <p role="alert" className="text-sm text-destructive">{autosave.error.message}</p>}
  </div>;
}

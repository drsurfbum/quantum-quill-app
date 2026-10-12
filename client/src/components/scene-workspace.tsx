import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { z } from "zod";
import type { Chapter, Scene, PlotStructure, PlotStructureSection } from "@shared/schema";
import { sceneCreateSchema } from "@shared/planning";
import { apiRequest, ApiError, queryClient } from "@/lib/queryClient";
import { useAutosave, withPendingEdits } from "@/hooks/use-autosave";
import { useEditorDraft } from "@/hooks/use-editor-draft";
import { useWizardDraft } from "@/hooks/use-wizard-draft";
import RichTextEditor from "./rich-text-editor";
import { WizardRecovery } from "./wizard-recovery";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";

const newSceneDraft = z.object({ requestId: z.string().uuid(), title: z.string(), summary: z.string(), submission: sceneCreateSchema.optional() });
function AddScene({ chapter, onCreated, onClose }: { chapter: Chapter; onCreated: (scene: Scene) => void; onClose: () => void }) {
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const draft = useWizardDraft(`new-scene:${chapter.projectId}:${chapter.id}`, () => ({ requestId: crypto.randomUUID(), title: "", summary: "" } as z.infer<typeof newSceneDraft>), newSceneDraft);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const value = draft.value;
  if (!value) return null;
  async function create() {
    if (busy || !value) return;
    const parsed = sceneCreateSchema.safeParse(value.submission || { requestId: value.requestId, chapterId: chapter.id, title: value.title, summary: value.summary });
    if (!parsed.success) { setError(parsed.error.issues.map(i => i.message).join(" ")); return; }
    if (!draft.update({ ...value, submission: parsed.data })) return; setBusy(true); setError("");
    try {
      const scene = await (await apiRequest("POST", `/api/projects/${chapter.projectId}/scenes`, parsed.data)).json();
      draft.finish(); await queryClient.invalidateQueries({ queryKey: [`/api/projects/${chapter.projectId}/scenes`] }); if (alive.current) onCreated(scene);
    } catch (e) { setError((e as Error).message); if (e instanceof ApiError && e.status === 400) draft.update({ ...value, submission: undefined }); }
    finally { setBusy(false); }
  }
  return <div className="p-4 border-b space-y-3 max-h-[50vh] overflow-y-auto">
    <h3 className="font-medium">Add a scene to {chapter.title}</h3>
    <WizardRecovery disabled={busy || !!value.submission} drafts={draft.recoverable} restore={draft.restore} discard={draft.discard} error={draft.error} value={value} />
    <fieldset disabled={busy || !!value.submission} className="space-y-2">
      <Label htmlFor="new-scene-title">Scene title</Label><Input id="new-scene-title" autoFocus maxLength={500} value={value.title} onChange={e => draft.update(current => ({ ...current, title: e.target.value }))} />
      <Label htmlFor="new-scene-summary">Scene summary (optional)</Label><Textarea id="new-scene-summary" maxLength={20000} value={value.summary} onChange={e => draft.update(current => ({ ...current, summary: e.target.value }))} />
    </fieldset>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex gap-2"><Button disabled={busy || !value.title.trim()} onClick={() => void create()}>{busy ? "Creating…" : value.submission ? "Retry scene creation" : "Create scene"}</Button><Button disabled={busy || !!draft.error} variant="ghost" onClick={onClose}>Save for later</Button></div>
  </div>;
}
function BeatLink({ sectionId }: { sectionId: number }) {
  const { data: section } = useQuery<PlotStructureSection>({ queryKey: [`/api/plot-structure-sections/${sectionId}`] });
  const { data: structure } = useQuery<PlotStructure>({ queryKey: [`/api/plot-structures/${section?.plotStructureId}`], enabled: !!section });
  return <p className="text-xs text-muted-foreground">Story beat: {structure?.name ? `${structure.name} / ` : ""}{section?.title || "Loading beat…"}</p>;
}
export function SceneEditor({ scene }: { scene: Scene }) {
  const url = `/api/scenes/${scene.id}`;
  const [value, update] = useEditorDraft(withPendingEdits(url, scene));
  const autosave = useAutosave(url, `/api/projects/${scene.projectId}/scenes`);
  const field = (patch: Partial<Pick<Scene, "title" | "summary">>) => { update(old => ({ ...old, ...patch })); autosave.save(patch); };
  return <div className="flex flex-col flex-1 min-h-0 min-w-0">
    <details className="border-b bg-muted/20 p-3 shrink-0 max-h-[35vh] overflow-y-auto">
      <summary className="cursor-pointer text-sm font-medium">Scene plan · {value.title}</summary>
      <div className="space-y-2 pt-3"><Label htmlFor={`scene-title-${scene.id}`}>Scene title</Label><Input id={`scene-title-${scene.id}`} value={value.title} maxLength={500} onChange={e => field({ title: e.target.value })} />
        <Label htmlFor={`scene-summary-${scene.id}`}>Scene summary</Label><Textarea id={`scene-summary-${scene.id}`} value={value.summary} maxLength={20000} onChange={e => field({ summary: e.target.value })} placeholder="Plan what happens here. This is separate from your manuscript." />
        {scene.linkedSectionId && <BeatLink sectionId={scene.linkedSectionId} />}
        {autosave.error && <p role="alert" className="text-sm text-destructive">{autosave.error.message}</p>}
      </div>
    </details>
    <RichTextEditor chapterId={scene.id} resource="scenes" projectId={scene.projectId} content={scene.content} title={scene.title} revision={scene.revision} />
  </div>;
}
export default function SceneWorkspace({ chapter }: { chapter: Chapter }) {
  const { data = [], isLoading, error } = useQuery<Scene[]>({ queryKey: [`/api/projects/${chapter.projectId}/scenes`] });
  const scenes = data.filter(scene => scene.chapterId === chapter.id).sort((a, b) => a.order - b.order || a.id - b.id);
  const selectedId = Number(new URLSearchParams(useSearch()).get("scene"));
  const selected = scenes.find(scene => scene.id === selectedId) || scenes[0];
  const [, navigate] = useLocation();
  const [adding, setAdding] = useState(false);
  const select = (id: number) => navigate(`/project/${chapter.projectId}/write?chapter=${chapter.id}&scene=${id}`);
  return <div className="flex flex-col flex-1 min-h-0 min-w-0">
    <div className="flex items-center gap-2 p-3 border-b shrink-0"><Label htmlFor="current-scene" className="shrink-0">Scene</Label><select id="current-scene" className="min-w-0 flex-1 rounded-md border border-input bg-background p-2" value={selected?.id || ""} onChange={e => select(Number(e.target.value))}>{!scenes.length && <option value="">No scenes yet</option>}{scenes.map((scene, i) => <option key={scene.id} value={scene.id}>{i + 1}. {scene.title}</option>)}</select><Button variant="outline" size="sm" onClick={() => setAdding(true)}>Add scene</Button></div>
    {adding && <AddScene chapter={chapter} onClose={() => setAdding(false)} onCreated={scene => { setAdding(false); select(scene.id); }} />}
    {error ? <p role="alert" className="p-4 text-destructive">{error.message}</p> : isLoading ? <p className="p-4">Loading scenes…</p> : selected ? <SceneEditor key={selected.id} scene={selected} /> : <div className="p-8 text-center text-muted-foreground">Add your first scene, or use the Blueprint Wizard in Storyboard to plan chapters and scenes together.</div>}
  </div>;
}

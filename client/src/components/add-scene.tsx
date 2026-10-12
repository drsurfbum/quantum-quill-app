import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import type { Chapter, Scene } from "@shared/schema";
import { sceneCreateSchema } from "@shared/planning";
import { apiRequest, ApiError, queryClient } from "@/lib/queryClient";
import { useWizardDraft } from "@/hooks/use-wizard-draft";
import { WizardRecovery } from "./wizard-recovery";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";

const newSceneDraft = z.object({ requestId: z.string().uuid(), title: z.string(), summary: z.string(), chapterChoice: z.string().default("new"), chapterTitle: z.string().default(""), submission: sceneCreateSchema.optional() });
export default function AddScene({ projectId, chapter, onCreated, onClose }: { projectId: number; chapter?: Chapter; onCreated: (scene: Scene) => void; onClose: () => void }) {
  const alive = useRef(true), working = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const { data: chapters = [], error: chaptersError } = useQuery<Chapter[]>({ queryKey: [`/api/projects/${projectId}/chapters`], enabled: !chapter });
  const draft = useWizardDraft(`new-scene:${projectId}:${chapter?.id || "outline"}`, () => ({ requestId: crypto.randomUUID(), title: "", summary: "", chapterChoice: "new", chapterTitle: "" } as z.infer<typeof newSceneDraft>), newSceneDraft);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const value = draft.value;
  if (!value) return null;
  async function create() {
    if (working.current || !value) return;
    const target = chapter ? { chapterId: chapter.id } : value.chapterChoice === "new" ? { chapterTitle: value.chapterTitle } : { chapterId: Number(value.chapterChoice) };
    const parsed = sceneCreateSchema.safeParse(value.submission || { requestId: value.requestId, ...target, title: value.title, summary: value.summary });
    if (!parsed.success) { setError(parsed.error.issues.map(i => `${i.path.join(" → ")}: ${i.message}`).join(" ")); return; }
    if (!draft.update({ ...value, submission: parsed.data })) return; working.current = true; setBusy(true); setError("");
    try {
      const scene: Scene = await (await apiRequest("POST", `/api/projects/${projectId}/scenes`, parsed.data)).json();
      draft.finish(); await Promise.all(["chapters", "scenes"].map(name => queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/${name}`] })));
      if (alive.current) onCreated(scene);
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError && (e.status === 400 || e.code === "CHAPTER_TITLE_EXISTS")) draft.update({ ...value, submission: undefined });
    } finally { working.current = false; setBusy(false); }
  }
  return <div className="p-4 border-b space-y-3 max-h-[60vh] overflow-y-auto">
    <h3 className="font-medium">{chapter ? `Add a scene to ${chapter.title}` : "Add an outline scene"}</h3>
    <WizardRecovery disabled={busy || !!value.submission} drafts={draft.recoverable} restore={draft.restore} discard={draft.discard} error={draft.error} value={value} />
    <fieldset disabled={busy || !!value.submission} className="space-y-2">
      {!chapter && <><Label htmlFor="scene-chapter-choice">Chapter</Label><select id="scene-chapter-choice" className="w-full rounded-md border border-input bg-background p-2" value={value.chapterChoice} onChange={e => draft.update(current => ({ ...current, chapterChoice: e.target.value }))}><option value="new">Create a new scene chapter</option>{chapters.filter(c => c.writingMode === "scenes").map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
        {value.chapterChoice === "new" && <><Label htmlFor="scene-new-chapter-title">New chapter title</Label><Input id="scene-new-chapter-title" maxLength={500} value={value.chapterTitle} onChange={e => draft.update(current => ({ ...current, chapterTitle: e.target.value }))} /></>}
        {chaptersError && <p role="alert" className="text-sm text-destructive">Could not load existing chapters: {chaptersError.message}</p>}
      </>}
      <Label htmlFor="new-scene-title">Scene title</Label><Input id="new-scene-title" autoFocus maxLength={500} value={value.title} onChange={e => draft.update(current => ({ ...current, title: e.target.value }))} />
      <Label htmlFor="new-scene-summary">Scene summary (optional)</Label><Textarea id="new-scene-summary" maxLength={20000} value={value.summary} onChange={e => draft.update(current => ({ ...current, summary: e.target.value }))} />
    </fieldset>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex gap-2"><Button disabled={busy || !value.title.trim()} onClick={() => void create()}>{busy ? "Creating…" : value.submission ? "Retry scene creation" : "Create scene"}</Button><Button disabled={busy || !!draft.error} variant="ghost" onClick={onClose}>Save for later</Button></div>
  </div>;
}

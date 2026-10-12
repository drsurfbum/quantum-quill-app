import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { blueprintSchema, type BlueprintInput, type BlueprintSource, type BlueprintResult } from "@shared/planning";
import { editorContent } from "@/lib/editor-content";
import { apiRequest, ApiError, queryClient } from "@/lib/queryClient";
import { flushPendingSaves } from "@/hooks/use-autosave";
import { useWizardDraft } from "@/hooks/use-wizard-draft";
import { WizardRecovery } from "./wizard-recovery";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";

const sourceSchema: z.ZodType<BlueprintSource> = z.object({
  structure: z.object({ id: z.number(), name: z.string(), revision: z.number() }),
  sections: z.array(z.object({ id: z.number(), title: z.string(), content: z.string().nullable(), revision: z.number(), guidance: z.string() })),
  chapters: z.array(z.object({ id: z.number(), title: z.string(), order: z.number(), revision: z.number() })), snapshot: z.string(),
});
const planSchema = z.object({ step: z.number().int().min(1).max(3), requestId: z.string().uuid(), source: sourceSchema.optional(),
  scenes: z.array(z.object({ key: z.string().uuid(), sectionId: z.number(), title: z.string(), summary: z.string(), startsChapter: z.boolean(), chapterTitle: z.string() })), submission: blueprintSchema.optional() });
type Plan = z.infer<typeof planSchema>;
const initial = (): Plan => ({ step: 1, requestId: crypto.randomUUID(), scenes: [] });
function chaptersFor(plan: Plan) {
  const chapters: BlueprintInput["chapters"] = [];
  for (const scene of plan.scenes) {
    if (!chapters.length || scene.startsChapter) chapters.push({ title: scene.chapterTitle, scenes: [] });
    chapters[chapters.length - 1].scenes.push({ title: scene.title, summary: scene.summary, sectionId: scene.sectionId });
  }
  return chapters;
}
function nextTitle(source: BlueprintSource, scenes: Plan["scenes"]) {
  const used = new Set([...source.chapters.map(c => c.title), ...scenes.map(s => s.chapterTitle)].map(s => s.trim().toLowerCase()));
  let n = 1; while (used.has(`chapter ${n}`)) n++;
  return `Chapter ${n}`;
}
function plainPreview(text: string | null) {
  if (typeof editorContent(text) !== "string") return text || "";
  return text ? new DOMParser().parseFromString(text, "text/html").body.textContent || text : "";
}
export default function BlueprintWizard({ projectId, structureId, onClose }: { projectId: number; structureId: number; onClose: () => void }) {
  const draft = useWizardDraft(`blueprint:${projectId}:${structureId}`, initial, planSchema), value = draft.value;
  const [, navigate] = useLocation();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const working = useRef(false);
  if (!value) return null;
  const update = (patch: Partial<Plan> | ((current: Plan) => Partial<Plan>)) => { draft.update(current => ({ ...current, ...(typeof patch === "function" ? patch(current) : patch) })); setError(""); };
  async function loadSource() {
    if (working.current || !value) return;
    working.current = true; setBusy(true); setError("");
    try {
      if (!await flushPendingSaves()) throw new Error("Resolve the pending writing saves before loading a Blueprint preview. Your plan is kept.");
      const source: BlueprintSource = await (await apiRequest("GET", `/api/projects/${projectId}/blueprint/${structureId}`)).json();
      const scenes = value.source ? value.scenes : source.sections.map((section, i) => ({ key: crypto.randomUUID(), sectionId: section.id, title: section.title, summary: "", startsChapter: i === 0, chapterTitle: i === 0 ? nextTitle(source, []) : "" }));
      draft.update({ ...value, source, scenes, step: 1 });
    } catch (e) { setError((e as Error).message); } finally { working.current = false; setBusy(false); }
  }
  function input() { return blueprintSchema.parse({ requestId: value!.requestId, structureId, snapshot: value!.source?.snapshot, chapters: chaptersFor(value!) }); }
  async function build() {
    if (working.current || !value) return;
    let submission: BlueprintInput;
    try { submission = value.submission || input(); } catch (e) { setError(e instanceof z.ZodError ? e.issues.map(i => `${i.path.join(" → ")}: ${i.message}`).join("; ") : String(e)); return; }
    // Persist the exact request before sending it, so an interrupted acknowledgment is retryable.
    if (!draft.update({ ...value, submission })) return; working.current = true; setBusy(true); setError("");
    try {
      const result: BlueprintResult = await (await apiRequest("POST", `/api/projects/${projectId}/blueprint`, submission)).json();
      draft.finish();
      await Promise.all(["chapters", "scenes"].map(name => queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/${name}`] })));
      onClose(); navigate(`/project/${projectId}/write?chapter=${result.chapterIds[0]}&scene=${result.sceneIds[0]}`);
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError && ([400, 413].includes(e.status) || ["BLUEPRINT_STALE", "CHAPTER_TITLE_EXISTS"].includes(e.code || ""))) draft.update({ ...value, submission: undefined });
    } finally { working.current = false; setBusy(false); }
  }
  const patchScene = (key: string, patch: Partial<Plan["scenes"][number]>) => update(current => ({ scenes: current.scenes.map(scene => scene.key === key ? { ...scene, ...patch } : scene) }));
  const move = (index: number, delta: number) => { const scenes = [...value.scenes]; [scenes[index], scenes[index + delta]] = [scenes[index + delta], scenes[index]]; if (!scenes[0].chapterTitle) scenes[0] = { ...scenes[0], startsChapter: true, chapterTitle: nextTitle(value.source!, scenes) }; update({ scenes }); };
  const validTargets = !!value.source && value.scenes.every(scene => value.source!.sections.some(section => section.id === scene.sectionId));
  return <Dialog open onOpenChange={open => { if (!open && !busy && !draft.error) onClose(); }}><DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
    <DialogHeader><DialogTitle>Blueprint Wizard</DialogTitle><DialogDescription>Turn your story beats into scene plans, then arrange them into new chapters. Your scene summaries stay separate from manuscript prose.</DialogDescription></DialogHeader>
    <WizardRecovery disabled={busy || !!value.submission} drafts={draft.recoverable} restore={draft.restore} discard={draft.discard} error={draft.error} value={value} />
    <fieldset disabled={busy || !!value.submission} className="space-y-4 min-w-0">
      {!value.source ? <Button onClick={() => void loadSource()}>Start from this plot structure</Button> : <>
        <div className="flex flex-wrap gap-2 items-center justify-between"><p className="text-sm font-medium">{value.source.structure.name} · Step {value.step} of 3</p><Button variant="outline" size="sm" onClick={() => void loadSource()}>Review latest source</Button></div>
        {value.step === 1 && <>
          <p className="text-sm text-muted-foreground">Shape each beat into one or more scenes. Add, remove, or reorder scenes; every scene keeps a link to its beat.</p>
          {!validTargets && <p role="alert" className="text-sm text-destructive">A linked beat was removed. Choose a current beat for the affected scenes before continuing.</p>}
          {value.scenes.map((scene, index) => {
            const section = value.source!.sections.find(s => s.id === scene.sectionId);
            return <div key={scene.key} className="rounded-lg border p-4 space-y-3">
              <div className="flex gap-2 items-center"><span className="text-sm">Scene {index + 1}</span><Button size="sm" variant="ghost" disabled={index === 0} aria-label={`Move scene ${index + 1} up`} onClick={() => move(index, -1)}>↑</Button><Button size="sm" variant="ghost" disabled={index === value.scenes.length - 1} aria-label={`Move scene ${index + 1} down`} onClick={() => move(index, 1)}>↓</Button><Button size="sm" variant="ghost" className="ml-auto" onClick={() => update({ scenes: value.scenes.filter(s => s.key !== scene.key) })}>Remove scene</Button></div>
              <div className="space-y-1"><Label htmlFor={`beat-${scene.key}`}>Story beat</Label><select id={`beat-${scene.key}`} className="w-full border border-input rounded-md bg-background p-2" value={scene.sectionId} onChange={e => patchScene(scene.key, { sectionId: Number(e.target.value) })}>{!section && <option value={scene.sectionId}>Missing beat — choose a replacement</option>}{value.source!.sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select></div>
              {section && <details className="text-sm text-muted-foreground"><summary className="cursor-pointer">Beat guidance & your notes</summary><p className="whitespace-pre-wrap mt-2">{section.guidance || "No template guidance."}</p><p className="whitespace-pre-wrap mt-2">{plainPreview(section.content) || "No beat notes yet."}</p></details>}
              <div className="space-y-1"><Label htmlFor={`title-${scene.key}`}>Scene title</Label><Input id={`title-${scene.key}`} maxLength={500} value={scene.title} onChange={e => patchScene(scene.key, { title: e.target.value })} /></div>
              <div className="space-y-1"><Label htmlFor={`summary-${scene.key}`}>Scene summary</Label><Textarea id={`summary-${scene.key}`} maxLength={20000} value={scene.summary} onChange={e => patchScene(scene.key, { summary: e.target.value })} placeholder="What changes in this scene? Who wants what, and what stands in their way?" /></div>
            </div>;
          })}
          <div className="flex flex-wrap gap-2">{value.source.sections.map(section => <Button key={section.id} variant="outline" size="sm" onClick={() => update({ scenes: [...value.scenes, { key: crypto.randomUUID(), sectionId: section.id, title: `${section.title} — scene`, summary: "", startsChapter: value.scenes.length === 0, chapterTitle: value.scenes.length === 0 ? nextTitle(value.source!, []) : "" }] })}>+ {section.title}</Button>)}</div>
        </>}
        {value.step === 2 && <>
          <p className="text-sm text-muted-foreground">Place chapter breaks between scenes and name each new chapter. These will be appended after your existing chapters.</p>
          {value.scenes.map((scene, index) => <div key={scene.key} className="border rounded-lg p-3 space-y-2">
            {index > 0 && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={scene.startsChapter} onChange={e => patchScene(scene.key, { startsChapter: e.target.checked, chapterTitle: scene.chapterTitle || nextTitle(value.source!, value.scenes) })} />Start a new chapter here</label>}
            {(index === 0 || scene.startsChapter) && <div className="space-y-1"><Label htmlFor={`chapter-${scene.key}`}>New chapter title</Label><Input id={`chapter-${scene.key}`} maxLength={500} value={scene.chapterTitle} onChange={e => patchScene(scene.key, { chapterTitle: e.target.value })} /></div>}
            <p className="text-sm">{index + 1}. {scene.title}</p>
          </div>)}
        </>}
        {value.step === 3 && <div className="space-y-3"><p>{chaptersFor(value).length} new chapters · {value.scenes.length} new scenes</p>{chaptersFor(value).map((chapter, i) => <div key={i} className="border rounded-lg p-3"><h3 className="font-semibold">{chapter.title}</h3><ol className="list-decimal pl-5 space-y-2 mt-2">{chapter.scenes.map((scene, j) => <li key={j}><p>{scene.title}</p><p className="text-sm text-muted-foreground whitespace-pre-wrap">{scene.summary || "No summary yet."}</p></li>)}</ol></div>)}<p className="text-sm text-muted-foreground">All {value.source.chapters.length} existing chapters stay intact. New scene prose starts blank.</p></div>}
      </>}
    </fieldset>
    {value.submission && !busy && <p className="text-sm">Retry this exact plan to retrieve the result if creation already completed.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex justify-between gap-2"><Button variant="ghost" disabled={busy || !!draft.error} onClick={onClose}>Save for later</Button><div className="flex gap-2">
      {value.source && value.step > 1 && !value.submission && <Button variant="outline" disabled={busy} onClick={() => update({ step: value.step - 1 })}>Back</Button>}
      {value.source && (value.step < 3 ? <Button disabled={busy || !validTargets || !value.scenes.length || value.scenes.some(s => !s.title.trim())} onClick={() => { if (value.step === 2) { try { input(); } catch (e) { setError("Give each chapter a title before reviewing."); return; } } update({ step: value.step + 1 }); }}>Next</Button> : <Button disabled={busy} onClick={() => void build()}>{busy ? "Building…" : value.submission ? "Retry build" : "Create chapters & scenes"}</Button>)}
    </div></div>
  </DialogContent></Dialog>;
}

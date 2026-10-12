import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { GENRES, newProjectSchema, type NewProjectInput } from "@shared/planning";
import { apiRequest, ApiError, queryClient } from "@/lib/queryClient";
import { useWizardDraft } from "@/hooks/use-wizard-draft";
import { WizardRecovery } from "@/components/wizard-recovery";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const schema = z.object({ step: z.number().int().min(1).max(3), title: z.string(), author: z.string(), genre: z.string(), goal: z.string(), description: z.string(), destination: z.enum(["storyboard", "write"]), requestId: z.string().uuid(), submission: newProjectSchema.optional() });
const initial = (): z.infer<typeof schema> => ({ step: 1, title: "", author: "", genre: "", goal: "80000", description: "", destination: "storyboard" as const, requestId: crypto.randomUUID() });
export default function NewProjectWizard({ onClose }: { onClose: () => void }) {
  const draft = useWizardDraft("new-project", initial, schema), value = draft.value;
  const [, navigate] = useLocation();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const submitting = useRef(false);
  if (!value) return null;
  const update = (patch: Partial<typeof value>) => { setError(""); draft.update(current => ({ ...current, ...patch })); };
  const payload = (): NewProjectInput => newProjectSchema.parse({ requestId: value.requestId, title: value.title, description: value.description, settings: { author: value.author, genre: value.genre, targetWordCount: Number(value.goal) } });
  async function submit() {
    if (submitting.current || !value) return;
    setError("");
    let input: NewProjectInput;
    try { input = value.submission || payload(); } catch (e) { setError(e instanceof z.ZodError ? e.issues.map(i => i.message).join(" ") : (e as Error).message); return; }
    if (!draft.update({ ...value, submission: input })) return; submitting.current = true; setBusy(true);
    try {
      const project = await (await apiRequest("POST", "/api/project-setup", input)).json();
      draft.finish(); await queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      onClose(); navigate(`/project/${project.id}/${value.destination}`);
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError && e.status === 400) draft.update({ ...value, submission: undefined });
    } finally { submitting.current = false; setBusy(false); }
  }
  return <Dialog open onOpenChange={open => { if (!open && !busy && !draft.error) onClose(); }}><DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
    <DialogHeader><DialogTitle>Begin a new story</DialogTitle><DialogDescription>Give your project a starting point. You can plan first or go straight to writing.</DialogDescription></DialogHeader>
    <WizardRecovery disabled={busy || !!value.submission} drafts={draft.recoverable} restore={draft.restore} discard={draft.discard} error={draft.error} value={value} />
    <p className="text-sm text-muted-foreground">Step {value.step} of 3 · {value.step === 1 ? "Your book" : value.step === 2 ? "Direction & goals" : "Review"}</p>
    <fieldset disabled={busy || !!value.submission} className="space-y-4 min-w-0">
      {value.step === 1 && <>
        <div className="space-y-2"><Label htmlFor="setup-title">Working title</Label><Input id="setup-title" autoFocus maxLength={500} value={value.title} onChange={e => update({ title: e.target.value })} placeholder="Your story begins here" /></div>
        <div className="space-y-2"><Label htmlFor="setup-author">Author or pen name (optional)</Label><Input id="setup-author" maxLength={200} value={value.author} onChange={e => update({ author: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="setup-genre">Genre (optional)</Label><select id="setup-genre" className="w-full rounded-md border border-input bg-background p-2" value={value.genre} onChange={e => update({ genre: e.target.value })}><option value="">Choose later</option>{GENRES.map(genre => <option key={genre}>{genre}</option>)}</select></div>
      </>}
      {value.step === 2 && <>
        <div className="space-y-2"><Label htmlFor="setup-goal">Word-count goal</Label><Input id="setup-goal" type="number" min={1} max={2000000} value={value.goal} onChange={e => update({ goal: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="setup-logline">Logline / what is your story about? (optional)</Label><Textarea id="setup-logline" className="min-h-28" maxLength={10000} value={value.description} onChange={e => update({ description: e.target.value })} placeholder="A character wants something, but…" /></div>
        <div className="space-y-2"><Label htmlFor="setup-destination">Where would you like to begin?</Label><select id="setup-destination" className="w-full rounded-md border border-input bg-background p-2" value={value.destination} onChange={e => update({ destination: e.target.value as "write" | "storyboard" })}><option value="storyboard">Plan with a story structure</option><option value="write">Start writing</option></select></div>
      </>}
      {value.step === 3 && <div className="rounded-lg border bg-muted/30 p-4 space-y-2"><h3 className="text-xl font-serif">{value.title}</h3><p>{value.author || "Author not specified"} · {value.genre || "Genre open"}</p><p>{Number(value.goal).toLocaleString()} words</p><p className="whitespace-pre-wrap break-words">{value.description || "No logline yet."}</p><p className="text-sm text-muted-foreground">Next: {value.destination === "write" ? "Write" : "choose a plot structure in Storyboard"}</p></div>}
    </fieldset>
    {value.submission && !busy && <p className="text-sm">Creation was submitted. Retry to retrieve the same project if the response was interrupted.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex items-center justify-between gap-2">
      <Button variant="ghost" disabled={busy || !!draft.error} onClick={onClose}>Save for later</Button>
      <div className="flex gap-2">{value.step > 1 && !value.submission && <Button variant="outline" onClick={() => update({ step: value.step - 1 })}>Back</Button>}
        {value.step < 3 ? <Button disabled={!value.title.trim()} onClick={() => { try { if (value.step === 2) payload(); update({ step: value.step + 1 }); } catch (e) { setError(e instanceof z.ZodError ? e.issues.map(i => i.message).join(" ") : String(e)); } }}>Next</Button> : <Button disabled={busy} onClick={() => void submit()}>{busy ? "Creating…" : value.submission ? "Retry creation" : "Create project"}</Button>}
      </div>
    </div>
  </DialogContent></Dialog>;
}

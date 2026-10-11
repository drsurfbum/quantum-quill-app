import { useState } from "react";
import { discardDraft, inspectDraft, restoreDraft, useRecoverableDrafts } from "@/hooks/use-autosave";
import type { DurableDraft } from "@/lib/draft-journal";
import { queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

function download(draft: DurableDraft) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = `quantum-quill-draft-${draft.url.split("/").pop()}.json`;
  anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function DraftRecovery() {
  const drafts = useRecoverableDrafts();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<DurableDraft>();
  const [review, setReview] = useState<Awaited<ReturnType<typeof inspectDraft>>>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function inspect(draft: DurableDraft) {
    setSelected(draft); setReview(undefined); setError(""); setBusy(true);
    try { setReview(await inspectDraft(draft)); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function finish(restore: boolean) {
    if (!selected) return;
    setBusy(true); setError("");
    try {
      if (restore) { if (!review) return; await restoreDraft(selected, review); }
      else {
        discardDraft(selected, review?.server);
        await queryClient.invalidateQueries({ queryKey: [selected.url], exact: true });
        if (selected.listUrl) await queryClient.invalidateQueries({ queryKey: [selected.listUrl], exact: true });
      }
      window.dispatchEvent(new Event("qq:draft-recovered"));
      setMessage(restore ? "Draft restored. Reopen the editor to continue." : "Draft discarded. The server version is unchanged.");
      setSelected(undefined); setReview(undefined);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  if (!drafts.length && !open && !message) return null;
  return <>
    <div className="fixed bottom-4 right-4 z-[100] rounded-md border bg-background p-3 shadow-lg text-sm max-w-sm">
      {drafts.length > 0 && <button className="underline" onClick={() => { setOpen(true); setMessage(""); }}>Review {drafts.length} saved {drafts.length === 1 ? "draft" : "drafts"}</button>}
      {message && <div role="status">{message}<button className="ml-2 underline" onClick={() => setMessage("")}>Dismiss</button></div>}
    </div>
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Recover your writing</DialogTitle><DialogDescription>These drafts are stored in this browser for your account. Review a draft before restoring or discarding it.</DialogDescription></DialogHeader>
        {drafts.map(draft => <div key={draft.id} className="flex items-center gap-3 border-b py-2">
          <div className="flex-1"><strong>{draft.title}</strong><div className="text-xs text-muted-foreground">{draft.projectId ? `Project ${draft.projectId} · ` : ""}{draft.url.split("/")[2]} · {new Date(draft.updatedAt).toLocaleString()}</div></div>
          <button className="underline" disabled={busy} onClick={() => void inspect(draft)}>Review</button>
          <button className="underline" onClick={() => download(draft)}>Download</button>
        </div>)}
        {selected && drafts.some(draft => draft.id === selected.id) && <section className="space-y-3">
          <h3 className="font-semibold">{selected.title}</h3>
          {review?.conflicts.length ? <p role="alert">The server has different changes in: {review.conflicts.join(", ")}. Compare both versions before choosing.</p> : review && <p>No conflicting changes found. Restoring preserves other server fields.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <div><h4>Your draft</h4><pre className="whitespace-pre-wrap break-words max-h-64 overflow-auto bg-muted p-2 text-xs">{JSON.stringify(selected.patch, null, 2)}</pre></div>
            {review && <div><h4>Current server fields</h4><pre className="whitespace-pre-wrap break-words max-h-64 overflow-auto bg-muted p-2 text-xs">{JSON.stringify(Object.fromEntries(Object.keys(selected.patch).map(key => [key, review.server[key]])), null, 2)}</pre></div>}
          </div>
          <div className="flex flex-wrap gap-4">
            <button className="underline" disabled={busy || !review} onClick={() => void finish(true)}>{review?.conflicts.length ? "Replace these fields with my draft" : "Restore draft"}</button>
            <button className="underline" disabled={busy} onClick={() => void finish(false)}>Discard this draft</button>
          </div>
        </section>}
        {busy && <p role="status">Checking your writing…</p>}{error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
      </DialogContent>
    </Dialog>
  </>;
}

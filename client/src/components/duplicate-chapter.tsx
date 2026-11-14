import { useRef, useState } from "react";
import type { Chapter } from "@shared/schema";
import { chapterCopyRequest, type ChapterCopyRequest, type ChapterCopyResult, type ChapterCopySource } from "@shared/chapter-copy";
import { apiRequest, ApiError, currentAccount, queryClient } from "@/lib/queryClient";
import { prepareManuscriptAction } from "@/lib/manuscript-actions";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";

export default function DuplicateChapter({ chapter, onClose, onCreated }: { chapter: Chapter; onClose: () => void; onCreated: (copy: ChapterCopyResult) => void }) {
  const working = useRef(false);
  const [busy,setBusy] = useState(false), [error,setError] = useState("");
  const keyFor = (owner: number) => `quantum-quill:chapter-copy:v1:${owner}:${chapter.projectId}:${chapter.id}`;
  // Only an operation token is stored, never manuscript text. A retry after a lost
  // response/reload reuses it, so the server returns the original copy.
  const clear = (key: string, input: ChapterCopyRequest) => {
    if (localStorage.getItem(key) === JSON.stringify(input)) localStorage.removeItem(key);
  };
  async function copy() {
    if (working.current) return;
    working.current = true; setBusy(true); setError("");
    let key: string | undefined, input: ChapterCopyRequest | undefined;
    let creationConfirmed = false;
    try {
      const owner = await prepareManuscriptAction(chapter.projectId);
      key = keyFor(owner);
      const saved = localStorage.getItem(key);
      if (saved) input = chapterCopyRequest.parse(JSON.parse(saved));
      else {
        const source: ChapterCopySource = await (await apiRequest("GET",`/api/chapters/${chapter.id}/duplicate`)).json();
        input = chapterCopyRequest.parse({requestId:crypto.randomUUID(),snapshot:source.snapshot});
      }
      if (owner !== currentAccount()) throw new Error("Your account changed. Sign in again before duplicating.");
      localStorage.setItem(key,JSON.stringify(input));
      const result: ChapterCopyResult = await (await apiRequest("POST",`/api/chapters/${chapter.id}/duplicate`,input)).json();
      creationConfirmed = true;
      await Promise.all(["chapters","scenes","manuscript"].map(name => queryClient.invalidateQueries({queryKey:[`/api/projects/${chapter.projectId}/${name}`]})));
      await queryClient.fetchQuery({queryKey:[`/api/projects/${chapter.projectId}/chapters`],staleTime:0});
      // Do not switch away if a late save or account change needs review.
      await prepareManuscriptAction(chapter.projectId);
      clear(key,input);
      onCreated(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The chapter could not be copied. Try again.");
      // These rejections guarantee no creation. Uncertain failures retain the token.
      if (!creationConfirmed && key && input && e instanceof ApiError && (e.status === 400 || e.code === "CHAPTER_COPY_CHANGED")) {
        try { clear(key,input); } catch { /* Keep the token rather than risk a second copy. */ }
      }
    } finally { working.current = false; setBusy(false); }
  }
  return <Dialog open onOpenChange={open => {if (!open && !working.current) onClose();}}>
    <DialogContent onEscapeKeyDown={event => {if (working.current) event.preventDefault();}} onInteractOutside={event => event.preventDefault()}>
      <DialogHeader>
        <DialogTitle>Duplicate Chapter</DialogTitle>
        <DialogDescription>Create an independent draft copy of “{chapter.title}” directly after the original. Your latest writing is saved first.</DialogDescription>
      </DialogHeader>
      <p className="text-sm">Chapter prose, or all scenes with their prose, summaries, story beats and valid Story Bible references, will be copied. Plot links stay with the original. Shared Story Bible entries are not duplicated.</p>
      <p className="text-sm text-muted-foreground">Both chapters appear in the manuscript and exports. This creates a separate chapter, not a hidden alternate draft.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error} Retry checks the same request before creating another copy.</p>}
      {busy && <p role="status" className="text-sm">Saving and copying…</p>}
      <DialogFooter>
        <Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button>
        <Button disabled={busy} onClick={() => void copy()}>{busy ? "Duplicating…" : error ? "Retry duplicate" : "Create copy"}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}

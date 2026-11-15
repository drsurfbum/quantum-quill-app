import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { apiRequest, ApiError, currentAccount, queryClient } from "@/lib/queryClient";
import { prepareManuscriptAction } from "@/lib/manuscript-actions";
import { acceptSavedProse } from "@/hooks/use-autosave";
import type { ProseRecord, ProseResource, VersionSummary } from "@shared/prose-history";
import { useTheme } from "@/hooks/use-theme";

type Review = {version:VersionSummary;previewHtml:string;current:{revision:number;title:string;previewHtml:string};issues:string[]};
type RestoreRequest = {versionId:number;expectedRevision:number;requestId:string};
const stamp = (date:Date) => new Date(date).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"medium"});

function Preview({html,label}: {html:string;label:string}) {
  const {theme} = useTheme();
  const dark = theme === "dark";
  // No scripts, navigation links, forms, remote images, or external requests.
  const doc = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><style>body{margin:16px;color:${dark ? '#eee' : '#111827'};background:${dark ? '#171717' : '#fff'};font:16px/1.65 Georgia,serif;overflow-wrap:anywhere;white-space:pre-wrap}table{border-collapse:collapse;max-width:100%}td,th{border:1px solid #888;padding:4px}p{margin:0 0 1em}pre{white-space:pre-wrap}a{text-decoration:underline}span[data-qq-entry]{text-decoration:underline dotted;text-underline-offset:3px}</style></head><body>${html}</body></html>`;
  return <iframe sandbox="" title={label} srcDoc={doc} className="w-full flex-1 min-h-48 rounded border bg-background" />;
}

export default function ProseHistory({resource,documentId,projectId,onClose,onRestored,onReturnFocus}: {
  resource:ProseResource;documentId:number;projectId:number;onClose:()=>void;onReturnFocus:()=>void;onRestored:(record:ProseRecord)=>void;
}) {
  const owner = useSyncExternalStore(listener=>queryClient.getQueryCache().subscribe(listener),currentAccount,currentAccount);
  const originalOwner = useRef(owner);
  const active = useRef(true), operation = useRef(false), selection = useRef(0);
  const [rows,setRows] = useState<VersionSummary[]>([]), [next,setNext] = useState<number|null>(null);
  const [review,setReview] = useState<Review>();
  const [busy,setBusy] = useState(true), [error,setError] = useState("");
  const [compare,setCompare] = useState(false), [pane,setPane] = useState<"saved"|"current">("saved");
  const [pending,setPending] = useState<RestoreRequest>();
  const url = `/api/${resource}/${documentId}`, historyUrl = `${url}/history`;
  const retryKey = `qq:history-restore:${owner}:${projectId}:${resource}:${documentId}`;
  const valid = () => active.current && currentAccount() === originalOwner.current;
  async function inspect(versionId:number) {
    const ticket = ++selection.current; setBusy(true);setError("");setReview(undefined);setPane("saved");
    try {
      const result = await (await apiRequest("GET",`${historyUrl}/${versionId}`)).json();
      if (valid() && ticket === selection.current) setReview(result);
    } catch(e) { if(valid()) setError((e as Error).message); }
    finally { if(valid() && ticket === selection.current) setBusy(false); }
  }
  async function load(before?:number) {
    setBusy(true);setError("");
    try {
      await prepareManuscriptAction(projectId);
      const result = await (await apiRequest("GET",`${historyUrl}${before ? `?before=${before}` : ""}`)).json();
      if (!valid()) return;
      setRows(old=>before ? [...old,...result.versions] : result.versions);setNext(result.nextBefore);
      if (!before) {
        let retry:RestoreRequest|undefined;
        try { const raw=localStorage.getItem(retryKey); if(raw) { const value=JSON.parse(raw); if(Number.isInteger(value.versionId)&&Number.isInteger(value.expectedRevision)&&typeof value.requestId==="string") retry=value; } } catch { /* A new restore reports unavailable storage before sending. */ }
        setPending(retry);
        if(retry || result.versions.length) await inspect(retry?.versionId || result.versions[0].id);
      }
    } catch(e) { if(valid()) setError((e as Error).message); }
    finally { if(valid()) setBusy(false); }
  }
  useEffect(()=>{ active.current=true; void load(); return ()=>{active.current=false;selection.current++;}; },[]);
  useEffect(()=>{if(owner !== originalOwner.current) onClose();},[owner,onClose]);
  function clearRetry() {
    try { localStorage.removeItem(retryKey); } catch { /* A retained token remains safe to retry. */ }
    setPending(undefined);
  }
  async function restore() {
    if (!review || operation.current || !valid()) return;
    operation.current=true;setBusy(true);setError("");
    try {
      const account = await prepareManuscriptAction(projectId);
      if(!valid()) return;
      const request = pending || {versionId:review.version.id,expectedRevision:review.current.revision,requestId:crypto.randomUUID()};
      // Metadata only, written before dispatch. Reload/lost-response retry uses the
      // same receipt; it cannot repeat the restoration over a newer revision.
      try { localStorage.setItem(retryKey,JSON.stringify(request)); }
      catch { throw new Error("Browser storage is unavailable. No restoration was sent; enable storage before trying again."); }
      setPending(request);
      const result = await (await apiRequest("POST",`${historyUrl}/restore`,request)).json();
      if(!valid()) return;
      await acceptSavedProse(url,`/api/projects/${projectId}/${resource}`,result,account);
      if(!valid()) return;
      clearRetry();
      onRestored(result);onClose();
    } catch(e) {
      if(valid()) {
        setError((e as Error).message);
        if(e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 401) {
          clearRetry();setReview(undefined);
        }
      }
    } finally {operation.current=false;if(valid())setBusy(false);}
  }
  if (owner !== originalOwner.current) return null;
  return <Dialog open onOpenChange={open=>{if(!open&&!operation.current)onClose();}}>
    <DialogContent className="w-[calc(100vw-1rem)] max-w-6xl h-[90dvh] flex flex-col gap-3 overflow-hidden" onCloseAutoFocus={event=>{event.preventDefault();onReturnFocus();}}>
      <DialogHeader className="pr-6"><DialogTitle>Version history</DialogTitle><DialogDescription>Saved prose for this {resource === "scenes" ? "scene" : "chapter"}. Restoring creates a new version and keeps the originals. Planning and chapter order stay as they are.</DialogDescription></DialogHeader>
      <div className="flex min-h-0 flex-1 flex-col sm:flex-row gap-3">
        <nav aria-label="Saved versions" className="sm:w-56 shrink-0 max-h-32 sm:max-h-none overflow-auto border rounded p-2 space-y-1">
          {rows.map(row=><button type="button" key={row.id} aria-current={review?.version.id===row.id ? "true" : undefined} disabled={busy||!!pending} className={`w-full rounded text-left p-2 text-sm focus-visible:ring-2 focus-visible:ring-ring ${review?.version.id===row.id ? "bg-muted" : "hover:bg-muted/60"}`} onClick={()=>void inspect(row.id)}>
            <time dateTime={new Date(row.savedAt).toISOString()}>{stamp(row.savedAt)}</time><span className="block text-xs text-muted-foreground">Revision {row.revision} · {row.kind === "baseline" ? "Original checkpoint" : row.kind === "restore" ? "Restored version" : "Saved"}</span>
          </button>)}
          {next && <Button variant="outline" size="sm" disabled={busy||!!pending} onClick={()=>void load(next)}>Older versions</Button>}
          {!rows.length&&!busy&&<p className="text-sm p-2">No earlier versions yet. Your current prose will be preserved when you next change and save it.</p>}
        </nav>
        <section aria-label="Version preview" className="flex flex-1 min-h-0 min-w-0 flex-col gap-2">
          {review && <>
            <div className="flex flex-wrap items-center gap-2"><p className="text-sm flex-1 min-w-0 truncate" title={review.version.title}>{review.version.title} · Revision {review.version.revision}</p><Button variant="outline" size="sm" aria-pressed={compare} onClick={()=>setCompare(v=>!v)}>{compare ? "Preview only" : "Compare with current"}</Button></div>
            {compare && <div className="grid grid-cols-2 gap-2 lg:hidden" role="group" aria-label="Comparison view"><Button size="sm" className="h-auto min-h-9 min-w-0 whitespace-normal px-2 text-xs" variant={pane==="saved"?"secondary":"ghost"} aria-pressed={pane==="saved"} onClick={()=>setPane("saved")}>Saved version</Button><Button size="sm" className="h-auto min-h-9 min-w-0 whitespace-normal px-2 text-xs" variant={pane==="current"?"secondary":"ghost"} aria-pressed={pane==="current"} onClick={()=>setPane("current")}>Current saved text</Button></div>}
            <div className={`grid flex-1 min-h-0 min-w-0 gap-3 ${compare ? "lg:grid-cols-2" : "grid-cols-1"}`}>
              <div className={`${compare&&pane==="current"?"hidden lg:flex":"flex"} flex-col min-h-0 min-w-0 gap-1`}><h3 className="text-sm font-medium">Saved version</h3><Preview label="Saved version preview" html={review.previewHtml}/></div>
              {compare&&<div className={`${pane==="saved"?"hidden lg:flex":"flex"} flex-col min-h-0 min-w-0 gap-1`}><h3 className="text-sm font-medium">Current saved text · Revision {review.current.revision}</h3><Preview label="Current saved text preview" html={review.current.previewHtml}/></div>}
            </div>
          </>}
        </section>
      </div>
      {pending&&<p className="text-sm" role="status">A restoration may already have completed. Retry safely to check its result, or <button className="underline" disabled={busy} onClick={()=>{clearRetry();setReview(undefined);}}>dismiss the retry</button>. Dismissing does not reverse a completed restoration.</p>}
      {review?.issues.map(issue=><p className="text-sm" role="alert" key={issue}>{issue}</p>)}
      {error&&<p role="alert" className="text-sm">{error} <button className="underline" disabled={busy} onClick={()=>void load()}>Refresh history</button></p>}
      <div className="flex flex-wrap items-center gap-2 justify-end shrink-0">
        <p className="text-xs text-muted-foreground mr-auto">{busy ? "Checking saved writing…" : "Restoration starts a new undo session. Earlier versions remain here."}</p>
        <Button variant="outline" disabled={operation.current} onClick={onClose}>Close</Button>
        <Button disabled={busy||!review||!!review.issues.length} onClick={()=>void restore()}>{pending ? "Retry restoration" : "Restore as current version"}</Button>
      </div>
    </DialogContent>
  </Dialog>;
}

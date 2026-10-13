import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";
import { apiRequest, currentAccount } from "@/lib/queryClient";
import { prepareManuscriptAction } from "@/lib/manuscript-actions";

export default function ExportModal({ projectId, projectTitle, preview = false }: { projectId: string | number; projectTitle: string; preview?: boolean }) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error,setError] = useState("");
  const [format,setFormat] = useState("docx"), [html,setHTML] = useState(""), [ready,setReady] = useState(false), [downloaded,setDownloaded] = useState(false);
  const [options,setOptions] = useState({ manuscript: true, outline: false, storyboard: false, bible: false, contents: true, pageNumbers: true });
  const frame = useRef<HTMLIFrameElement>(null);
  const run = async (show: boolean) => {
    setBusy(true); setError(""); setDownloaded(false);
    try {
      const account = await prepareManuscriptAction(Number(projectId));
      const response = await apiRequest("POST", `/api/projects/${projectId}/export`, { ...options, format: show ? "html" : format });
      const blob = await response.blob();
      if (currentAccount() !== account) throw new Error("Your account changed. Reopen this project to export it.");
      if (show) { const text = await blob.text(); if (currentAccount() !== account) throw new Error("Your account changed."); setReady(false); setHTML(text); }
      else {
        const url = URL.createObjectURL(blob), link = document.createElement("a");
        link.href = url; link.download = `${projectTitle.replace(/[\\/:*?"<>|]/g,"_") || "Quantum Quill"}.${format}`;
        document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); setDownloaded(true);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Export failed. Your writing is unchanged."); }
    finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={value => { if (!busy) { setOpen(value); setHTML(""); setError(""); setDownloaded(false); } }}>
    <DialogTrigger asChild><Button variant={preview ? "default" : "ghost"} className="gap-1">{preview ? <ExternalLink className="h-4 w-4"/> : <Download className="h-4 w-4"/>}<span className="hidden sm:inline">{preview ? "Preview" : "Export"}</span></Button></DialogTrigger>
    <DialogContent className={html ? "max-w-5xl max-h-[95dvh]" : "max-w-lg max-h-[95dvh] overflow-y-auto"}>
      <DialogHeader><DialogTitle>{preview ? "Manuscript preview" : "Export project"}</DialogTitle><DialogDescription>Saved writing in manuscript order. Pending edits are saved first; unresolved drafts must be reviewed.</DialogDescription></DialogHeader>
      {html ? <><iframe ref={frame} title="Manuscript print preview" sandbox="allow-same-origin allow-modals" srcDoc={html.replace("<head>", '<head><base href="about:srcdoc">')} referrerPolicy="no-referrer" onLoad={() => setReady(true)} className="w-full h-[60dvh] border rounded bg-white"/><p className="text-sm text-muted-foreground">Choose Save as PDF in the print dialog. Page numbers and paper size use your browser’s print settings.</p></> : <div className="space-y-4">
        {!preview && <label className="block space-y-1"><span>File format</span><select aria-label="File format" className="w-full border rounded p-2 bg-background" value={format} onChange={e => setFormat(e.target.value)} disabled={busy}><option value="docx">Word document (.docx)</option><option value="html">Formatted HTML (.html)</option><option value="txt">Plain text (.txt)</option><option value="epub">EPUB ebook (.epub)</option><option value="json">Original project records (.json)</option></select></label>}
        <fieldset disabled={busy} className="space-y-2"><legend className="font-medium mb-2">Include</legend>{([['manuscript','Chapters & scene prose'],['outline','Outline notes, scene summaries & beats'],['storyboard','Storyboard plot points'],['bible','Story Bible, metadata & relationships']] as const).map(([key,label]) => <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={options[key]} onChange={e => { setOptions({...options,[key]:e.target.checked}); setDownloaded(false); }}/>{label}</label>)}</fieldset>
        <label className="flex items-center gap-2"><input type="checkbox" checked={options.contents} onChange={e => setOptions({...options,contents:e.target.checked})}/>Include contents in formatted documents</label>
        {!preview && format === "docx" && <label className="flex items-center gap-2"><input type="checkbox" checked={options.pageNumbers} onChange={e => setOptions({...options,pageNumbers:e.target.checked})}/>Word page numbers</label>}
        <p className="text-xs text-muted-foreground">Use preview to print or save a PDF. HTML best preserves editor styling. Word supports text formatting and tables; font availability varies by reader. JSON retains original fields; it is not a database-and-uploads backup.</p>
      </div>}
      {error && <p role="alert" className="text-destructive text-sm">{error}</p>}{downloaded && <p role="status" className="text-sm">Your download has started.</p>}
      <DialogFooter>{html ? <><Button variant="outline" onClick={() => setHTML("")}>Back</Button><Button disabled={!ready} onClick={() => frame.current?.contentWindow?.print()}>Print / Save PDF</Button></> : <><Button variant="outline" disabled={busy || !Object.entries(options).some(([key,value]) => ['manuscript','outline','storyboard','bible'].includes(key) && value)} onClick={() => void run(true)}>{busy ? "Preparing…" : "Preview / PDF"}</Button>{!preview && <Button disabled={busy || ![options.manuscript,options.outline,options.storyboard,options.bible].some(Boolean)} onClick={() => void run(false)}>{busy ? "Preparing…" : "Download"}</Button>}</>}</DialogFooter>
    </DialogContent>
  </Dialog>;
}

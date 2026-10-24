import { useEffect, useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, currentAccount, ApiError } from "@/lib/queryClient";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import type { FeedbackInput } from "@shared/feedback";
import type { FeedbackReport } from "@shared/schema";
import { feedbackInput } from "@shared/feedback";
import { FeedbackInboxLink } from "./feedback-inbox-link";

export function FeedbackButton({compact=false}: {compact?:boolean}) {
  return <Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground" title="Report feedback" aria-label="Report feedback" onClick={()=>window.dispatchEvent(new Event("qq:feedback"))}><MessageSquarePlus className="h-4 w-4"/>{!compact && <span className="ml-2 hidden sm:inline">Feedback</span>}</Button>;
}
const area = (): FeedbackInput["area"] => {
  const path=window.location.pathname;
  if(path.endsWith("/write")) return "Write";
  if(path.endsWith("/story-bible")) return "Story Bible";
  if(path.endsWith("/storyboard")) return "Storyboard";
  if(path.endsWith("/outline")) return "Outline";
  return path.startsWith("/project/") ? "Overview" : "Projects";
};
const blank = (): FeedbackInput => ({requestId:crypto.randomUUID(),category:"bug",summary:"",details:"",area:area(),device:"",allowContact:false});
function FeedbackForAccount({userId}: {userId:number}) {
  const key=`qq:feedback-draft:${userId}`;
  const [open,setOpen]=useState(false), [busy,setBusy]=useState(false);
  const [error,setError]=useState(""), [receipt,setReceipt]=useState<number>();
  const [reports,setReports]=useState<FeedbackReport[]>([]), [historyError,setHistoryError]=useState("");
  const [device,setDevice]=useState(false);
  const [draft,setDraft]=useState<FeedbackInput>(()=>{
    try { const stored=JSON.parse(sessionStorage.getItem(key)||"null");
      // Incomplete drafts are valid to retain, even before submission validation.
      if(stored && typeof stored.summary==="string" && typeof stored.details==="string" && typeof stored.requestId==="string") return {...blank(),...stored};
    } catch {} return blank();
  });
  useEffect(()=>{const show=()=>{setOpen(true);if(!draft.summary&&!draft.details) setDraft(v=>({...v,area:area()}));};window.addEventListener("qq:feedback",show);return()=>window.removeEventListener("qq:feedback",show);},[draft.summary,draft.details]);
  useEffect(()=>{try {sessionStorage.setItem(key,JSON.stringify(draft));}catch{}},[draft,key]);
  async function history(){try {const rows=await (await apiRequest("GET","/api/feedback")).json();if(currentAccount()===userId){setReports(rows);setHistoryError("");}}catch{setHistoryError("Couldn’t load your earlier reports. You can still try sending feedback.");}}
  useEffect(()=>{if(open) void history();},[open]);
  const update=(patch:Partial<FeedbackInput>)=>{setDraft(v=>({...v,...patch}));setError("");};
  async function submit(event:React.FormEvent){
    event.preventDefault();setError("");
    const input={...draft,device:device ? `${navigator.userAgent}; viewport ${window.innerWidth}×${window.innerHeight}`.slice(0,300) : ""};
    const parsed=feedbackInput.safeParse(input);
    if(!parsed.success){setError(parsed.error.issues[0].message);return;}
    setBusy(true);
    try {const saved=await (await apiRequest("POST","/api/feedback",parsed.data)).json();
      if(currentAccount()===userId){setReceipt(saved.id);setDraft(blank());void history();}
    }catch(cause){if(currentAccount()===userId){
      if(cause instanceof ApiError && cause.code==="FEEDBACK_ALREADY_RECEIVED"){setDraft(v=>({...v,requestId:crypto.randomUUID()}));void history();}
      setError(cause instanceof Error?cause.message:"Couldn’t send. Your report is kept here; try again.");
    }}
    finally{setBusy(false);}
  }
  return <Dialog open={open} onOpenChange={value=>{if(!busy)setOpen(value);}}>
    <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto" onPointerDownOutside={event=>event.preventDefault()}>
      <DialogHeader><DialogTitle>Report feedback</DialogTitle><DialogDescription>Send a private report to the Quantum Quill maintainer. Your writing stays open behind this window.</DialogDescription></DialogHeader>
      <FeedbackInboxLink />
      {receipt ? <div className="space-y-4"><p role="status" className="font-medium">Thank you — report #{receipt} received.</p><p className="text-sm text-muted-foreground">We’ll review it as part of the alpha. Reports aren’t monitored as a live support chat.</p><div className="flex gap-2"><Button onClick={()=>setOpen(false)}>Back to writing</Button><Button variant="outline" onClick={()=>setReceipt(undefined)}>Send another report</Button></div></div> :
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label htmlFor="feedback-kind">What would you like to share?</Label><select id="feedback-kind" className="w-full h-10 rounded-md border bg-background px-2" value={draft.category} onChange={e=>update({category:e.target.value as FeedbackInput["category"]})}><option value="bug">Something is broken</option><option value="confusing">Something is confusing</option><option value="idea">An idea or improvement</option><option value="other">Other feedback</option></select></div>
          <div className="space-y-1"><Label htmlFor="feedback-area">Which part of QQ?</Label><select id="feedback-area" className="w-full h-10 rounded-md border bg-background px-2" value={draft.area} onChange={e=>update({area:e.target.value as FeedbackInput["area"]})}>{["Write","Story Bible","Storyboard","Outline","Overview","Projects","Other"].map(v=><option key={v}>{v}</option>)}</select></div>
        </div>
        <div className="space-y-1"><Label htmlFor="feedback-summary">Short summary</Label><Input id="feedback-summary" maxLength={160} value={draft.summary} onChange={e=>update({summary:e.target.value})} placeholder="What happened, or what could work better?" required/></div>
        <div className="space-y-1"><Label htmlFor="feedback-details">Details</Label><Textarea id="feedback-details" className="min-h-36" maxLength={6000} value={draft.details} onChange={e=>update({details:e.target.value})} placeholder="What were you trying to do? What happened? What did you expect? For a bug, include the steps to repeat it." required/><p className="text-xs text-muted-foreground">Use sample text. Manuscripts, screenshots, and project names are never included automatically.</p></div>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={device} onChange={e=>setDevice(e.target.checked)}/>Include my browser and window size to help reproduce the problem.</label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={draft.allowContact} onChange={e=>update({allowContact:e.target.checked})}/>You may follow up using my account email.</label>
        <p className="text-xs text-muted-foreground">Reports are linked to your account and visible to you and QQ’s maintainer. Unsent text stays in this browser tab for this account.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2 justify-end"><Button type="button" variant="outline" disabled={busy} onClick={()=>setOpen(false)}>Keep for later</Button><Button type="submit" disabled={busy}>{busy?"Sending…":"Send feedback"}</Button></div>
      </form>}
      <details className="border-t pt-3"><summary className="cursor-pointer text-sm font-medium">My recent reports ({reports.length})</summary>{historyError && <p className="text-sm text-muted-foreground mt-2">{historyError}</p>}<ul className="mt-3 space-y-2 text-sm">{reports.map(report=><li key={report.id} className="rounded border p-2"><p>#{report.id} · {report.summary}</p><p className="text-xs text-muted-foreground capitalize">{report.status} · {new Date(report.createdAt).toLocaleDateString()}</p></li>)}</ul>{!reports.length&&!historyError&&<p className="text-sm text-muted-foreground mt-2">Your submitted reports will appear here.</p>}</details>
    </DialogContent>
  </Dialog>;
}
export function FeedbackDialog(){const {user}=useAuth();return user?<FeedbackForAccount key={user.id} userId={user.id}/>:null;}

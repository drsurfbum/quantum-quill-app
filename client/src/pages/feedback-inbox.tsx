import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Inbox, RefreshCw, Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, ApiError } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ThemeToggle from "@/components/ui/theme-toggle";
import { feedbackStatuses, type FeedbackDetail, type FeedbackInbox, type FeedbackStatus } from "@shared/feedback";

const statusNames: Record<string,string> = {received:"Received",reviewing:"Reviewing",planned:"Planned",resolved:"Resolved"};
const categoryNames: Record<string,string> = {bug:"Something is broken",confusing:"Something is confusing",idea:"Idea or improvement",other:"Other feedback"};
const selectClass="h-10 rounded-md border bg-background px-3 text-sm";
function Status({value}:{value:string}) {
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${value==="resolved"?"bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200":"bg-muted text-foreground"}`}>{statusNames[value] || value}</span>;
}

function Report({id,userId,onSaved,onBack}:{id:number;userId:number;onSaved:()=>void;onBack:()=>void}) {
  const query = useQuery<FeedbackDetail>({queryKey:[`/api/admin/feedback/${id}`,userId],staleTime:0,refetchOnWindowFocus:true});
  const [chosen,setChosen]=useState<FeedbackStatus | "">("");
  const [saving,setSaving]=useState(false), [message,setMessage]=useState(""), [error,setError]=useState("");
  async function save() {
    if (!query.data || !chosen) return;
    setSaving(true);setError("");setMessage("");
    try {
      await apiRequest("PATCH",`/api/admin/feedback/${id}`,{status:chosen,expectedStatus:query.data.status});
      await query.refetch();setChosen("");onSaved();setMessage("Status saved. The tester can see it in their report history.");
    } catch(cause) {
      setError(cause instanceof Error?cause.message:"Couldn’t save. Try again.");
      if (cause instanceof ApiError && cause.status===409) { await query.refetch();setChosen(""); }
    } finally {setSaving(false);}
  }
  // Errors suppress cached report contents, including after permission revocation.
  if (query.isError) return <div className="p-6"><p role="alert">{query.error.message}</p><Button variant="outline" className="mt-4" onClick={()=>void query.refetch()}>Try again</Button><Button variant="ghost" onClick={onBack}>Back to inbox</Button></div>;
  if (!query.data) return <p role="status" className="p-6">Loading report…</p>;
  const report=query.data;
  return <article className="p-5 sm:p-7 space-y-6 min-w-0">
    <div><Button variant="ghost" size="sm" className="mb-3 lg:hidden" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2"/>All reports</Button><div className="flex items-center gap-3 text-sm text-muted-foreground"><span>Report #{report.id}</span><Status value={report.status}/></div><h2 className="mt-3 text-xl font-semibold break-words">{report.summary}</h2><p className="mt-2 text-sm text-muted-foreground">{categoryNames[report.category]} · {report.area} · {new Date(report.createdAt).toLocaleString()}</p></div>
    <section aria-label="Report details"><h3 className="text-sm font-semibold mb-2">What the tester shared</h3><p className="whitespace-pre-wrap break-words leading-relaxed">{report.details}</p></section>
    <section className="rounded-lg border p-4 space-y-3"><h3 className="font-medium">Review status</h3><p className="text-sm text-muted-foreground">This status is visible to the tester. Saving it does not send an email.</p><div className="flex flex-wrap gap-2 items-center"><label htmlFor="report-status" className="sr-only">Report status</label><select id="report-status" className={selectClass} disabled={saving} value={chosen || report.status} onChange={event=>{setChosen(event.target.value as FeedbackStatus);setMessage("");setError("");}}>{feedbackStatuses.map(status=><option key={status} value={status}>{statusNames[status]}</option>)}</select><Button disabled={saving || !chosen || chosen===report.status} onClick={()=>void save()}>{saving?"Saving…":"Save status"}</Button></div>{message&&<p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}</section>
    <section className="text-sm space-y-2"><h3 className="font-semibold">Reporter</h3><p className="break-words">{report.reporter.username}</p>{report.reporter.email ? <><p className="text-muted-foreground">Opted in to follow-up at:</p><p className="break-all">{report.reporter.email}</p></> : <p className="text-muted-foreground">No email follow-up permission. Contact address is hidden.</p>}</section>
    {report.device&&<details className="text-sm border-t pt-4"><summary className="cursor-pointer">Browser details shared by the tester</summary><p className="mt-3 break-words text-muted-foreground">{report.device}</p></details>}
  </article>;
}

function InboxContents({userId}:{userId:number}) {
  const cache=useQueryClient();
  const [status,setStatus]=useState(""), [category,setCategory]=useState("");
  const [search,setSearch]=useState(""), [queryText,setQueryText]=useState("");
  const [cursors,setCursors]=useState<number[]>([]), [selected,setSelected]=useState<number>();
  const params=new URLSearchParams();
  if(status)params.set("status",status);if(category)params.set("category",category);if(queryText)params.set("q",queryText);
  if(cursors.length)params.set("before",String(cursors[cursors.length-1]));
  const url=`/api/admin/feedback?${params}`;
  const query=useQuery<FeedbackInbox>({queryKey:[url,userId],staleTime:0,refetchOnWindowFocus:true});
  const reset=()=>{setCursors([]);setSelected(undefined);};
  const refresh=()=>void cache.invalidateQueries({predicate:query=>String(query.queryKey[0]).startsWith("/api/admin/feedback")});
  return <div className="min-h-dvh bg-background text-foreground">
    <header className="border-b px-4 sm:px-7 py-4 flex items-center justify-between gap-3"><Link href="/" className="flex gap-2 items-center text-sm"><ArrowLeft className="h-4 w-4"/>Projects</Link><span className="font-serif font-semibold">Quantum Quill</span><ThemeToggle/></header>
    <main className="max-w-7xl mx-auto px-4 sm:px-7 py-6">
      <div className="flex justify-between items-start gap-4 mb-6"><div><h1 className="text-2xl font-semibold flex items-center gap-2"><Inbox className="h-6 w-6"/>Feedback inbox</h1><p className="text-sm text-muted-foreground mt-2">Private tester reports. Review what happened and keep testers informed through their report status.</p></div><Button variant="outline" size="sm" onClick={refresh} disabled={query.isFetching}><RefreshCw className="h-4 w-4 mr-2"/>Refresh</Button></div>
      <form className="flex flex-wrap gap-3 mb-5" onSubmit={event=>{event.preventDefault();setQueryText(search.trim());reset();}}><div className="flex gap-2 flex-1 min-w-52"><label htmlFor="feedback-search" className="sr-only">Search feedback</label><Input id="feedback-search" placeholder="Search report summaries and details" maxLength={100} value={search} onChange={event=>setSearch(event.target.value)}/><Button type="submit" variant="outline" aria-label="Search reports"><Search className="h-4 w-4"/></Button></div><label htmlFor="filter-status" className="sr-only">Filter by status</label><select id="filter-status" className={selectClass} value={status} onChange={event=>{setStatus(event.target.value);reset();}}><option value="">All statuses</option>{feedbackStatuses.map(status=><option key={status} value={status}>{statusNames[status]}</option>)}</select><label htmlFor="filter-category" className="sr-only">Filter by category</label><select id="filter-category" className={selectClass} value={category} onChange={event=>{setCategory(event.target.value);reset();}}><option value="">All categories</option>{Object.entries(categoryNames).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></form>
      {query.isError ? <p role="alert" className="border rounded-lg p-6">{query.error.message}</p> : <div className="border rounded-xl overflow-hidden grid lg:grid-cols-[minmax(260px,0.85fr)_minmax(0,1.5fr)]">
        <section aria-label="Feedback reports" className={`${selected?"hidden lg:block":""} lg:border-r min-w-0`}>
          {query.isPending?<p role="status" className="p-6">Loading reports…</p>:!query.data?.reports.length?<div className="p-7"><h2 className="font-medium">No reports found</h2><p className="mt-2 text-sm text-muted-foreground">{status||category||queryText?"Try another search or filter.":"New tester feedback will appear here."}</p></div>:<ul>{query.data.reports.map(report=><li key={report.id} className="border-b last:border-b-0"><button type="button" aria-pressed={selected===report.id} onClick={()=>setSelected(report.id)} className={`w-full text-left p-4 space-y-2 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${selected===report.id?"bg-accent":""}`}><div className="flex justify-between items-center gap-3"><span className="text-xs text-muted-foreground">#{report.id} · {report.area}</span><Status value={report.status}/></div><p className="font-medium break-words">{report.summary}</p><p className="text-xs text-muted-foreground">{categoryNames[report.category]} · {new Date(report.createdAt).toLocaleDateString()}</p></button></li>)}</ul>}
          <div className="flex items-center justify-between gap-2 border-t p-3"><Button variant="ghost" size="sm" disabled={!cursors.length} onClick={()=>{setCursors(v=>v.slice(0,-1));setSelected(undefined);}}>Newer</Button><span className="text-xs text-muted-foreground">Page {cursors.length+1}</span><Button variant="ghost" size="sm" disabled={!query.data?.nextCursor} onClick={()=>{setCursors(v=>[...v,query.data!.nextCursor!]);setSelected(undefined);}}>Older</Button></div>
        </section>
        <section aria-label="Selected report" className={`${!selected?"hidden lg:block":""} min-w-0`}>{selected?<Report key={selected} id={selected} userId={userId} onSaved={refresh} onBack={()=>setSelected(undefined)}/>:<p className="p-8 text-muted-foreground">Choose a report to read the details and update its status.</p>}</section>
      </div>}
      <p className="text-xs text-muted-foreground mt-4">Reports are private. Use a sanitized summary when adding an item to the public roadmap.</p>
    </main>
  </div>;
}
export default function FeedbackInboxPage() {
  const {user}=useAuth();
  return user?.feedbackAdmin ? <InboxContents key={user.id} userId={user.id}/> : <main className="p-8"><h1 className="text-xl font-semibold">Private admin inbox</h1><p className="my-4">This page is available only to the Quantum Quill maintainer.</p><Link href="/" className="underline">Back to projects</Link></main>;
}

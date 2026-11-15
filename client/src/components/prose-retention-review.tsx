import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import type { RetentionReport } from "@shared/prose-retention";
import { Button } from "./ui/button";

export default function ProseRetentionReview({historyUrl}:{historyUrl:string}) {
  const [report,setReport]=useState<RetentionReport>();
  const [error,setError]=useState("");
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let active=true;setReport(undefined);setError("");
    void apiRequest("GET",`${historyUrl}/retention`).then(r=>r.json()).then(result=>{if(active)setReport(result);}).catch(e=>{if(active)setError(e.message);});
    return ()=>{active=false;};
  },[historyUrl,attempt]);
  const mb=(bytes:number)=>(bytes/1_000_000).toFixed(2);
  return <section aria-label="Retention review" className="min-w-0 space-y-3 overflow-y-auto text-sm p-1">
    <h3 className="font-semibold">Retention policy · dry-run only</h3>
    <p>No saved versions are being deleted. Every changed save is still captured during review. These tiers describe which automatic checkpoints would remain if cleanup is approved later.</p>
    <table className="w-full text-left border-collapse"><caption className="sr-only">Proposed automatic checkpoint retention</caption><thead><tr><th className="border-b py-2">Age</th><th className="border-b py-2">Keep the latest changed checkpoint</th></tr></thead><tbody>
      {[["Last 24 hours","Every 5 minutes"],["2–7 days","Every hour"],["8–90 days","Every day"],["91 days–1 year","Every month"],["Older than 1 year","Protected versions only"]].map(([age,keep])=><tr key={age}><td className="border-b py-2 pr-2">{age}</td><td className="border-b py-2">{keep}</td></tr>)}
    </tbody></table>
    <p>Original, current/latest, kept, and restore checkpoints never expire automatically. Clean document-switch checkpoints also remain for the first 24 hours. Older automatic intermediate states may eventually expire; use Keep or Download to preserve an important version.</p>
    {error&&<p role="alert">{error} <Button variant="outline" size="sm" onClick={()=>setAttempt(n=>n+1)}>Retry review</Button></p>}
    {!report&&!error&&<p role="status">Reviewing saved-version metadata…</p>}
    {report&&<>
      <p role="status">{report.complete?report.scannedVersions:`At least ${report.scannedVersions}`} versions reviewed: {report.retainedVersions} retained, {report.wouldExpireVersions} would expire. <strong>Deleted: 0.</strong></p>
      <p>{report.protectedVersions} protected checkpoints. Proposed expiry accounts for {mb(report.wouldExpireLogicalBytes)} MB of {mb(report.logicalBytes)} MB of saved prose. These are logical bytes, not promised disk savings.</p>
      {!report.complete&&<p role="alert">This document exceeds the safe review limit. All scanned versions are retained; no expiry is proposed. Request an operator review.</p>}
      {!!report.wouldExpireVersions&&<div><h4 className="font-medium">Example expiry candidates</h4><ul className="list-disc pl-5">{report.decisions.filter(row=>row.action==="would-expire").slice(0,20).map(row=><li key={row.id}>Revision {row.revision}: {row.tier==="older-than-year"?"older than one year":"a newer checkpoint remains in its time window"}.</li>)}</ul>{report.wouldExpireVersions>20&&<p>Showing the first 20 candidates.</p>}</div>}
      <p className="text-xs text-muted-foreground">Reviewed {new Date(report.evaluatedAt).toLocaleString()}. UTC time windows; this report is a snapshot and cannot run cleanup.</p>
    </>}
  </section>;
}

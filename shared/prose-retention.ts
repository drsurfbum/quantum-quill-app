import type { ProseVersion } from "./schema";

export const RETENTION_POLICY = "prose-retention-v1";
export const RETENTION_SCAN_LIMIT = 10_000;
export type RetentionInput = Pick<ProseVersion, "id" | "revision" | "savedAt" | "kind" | "restoredFromId" | "keptAt" | "restoreProtected" | "sessionCheckpoint"> & { bytes: number };
export type RetentionDecision = { id: number; revision: number; bytes: number; action: "retain" | "would-expire"; reasons: string[]; tier: string | null };
const DAY = 86_400_000;

/** Pure review plan. No deletion function or apply mode exists. UTC buckets avoid DST ambiguity. */
export function planProseRetention(rows: RetentionInput[], currentRevision: number | null, now = new Date()) {
  if (!Number.isFinite(now.getTime())) throw new Error("A valid review time is required");
  const yearAgo = new Date(now);
  yearAgo.setUTCFullYear(now.getUTCFullYear() - 1);
  if (yearAgo.getUTCMonth() !== now.getUTCMonth()) yearAgo.setUTCDate(0);
  const time = (row: RetentionInput) => new Date(row.savedAt).getTime();
  const complete = rows.length <= RETENTION_SCAN_LIMIT;
  const ordered = [...rows].sort((a,b) => (time(b) - time(a) || b.revision - a.revision || b.id - a.id));
  const latestId = [...rows].sort((a,b)=>b.revision-a.revision || b.id-a.id)[0]?.id;
  // Also protects old rows created before retention metadata was introduced.
  const restoreIds = new Set<number>();
  let previous: RetentionInput | undefined;
  for (const row of [...rows].sort((a,b)=>a.revision-b.revision || a.id-b.id)) {
    if(row.kind === "restore") {
      restoreIds.add(row.id);
      if(row.restoredFromId) restoreIds.add(row.restoredFromId);
      if(previous) restoreIds.add(previous.id);
    }
    previous=row;
  }
  const buckets = new Set<string>();
  const decisions: RetentionDecision[] = ordered.map(row => {
    const saved = time(row), age = now.getTime() - saved;
    const reasons: string[] = [];
    if (!complete) reasons.push("scan-limit");
    if (currentRevision === null) reasons.push("document-unavailable");
    if (!Number.isFinite(saved) || age < 0) reasons.push("uncertain-timestamp");
    if (row.kind === "baseline") reasons.push("original");
    if (row.keptAt) reasons.push("kept-by-writer");
    if (row.restoreProtected || restoreIds.has(row.id)) reasons.push("restore-checkpoint");
    if (row.revision === currentRevision) reasons.push("current");
    if (row.id === latestId) reasons.push("latest-checkpoint");
    if (row.sessionCheckpoint && age >= 0 && age <= DAY) reasons.push("recent-session-end");
    let tier: string | null = null, bucket: string | null = null;
    if (Number.isFinite(saved) && age >= 0) {
      if (age <= DAY) { tier="5-minute"; bucket=`5m:${Math.floor(saved/300_000)}`; }
      else if (age <= 7*DAY) { tier="hourly"; bucket=`hour:${Math.floor(saved/3_600_000)}`; }
      else if (age <= 90*DAY) { tier="daily"; bucket=`day:${Math.floor(saved/DAY)}`; }
      else if (saved >= yearAgo.getTime()) { tier="monthly"; bucket=`month:${new Date(saved).toISOString().slice(0,7)}`; }
      else tier="older-than-year";
    }
    if (bucket && !buckets.has(bucket)) { buckets.add(bucket); reasons.push("latest-in-window"); }
    return {id:row.id,revision:row.revision,bytes:row.bytes,action:reasons.length ? "retain" : "would-expire",reasons,tier};
  });
  const candidates = decisions.filter(row=>row.action === "would-expire");
  return {mode:"dry-run" as const,policy:RETENTION_POLICY,evaluatedAt:now.toISOString(),complete,
    scannedVersions:rows.length,retainedVersions:rows.length-candidates.length,wouldExpireVersions:candidates.length,
    logicalBytes:rows.reduce((n,row)=>n+row.bytes,0),wouldExpireLogicalBytes:candidates.reduce((n,row)=>n+row.bytes,0),
    protectedVersions:decisions.filter(row=>row.reasons.some(reason=>["original","kept-by-writer","restore-checkpoint","current","latest-checkpoint"].includes(reason))).length,
    decisions};
}
export type RetentionReport = ReturnType<typeof planProseRetention>;
export function capacityNotice(usedBytes:number,capacityBytes:number) {
  if (!Number.isFinite(usedBytes) || usedBytes < 0 || !Number.isFinite(capacityBytes) || capacityBytes <= 0) throw new Error("Valid storage usage and capacity are required");
  const utilization = usedBytes/capacityBytes;
  return {usedBytes,capacityBytes,utilization,level:utilization >= 0.85 ? "urgent" : utilization >= 0.70 ? "warning" : "normal"};
}

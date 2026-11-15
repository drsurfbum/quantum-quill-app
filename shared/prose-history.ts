import type { Chapter, Scene, ProseVersion } from "./schema";
export type ProseResource = "chapters" | "scenes";
export type ProseRecord = Chapter | Scene;
export type RestoreSource = { restoredFromId: number; requestId: string };
export type VersionSummary = Omit<ProseVersion, "content" | "requestId"> & { bytes: number };
export const HISTORY_PAGE_SIZE = 20;
export function historySummary(row: ProseVersion): VersionSummary {
  const { content, requestId, ...summary } = row;
  return { ...summary, bytes: new TextEncoder().encode(content || "").length };
}
export function versionValue(resource: ProseResource, record: ProseRecord, kind: ProseVersion["kind"], source?: RestoreSource) {
  return { projectId: record.projectId, resource, documentId: record.id, revision: record.revision,
    title: record.title, content: record.content, savedAt: record.updatedAt || record.createdAt || new Date(),
    keptAt: null, restoreProtected: !!source, sessionCheckpoint: false,
    kind, restoredFromId: source?.restoredFromId ?? null, requestId: source?.requestId ?? null };
}

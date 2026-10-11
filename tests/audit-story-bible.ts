// Read-only inventory and normalization rehearsal against the verified snapshot.
// Reports shapes/counts only; it neither writes records nor exports writing.
import pg from "pg";
import { bibleLinks, prepareBiblePatch, readBibleFields, bibleFieldSchemas, structuredTypes } from "../shared/story-bible";
const client = new pg.Client({ host: "/tmp/quantum-quill-501", port: 55432, user: "qq_local", database: "quantum_quill_verified_snapshot" });
await client.connect();
try {
  await client.query("BEGIN READ ONLY");
  const result = await client.query(`select id, project_id as "projectId", entry_type as "entryType", title, content, metadata, tags, is_archived as "isArchived", related_entry_ids as "relatedEntryIds" from story_bible_entries order by id`);
  const entries = result.rows;
  const report: any = { database: "quantum_quill_verified_snapshot", readOnly: true, count: entries.length, types: {}, preservedUnknownKeys: 0, validationIssues: [], relationshipIssues: [], prepared: 0 };
  for (const entry of entries) {
    report.types[entry.entryType] = (report.types[entry.entryType] || 0) + 1;
    const fields = readBibleFields(entry); const schema = bibleFieldSchemas[entry.entryType];
    if (schema) {
      report.preservedUnknownKeys += Object.keys(fields).filter(key => !schema.shape[key]).length;
      const checked = schema.safeParse(fields);
      if (!checked.success) report.validationIssues.push({ id: entry.id, type: entry.entryType, paths: checked.error.issues.map(issue => issue.path.join(".")) });
    }
    try {
      const patch = prepareBiblePatch(entry, structuredTypes.has(entry.entryType) ? { content: entry.content } : { metadata: entry.metadata });
      const merged = { ...entry, ...patch };
      // Every legacy field survives a no-op compatibility write rehearsal.
      const after = readBibleFields(merged);
      for (const key of Object.keys(fields)) if (JSON.stringify(fields[key]) !== JSON.stringify(after[key])) throw new Error(`Changed field: ${key}`);
      report.prepared++;
    } catch { report.validationIssues.push({ id: entry.id, type: entry.entryType, paths: ["normalization"] }); }
    for (const link of bibleLinks(entry)) {
      const target = entries.find(other => other.id === link.targetId);
      if (!target || target.projectId !== entry.projectId || link.targetType && target.entryType !== link.targetType || link.targetId === entry.id) report.relationshipIssues.push({ id: entry.id, field: link.field, targetId: link.targetId, reason: !target ? "missing" : target.projectId !== entry.projectId ? "cross-project" : link.targetId === entry.id ? "self" : "type" });
    }
  }
  await client.query("ROLLBACK");
  console.log(JSON.stringify(report, null, 2));
} finally { await client.end(); }

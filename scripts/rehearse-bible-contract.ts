/** Restore the immutable recovery dump into a UNIQUE disposable database.
 * Stage v2 documents beside unchanged originals, verify every field, rehearse
 * rollback, then destroy only the database this process created. No prod mode. */
import pg from "pg";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { randomUUID, createHash } from "node:crypto";
import path from "node:path";
import assert from "node:assert/strict";
import { previewBibleDocument, readBibleDocument } from "../shared/bible-contract";
import { canonical } from "../shared/draft";
const dump = process.argv[2], output = process.argv[3];
if (!dump || !output) throw new Error("Usage: tsx scripts/rehearse-bible-contract.ts <recovery.dump> <private-report-directory>");
const name = `qq_contract_rehearsal_${randomUUID().replaceAll("-", "")}`;
const connection = { host: "/tmp/quantum-quill-501", port: 55432, user: "qq_local" };
const admin = new pg.Client({ ...connection, database: "postgres" });
let client: pg.Client | undefined, created = false;
const hash = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
const sourceDumpHash = createHash("sha256").update(await readFile(dump)).digest("hex");
await admin.connect();
try {
  await admin.query(`CREATE DATABASE "${name}"`); created = true;
  execFileSync("/opt/homebrew/opt/postgresql@16/bin/pg_restore", ["--host", connection.host, "--port", String(connection.port), "--username", connection.user, "--dbname", name, "--no-owner", "--no-privileges", "--exit-on-error", dump], { stdio: "pipe" });
  client = new pg.Client({ ...connection, database: name }); await client.connect();
  assert.equal((await client.query("SELECT current_database() name")).rows[0].name, name);
  const tableNames = (await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(row => row.tablename as string);
  const fingerprint = async () => {
    const result: Record<string, { count: number; sha256: string }> = {};
    for (const table of tableNames) {
      assert.match(table, /^[a-z_]+$/);
      const rows = (await client!.query(`SELECT to_jsonb(t) row FROM public."${table}" t`)).rows.map(row => canonical(row.row)).sort();
      result[table] = { count: rows.length, sha256: hash(rows) };
    }
    return result;
  };
  const before = await fingerprint();
  const originals = (await client.query("SELECT to_jsonb(e) row FROM story_bible_entries e ORDER BY id")).rows.map(row => row.row);
  const camel = (row: Record<string, unknown>) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/_([a-z])/g, (_match, letter) => letter.toUpperCase()), value]));
  const candidates = originals.map(raw => ({ raw, preview: previewBibleDocument(camel(raw)) }));
  await client.query("BEGIN");
  await client.query("CREATE TABLE qq_bible_contract_stage (entry_id integer PRIMARY KEY, original jsonb NOT NULL, document jsonb, review_required boolean NOT NULL)");
  for (const { raw, preview } of candidates) {
    assert.ok(preview.mappings.every(field => field.preserved), `Unmapped data for entry ${raw.id}: ${preview.mappings.filter(field => !field.preserved).map(field => field.source).join(", ")}`);
    if (preview.document && !preview.issues.length) readBibleDocument(preview.document);
    await client.query("INSERT INTO qq_bible_contract_stage VALUES ($1,$2,$3,$4)", [raw.id, JSON.stringify(raw), preview.document ? JSON.stringify(preview.document) : null, preview.needsReview]);
  }
  await client.query("COMMIT");
  const staged = (await client.query("SELECT * FROM qq_bible_contract_stage ORDER BY entry_id")).rows;
  assert.equal(staged.length, originals.length);
  for (let i = 0; i < staged.length; i++) {
    assert.equal(canonical(staged[i].original), canonical(originals[i]));
    assert.equal(canonical(staged[i].document), canonical(candidates[i].preview.document));
    if (staged[i].document) assert.equal(canonical(staged[i].document.legacy.original), canonical(camel(originals[i])));
  }
  const after = await fingerprint(); assert.deepEqual(after, before);
  // Rollback of this additive design removes staging only, never rewrites original rows.
  await client.query("BEGIN"); await client.query("DROP TABLE qq_bible_contract_stage"); await client.query("COMMIT");
  assert.equal((await client.query("SELECT to_regclass('public.qq_bible_contract_stage') name")).rows[0].name, null);
  const rollback = await fingerprint(); assert.deepEqual(rollback, before);
  const typeCounts: Record<string, number> = {}, destinationCounts: Record<string, number> = {};
  for (const { preview } of candidates) { typeCounts[preview.sourceType] = (typeCounts[preview.sourceType] || 0) + 1; const to = preview.targetType || "retained pending review"; destinationCounts[to] = (destinationCounts[to] || 0) + 1; }
  const report = { contractVersion: 2, sourceDump: path.basename(dump), sourceDumpSha256: sourceDumpHash, disposableDatabase: name, sourceDatabaseModified: false, originalRows: originals.length, stagedRows: staged.length, mappedFields: candidates.reduce((sum, item) => sum + item.preview.mappings.length, 0), allFieldsPreserved: true, before, after, rollback, rollbackRehearsed: true, typeCounts, destinationCounts,
    entries: candidates.map(({ raw, preview }) => ({ id: raw.id, sourceType: preview.sourceType, targetType: preview.targetType, needsReview: preview.needsReview, issues: preview.issues, conflicts: preview.document?.legacy.conflicts || [], originalHash: hash(raw), stagedOriginalHash: hash(staged.find(row => row.entry_id === raw.id).original), mappings: preview.mappings })) };
  await mkdir(output, { recursive: true, mode: 0o700 });
  await writeFile(path.join(output, "bible-contract-rehearsal.json"), JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ originalRows: report.originalRows, stagedRows: report.stagedRows, mappedFields: report.mappedFields, allFieldsPreserved: true, rollbackRehearsed: true, typeCounts, destinationCounts, reviewRequired: report.entries.filter(row => row.needsReview).map(({ id, sourceType, targetType, conflicts, issues }) => ({ id, sourceType, targetType, conflicts, issues })), report: path.resolve(output, "bible-contract-rehearsal.json") }, null, 2));
} finally {
  await client?.end();
  if (created) { assert.match(name, /^qq_contract_rehearsal_[a-f0-9]{32}$/); await admin.query(`DROP DATABASE "${name}"`); }
  await admin.end();
  assert.equal(createHash("sha256").update(await readFile(dump)).digest("hex"), sourceDumpHash);
}

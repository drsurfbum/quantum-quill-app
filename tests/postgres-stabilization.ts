// Explicit local-only integration check. Creates and drops its own empty database;
// never imports the app DB module until DATABASE_URL points at that scratch DB.
import pg from "pg";
import { readFile } from "node:fs/promises";
import { DEFAULT_WRITING_STYLE, QUILL_STYLES } from "../shared/writing-styles";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import session from "express-session";
const name = `qq_stabilization_${randomUUID().replaceAll("-", "")}`;
const admin = new pg.Client({ host: "/tmp/quantum-quill-501", port: 55432, user: "qq_local", database: "postgres" });
await admin.connect();
let pool: pg.Pool | undefined;
let created = false;
try {
  await admin.query(`CREATE DATABASE "${name}"`); created = true;
  process.env.DATABASE_URL = `postgresql://qq_local@localhost:55432/${name}?host=/tmp/quantum-quill-501`;
  const dbModule = await import("../server/db"); pool = dbModule.pool;
  assert.equal((await pool.query("select current_database() as name")).rows[0].name, name);
  await pool.query(`
    CREATE TABLE chapters (id serial primary key, project_id integer not null, title text not null, content text default '', "order" integer not null, is_draft boolean default true, created_at timestamp default now(), updated_at timestamp default now());
    CREATE TABLE story_bible_entries (id serial primary key, project_id integer not null, entry_type text not null, title text not null, content text default '', category text, subcategory text, tags text[], related_entry_ids integer[], metadata jsonb default '{}', is_archived boolean default false, priority integer default 0, created_at timestamp default now(), updated_at timestamp default now());
  `);
  await pool.query(`
    CREATE TABLE whiteboards (id serial primary key, name text);
    CREATE TABLE outline_items (id serial primary key, content text);
    CREATE TABLE plot_structures (id serial primary key, name text);
    CREATE TABLE plot_structure_sections (id serial primary key, content text);
    INSERT INTO chapters (project_id, title, content, "order") VALUES (1, 'Untouched migration fixture', 'Legacy prose <dragon> & two  spaces', 0);
    INSERT INTO story_bible_entries (project_id, entry_type, title, content, metadata) VALUES (1, 'details', 'Untouched legacy', '{"content":"keep","unknown":{"x":1}}', '{"unmapped":"keep"}');
  `);
  const before = await pool.query("SELECT to_jsonb(c) AS record FROM chapters c UNION ALL SELECT to_jsonb(b) FROM story_bible_entries b");
  const revisions = await readFile(new URL("../migrations/0002_writing_revisions.sql", import.meta.url), "utf8");
  await pool.query(revisions); await pool.query(revisions);
  const after = await pool.query("SELECT to_jsonb(c) - 'revision' AS record FROM chapters c UNION ALL SELECT to_jsonb(b) - 'revision' FROM story_bible_entries b");
  assert.deepEqual(after.rows, before.rows); // Byte-for-byte strings and metadata stay untouched.
  const { DatabaseStorage } = await import("../server/database-storage");
  const { updateBibleEntry, deleteBibleEntry } = await import("../server/story-bible");
  const storage = new DatabaseStorage(dbModule.db, new session.MemoryStore());
  const chapter = await storage.createChapter({ projectId: 1, title: "Synthetic", order: 0, content: "original" });
  const writes = await Promise.all(["A", "B"].map(content => storage.updateChapter(chapter.id, { content }, { content: "original", revision: chapter.revision })));
  assert.equal(writes.filter(Boolean).length, 1);
  assert.ok(await storage.updateChapter(chapter.id, { title: "Independent field" }, { title: "Synthetic" }));
  const returned = await storage.updateChapter(chapter.id, { content: "original" }, { revision: 2 });
  assert.equal(returned?.revision, 3);
  assert.equal(await storage.updateChapter(chapter.id, { content: "stale" }, { revision: 0, content: "original" }), undefined);
  const a = await storage.createStoryBibleEntry({ projectId: 1, title: "A", entryType: "locations", metadata: { notes: "old", custom: 1 } });
  const b = await storage.createStoryBibleEntry({ projectId: 1, title: "B", entryType: "locations" });
  assert.ok(await storage.updateStoryBibleEntry(a.id, { metadata: { notes: "new" } }, { metadata: { custom: 1, notes: "old" } }));
  assert.equal(await storage.updateStoryBibleEntry(a.id, { metadata: {} }, { metadata: { notes: "old", custom: 1 } }), undefined);
  const parents = await Promise.allSettled([[a,b],[b,a]].map(([source,target]) => updateBibleEntry(storage, source.id, { metadata: { parentLocation: String(target.id) } })));
  assert.equal(parents.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(parents.filter(result => result.status === "rejected").length, 1);
  const currentA = await storage.getStoryBibleEntry(a.id);
  const parentId = (currentA?.metadata as any).parentLocation ? b.id : a.id;
  await assert.rejects(() => deleteBibleEntry(storage, parentId), /incoming relationships/);
  const detail = await storage.createStoryBibleEntry({ projectId: 1, title: "Legacy", entryType: "details", content: "Original notes" });
  const updated = await updateBibleEntry(storage, detail.id, { content: JSON.stringify({ content: "New", tags: ["x"], isArchived: true, unknown: { retained: 1 } }) }, { content: "Original notes" });
  assert.equal(JSON.parse(updated!.content!)._legacyContent, "Original notes");
  assert.deepEqual(updated!.tags, ["x"]); assert.equal(updated!.isArchived, true);
  await pool.query("CREATE TABLE users (id serial PRIMARY KEY, username text NOT NULL UNIQUE, password text NOT NULL, email text NOT NULL, created_at timestamp DEFAULT now())");
  const migration = await readFile(new URL("../migrations/0001_writing_styles.sql", import.meta.url), "utf8");
  await pool.query(migration); await pool.query(migration); // Additive and repeatable.
  const writer = await storage.createUser({ username: "style-writer", email: "style@example.test", password: "synthetic-only" });
  const otherWriter = await storage.createUser({ username: "other-style-writer", email: "other@example.test", password: "synthetic-only" });
  const savedStyle = await storage.saveWritingStyle(writer.id, { name: "My style", definition: DEFAULT_WRITING_STYLE });
  const overwrittenStyle = await storage.saveWritingStyle(writer.id, { name: "My style", definition: QUILL_STYLES[0].definition });
  assert.equal(overwrittenStyle.id, savedStyle.id);
  assert.deepEqual((await storage.getWritingStyles(writer.id))[0].definition, QUILL_STYLES[0].definition);
  await storage.saveWritingStyle(otherWriter.id, { name: "My style", definition: DEFAULT_WRITING_STYLE });
  assert.equal(await storage.deleteWritingStyle(otherWriter.id, savedStyle.id), false);
  assert.equal(await storage.deleteWritingStyle(writer.id, savedStyle.id), true);
  assert.equal((await storage.getWritingStyles(writer.id)).length, 0);
  assert.equal((await storage.getWritingStyles(otherWriter.id)).length, 1);
  console.log("PASS: PostgreSQL additive revision migration leaves writing unchanged, rejects stale/ABA writes, atomic drafts, JSON equality, concurrent parent locks, deletion guards, legacy normalization, writing-style migration/upsert, and account isolation in an isolated scratch database.");
} finally {
  await pool?.end();
  if (created) { assert.match(name, /^qq_stabilization_[a-f0-9]{32}$/); await admin.query(`DROP DATABASE "${name}"`); }
  await admin.end();
}

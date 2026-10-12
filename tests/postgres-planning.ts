// Restore a local backup into a unique disposable DB. Never mutate the source DB.
import pg from "pg";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import session from "express-session";
import request from "supertest";
import { createApp } from "../server/app";
const name = `qq_planning_${randomUUID().replaceAll("-", "")}`;
const admin = new pg.Client({ host: "/tmp/quantum-quill-501", port: 55432, user: "qq_local", database: "postgres" });
await admin.connect(); let pool: pg.Pool | undefined;
try {
  await admin.query(`CREATE DATABASE "${name}"`);
  execFileSync("/opt/homebrew/opt/postgresql@16/bin/pg_restore", ["-h", "/tmp/quantum-quill-501", "-p", "55432", "-U", "qq_local", "--no-owner", "--no-privileges", "-d", name, process.argv[2] || "/private/tmp/qq-before-wizards-20261011.dump"], { stdio: "pipe" });
  process.env.DATABASE_URL = `postgresql://qq_local@localhost:55432/${name}?host=/tmp/quantum-quill-501`;
  const dbModule = await import("../server/db"); pool = dbModule.pool;
  assert.equal((await pool.query("select current_database() as name")).rows[0].name, name);
  const tables = ["users", "projects", "chapters", "outline_items", "story_bible_entries", "whiteboards", "plot_structures", "plot_structure_sections", "plot_structure_templates", "writing_styles", "bible_relationships"];
  async function snapshot(migrated = false) {
    const result: Record<string, unknown> = {};
    for (const table of tables) {
      const strip = migrated && table === "projects" ? " - 'settings'" : migrated && table === "chapters" ? " - 'writing_mode'" : "";
      result[table] = (await pool!.query(`SELECT to_jsonb(t)${strip} AS data FROM ${table} t ORDER BY to_jsonb(t)::text`)).rows;
    }
    return result;
  }
  // Sort by canonical JSON after stripping added columns, so altered physical order is irrelevant.
  const stable = (value: Record<string, unknown>) => Object.fromEntries(Object.entries(value).map(([key, rows]) => [key, (rows as any[]).map(row => JSON.stringify(row.data)).sort()]));
  const before = stable(await snapshot());
  const sql = await readFile(new URL("../migrations/0004_wizards_and_scenes.sql", import.meta.url), "utf8");
  await pool.query(sql); await pool.query(sql); assert.deepEqual(stable(await snapshot(true)), before);
  await pool.query("DROP TABLE creation_requests; DROP TABLE scenes; ALTER TABLE chapters DROP CONSTRAINT chapter_writing_mode; ALTER TABLE chapters DROP COLUMN writing_mode; ALTER TABLE projects DROP COLUMN settings;");
  assert.deepEqual(stable(await snapshot()), before); // Rollback before any feature use.
  await pool.query(sql); assert.deepEqual(stable(await snapshot(true)), before);
  const { DatabaseStorage } = await import("../server/database-storage");
  const { createProjectFromWizard, buildBlueprint, blueprintSource, createSceneSafely } = await import("../server/planning");
  const storage = new DatabaseStorage(dbModule.db, new session.MemoryStore());
  const user = await storage.createUser({ username: `planning-${randomUUID()}`, password: "synthetic-only", email: "fixture@example.test" });
  const projectInput = { requestId: randomUUID(), title: "Synthetic PG wizard", description: "Fixture", settings: { author: "Fixture", genre: "Fantasy", targetWordCount: 90000 } };
  const projects = await Promise.all([createProjectFromWizard(storage, user.id, projectInput), createProjectFromWizard(storage, user.id, projectInput)]); assert.equal(projects[0].id, projects[1].id);
  const project = projects[0];
  const template = await storage.createPlotStructureTemplate({ name: "Fixture", templateType: "fixture", sections: [] });
  const plot = await storage.createPlotStructure({ projectId: project.id, name: "Fixture", templateId: template.id });
  const beat = await storage.createPlotStructureSection({ plotStructureId: plot.id, sectionKey: "opening", title: "Opening", content: "Untouched notes", order: 0 });
  const source = await blueprintSource(storage, project.id, plot.id);
  const plan = { requestId: randomUUID(), structureId: plot.id, snapshot: source.snapshot, chapters: [{ title: "Chapter 1", scenes: [{ title: "First", summary: "Plan A", sectionId: beat.id }, { title: "synthetic failure", summary: "Plan B", sectionId: beat.id }] }] };
  await pool.query(`CREATE FUNCTION fail_test_scene() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.title = 'synthetic failure' THEN RAISE EXCEPTION 'synthetic failure'; END IF; RETURN NEW; END; $$; CREATE TRIGGER fail_scene BEFORE INSERT ON scenes FOR EACH ROW EXECUTE FUNCTION fail_test_scene();`);
  await assert.rejects(() => buildBlueprint(storage, project.id, plan), /synthetic failure/);
  assert.equal((await storage.getProjectChapters(project.id)).length, 0); assert.equal((await storage.getProjectScenes(project.id)).length, 0); assert.equal(await storage.getCreationRequest(project.id, plan.requestId), undefined);
  await pool.query("DROP TRIGGER fail_scene ON scenes; DROP FUNCTION fail_test_scene()");
  const results = await Promise.all([buildBlueprint(storage, project.id, plan), buildBlueprint(storage, project.id, plan)]); assert.deepEqual(results[0], results[1]);
  assert.equal((await storage.getProjectChapters(project.id)).length, 1); assert.equal((await storage.getProjectScenes(project.id)).length, 2);
  await assert.rejects(() => buildBlueprint(storage, project.id, { ...plan, requestId: randomUUID() }), /changed/);
  const scene = (await storage.getProjectScenes(project.id))[0];
  const writes = await Promise.all(["A", "B"].map(content => storage.updateScene(scene.id, { content }, { revision: 0, content: "" }))); assert.equal(writes.filter(Boolean).length, 1);
  const input = { requestId: randomUUID(), chapterId: scene.chapterId, title: "Extra" };
  const extra = await Promise.all([createSceneSafely(storage, project.id, input), createSceneSafely(storage, project.id, input)]); assert.equal(extra[0].id, extra[1].id); assert.equal(extra[0].order, 2);
  await assert.rejects(() => pool!.query("DELETE FROM chapters WHERE id=$1", [scene.chapterId]), /foreign key/);
  await assert.rejects(() => pool!.query("DELETE FROM plot_structure_sections WHERE id=$1", [beat.id]), /foreign key/);
  await assert.rejects(() => pool!.query("UPDATE chapters SET content='hidden' WHERE id=$1", [scene.chapterId]), /check constraint/);
  // Resource validation and mutation must use the locked transaction connection.
  // A small pool exposes the deadlock caused by borrowing another connection while
  // competing requests occupy all remaining connections waiting for the same lock.
  pool.options.max = 2; pool.options.connectionTimeoutMillis = 3000;
  const app = createApp({ storage, secret: "synthetic-only-planning-secret-at-least-32-chars" });
  const agent = request.agent(app);
  await agent.post("/api/register").send({ username: `pool-${randomUUID()}`, email: "pool@example.test", password: "synthetic-password" }).expect(201);
  const apiProject = (await agent.post("/api/projects").send({ title: "Concurrent API fixture" }).expect(201)).body;
  const apiChapter = (await agent.post("/api/chapters").send({ projectId: apiProject.id, title: "Guarded", order: 0 }).expect(201)).body;
  const competing = await Promise.all(Array.from({ length: 12 }, (_, i) => agent.put(`/api/chapters/${apiChapter.id}`).send({ content: `Writer ${i}`, _revision: 0 }).timeout({ response: 5000, deadline: 10000 })));
  assert.equal(competing.filter(r => r.status === 200).length, 1); assert.equal(competing.filter(r => r.status === 409).length, 11);
  console.log(JSON.stringify({ migration: "PASS", originalRowCounts: Object.fromEntries(Object.entries(before).map(([key, rows]) => [key, (rows as any[]).length])), unchangedOriginalValues: true, rollbackRehearsal: "PASS", atomicFailureRollback: "PASS", duplicateRetry: "PASS", concurrentScenes: "PASS", stalePreview: "PASS", databaseGuards: "PASS", connectionPoolContention: "PASS" }, null, 2));
} finally { await pool?.end(); assert.match(name, /^qq_planning_[a-f0-9]{32}$/); await admin.query(`DROP DATABASE IF EXISTS "${name}"`); await admin.end(); }

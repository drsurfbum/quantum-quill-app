// Rehearse against a disposable restored local backup, never the source database.
import pg from "pg";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import session from "express-session";
import { migrateSceneBeats, sceneOutlineFingerprint } from "../scripts/scene-beats-migration";
if (!process.argv[2]) throw new Error("Pass a local backup taken before scene story beats.");
const name = `qq_scene_outline_${randomUUID().replaceAll("-", "")}`;
const config = { host: "/tmp/quantum-quill-501", port: 55432, user: "qq_local" };
const admin = new pg.Client({ ...config, database: "postgres" });
await admin.connect(); let client: pg.Client | undefined, pool: pg.Pool | undefined;
try {
  await admin.query(`CREATE DATABASE "${name}"`);
  execFileSync("/opt/homebrew/opt/postgresql@16/bin/pg_restore", ["-h", config.host, "-p", "55432", "-U", config.user, "--no-owner", "--no-privileges", "-d", name, process.argv[2]], { stdio: "pipe" });
  client = new pg.Client({ ...config, database: name }); await client.connect();
  const before = await sceneOutlineFingerprint(client);
  await migrateSceneBeats(client); await migrateSceneBeats(client); assert.deepEqual(await sceneOutlineFingerprint(client), before);
  // Safe only in this disposable rehearsal, before writing any new feature data.
  await client.query("ALTER TABLE scenes DROP COLUMN story_beats");
  assert.deepEqual(await sceneOutlineFingerprint(client), before); await migrateSceneBeats(client);
  process.env.DATABASE_URL = `postgresql://qq_local@localhost:55432/${name}?host=/tmp/quantum-quill-501`;
  const db = await import("../server/db"); pool = db.pool;
  const { DatabaseStorage } = await import("../server/database-storage");
  const { createSceneSafely } = await import("../server/planning");
  const storage = new DatabaseStorage(db.db, new session.MemoryStore());
  const user = await storage.createUser({ username: `scene-test-${randomUUID()}`, email: "fixture@example.test", password: "synthetic-only" });
  const project = await storage.createProject({ userId: user.id, title: "Synthetic scene outline" });
  const input = { requestId: randomUUID(), chapterTitle: "Manual chapter", title: "Manual scene" };
  const [scene, retry] = await Promise.all([createSceneSafely(storage, project.id, input), createSceneSafely(storage, project.id, input)]);
  assert.equal(scene.id, retry.id); assert.deepEqual(scene.storyBeats, []); assert.equal((await storage.getProjectChapters(project.id)).length, 1);
  const beats = [{ id: randomUUID(), text: "The door opens." }, { id: randomUUID(), text: "Someone is waiting." }];
  const writes = await Promise.all([beats, []].map(storyBeats => storage.updateScene(scene.id, { storyBeats }, { revision: 0, storyBeats: [] })));
  assert.equal(writes.filter(Boolean).length, 1);
  const current = await storage.getScene(scene.id); assert.equal(current?.content, ""); assert.equal(current?.revision, 1);
  const saved = await storage.updateScene(scene.id, { storyBeats: beats, content: "<p>Independent prose.</p>" }, { revision: 1 });
  assert.deepEqual(saved?.storyBeats, beats);
  await assert.rejects(() => client!.query("UPDATE scenes SET story_beats='{}'::jsonb WHERE id=$1", [scene.id]), /check constraint/);
  await client.query(`CREATE FUNCTION fail_scene_outline() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.title = 'Fail this scene' THEN RAISE EXCEPTION 'synthetic failure'; END IF; RETURN NEW; END; $$; CREATE TRIGGER fail_scene_outline BEFORE INSERT ON scenes FOR EACH ROW EXECUTE FUNCTION fail_scene_outline();`);
  await assert.rejects(() => createSceneSafely(storage, project.id, { requestId: randomUUID(), chapterTitle: "Failed chapter", title: "Fail this scene" }), /synthetic failure/);
  assert.equal((await storage.getProjectChapters(project.id)).length, 1);
  console.log(JSON.stringify({ migration: "PASS", idempotentMigration: true, originalValuesUnchanged: true, tablesCompared: Object.keys(before).length, rollbackRehearsed: true, duplicateRetry: "PASS", concurrentBeats: "PASS", atomicFailureRollback: "PASS", originalRowCounts: Object.fromEntries(Object.entries(before).map(([table, row]) => [table, Number(row.count)])) }, null, 2));
} finally {
  await pool?.end(); await client?.end(); assert.match(name, /^qq_scene_outline_[a-f0-9]{32}$/);
  await admin.query(`DROP DATABASE IF EXISTS "${name}"`); await admin.end();
}

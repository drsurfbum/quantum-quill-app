// Synthetic PostgreSQL verification using the same fresh-database policy as the copy/history suites.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import session from "express-session";
import { initializeAlphaDatabase } from "../scripts/init-alpha-db.mjs";
import { migrateProseHistory } from "../scripts/migrate-prose-history.mjs";
import { migrateProseRetention } from "../scripts/migrate-prose-retention.mjs";
import { readSource } from "../server/assistant/source";

const adminURL = process.env.QQ_TEST_PG_ADMIN_URL;
if (!adminURL) throw new Error("Provide the disposable test PostgreSQL admin URL.");
const name = "qq_assistant_test_" + randomUUID().replaceAll("-", "");
const url = new URL(adminURL);
url.pathname = "/" + name;
const admin = new pg.Client({ connectionString: adminURL });
await admin.connect();
let pool: pg.Pool | undefined;
try {
  await admin.query(`CREATE DATABASE "${name}"`);
  await initializeAlphaDatabase(url.href, "fresh-alpha");
  await migrateProseHistory(url.href, "apply-prose-history-v1");
  await migrateProseRetention(url.href, "apply-prose-retention-v1");
  process.env.DATABASE_URL = url.href;
  const database = await import("../server/db");
  pool = database.pool;
  const { DatabaseStorage } = await import("../server/database-storage");
  const storage = new DatabaseStorage(database.db, new session.MemoryStore());
  const owner = await storage.createUser({
    username: "fictional",
    password: "fixture",
    email: "fixture@example.test",
  });
  const project = await storage.createProject({ userId: owner.id, title: "Fictional harbor" });
  const projectId = project.id;
  const other = await storage.createProject({ userId: owner.id, title: "Another project" });
  const chapter = await storage.createChapter({
    projectId,
    title: "The crossing",
    writingMode: "scenes",
    order: 0,
  });
  const scene = await storage.createScene({
    projectId,
    chapterId: chapter.id,
    title: "Harbor",
    order: 0,
    summary: "A gate closes.",
    content: "<p>Private fictional prose.</p>",
  });
  const template = await storage.createPlotStructureTemplate({
    name: "Fiction",
    templateType: "fixture",
    sections: [],
  });
  const plot = await storage.createPlotStructure({ projectId, templateId: template.id, name: "Departure" });
  const point = await storage.createPlotStructureSection({
    plotStructureId: plot.id,
    title: "Sea gate",
    sectionKey: "gate",
    order: 0,
  });
  const entry = await storage.createStoryBibleEntry({
    projectId,
    title: "Gatekeeper",
    entryType: "characters",
    content: "An old sailor.",
  });
  const note = await storage.createOutlineItem({ projectId, title: "Opening", order: 0 });
  const state = async () => {
    const rows = await pool!.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename",
    );
    const result = [];
    for (const { tablename } of rows.rows) {
      assert.match(tablename, /^[a-z_0-9]+$/);
      result.push(
        (await pool!.query(`SELECT to_jsonb(t) AS row FROM "${tablename}" t ORDER BY to_jsonb(t)::text`))
          .rows,
      );
    }
    return result;
  };
  const before = await state();
  await storage.withReadSnapshot(async (db) => {
    for (const [kind, row] of [
      ["plan", scene],
      ["plot", point],
      ["bible", entry],
      ["outline", note],
    ] as const) {
      assert.deepEqual(await db.assistantTitles(projectId, kind, row.title.toUpperCase().slice(0, 3)), [
        { id: row.id, title: row.title },
      ]);
      assert.deepEqual(await db.assistantTitles(other.id, kind, ""), []);
      await assert.rejects(() => readSource(db, other.id, { kind, id: row.id }), /unavailable/);
    }
    assert.equal(
      (await readSource(db, projectId, { kind: "plan", id: scene.id })).text.trim(),
      scene.summary,
    );
    assert.equal(
      (await readSource(db, projectId, { kind: "scene", id: scene.id })).text,
      "Private fictional prose.",
    );
  });
  // A future accidental write through the reader must be rejected by PostgreSQL,
  // not merely avoided by the current route implementation.
  await assert.rejects(
    () => storage.withReadSnapshot((db) => db.createOutlineItem({
      projectId, title: "Forbidden assistant write", order: 1,
    })),
    (error: unknown) => (error as { cause?: { code?: string }; code?: string }).code === "25006" ||
      (error as { cause?: { code?: string } }).cause?.code === "25006",
  );
  assert.deepEqual(await state(), before);
  console.log(
    `PostgreSQL scoped title lookup, versioned source reading and before/after equality across ${before.length} tables passed.`,
  );
} finally {
  await pool?.end();
  await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  await admin.end();
}

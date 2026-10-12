import type pg from "pg";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
// Compare stored values by hash; private manuscript text never appears in diagnostics.
export async function sceneOutlineFingerprint(client: pg.Client | pg.Pool) {
  const tables = ["users", "projects", "chapters", "scenes", "outline_items", "story_bible_entries", "whiteboards", "plot_structures", "plot_structure_sections", "plot_structure_templates", "writing_styles", "bible_relationships", "creation_requests"];
  const result: Record<string, { count: string; digest: string }> = {};
  for (const table of tables) {
    const value = table === "scenes" ? "to_jsonb(t) - 'story_beats'" : "to_jsonb(t)";
    result[table] = (await client.query(`SELECT count(*)::text AS count, md5(COALESCE(string_agg(row_hash, '' ORDER BY row_hash), '')) AS digest FROM (SELECT md5((${value})::text) AS row_hash FROM ${table} t) rows`)).rows[0];
  }
  return result;
}
export async function migrateSceneBeats(client: pg.Client) {
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ");
  try {
    const before = await sceneOutlineFingerprint(client);
    await client.query(await readFile(new URL("../migrations/0005_scene_story_beats.sql", import.meta.url), "utf8"));
    assert.deepEqual(await sceneOutlineFingerprint(client), before, "Existing rows changed during scene-beat migration");
    await client.query("COMMIT");
    return Object.fromEntries(Object.entries(before).map(([table, row]) => [table, Number(row.count)]));
  } catch (error) { await client.query("ROLLBACK"); throw error; }
}

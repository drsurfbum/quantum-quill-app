import pg from "pg";
import { migrateSceneBeats } from "./scene-beats-migration";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  const counts = await migrateSceneBeats(client);
  console.log(JSON.stringify({ migration: "Scene story beats ready", existingValuesUnchanged: true, rowCounts: counts }));
} catch (error) { console.error(error instanceof Error ? error.message : "Migration failed"); process.exitCode = 1; }
finally { await client.end(); }

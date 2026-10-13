// Build an additive access index from existing references. Never changes files or
// recovered rows. Run dry first; --apply creates only missing sidecar records.
import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { safeImageName } from "../server/upload-access";
const directory=path.resolve(process.env.UPLOAD_DIR || process.env.QQ_UPLOAD_DIR || "uploads");
const client=new pg.Client({connectionString:process.env.DATABASE_URL}); await client.connect();
try {
 await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
 const files=(await fs.readdir(directory)).filter(safeImageName), mapping=new Map<string,Set<number>>();
 const queries=["select project_id,to_jsonb(t)::text payload from chapters t","select project_id,to_jsonb(t)::text payload from scenes t","select project_id,to_jsonb(t)::text payload from outline_items t","select project_id,to_jsonb(t)::text payload from story_bible_entries t","select project_id,to_jsonb(t)::text payload from whiteboards t","select project_id,to_jsonb(t)::text payload from plot_structures t","select p.project_id,to_jsonb(s)::text payload from plot_structure_sections s join plot_structures p on p.id=s.plot_structure_id"];
 const validProjects=new Set((await client.query("select id from projects")).rows.map(r=>r.id));
 for(const query of queries) for(const row of (await client.query(query)).rows) {
   if(!validProjects.has(row.project_id)) continue;
   // Compare exact path boundaries, never partial filename matches.
   for(const match of row.payload.matchAll(/\/uploads\/([a-zA-Z0-9][a-zA-Z0-9._-]*\.(?:png|jpe?g|gif|webp))(?=[\\"'\s<>?#)]|$)/gi)) {
     if(!files.includes(match[1])) continue;
     const ids=mapping.get(match[1]) || new Set<number>();ids.add(row.project_id);mapping.set(match[1],ids);
   }
 }
 await client.query("COMMIT");
 const report={files:files.length,referenced:mapping.size,unassigned:files.filter(name=>!mapping.has(name)),sharedAcrossProjects:[...mapping].filter(([,ids])=>ids.size>1).map(([name,ids])=>({name,projectIds:[...ids]})),applied:process.argv.includes("--apply")};
 if(report.applied){
   await fs.mkdir(path.join(directory,".access"),{recursive:true,mode:0o700});
   for(const [name,ids] of mapping) try{await fs.writeFile(path.join(directory,".access",`${name}.json`),JSON.stringify({version:1,projectIds:[...ids],source:"recovered-reference-index"}),{flag:"wx",mode:0o600});}catch(error){if((error as NodeJS.ErrnoException).code!=="EEXIST") throw error;}
 }
 console.log(JSON.stringify(report,null,2));
} finally {await client.end();}

import pg from "pg";
import { pathToFileURL } from "node:url";
import { capacityNotice, planProseRetention, RETENTION_SCAN_LIMIT } from "../shared/prose-retention";
import type { RetentionInput } from "../shared/prose-retention";

export function reportArguments(args:string[]) {
  const options:{projectId?:number;capacityBytes?:number}={};
  for(let i=0;i<args.length;i+=2) {
    const flag=args[i],value=Number(args[i+1]);
    if(!['--project-id','--capacity-mb'].includes(flag)||!Number.isFinite(value)||value<=0) throw new Error('Use --project-id N [--capacity-mb N]. This command only reports; no apply mode exists.');
    if(flag==='--project-id') {
      if(options.projectId||!Number.isInteger(value)||value>2147483647)throw new Error('Provide one valid project ID');
      options.projectId=value;
    } else {
      if(options.capacityBytes)throw new Error('Provide capacity once');
      options.capacityBytes=value*1_000_000;
      if(!Number.isFinite(options.capacityBytes))throw new Error('Invalid capacity');
    }
  }
  if(!options.projectId)throw new Error('An explicit --project-id is required');
  return {projectId:options.projectId,capacityBytes:options.capacityBytes};
}

/** Read-only, metadata-only snapshot. No cleanup implementation or schedule exists. */
export async function retentionReport(connectionString:string,projectId:number,capacityBytes?:number) {
  if(!connectionString)throw new Error('An explicit DATABASE_URL is required');
  const client=new pg.Client({connectionString,connectionTimeoutMillis:4000});await client.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await client.query("SET LOCAL statement_timeout = '30s'");
    if(!(await client.query('SELECT id FROM projects WHERE id=$1',[projectId])).rowCount)throw new Error('Project not found');
    const now=(await client.query('SELECT now() value')).rows[0].value;
    const docs=(await client.query('SELECT DISTINCT resource,document_id FROM prose_versions WHERE project_id=$1 ORDER BY resource,document_id LIMIT 1001',[projectId])).rows;
    if(docs.length>1000)throw new Error('Project exceeds the safe document review limit; no expiry report produced');
    const documents=[];
    for(const doc of docs) {
      const table=doc.resource==='chapters'?'chapters':doc.resource==='scenes'?'scenes':null;
      if(!table)throw new Error('Unknown document resource; no expiry report produced');
      const current=(await client.query(`SELECT revision FROM ${table} WHERE id=$1 AND project_id=$2${table==='chapters'?" AND writing_mode='chapter'":''}`,[doc.document_id,projectId])).rows[0];
      const rows:RetentionInput[]=(await client.query(`SELECT id,revision,saved_at AS "savedAt",kind,restored_from_id AS "restoredFromId",kept_at AS "keptAt",restore_protected AS "restoreProtected",session_checkpoint AS "sessionCheckpoint",octet_length(coalesce(content,'')) AS bytes FROM prose_versions WHERE project_id=$1 AND resource=$2 AND document_id=$3 ORDER BY id DESC LIMIT $4`,[projectId,doc.resource,doc.document_id,RETENTION_SCAN_LIMIT+1])).rows;
      documents.push({resource:doc.resource,documentId:doc.document_id,...planProseRetention(rows,current?.revision??null,now)});
    }
    const databaseBytes=Number((await client.query('SELECT pg_database_size(current_database()) bytes')).rows[0].bytes);
    await client.query('COMMIT');
    return {mode:'dry-run',deletedVersions:0,reclaimedBytes:0,projectId,evaluatedAt:now.toISOString(),complete:documents.every(d=>d.complete),databaseBytes,capacity:capacityBytes?capacityNotice(databaseBytes,capacityBytes):null,
      note:'All saves are still captured. Logical candidate bytes are not physical disk savings. Capacity covers this database, not uploads, WAL or backups. No cleanup or storage alerts are scheduled.',documents};
  } catch(error) {await client.query('ROLLBACK');throw error;}
  finally{await client.end();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    const options=reportArguments(process.argv.slice(2));
    console.log(JSON.stringify(await retentionReport(process.env.DATABASE_URL||'',options.projectId,options.capacityBytes),null,2));
  }catch(error){console.error((error as Error).message);process.exitCode=1;}
}

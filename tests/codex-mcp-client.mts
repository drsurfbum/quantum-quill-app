// Optional installed-vendor-client acceptance test. No model turn or real account.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import session from 'express-session';
import { createApp } from '../server/app';
import { MemStorage } from '../server/storage';
const binary=process.env.QQ_CODEX_BIN;
if(!binary)throw new Error('Set QQ_CODEX_BIN to an already installed Codex executable. No installation is performed.');
const storage=new MemStorage();(storage.sessionStore as any).stopInterval?.();storage.sessionStore=new session.MemoryStore();
const server=createServer(createApp({storage,secret:'fictional-vendor-client-test-only-secret'}));
server.listen(0,'127.0.0.1');await once(server,'listening');
const origin=`http://127.0.0.1:${(server.address() as any).port}`;
const temporary=await mkdtemp(join(tmpdir(),'qq-codex-acceptance-'));
const isolatedConfig=join(temporary,'config'),workspace=join(temporary,'empty-workspace');
await mkdir(isolatedConfig);await mkdir(workspace);
let child:ReturnType<typeof spawn>|undefined;let stderr='';let nextId=0;
const pending=new Map<number,{resolve:(v:any)=>void,reject:(e:Error)=>void,timer:ReturnType<typeof setTimeout>}>();
const checks:string[]=[];
try{
 const registration=await fetch(origin+'/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'vendor-fixture',email:'vendor@example.test',password:'fictional-vendor-password'})});assert.equal(registration.status,201);
 const cookie=registration.headers.get('set-cookie')!.split(';')[0],user=await registration.json();
 const request=async(path:string,method='GET',body?:any)=>{const r=await fetch(origin+'/api/agent-settings'+path,{method,headers:{Cookie:cookie,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});assert.equal(r.status,200);return r.json();};
 const settings=async(patch:any)=>{const {hasKey,...current}=await request('');return request('','PUT',{...current,...patch});};
 const project=await storage.createProject({userId:user.id,title:'The Lantern Observatory'}),sibling=await storage.createProject({userId:user.id,title:'The Glass Orchard'});
 const outline=await storage.createOutlineItem({projectId:project.id,title:'The first light',content:'A fictional outline note.',order:0});
 const chapter=await storage.createChapter({projectId:project.id,title:'Arrival',content:'<p>A fictional lantern glowed.</p>',writingMode:'chapter',order:0});
 const selected=await settings({enabled:true,projectIds:[project.id]});const {key}=await request('/key','POST',{revision:selected.revision});
 const setup=await request('/setup');
 // Correctly use Codex's documented configuration-root override; never read or
 // change the writer's normal config/auth. No provider traffic can leave loopback.
 await writeFile(join(isolatedConfig,'config.toml'),`model_provider = "fixture_no_inference"\nmodel = "fixture"\n[model_providers.fixture_no_inference]\nname = "Fixture (no inference)"\nbase_url = "http://127.0.0.1:9/v1"\nwire_api = "responses"\nrequires_openai_auth = false\n[analytics]\nenabled = false\n`+setup.codexEnvironmentConfig,{mode:0o600});
 child=spawn(binary,['app-server','--stdio'],{cwd:workspace,env:{PATH:process.env.PATH!,HOME:process.env.HOME!,TMPDIR:tmpdir(),CODEX_HOME:isolatedConfig,QQ_MCP_TOKEN:key},stdio:['pipe','pipe','pipe']});
 child.stderr!.on('data',b=>{stderr+=b.toString();});
 createInterface({input:child.stdout!}).on('line',line=>{
  const message=JSON.parse(line),p=pending.get(message.id);if(p){clearTimeout(p.timer);pending.delete(message.id);message.error?p.reject(new Error(JSON.stringify(message.error))):p.resolve(message.result);}
  else if(message.id!==undefined&&message.method){child!.stdin!.write(JSON.stringify({id:message.id,error:{code:-32601,message:'No interactive approvals or credential requests in isolated acceptance test.'}})+'\n');}
 });
 const rpc=(method:string,params:any)=>new Promise<any>((resolve,reject)=>{const id=++nextId;const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`Timeout: ${method}`));},30000);pending.set(id,{resolve,reject,timer});child!.stdin!.write(JSON.stringify({id,method,params})+'\n');});
 const initialized=await rpc('initialize',{clientInfo:{name:'qq_fixture_acceptance',version:'0.1.0'},capabilities:{experimentalApi:true}});
 child.stdin!.write(JSON.stringify({method:'initialized'})+'\n');
 const thread=await rpc('thread/start',{cwd:workspace,ephemeral:true,approvalPolicy:'on-request',sandbox:'read-only',modelProvider:'fixture_no_inference',model:'fixture'});
 const threadId=thread.thread.id;
 const inventory=await rpc('mcpServerStatus/list',{threadId,serverName:'quantum_quill'});
 const found=inventory.data.find((s:any)=>s.name==='quantum_quill');assert(found,'Codex discovered configured QQ server');assert.equal(Object.keys(found.tools).length,19);checks.push('fresh installed Codex discovery: 19 tools');
 const call=(tool:string,args:any={})=>rpc('mcpServer/tool/call',{threadId,server:'quantum_quill',tool,arguments:args});
 const value=(r:any)=>{assert(!r.isError,JSON.stringify(r));return r.structuredContent;};
 const guide=value(await call('qq_get_guide',{section:'writing',limit:300}));assert(guide.markdown.length<=300&&guide.nextOffset);checks.push('bounded guide recipe without checkout');
 assert.deepEqual(value(await call('qq_list_projects')).data.items.map((p:any)=>p.id),[project.id]);
 assert.equal(value(await call('qq_get_project',{projectId:project.id})).data.title,project.title);
 assert((await call('qq_get_project',{projectId:sibling.id})).isError);checks.push('selected-project safe read and sibling denial');
 const edit={projectId:project.id,itemId:outline.id,revision:0,patch:{title:'Revised fictional plan'}};
 assert((await call('qq_update_outline_item',edit)).isError);assert((await call('qq_get_chapter',{projectId:project.id,chapterId:chapter.id})).isError);checks.push('default write and manuscript denial');
 await settings({allowWrites:true});assert(! (await call('qq_update_outline_item',edit)).isError);assert((await call('qq_update_outline_item',edit)).isError);assert((await call('qq_get_chapter',{projectId:project.id,chapterId:chapter.id})).isError);checks.push('editing enabled independently; stale revision and manuscript denied');
 await settings({allowWrites:false,allowManuscript:true});const prose=value(await call('qq_get_chapter',{projectId:project.id,chapterId:chapter.id})).data;assert(prose.content.includes('fictional lantern'));assert((await call('qq_update_chapter',{projectId:project.id,chapterId:chapter.id,revision:prose.revision,patch:{content:'<p>Denied.</p>'}})).isError);checks.push('manuscript read enabled independently; write denied');
 await settings({allowWrites:true});assert(!(await call('qq_update_chapter',{projectId:project.id,chapterId:chapter.id,revision:prose.revision,patch:{content:'<p>A revised fictional lantern glowed.</p>'}})).isError);checks.push('explicit revision-checked manuscript edit with both permissions');
 await settings({allProjects:true});assert.equal(value(await call('qq_list_projects')).data.items.length,2);await settings({allProjects:false});assert((await call('qq_get_project',{projectId:sibling.id})).isError);checks.push('live all/selected scope changes');
 await request('/key','DELETE');assert((await call('qq_get_project',{projectId:project.id})).isError);checks.push('revocation enforced on existing Codex connection');
 assert(!stderr.includes(key),'No key in vendor stderr');
 const receipt={client:'installed Codex app-server (no model turn)',clientInfo:initialized.userAgent,checks,fictionalDataOnly:true,personalConfigChanged:false,externalModelCalls:0};
 await mkdir('.local/mcp-release-review',{recursive:true});await writeFile('.local/mcp-release-review/codex-client.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
}finally{
 for(const p of pending.values()){clearTimeout(p.timer);p.reject(new Error('Client stopped'));}pending.clear();
 if(child&&child.exitCode===null){const exited=once(child,'exit');child.stdin!.end();const timeout=setTimeout(()=>child?.kill('SIGTERM'),3000);await exited;clearTimeout(timeout);}
 await rm(temporary,{recursive:true,force:true});const closed=once(server,'close');server.close();server.closeAllConnections();await closed;
}

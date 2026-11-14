import assert from 'node:assert/strict';
import { test,before,after } from 'node:test';
import { createServer,type Server } from 'node:http';
import { once } from 'node:events';
import { mkdtemp,readFile,writeFile,mkdir,rm } from 'node:fs/promises';
import { join,dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import session from 'express-session';
import JSZip from 'jszip';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { createApp } from '../server/app';
import { MemStorage } from '../server/storage';
import { guideMarkdown,guideHash,guideSections } from '../server/mcp/guide';
const storage=new MemStorage();(storage.sessionStore as any).stopInterval?.();storage.sessionStore=new session.MemoryStore();
let server:Server,origin:string,cookie:string,key:string,project:any,sibling:any,foreign:any,extracted:string;
async function request(path:string,method='GET',body?:unknown,headers:Record<string,string>={}){return fetch(origin+'/api/agent-settings'+path,{method,headers:{Cookie:cookie,'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});}
async function settings(patch:any){const {hasKey,...s}=await(await request('')).json();const r=await request('','PUT',{...s,...patch});assert.equal(r.status,200);return r.json();}
function content(r:any){assert(!r.isError,JSON.stringify(r));return r.structuredContent;}
before(async()=>{
 server=createServer(createApp({storage,secret:'fictional-setup-guide-test-only-123'}));server.listen(0,'127.0.0.1');await once(server,'listening');origin=`http://127.0.0.1:${(server.address() as any).port}`;
 const r=await fetch(origin+'/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'guide-fixture-writer',email:'guide@example.test',password:'fictional-password-only'})});assert.equal(r.status,201);cookie=r.headers.get('set-cookie')!.split(';')[0];const user=await r.json();
 const other=await storage.createUser({username:'another-fixture',email:'another@example.test',password:'not-a-login'});
 project=await storage.createProject({userId:user.id,title:'The Lantern Observatory'});sibling=await storage.createProject({userId:user.id,title:'The Glass Orchard'});foreign=await storage.createProject({userId:other.id,title:'UNPERMITTED_FIXTURE_MARKER'});
 const s=await settings({enabled:true,projectIds:[project.id]});key=(await(await request('/key','POST',{revision:s.revision})).json()).key;
 extracted=await mkdtemp(join(tmpdir(),'qq-portable-guide-'));
});
after(async()=>{await rm(extracted,{recursive:true,force:true});if(server){const closed=once(server,'close');server.close();server.closeAllConnections();await closed;}});
test('setup downloads are local/session protected and configurations contain no key',async()=>{
 const r=await request('/setup','GET',undefined,{Host:'untrusted.example'});assert.equal(r.status,200);const setup=await r.json();assert.equal(setup.origin,origin);assert(setup.executableAvailable&&setup.bundleAvailable);assert(!JSON.stringify(setup).includes(key));assert(!JSON.stringify(setup).includes('untrusted.example'));
 assert(setup.codexConfig.includes(JSON.stringify(process.execPath)));assert(setup.codexConfig.includes('default_tools_approval_mode = "prompt"'));assert(setup.codexConfig.includes('<PASTE_KEY_PRIVATELY_HERE>'));assert(setup.codexEnvironmentConfig.includes('env_vars = ["QQ_MCP_TOKEN"]'));assert(!setup.codexEnvironmentConfig.includes('QQ_MCP_TOKEN ='));
 assert.equal(await(await request('/guide')).text(),guideMarkdown);
 for(const route of ['/setup','/bundle','/guide'])assert.equal((await fetch(origin+'/api/agent-settings'+route,{headers:{Authorization:`Bearer ${key}`}})).status,401);
 assert.equal((await request('/test','POST',{key},{Origin:'https://foreign.example'})).status,403);
 const hosted=createServer(createApp({storage,secret:'fictional-production-test-only-secret',production:true}));hosted.listen(0,'127.0.0.1');await once(hosted,'listening');try{for(const route of ['/setup','/bundle','/guide','/test'])assert.equal((await fetch(`http://127.0.0.1:${(hosted.address() as any).port}/api/agent-settings${route}`,{method:route==='/test'?'POST':'GET'})).status,403);}finally{const closed=once(hosted,'close');hosted.close();hosted.closeAllConnections();await closed;}
});
test('portable extension has canonical docs and dependency licenses, no secrets or machine paths',async()=>{
 const r=await request('/bundle');assert.equal(r.status,200);assert(r.headers.get('content-disposition')?.includes('quantum-quill.mcpb'));
 const zip=await JSZip.loadAsync(await r.arrayBuffer());const manifest=JSON.parse(await zip.file('manifest.json')!.async('string'));
 assert.equal(manifest.version,'0.1.0');assert.equal(manifest.manifest_version,'0.3');assert.equal(manifest.user_config.key.sensitive,true);assert.equal(manifest.server.type,'node');assert.equal(manifest.server.entry_point,'server/index.cjs');assert(manifest.tools_generated);
 assert.equal(await zip.file('QQ_FIELD_GUIDE.md')!.async('string'),guideMarkdown);
 assert((await zip.file('THIRD_PARTY_NOTICES.txt')!.async('string')).includes('@modelcontextprotocol/sdk'));
 assert(Object.keys(zip.files).some(n=>n.startsWith('licenses/@modelcontextprotocol_sdk/')));
 for(const [name,file] of Object.entries(zip.files)){
  assert(!name.includes('..')&&!name.startsWith('/')&&!name.includes('.env'));if(file.dir)continue;
  const bytes=await file.async('nodebuffer'),text=bytes.toString();assert(!text.includes(key));assert(!/\/Users\/|\/home\/|qqmcp_[0-9]+_[A-Za-z0-9_-]{43}/.test(text),`Private content in ${name}`);
  const target=join(extracted,name);await mkdir(dirname(target),{recursive:true});await writeFile(target,bytes);
 }
});
test('fresh real client discovers the guide and bounded recipes without a checkout',async()=>{
 const transport=new StdioClientTransport({command:process.execPath,args:[join(extracted,'server/index.cjs')],cwd:extracted,env:{QQ_MCP_ORIGIN:origin,QQ_MCP_TOKEN:key},stderr:'pipe'});let logs='';transport.stderr?.on('data',b=>logs+=b);
 const client=new Client({name:'fresh-guide-fixture-client',version:'1'});await client.connect(transport);const pid=transport.pid!;assert.equal(client.getServerVersion()?.version,'0.1.0');
 try{
  const tools=await client.listTools();assert.equal(tools.tools.length,19);assert(tools.tools.some(t=>t.name==='qq_get_guide'));assert(client.getInstructions()?.includes('qq_get_guide'));
  const start=content(await client.callTool({name:'qq_get_guide',arguments:{}}));assert(start.markdown.length<2200);assert.equal(start.sha256,guideHash);assert.equal(start.nextOffset,null);assert(!start.markdown.includes(foreign.title));
  const index=content(await client.callTool({name:'qq_get_guide',arguments:{section:'index'}}));assert.equal(index.sections.length,guideSections.length);
  let text='',offset=0;do{const part=content(await client.callTool({name:'qq_get_guide',arguments:{section:'writing',offset,limit:300}}));assert(part.markdown.length<=300);text+=part.markdown;offset=part.nextOffset;}while(offset!==null);
  assert.equal(text,guideSections.find(s=>s.id==='writing')!.markdown);
  const resources=await client.listResources();assert.equal(resources.resources.length,guideSections.length+1);const read=await client.readResource({uri:'qq-guide://sections/writing'});assert((read.contents[0] as any).text.endsWith(text));
  for(const args of [{section:'../../secret'},{section:'writing',offset:999999},{limit:12001},{projectId:project.id}])assert((await client.callTool({name:'qq_get_guide',arguments:args})).isError);
  const projects=content(await client.callTool({name:'qq_list_projects',arguments:{}})).data;assert.deepEqual(projects.items.map((p:any)=>p.id),[project.id]);
  assert.equal(content(await client.callTool({name:'qq_get_project',arguments:{projectId:project.id}})).data.title,project.title);
  for(const id of [sibling.id,foreign.id])assert((await client.callTool({name:'qq_get_project',arguments:{projectId:id}})).isError);
  assert((await client.callTool({name:'qq_list_chapters',arguments:{projectId:project.id}})).isError);
  assert((await client.callTool({name:'qq_update_outline_item',arguments:{projectId:project.id,itemId:1,revision:0,patch:{title:'Denied'}}})).isError);
 }finally{await client.close();}assert.throws(()=>process.kill(pid,0));assert.equal(logs,'');
});
test('local setup check performs handshake and safe call; disabled and revoked access fail',async()=>{
 let r=await request('/test','POST',{key});assert.equal(r.status,200);let result=await r.json();assert.equal(result.toolCount,19);assert.equal(result.hasVisibleProject,true);assert(!JSON.stringify(result).includes(key));assert(!JSON.stringify(result).includes(project.title));
 await settings({projectIds:[]});r=await request('/test','POST',{key});assert.equal(r.status,200);assert.equal((await r.json()).hasVisibleProject,false);
 await settings({enabled:false});r=await request('/test','POST',{key});assert.equal(r.status,409);assert.equal((await r.json()).code,'ACCESS_DISABLED');
 r=await request('/test','POST',{key,command:'arbitrary'});assert.equal(r.status,400);
 await request('/key','DELETE');r=await request('/test','POST',{key});assert.equal(r.status,409);assert.equal((await r.json()).code,'KEY_INVALID');
});
test('portable startup rejects missing configuration without exposing values',async()=>{
 const secret='fictional-invalid-secret';const p=spawn(process.execPath,[join(extracted,'server/index.cjs')],{cwd:extracted,env:{QQ_MCP_TOKEN:secret},stdio:['pipe','pipe','pipe']});let out='',err='';p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>err+=b);p.stdin.end();const [code]=await once(p,'exit');assert.equal(code,1);assert.equal(out,'');assert(!err.includes(secret));assert(!err.includes(extracted));
});

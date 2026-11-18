import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Express, Request, RequestHandler } from 'express';
import { z } from 'zod';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { requireUser } from './auth';
import type { IStorage } from './storage';
import { agentFail } from './agent-operations';
import { guideMarkdown, guideVersion } from './mcp/guide';
const executable=resolve('dist/mcp.js');
const bundle=resolve('dist/quantum-quill.mcpb');
const handler=(fn:(req:Request,res:any)=>Promise<unknown>):RequestHandler=>(req,res,next)=>{Promise.resolve(fn(req,res)).catch(next);};
// Never derive a credential destination from Host, proxy or arbitrary user input.
function localOrigin(req:Request){
 const address=req.socket.localAddress;
 if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(address||'')||!req.socket.localPort)agentFail(400,'LOCAL_ADDRESS_REQUIRED','Open QQ at its numeric loopback address.');
 return `http://${address==='::1'?'[::1]':'127.0.0.1'}:${req.socket.localPort}`;
}
export function registerAgentSetupRoutes(app:Express,storage:IStorage,local:RequestHandler){
 const running=new Set<number>();
 app.get('/api/agent-settings/setup',local,requireUser,handler(async(req,res)=>{
  const origin=localOrigin(req),base=`[mcp_servers.quantum_quill]\ncommand = ${JSON.stringify(process.execPath)}\nargs = [${JSON.stringify(executable)}]\ndefault_tools_approval_mode = "prompt"\n`;
  res.json({origin,executableAvailable:existsSync(executable),bundleAvailable:existsSync(bundle),guideVersion,
   codexConfig:base+`\n[mcp_servers.quantum_quill.env]\nQQ_MCP_ORIGIN = ${JSON.stringify(origin)}\nQQ_MCP_TOKEN = "<PASTE_KEY_PRIVATELY_HERE>"\n`,
   codexEnvironmentConfig:base+`env_vars = ["QQ_MCP_TOKEN"]\n\n[mcp_servers.quantum_quill.env]\nQQ_MCP_ORIGIN = ${JSON.stringify(origin)}\n`});
 }));
 app.get('/api/agent-settings/bundle',local,requireUser,handler(async(_req,res)=>{
  if(!existsSync(bundle))agentFail(409,'BUILD_REQUIRED','The local extension has not been built. Run npm run build:mcp in the QQ checkout.');
  res.download(bundle,'quantum-quill.mcpb');
 }));
 app.get('/api/agent-settings/guide',local,requireUser,handler(async(_req,res)=>{res.type('text/markdown').attachment('QQ_FIELD_GUIDE.md').send(guideMarkdown);}));
 app.post('/api/agent-settings/test',local,requireUser,handler(async(req,res)=>{
  const {key}=z.object({key:z.string().regex(/^qqmcp_[1-9][0-9]*_[A-Za-z0-9_-]{43}$/)}).strict().parse(req.body),owner=req.user!.id;
  const access=await storage.getAgentAccess(owner),received=createHash('sha256').update(key).digest('hex');
  if(Number(key.split('_')[1])!==owner||!access.tokenHash||access.tokenHash.length!==received.length||!timingSafeEqual(Buffer.from(received),Buffer.from(access.tokenHash)))agentFail(409,'KEY_INVALID','The key is missing, replaced or revoked. Use your current QQ connection key.');
  if(running.has(owner))agentFail(409,'TEST_RUNNING','A local setup test is already running.');
  if(!existsSync(executable))agentFail(409,'BUILD_REQUIRED','The local MCP executable has not been built. Run npm run build:mcp in the QQ checkout.');
  const origin=localOrigin(req),client=new Client({name:'qq-local-setup-check',version:'1.0'});
  const transport=new StdioClientTransport({command:process.execPath,args:[executable],env:{QQ_MCP_ORIGIN:origin,QQ_MCP_TOKEN:key},stderr:'pipe'});
  // Do not retain subprocess logs: they must never become a source of credentials or story content.
  transport.stderr?.on('data',()=>{});running.add(owner);
  let timeout:ReturnType<typeof setTimeout>|undefined;
  let result:{toolCount:number;hasVisibleProject:boolean;checkedAt:string};
  try{
   result=await Promise.race([(async()=>{
    await client.connect(transport);
    const tools=await client.listTools();
    const guide=await client.callTool({name:'qq_get_guide',arguments:{limit:500}});
    if(guide.isError)throw new Error('GUIDE_UNAVAILABLE');
    const projects=await client.callTool({name:'qq_list_projects',arguments:{limit:1}});
    if(projects.isError){const text=JSON.stringify(projects.content);throw new Error(text.includes('ACCESS_DISABLED')?'ACCESS_DISABLED':text.includes('KEY_INVALID')?'KEY_INVALID':'PROJECT_READ_FAILED');}
    const data=projects.structuredContent as {data?:{items?:unknown[]}}|undefined;
    return {toolCount:tools.tools.length,hasVisibleProject:!!data?.data?.items?.length,checkedAt:new Date().toISOString()};
   })(),new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(new Error('TEST_TIMEOUT')),15000);})]);
  }catch(e){
   const code=e instanceof Error?e.message:'';
   const message=code==='ACCESS_DISABLED'?'Agent access is disabled. Enable it and save permissions.':code==='KEY_INVALID'?'The key was replaced or revoked. Use the current connection key.':code==='TEST_TIMEOUT'?'The local test timed out. Check that QQ is running and try again.':'The local test could not complete. Rebuild the MCP executable and check the local app.';
   agentFail(409,['ACCESS_DISABLED','KEY_INVALID','TEST_TIMEOUT'].includes(code)?code:'LOCAL_TEST_FAILED',message);
  }finally{if(timeout)clearTimeout(timeout);await client.close().catch(()=>{});await transport.close().catch(()=>{});running.delete(owner);}
  res.json({...result,message:'Local MCP handshake and read-only project-list call passed. External client connection is not verified.'});
 }));
}

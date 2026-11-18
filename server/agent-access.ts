import { registerAgentSetupRoutes } from "./agent-setup";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Express, Request, RequestHandler } from "express";
import { z } from "zod";
import { requireUser } from "./auth";
import type { IStorage } from "./storage";
import { agentId, publicAgentSettings, saveAgentSettingsSchema } from "@shared/agent-access";
import { agentTools } from "@shared/agent-tools";
import { agentFail, runAgentOperation } from "./agent-operations";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const handler = (fn: (req: Request, res: any) => Promise<unknown>): RequestHandler => (req,res,next)=>{Promise.resolve(fn(req,res)).catch(next);};
const requestSchema=z.object({name:z.string().max(100),arguments:z.record(z.unknown()).default({})}).strict();
const MAX_BYTES=1024*1024;
export function registerAgentRoutes(app: Express, storage: IStorage, production: boolean) {
  // No hosted agent gateway, even behind a loopback reverse proxy.
  const local: RequestHandler=(req,_res,next)=>{
    if(production || !["127.0.0.1","::1","::ffff:127.0.0.1"].includes(req.socket.remoteAddress || ""))return next(Object.assign(new Error("Agent access is available only in the local QQ app."),{status:403,code:"LOCAL_ONLY"}));
    next();
  };
  registerAgentSetupRoutes(app,storage,local);
  app.get('/api/agent-settings',local,requireUser,handler(async(req,res)=>res.json(publicAgentSettings(await storage.getAgentAccess(req.user!.id)))));
  app.put('/api/agent-settings',local,requireUser,handler(async(req,res)=>{
    const input=saveAgentSettingsSchema.parse(req.body),owner=req.user!.id;
    const result=await storage.withAgentLock(owner,async s=>{
      const current=await s.getAgentAccess(owner);
      if(current.revision!==input.revision)agentFail(409,"SETTINGS_CHANGED","Settings changed in another window. Reload them before saving.");
      for(const id of input.projectIds){const p=await s.getProject(id);if(!p||p.userId!==owner||p.isTrashed)agentFail(400,"PROJECT_UNAVAILABLE","Choose only available projects from this account.");}
      const next={...current,...input,projectIds:[...new Set(input.projectIds)].sort((a,b)=>a-b),revision:current.revision+1};
      await s.putAgentAccess(next);return publicAgentSettings(next);
    });res.json(result);
  }));
  app.post('/api/agent-settings/key',local,requireUser,handler(async(req,res)=>{
    const {revision}=z.object({revision:z.number().int().nonnegative()}).strict().parse(req.body),owner=req.user!.id;
    const result=await storage.withAgentLock(owner,async s=>{
      const current=await s.getAgentAccess(owner);
      if(current.revision!==revision)agentFail(409,"SETTINGS_CHANGED","Settings changed. Reload them before replacing the key.");
      const key=`qqmcp_${owner}_${randomBytes(32).toString('base64url')}`;
      const next={...current,tokenHash:hash(key),revision:current.revision+1};await s.putAgentAccess(next);
      return {settings:publicAgentSettings(next),key};
    });res.json(result);
  }));
  app.delete('/api/agent-settings/key',local,requireUser,handler(async(req,res)=>{
    const result=await storage.withAgentLock(req.user!.id,async s=>{const current=await s.getAgentAccess(req.user!.id);const next={...current,tokenHash:null,enabled:false,revision:current.revision+1};await s.putAgentAccess(next);return publicAgentSettings(next);});res.json(result);
  }));
  // Bearer keys are recognized ONLY here, never as browser sessions or for Settings.
  app.post('/api/mcp/call',local,handler(async(req,res)=>{
    const raw=req.get('authorization') || '',match=/^Bearer (qqmcp_([1-9][0-9]*)_[A-Za-z0-9_-]{43})$/.exec(raw);
    if(!match)agentFail(401,"KEY_INVALID","MCP key missing or revoked.");
    const owner=agentId.parse(Number(match[2]));
    const result=await storage.withAgentLock(owner,async s=>{
      const access=await s.getAgentAccess(owner),received=hash(match[1]);
      if(!access.tokenHash||access.tokenHash.length!==received.length||!timingSafeEqual(Buffer.from(access.tokenHash),Buffer.from(received)))agentFail(401,"KEY_INVALID","MCP key missing or revoked.");
      if(!access.enabled)agentFail(403,"ACCESS_DISABLED","Agent access is disabled in QQ Settings.");
      if(Buffer.byteLength(JSON.stringify(req.body))>MAX_BYTES)agentFail(413,"REQUEST_TOO_LARGE","Request exceeds the MCP size limit.");
      const {name,arguments:args}=requestSchema.parse(req.body),tool=Object.hasOwn(agentTools,name)?agentTools[name]:undefined;
      if(!tool)agentFail(400,"UNKNOWN_TOOL","Unknown tool.");
      const a=tool.schema.parse(args);
      if(tool.write&&!access.allowWrites)agentFail(403,"WRITES_DISABLED","Editing is disabled in QQ Settings.");
      if(tool.manuscript&&!access.allowManuscript)agentFail(403,"MANUSCRIPT_DISABLED","Manuscript access is disabled in QQ Settings.");
      if(name!=='qq_list_projects'){
        const p=await s.getProject(a.projectId);
        if(!p||p.userId!==owner||p.isTrashed||(!access.allProjects&&!access.projectIds.includes(p.id)))agentFail(403,"PROJECT_DENIED","This project is unavailable or not permitted in QQ Settings.");
      }
      const data=await runAgentOperation(s,owner,name,a);
      // Check before transaction commit. Mutations return small receipts, never a large record.
      const result={projectId:a.projectId??null,data:tool.write?{id:(data as {id:number}).id,revision:(data as {revision:number}).revision,projectId:a.projectId,...('replayed' in data?{replayed:data.replayed}:{})}:data};
      if(Buffer.byteLength(JSON.stringify(result))>MAX_BYTES)agentFail(413,"RESULT_TOO_LARGE","Result exceeds the MCP size limit. Read this record in QQ.");
      return result;
    });
    res.json(result);
  }));
}

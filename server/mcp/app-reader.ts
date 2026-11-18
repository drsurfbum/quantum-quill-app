import { Agent, request, type IncomingMessage } from "node:http";
export const MAX_RESULT_BYTES = 1024 * 1024;
export class ReadError extends Error {}
export interface McpConfig { origin: string; token: string }
export function readConfig(env: NodeJS.ProcessEnv): McpConfig {
  try {
    const origin=env.QQ_MCP_ORIGIN || 'http://127.0.0.1:5055';
    if(!/^http:\/\/(127\.0\.0\.1|\[::1\]):[1-9][0-9]{0,4}$/.test(origin))throw new Error();
    new URL(origin);
    const token=env.QQ_MCP_TOKEN || '';
    if(!/^qqmcp_[1-9][0-9]*_[A-Za-z0-9_-]{43}$/.test(token))throw new Error();
    return {origin,token};
  } catch { throw new ReadError('Invalid MCP configuration. Set a numeric loopback origin and a private QQ_MCP_TOKEN from local QQ Settings.'); }
}
const errors:Record<string,string>={
  KEY_INVALID:'MCP key missing or revoked. Create a key in local QQ Settings.', ACCESS_DISABLED:'Agent access is disabled in QQ Settings.',
  WRITES_DISABLED:'Editing is disabled in QQ Settings.', MANUSCRIPT_DISABLED:'Manuscript access is disabled in QQ Settings.',
  PROJECT_DENIED:'This project is unavailable or not permitted in QQ Settings.', RECORD_UNAVAILABLE:'Record unavailable in this project.',
  REVISION_CONFLICT:'This record changed. Read its current revision and review changes before retrying.',
  REQUEST_REUSED:'This request ID was already used with different arguments.', CHAPTER_PROSE_PROTECTED:'Write prose in the scenes of this chapter.',
  RESULT_TOO_LARGE:'Result exceeds the MCP size limit. Read this record in QQ.', REQUEST_TOO_LARGE:'Request exceeds the MCP size limit.',
  VALIDATION_ERROR:'Invalid arguments or unsupported fields.', LOCAL_ONLY:'MCP access is available only in the local QQ app.',
};
/** Dedicated local gateway: no session cookies, arbitrary URLs, methods or environment proxies. */
export class AppReader {
  constructor(private readonly config:McpConfig){}
  async call(name:string,args:Record<string,unknown>):Promise<Record<string,unknown>> {
    const agent=new Agent({keepAlive:false});
    try {
      const body=JSON.stringify({name,arguments:args});
      if(Buffer.byteLength(body)>MAX_RESULT_BYTES)throw new ReadError(errors.REQUEST_TOO_LARGE);
      const response=await new Promise<IncomingMessage>((resolve,reject)=>{
        const req=request(`${this.config.origin}/api/mcp/call`,{method:'POST',agent,signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${this.config.token}`,'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),Accept:'application/json'}},resolve);
        req.on('error',reject);req.end(body);
      });
      try {
        if(!response.headers['content-type']?.includes('application/json'))throw new Error();
        const chunks:Buffer[]=[];let size=0;
        for await(const chunk of response){size+=chunk.length;if(size>MAX_RESULT_BYTES)throw new ReadError(errors.RESULT_TOO_LARGE);chunks.push(chunk);}
        const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if(response.statusCode!==200){const code=typeof value.code==='string'&&Object.hasOwn(errors,value.code)?value.code:'REQUEST_FAILED';throw new ReadError(`${code}: ${errors[code] || 'QQ rejected this request. Review the record and permissions in QQ.'}`);}
        if(!value||typeof value!=='object'||!Object.hasOwn(value,'data')||value.projectId!==(args.projectId??null))throw new Error();
        return value;
      } finally {response.destroy();}
    } catch(error){if(error instanceof ReadError)throw error;throw new ReadError('Local QQ request failed. A write outcome may be unknown: read the current record before retrying; retry creation with the identical request ID and arguments.');}
    finally{agent.destroy();}
  }
}

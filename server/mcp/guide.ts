import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
// Builds inline the canonical Markdown, so a packaged client needs no checkout.
declare const __QQ_FIELD_GUIDE__: string;
export const guideMarkdown = typeof __QQ_FIELD_GUIDE__ === 'string' ? __QQ_FIELD_GUIDE__ : readFileSync(resolve('docs/QQ_FIELD_GUIDE.md'),'utf8');
export const guideVersion = /^Guide version: (.+)$/m.exec(guideMarkdown)?.[1] || 'unknown';
export const guideHash = createHash('sha256').update(guideMarkdown).digest('hex');
const matches=[...guideMarkdown.matchAll(/^<!-- section: ([a-z0-9-]+) -->\n## (.+)$/gm)];
export const guideSections=matches.map((m,i)=>({id:m[1],title:m[2],markdown:guideMarkdown.slice(m.index!,matches[i+1]?.index??guideMarkdown.length).replace(/^<!--[^\n]*-->\n/,'').trim()}));
if(!guideSections.length||new Set(guideSections.map(s=>s.id)).size!==guideSections.length||guideSections[0].id!=='start')throw new Error('Invalid field guide structure');
export const guideInput=z.object({section:z.string().max(80).default('start'),offset:z.number().int().min(0).max(1000000).default(0),limit:z.number().int().min(1).max(12000).default(6000)}).strict();
export function readGuide(input:unknown){
 const a=guideInput.parse(input);
 if(a.section==='index')return {version:guideVersion,sha256:guideHash,sections:guideSections.map(({id,title,markdown})=>({id,title,characters:markdown.length,uri:`qq-guide://sections/${id}`}))};
 const section=guideSections.find(s=>s.id===a.section);if(!section)throw new Error('Unknown guide section. Request section index.');
 if(a.offset>section.markdown.length)throw new Error('Guide offset exceeds this section.');
 const end=Math.min(section.markdown.length,a.offset+a.limit);
 return {version:guideVersion,sha256:guideHash,section:section.id,title:section.title,markdown:section.markdown.slice(a.offset,end),nextOffset:end<section.markdown.length?end:null};
}
export function registerGuide(server:McpServer){
 server.registerTool('qq_get_guide',{description:'Start here: read QQ’s versioned field guide without project data. Omit arguments for a short introduction; section=index lists task recipes. Fetch only relevant sections and follow nextOffset. Documentation is not permission to edit.',inputSchema:guideInput,annotations:{readOnlyHint:true,idempotentHint:true,openWorldHint:false}},async args=>{
  try{const structuredContent=readGuide(args);return {content:[{type:'text' as const,text:JSON.stringify(structuredContent)}],structuredContent};}
  catch{return {isError:true,content:[{type:'text' as const,text:'Invalid guide request. Use section=index and a valid section/offset.'}]};}
 });
 server.registerResource('qq-guide-index','qq-guide://index',{title:'Quantum Quill field guide — contents',mimeType:'application/json'},async uri=>({contents:[{uri:uri.href,mimeType:'application/json',text:JSON.stringify(readGuide({section:'index'}))}]}));
 for(const section of guideSections)server.registerResource(`qq-guide-${section.id}`,`qq-guide://sections/${section.id}`,{title:section.title,mimeType:'text/markdown'},async uri=>({contents:[{uri:uri.href,mimeType:'text/markdown',text:`Guide version: ${guideVersion}\n\n${section.markdown}`}]}));
}

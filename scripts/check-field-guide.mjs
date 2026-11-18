import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
const md=await readFile('docs/QQ_FIELD_GUIDE.md','utf8'),coverage=JSON.parse(await readFile('docs/QQ_FIELD_GUIDE_COVERAGE.json','utf8'));
assert(md.includes(`Guide version: ${coverage.guideVersion}\n`),'Guide and coverage versions differ');
const markers=[...md.matchAll(/^<!-- section: ([a-z0-9-]+) -->\n## (.+)$/gm)];
const sections=Object.fromEntries(markers.map((m,i)=>[m[1],md.slice(m.index,markers[i+1]?.index??md.length)]));
assert.equal(Object.keys(sections).length,markers.length,'Duplicate section');
assert.deepEqual(Object.keys(sections).sort(),Object.keys(coverage.sections).sort(),'Recipe coverage map differs');
assert(sections.start.length<2200,'First entry should stay short');
for(const [id,text] of Object.entries(sections)){
 assert(text.length<=12000,`Section ${id} too long: split it`);
 assert(text.includes(`<a id="${id}"></a>`),`Missing direct Markdown anchor ${id}`);
 for(const path of coverage.sections[id])await access(path);
}
const app=await readFile('client/src/App.tsx','utf8'),routes=[...app.matchAll(/<\w*Route path="([^"]+)"/g)].map(m=>m[1]);
assert.deepEqual(routes.sort(),Object.keys(coverage.routes).sort(),'Review guide coverage for changed routes');
for(const id of Object.values(coverage.routes))assert(sections[id]);
const tools=[...((await readFile('shared/agent-tools.ts','utf8')).matchAll(/^  (qq_[a-z_]+):/gm))].map(m=>m[1]);
assert(tools.length>0,'Tool extraction failed');tools.push('qq_get_guide');
const documented=[...sections.mcp.matchAll(/^\| `(qq_[a-z_]+)`/gm)].map(m=>m[1]);
assert.deepEqual(documented.sort(),tools.sort(),'Update exact MCP tool table');
assert(!tools.some(t=>t.startsWith('qq_review_')),'Optional plot review needs a deliberate guide baseline update');
assert(!/qqmcp_[0-9]+_[A-Za-z0-9_-]{43}|\/Users\/|\/home\//.test(md),'Portable guide contains credential or machine path');
console.log(`Field guide verified: ${markers.length} bounded sections, ${routes.length} routes, ${tools.length} tools.`);

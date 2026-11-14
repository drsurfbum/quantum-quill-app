import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import JSZip from 'jszip';
const guide=await readFile(new URL('../docs/QQ_FIELD_GUIDE.md',import.meta.url),'utf8');
const define={__QQ_FIELD_GUIDE__:JSON.stringify(guide)};
await mkdir('dist',{recursive:true});
await build({entryPoints:['server/mcp/index.ts'],platform:'node',packages:'external',bundle:true,format:'esm',outfile:'dist/mcp.js',define});
// Self-contained entry point: no install step, network fetch or repository needed by the client.
const packed=await build({entryPoints:['server/mcp/index.ts'],platform:'node',bundle:true,format:'cjs',outfile:'dist/mcp-bundle.cjs',define,metafile:true,logOverride:{'empty-import-meta':'silent'}});
const zip=new JSZip(),manifest=await readFile('mcp/manifest.json','utf8');
zip.file('manifest.json',manifest);zip.file('server/index.cjs',await readFile('dist/mcp-bundle.cjs'));
zip.file('QQ_FIELD_GUIDE.md',guide);zip.file('package.json',JSON.stringify({name:'quantum-quill-local',version:JSON.parse(manifest).version,private:true,type:'commonjs'}));
// Carry licenses for dependencies actually included in the bundled executable.
const packages=new Set();
for(const input of Object.keys(packed.metafile.inputs)){
 const m=/^(node_modules\/(?:@[^/]+\/)?[^/]+)/.exec(input);if(m)packages.add(m[1]);
}
const notices=[];
for(const dir of [...packages].sort()){
 const pkg=JSON.parse(await readFile(join(dir,'package.json'),'utf8'));notices.push(`${pkg.name} ${pkg.version} (${pkg.license||'see package license'})`);
 for(const name of ['LICENSE','LICENSE.md','LICENSE.txt','license','license.md','license.txt','COPYING'])try{zip.file(`licenses/${pkg.name.replaceAll('/','_')}/${name}`,await readFile(join(dir,name)));break;}catch{}
}
zip.file('THIRD_PARTY_NOTICES.txt',notices.join('\n')+'\n');
zip.file('README.txt','Local-only Quantum Quill MCP. Install through a supported desktop client; no key is included. QQ must already be running. Create and scope a key in QQ Settings. Guide is bundled. No model calls or public service.\n');
await writeFile('dist/quantum-quill.mcpb',await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
await writeFile('dist/QQ_FIELD_GUIDE.md',guide);

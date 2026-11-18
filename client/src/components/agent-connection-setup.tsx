import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
type Setup={origin:string;executableAvailable:boolean;bundleAvailable:boolean;guideVersion:string;codexConfig:string;codexEnvironmentConfig:string};
export function AgentConnectionSetup({newKey,dirty}:{newKey:string;dirty:boolean}){
 const [setup,setSetup]=useState<Setup>(),[client,setClient]=useState('codex'),[privateKey,setPrivateKey]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{let active=true;apiRequest('GET','/api/agent-settings/setup').then(r=>r.json()).then(s=>{if(active)setSetup(s);}).catch(()=>{if(active)setError('Local setup could not load. Check the local QQ app.');});return()=>{active=false;};},[]);
 useEffect(()=>{setNotice('');setPrivateKey('');},[newKey]);
 useEffect(()=>{setNotice('');},[dirty]);
 const config=client==='codex-env'?setup?.codexEnvironmentConfig:setup?.codexConfig;
 async function download(kind:'bundle'|'guide'){
  setError('');try{const response=await apiRequest('GET',`/api/agent-settings/${kind}`),url=URL.createObjectURL(await response.blob()),a=document.createElement('a');a.href=url;a.download=kind==='bundle'?'quantum-quill.mcpb':'QQ_FIELD_GUIDE.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice(kind==='bundle'?'Extension downloaded. Install it in Claude Desktop and enter your key privately.':'Field guide downloaded.');}catch{setError('Download failed. Check that the local MCP build is available.');}
 }
 async function copy(){setError('');try{await navigator.clipboard.writeText(config||'');setNotice('Setup copied without a key. Add your key privately in the client.');}catch{setError('Clipboard access failed. Open Show configuration and copy it manually.');}}
 async function test(){setBusy(true);setError('');setNotice('');try{const result=await(await apiRequest('POST','/api/agent-settings/test',{key:newKey||privateKey})).json();setNotice(`Local test passed: ${result.toolCount} tools available. ${result.hasVisibleProject?'A permitted project is visible.':'No permitted projects are visible; select a project and save permissions.'} External client connection is not verified.`);}catch(e){setError(e instanceof Error?e.message:'The local test failed.');}finally{setBusy(false);setPrivateKey('');}}
 return <section className="border-t pt-4 space-y-3" aria-label="Connect your assistant">
  <div><h3 className="font-medium">Connect your assistant</h3><p className="text-sm text-muted-foreground mt-1">Start with one project and read-only access. Save permissions, create a key above, then choose your local client.</p></div>
  <Label htmlFor="agent-client">Assistant client</Label>
  <select id="agent-client" className="w-full border rounded-md bg-background px-3 py-2 text-sm" value={client} onChange={e=>{setClient(e.target.value);setError('');setNotice('');}}>
   <option value="claude">Claude Desktop · extension preview</option><option value="codex">Codex · local app, CLI or IDE</option><option value="codex-env">Codex CLI · environment key</option>
  </select>
  {setup&&<>
   {client==='claude'?<><p className="text-sm text-muted-foreground">Preview: the portable package is tested, but installation and tool use inside Claude Desktop have not yet been verified.</p><ol className="list-decimal pl-5 text-sm space-y-2"><li>Download the extension. In Claude Desktop, open Settings → Desktop app → Extensions → Manage. In Advanced settings, choose Install Extension… and select the file. Older clients use Settings → Extensions.</li><li>Enter the local QQ address <code className="break-all">{setup.origin}</code> and your connection key in the extension’s private configuration. Claude stores sensitive extension settings in OS secure storage.</li><li>Keep QQ running. Start a new chat and ask: “Read the QQ field guide introduction, then list my permitted project titles.”</li></ol><Button variant="outline" disabled={!setup.bundleAvailable} onClick={()=>void download('bundle')}>Download Claude extension</Button><p className="text-xs text-muted-foreground">No separate Node install is needed for the extension. Claude may require a restart or administrator approval. This download does not install or connect it for you.</p></>:
   <><ol className="list-decimal pl-5 text-sm space-y-2"><li>Copy setup. In your local <code>~/.codex/config.toml</code>, add the block once. The executable paths are already filled in; replace an existing quantum_quill block instead of duplicating it.</li><li>{client==='codex-env'?<>Set <code>QQ_MCP_TOKEN</code> privately in the same terminal before launching Codex. For a hidden prompt, use <code className="break-all">read -r -s QQ_MCP_TOKEN; export QQ_MCP_TOKEN; codex</code>. A separately launched desktop app may not inherit this environment.</>:<>Replace <code>&lt;PASTE_KEY_PRIVATELY_HERE&gt;</code> with your key in that local file. Keep the file private: it will contain the key. Copied setup never includes your key.</>}</li><li>Restart the local Codex client. In the CLI, use <code>/mcp</code> to check tools. Ask: “Read the QQ field guide introduction, then list my permitted project titles.”</li></ol><Button variant="outline" disabled={!setup.executableAvailable} onClick={()=>void copy()}>Copy setup</Button><details><summary className="cursor-pointer text-sm">Show configuration</summary><pre className="text-xs border rounded p-3 mt-2 overflow-auto" tabIndex={0} aria-label="Client configuration without secret">{config}</pre></details></>}
   {(!setup.executableAvailable||!setup.bundleAvailable)&&<p className="text-sm text-destructive">Local build missing. In the QQ checkout, run <code>npm run build:mcp</code>, then reopen Settings.</p>}
   <div className="rounded-md border p-3 space-y-2"><h4 className="text-sm font-medium">Check QQ before opening your client</h4><p className="text-xs text-muted-foreground">This starts a disposable MCP process and reads the permitted project list. It does not edit writing or verify an external client connection.</p>
    {!newKey&&<><Label htmlFor="agent-test-key" className="text-sm">Current connection key (used once)</Label><Input id="agent-test-key" type="password" autoComplete="off" value={privateKey} onChange={e=>setPrivateKey(e.target.value)} placeholder="Paste privately to test"/></>}
    <Button variant="outline" disabled={busy||dirty||!setup.executableAvailable||!(newKey||privateKey)} onClick={()=>void test()}>{busy?'Testing local setup…':'Test local setup'}</Button>{dirty&&<p className="text-xs text-muted-foreground">Save permissions before testing.</p>}
   </div>
   <Button variant="link" className="px-0" onClick={()=>void download('guide')}>Download field guide (.md)</Button>
  </>}
  <p className="text-xs text-muted-foreground">Local desktop clients only. Claude web, Codex cloud and remote browsers cannot reach this Mac’s local MCP through this setup. Your assistant chooses its model and may send requested content to its provider. No hosted endpoint or provider key is required by QQ.</p>
  {error&&<p role="alert" className="text-sm text-destructive border rounded p-3">{error}</p>}{notice&&<p role="status" className="text-sm border rounded p-3">{notice}</p>}
 </section>;
}

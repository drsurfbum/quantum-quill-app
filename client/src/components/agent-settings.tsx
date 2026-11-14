import { useEffect, useState } from 'react';
import { Settings, Shield, Copy, KeyRound } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest, ApiError } from '@/lib/queryClient';
import type { AgentSettings } from '@shared/agent-access';
import type { Project } from '@shared/schema';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import ThemeToggle from './ui/theme-toggle';

export function SettingsButton(){return <Button variant="ghost" size="sm" aria-label="Settings" title="Settings" onClick={()=>window.dispatchEvent(new Event('qq:settings'))}><Settings className="h-4 w-4"/></Button>;}
function SettingsForAccount({userId}:{userId:number}){
  const [open,setOpen]=useState(false),[value,setValue]=useState<AgentSettings>(),[saved,setSaved]=useState<AgentSettings>();
  const [projects,setProjects]=useState<Project[]>([]),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false);
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[key,setKey]=useState('');
  const dirty=JSON.stringify(value)!==JSON.stringify(saved);
  useEffect(()=>{const show=()=>setOpen(true);window.addEventListener('qq:settings',show);return()=>window.removeEventListener('qq:settings',show);},[]);
  useEffect(()=>{
    if(!open){setKey('');setNotice('');return;}
    let active=true;setLoading(true);setValue(undefined);setSaved(undefined);setError('');
    Promise.all([apiRequest('GET','/api/agent-settings').then(r=>r.json()),apiRequest('GET','/api/projects').then(r=>r.json())])
      .then(([settings,rows])=>{if(active){setValue(settings);setSaved(settings);setProjects(rows.filter((p:Project)=>!p.isTrashed));}})
      .catch(e=>{if(active)setError(e instanceof ApiError&&e.code==='LOCAL_ONLY'?'Agent settings are available in your local QQ app. Hosted access is not enabled.':'Settings could not load. Check your local app and apply the agent-access database migration if needed.');})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[open,userId]);
  const change=(patch:Partial<AgentSettings>)=>{setValue(v=>v&&({...v,...patch}));setNotice('');};
  async function save(){
    if(!value)return;setBusy(true);setError('');setNotice('');
    try{const {hasKey:_,...body}=value;const next=await(await apiRequest('PUT','/api/agent-settings',body)).json();setValue(next);setSaved(next);setNotice('Permissions saved. Subsequent agent operations use these settings.');}
    catch(e){setError(e instanceof ApiError&&e.code==='SETTINGS_CHANGED'?'Settings changed in another window. Close and reopen Settings before saving.':e instanceof Error?e.message:'Could not save permissions.');}finally{setBusy(false);}
  }
  async function manageKey(revoke=false){
    if(!saved)return;setBusy(true);setError('');setNotice('');setKey('');
    try{const result=await(await apiRequest(revoke?'DELETE':'POST','/api/agent-settings/key',revoke?undefined:{revision:saved.revision})).json();
      const next=revoke?result:result.settings;setValue(next);setSaved(next);if(!revoke)setKey(result.key);
      setNotice(revoke?'Key revoked and agent access disabled.':'New key created. Any previous key is revoked. Store this key privately; it is shown only until you close Settings.');
    }catch(e){setError(e instanceof Error?e.message:'Could not change the key.');}finally{setBusy(false);}
  }
  async function copy(text:string,label:string){try{await navigator.clipboard.writeText(text);setNotice(`${label} copied.`);}catch{setError('Clipboard access failed. Select and copy the text manually.');}}
  const snippet=JSON.stringify({mcpServers:{'quantum-quill':{command:'/absolute/path/to/node',args:['/absolute/path/to/quantum-quill-app/dist/mcp.js'],env:{QQ_MCP_ORIGIN:window.location.origin,QQ_MCP_TOKEN:'<SET_PRIVATELY_IN_YOUR_MCP_CLIENT>'}}}},null,2);
  return <Dialog open={open} onOpenChange={next=>{if(!busy)setOpen(next);}}><DialogContent className="max-w-4xl w-[calc(100%-1rem)] h-[min(90dvh,850px)] flex flex-col p-0 gap-0 overflow-hidden">
    <DialogHeader className="px-6 pt-6 pb-4 border-b"><DialogTitle className="font-serif text-2xl">Settings</DialogTitle><DialogDescription>Control how external assistants can work with your writing.</DialogDescription></DialogHeader>
    <Tabs defaultValue="agents" orientation="vertical" className="flex flex-col sm:flex-row min-h-0 flex-1">
      <TabsList aria-label="Settings sections" className="sm:w-44 shrink-0 sm:h-full sm:flex-col justify-start rounded-none border-b sm:border-b-0 sm:border-r p-3 gap-1 bg-muted/30">
        <TabsTrigger value="appearance" className="sm:w-full justify-start">Appearance</TabsTrigger><TabsTrigger value="agents" className="sm:w-full justify-start gap-2"><Shield className="h-4 w-4"/>Agents</TabsTrigger>
      </TabsList>
      <TabsContent value="appearance" className="m-0 p-6 flex-1 overflow-auto"><h2 className="text-lg font-semibold mb-3">Appearance</h2><div className="flex items-center justify-between"><span>Light / dark theme</span><ThemeToggle/></div></TabsContent>
      <TabsContent value="agents" className="m-0 flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 space-y-5">
        <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold">Agent access</h2><Badge variant="outline">Local MCP</Badge><Badge variant="secondary">{saved?.enabled?'Access enabled':'Access disabled'}</Badge></div>
        <p className="text-sm text-muted-foreground mt-2">Connect your own assistant to QQ. It can only use the projects and permissions you save here. Your MCP client and model provider may receive the content it requests.</p></div>
        {loading&&<p role="status">Loading settings…</p>}{error&&<p role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}
        {value&&<>
          <fieldset disabled={busy} className="space-y-5">
            <div className="flex items-center justify-between gap-4"><Label htmlFor="agent-enabled" className="text-base">Let agents access my projects</Label><Switch className="data-[state=checked]:bg-foreground" id="agent-enabled" checked={value.enabled} onCheckedChange={enabled=>change({enabled})}/></div>
            <section className="border rounded-lg p-4 space-y-3"><h3 className="font-medium">Projects</h3>
              <label className="flex gap-2 items-start text-sm"><input type="radio" name="agent-scope" checked={!value.allProjects} onChange={()=>change({allProjects:false})}/>Only selected projects</label>
              <label className="flex gap-2 items-start text-sm"><input type="radio" name="agent-scope" checked={value.allProjects} onChange={()=>change({allProjects:true})}/>All my current and future projects</label>
              {value.allProjects?<p className="text-sm text-muted-foreground">Includes new projects you create. Other writers’ projects are never included.</p>:<div className="space-y-2 max-h-40 overflow-y-auto border-t pt-3">{projects.map(p=><div key={p.id} className="flex items-center gap-2"><Checkbox id={`agent-project-${p.id}`} checked={value.projectIds.includes(p.id)} onCheckedChange={checked=>change({projectIds:checked?[...value.projectIds,p.id]:value.projectIds.filter(id=>id!==p.id)})}/><Label htmlFor={`agent-project-${p.id}`} className="text-sm break-words">{p.title}</Label></div>)}{!projects.length&&<p className="text-sm text-muted-foreground">No projects available.</p>}</div>}
            </section>
            <section className="space-y-4"><div className="flex items-start justify-between gap-4"><div><Label htmlFor="agent-write">Allow agents to create and edit</Label><p className="text-sm text-muted-foreground mt-1">Outline and Story Bible. Manuscript editing also requires the switch below. No deletion or project moves.</p></div><Switch className="data-[state=checked]:bg-foreground" id="agent-write" checked={value.allowWrites} onCheckedChange={allowWrites=>change({allowWrites})}/></div>
              <div className="flex items-start justify-between gap-4"><div><Label htmlFor="agent-manuscript">Allow manuscript access</Label><p className="text-sm text-muted-foreground mt-1">Read chapter and scene text. With editing enabled, agents can create and edit chapters and scenes. Updates must match the current revision.</p></div><Switch className="data-[state=checked]:bg-foreground" id="agent-manuscript" checked={value.allowManuscript} onCheckedChange={allowManuscript=>change({allowManuscript})}/></div></section>
            <div className="flex flex-wrap items-center gap-3"><Button onClick={()=>void save()} disabled={!dirty||busy}>{busy?'Saving…':'Save permissions'}</Button><span className="text-xs text-muted-foreground">{dirty?'Unsaved changes':'Saved settings apply to every subsequent call.'}</span></div>
          </fieldset>
          <section className="border-t pt-4 space-y-3"><div className="flex items-center gap-2"><KeyRound className="h-4 w-4"/><h3 className="font-medium">Connection key</h3><Badge variant="outline">{saved?.hasKey?'Key exists':'No key'}</Badge></div>
            <p className="text-sm text-muted-foreground">Keep the key in your trusted MCP client’s private environment. It cannot change these settings. Replacing or revoking it disconnects its authority immediately after this action completes.</p>
            <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>void manageKey()} disabled={busy||dirty}>{saved?.hasKey?'Replace key':'Create key'}</Button>{saved?.hasKey&&<Button variant="destructive" onClick={()=>void manageKey(true)} disabled={busy}>Revoke key & disable</Button>}</div>
            {dirty&&<p className="text-xs text-muted-foreground">Save permissions before creating or replacing a key.</p>}
            {key&&<div className="space-y-2"><Label htmlFor="new-agent-key">New key — store privately now</Label><div className="flex gap-2"><Input id="new-agent-key" type="password" readOnly value={key} autoComplete="off"/><Button variant="outline" onClick={()=>void copy(key,'Key')}>Copy key</Button></div></div>}
          </section>
          <details className="border-t pt-4"><summary className="cursor-pointer font-medium">Local client setup</summary><p className="text-sm text-muted-foreground my-3">Build with <code>npm run build:mcp</code>. Adjust the executable paths below and supply your private key separately. There is no hosted MCP endpoint. The assistant chooses its provider and model in its own settings.</p><pre className="text-xs bg-muted/40 border rounded p-3 overflow-x-auto" tabIndex={0} aria-label="Client configuration without secret">{snippet}</pre><Button variant="outline" size="sm" className="mt-2" onClick={()=>void copy(snippet,'Setup template')}><Copy className="h-4 w-4 mr-2"/>Copy setup template</Button></details>
          <p className="text-xs text-muted-foreground">Connection activity is not reported to this screen. Enabled permissions or an existing key do not mean an assistant is connected. Changes take effect when saved; an operation already in progress may finish first.</p>
        </>}
        {notice&&<p role="status" className="text-sm rounded border p-3">{notice}</p>}
      </TabsContent>
    </Tabs>
    <div className="px-6 py-3 border-t flex justify-end"><Button variant="outline" disabled={busy} onClick={()=>setOpen(false)}>Close</Button></div>
  </DialogContent></Dialog>;
}
export function AgentSettingsDialog(){const {user}=useAuth();return user?<SettingsForAccount key={user.id} userId={user.id}/>:null;}

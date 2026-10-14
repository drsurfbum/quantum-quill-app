jest.mock("wouter",()=>({useLocation:()=>["/project/1/story-bible",jest.fn()],Link:({children,...props}:any)=>require("react").createElement("a",props,children)}));
import "./editor-dom";
import React,{act} from "react";
import {createRoot,Root} from "react-dom/client";
import {Simulate} from "react-dom/test-utils";
import {QueryClientProvider,useQuery} from "@tanstack/react-query";
import {WorkspaceEntry} from "../client/src/components/story-bible/workspace-entry";
import {WorkspaceLibrary} from "../client/src/components/story-bible/workspace-library";
import {queryClient} from "../client/src/lib/queryClient";
import {flushPendingSaves,getSaveQueue} from "../client/src/hooks/use-autosave";
import {DraftJournal} from "../client/src/lib/draft-journal";
import {bibleCategory,bibleDescription,bibleText,defaultBibleFilters,filterBibleEntries} from "../client/src/lib/bible-workspace";
import type {StoryBibleEntry} from "../shared/schema";
let root:Root,container:HTMLDivElement,id=16000,entry:StoryBibleEntry,records:Record<string,any>,fail=false;
const url=()=>`/api/story-bible/${id}`;
const listUrl=()=>`/api/projects/${id}/story-bible`;
const source={version:1,sourceId:'a'.repeat(32),originalMarkdown:'Untouched original notes',notes:[],supportingPages:[]};
const namedButton=(name:string)=>[...container.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===name || b.textContent===name)!;
async function tab(name:string){const button=[...container.querySelectorAll('[role="tab"]')].find(b=>b.textContent===name)!;await act(async()=>{Simulate.mouseDown(button,{button:0,ctrlKey:false});});}
function Harness(){const {data}=useQuery<StoryBibleEntry>({queryKey:[url()]});return data ? React.createElement(WorkspaceEntry,{entry:data,onOpen:jest.fn(),onBack:jest.fn()}) : null;}
async function mount(node:React.ReactNode=React.createElement(Harness)){await act(async()=>root.render(React.createElement(QueryClientProvider,{client:queryClient},node)));}
beforeEach(()=>{
 jest.useFakeTimers();id++;queryClient.clear();window.localStorage.clear();fail=false;
 queryClient.setQueryData(['/api/user'],{id});
 entry={id,projectId:id,title:'The Navigator',entryType:'characters',content:'A navigator with a secret.',metadata:{age:'31',origin:'North Coast',unknown:'keep me',_notionImport:source},revision:0,category:'Major Character',tags:['voyage'],priority:0,isArchived:false} as StoryBibleEntry;
 records={[url()]:entry,[listUrl()]:[entry],[`/api/projects/${id}/relationships`]:[],[`/api/story-bible/${id}/scene-uses`]:[],[`/api/story-bible/${id}/writing-uses`]:[]};
 for(const [key,value] of Object.entries(records))queryClient.setQueryData([key],value);
 jest.spyOn(global,'fetch').mockImplementation(async(path,init)=>{
  const key=String(path);
  if(init?.method==='PUT'){
   if(fail)return new Response(JSON.stringify({message:'Writing changed elsewhere',code:'REVISION_CONFLICT'}),{status:409});
   const {_base,_revision,...patch}=JSON.parse(init.body as string);
   expect(_revision).toBe(records[key].revision);
   records[key]={...records[key],...patch,revision:records[key].revision+1};
  }
  return new Response(JSON.stringify(records[key] || []),{status:200});
 });
 container=document.createElement('div');document.body.append(container);root=createRoot(container);
});
afterEach(async()=>{await act(async()=>{getSaveQueue(url()).discard();root.unmount();await flushPendingSaves();});container.remove();queryClient.clear();jest.restoreAllMocks();jest.useRealTimers();});
it('keeps the same editable fields mounted across views, preserves imported data, and saves the latest draft',async()=>{
 await mount();await tab('Develop');
 const input=container.querySelector<HTMLInputElement>('#age')!;
 await act(async()=>{input.value='32';Simulate.change(input);});
 await tab('Overview');expect(container.querySelector('[role="tabpanel"][data-state="active"]')?.textContent).toContain('32');
 await tab('Source');expect(container.querySelector('[role="tabpanel"][data-state="active"]')?.textContent).toContain('Original source');
 await tab('Connections');await tab('Develop');
 expect(container.querySelector('#age')).toBe(input);expect(input.value).toBe('32');
 await act(async()=>{await flushPendingSaves();});
 expect(records[url()].metadata).toMatchObject({age:'32',unknown:'keep me',_notionImport:source});expect(records[url()].revision).toBe(1);
});
it('keeps conflicted edits recoverable and reviewable while switching sections',async()=>{
 await mount();await tab('Develop');fail=true;
 const input=container.querySelector<HTMLInputElement>('#age')!;
 await act(async()=>{input.value='39';Simulate.change(input);await getSaveQueue(url()).flush();});
 await tab('Connections');await tab('Overview');await tab('Develop');
 expect(container.querySelector('#age')).toBe(input);expect(input.value).toBe('39');expect(container.textContent).toContain('Changes need review');
 const journal=new DraftJournal(()=>window.localStorage),draft=journal.read(id).find(d=>d.url===url())!;
 expect(draft.projectId).toBe(id);expect(draft.patch.metadata).toMatchObject({age:'39',_notionImport:source});expect(journal.read(id+1)).toEqual([]);
});
it('stars through the existing revision queue without rewriting the content or original source',async()=>{
 await mount();await act(async()=>{namedButton('Star entry').click();await flushPendingSaves();});
 expect(records[url()]).toMatchObject({priority:1,content:entry.content,metadata:entry.metadata,revision:1});
});
it('reads all seven types, legacy archive status and meaningful categories without searching source scaffolding',()=>{
 const rows=['characters','groups_races','locations','events','world_elements','details','research'].map((entryType,index)=>({...entry,id:id+index,entryType,title:entryType,content:index>=3 ? JSON.stringify({shortSummary:'A signal',isArchived:index===3}) : entry.content,metadata:{locationType:'spacecraft',_notionImport:{...source,originalMarkdown:'unrelated template'}}} as StoryBibleEntry));
 expect(filterBibleEntries(rows,defaultBibleFilters)).toHaveLength(6);
 expect(filterBibleEntries(rows,{...defaultBibleFilters,archive:'archived'}).map(e=>e.entryType)).toEqual(['events']);
 expect(filterBibleEntries(rows,{...defaultBibleFilters,query:'unrelated template'})).toEqual([]);
 expect(bibleCategory(rows[2])).toBe('Spaceship');expect(bibleDescription(rows[4])).toBe('A signal');
 expect(bibleText('<p>Safe <strong>facts</strong></p><script>dangerous()</script>')).toBe('Safe facts');
});
it('opens an entry from a keyboard-usable library row and keeps all category controls visible',async()=>{
 const onOpen=jest.fn();await mount(React.createElement(WorkspaceLibrary,{entries:[entry],filters:defaultBibleFilters,onFilter:jest.fn(),onOpen,onCreate:jest.fn(),retry:jest.fn()}));
 expect(container.querySelectorAll('[aria-label="Entry types"] button')).toHaveLength(8);
 await act(async()=>namedButton('Open The Navigator').click());expect(onOpen).toHaveBeenCalledWith(entry);
 expect(container.querySelector('select[aria-label="Archive filter"]')).toBeTruthy();
});

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
import {BIBLE_GUIDES,bibleGuide} from "../shared/bible-guidance";
import {BIBLE_TYPES} from "../shared/bible-catalog";
import {availableRelationshipTypes,targetTypes} from "../shared/relationships";
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

it('guides the existing seven types and proposes only supported optional connection kinds',()=>{
 expect(Object.keys(BIBLE_GUIDES).sort()).toEqual([...BIBLE_TYPES].sort());
 for(const type of BIBLE_TYPES){
  const guide=bibleGuide(type)!;
  expect(guide.purpose).toBeTruthy();expect(guide.examples).toBeTruthy();
  expect(Object.values(guide.groups).some(group=>group.start)).toBe(true);
  for(const suggestion of guide.connections){
   expect(availableRelationshipTypes(type)).toContain(suggestion.kind);
   expect(targetTypes(suggestion.kind,type).length).toBeGreaterThan(0);
  }
 }
 expect(bibleGuide('timeline')).toBeUndefined();
});

it.each([
 ['characters','basicInfo','#age','metadata','age'],
 ['groups_races','basicInfo','#tagline','metadata','tagline'],
 ['locations','coreInfo','#tagline','metadata','tagline'],
 ['events','coreSummary','#shortSummary','content','shortSummary'],
 ['world_elements','coreOverview','#shortNotes','content','shortNotes'],
 ['details','content','#content','content','content'],
 ['research','coreInfo','#shortSummary','content','shortSummary'],
])('%s keeps edits, original imports and unknown nested values through disclosures, tabs and reload',async(type,group,selector,bucket,key)=>{
 const original={untouched:{list:['one','two'],flag:false},category:'Unknown saved category'};
 entry={...entry,entryType:type,metadata:{...(entry.metadata as Record<string,unknown>),...(bucket==='metadata' ? original : {})},content:bucket==='content' ? JSON.stringify(original) : '<p>A <strong>formatted</strong> story note.</p>'};
 records[url()]=entry;records[listUrl()]=[entry];queryClient.setQueryData([url()],entry);queryClient.setQueryData([listUrl()],[entry]);
 await mount();await tab('Develop');
 const trigger=container.querySelector<HTMLButtonElement>(`[data-bible-group="${group}"] h3 button`)!;
 if(trigger.getAttribute('aria-expanded')==='false')await act(async()=>trigger.click());
 const input=container.querySelector<HTMLInputElement>(selector)!;
 expect(input).toBeTruthy();
 await act(async()=>{input.value='Unfinished idea — keep this';Simulate.change(input);});
 await act(async()=>trigger.click());
 expect(document.getElementById(trigger.getAttribute('aria-controls')!)?.hidden).toBe(true);
 expect(container.querySelector(selector)).toBe(input);
 await act(async()=>namedButton('Hide guidance').click());
 await tab('Source');await tab('Connections');await tab('Develop');
 await act(async()=>{trigger.click();namedButton('Show guidance').click();});
 expect(container.querySelector(selector)).toBe(input);expect(input.value).toBe('Unfinished idea — keep this');
 await act(async()=>{await flushPendingSaves();});
 expect(records[url()].revision).toBe(1);
 const saved=bucket==='content' ? JSON.parse(records[url()].content) : records[url()].metadata;
 expect(saved).toMatchObject({...original,[key]:'Unfinished idea — keep this'});
 expect(records[url()].metadata._notionImport).toEqual(source);
 if(bucket==='metadata')expect(records[url()].content).toBe(entry.content);
 await act(async()=>root.render(React.createElement('div')));await mount();await tab('Develop');
 expect(container.querySelector<HTMLInputElement>(selector)!.value).toBe('Unfinished idea — keep this');
});

it('opening guidance, examples, retained values and empty groups never writes or inserts example content',async()=>{
 await mount();await tab('Develop');
 const trigger=container.querySelector<HTMLButtonElement>('[data-bible-group="personality"] h3 button')!;
 await act(async()=>trigger.click());
 const example=container.querySelector<HTMLDetailsElement>('#characters-motivations-help details')!;
 await act(async()=>{example.open=true;Simulate.toggle(example);});
 expect(example.textContent).toContain('Example only:');
 expect(container.querySelector<HTMLTextAreaElement>('#motivations')!.value).toBe('');
 const retained=[...container.querySelectorAll('details')].find(d=>d.querySelector('summary')?.textContent==='Saved & legacy values')!;
 await act(async()=>{retained.open=true;Simulate.toggle(retained);});
 expect(retained.textContent).toContain('keep me');expect(retained.textContent).toContain('Untouched original notes');
 await act(async()=>namedButton('Hide guidance').click());
 await act(async()=>{namedButton('Show guidance').click();trigger.click();await flushPendingSaves();});
 expect((global.fetch as jest.Mock).mock.calls.filter(([,init])=>init?.method && init.method!=='GET')).toHaveLength(0);
 expect(records[url()]).toEqual(entry);
});

it('uses a real button disclosure with an accessible name and a stable controlled panel',async()=>{
 await mount();await tab('Develop');
 const trigger=container.querySelector<HTMLButtonElement>('[data-bible-group="basicInfo"] h3 button')!;
 const panel=document.getElementById(trigger.getAttribute('aria-controls')!);
 expect(trigger.tagName).toBe('BUTTON');expect(trigger.type).toBe('button');expect(trigger.textContent).toContain('Identity & role');
 await act(async()=>{trigger.focus();trigger.click();});
 expect(document.activeElement).toBe(trigger);expect(panel?.hidden).toBe(false);
 expect(container.querySelector('#primaryRole')?.getAttribute('aria-describedby')).toBe('characters-primaryRole-help');
 await act(async()=>trigger.click());expect(panel?.hidden).toBe(true);expect(document.activeElement).toBe(trigger);
});

it('connection ideas open the shared picker without choosing a target, writing or making recovery copies',async()=>{
 await mount();await tab('Connections');
 const ideas=[...container.querySelectorAll('details')].find(d=>d.querySelector('summary')?.textContent==='Ideas for connections (optional)')!;
 await act(async()=>{ideas.open=true;Simulate.toggle(ideas);namedButton('Add an affiliation').click();});
 const dialog=document.querySelector('[role="dialog"]')!;
 expect(dialog.querySelector<HTMLSelectElement>('select')!.value).toBe('affiliation');
 expect(dialog.querySelector('[aria-label="Search entries"]')).toBeTruthy();
 expect([...dialog.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent==='Add relationship')!.disabled).toBe(true);
 expect(Object.keys(window.localStorage).filter(key=>key.includes('relationship-draft'))).toEqual([]);
 expect((global.fetch as jest.Mock).mock.calls.filter(([,init])=>init?.method && init.method!=='GET')).toHaveLength(0);
 await act(async()=>{[...dialog.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent==='Close — keep draft')!.click();});
 expect(records[url()]).toEqual(entry);
});

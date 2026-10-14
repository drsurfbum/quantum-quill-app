jest.mock("wouter",()=>({useLocation:()=>["/project/1/write",jest.fn()],Link:({children,...props}:any)=>require("react").createElement("a",props,children)}));
import "./editor-dom";
import React,{act,StrictMode} from "react";
import {createRoot,Root} from "react-dom/client";
import {Simulate} from "react-dom/test-utils";
import {QueryClientProvider} from "@tanstack/react-query";
import type {Editor} from "@tiptap/core";
import WritingDocument from "../client/src/components/writing-document";
import {queryClient} from "../client/src/lib/queryClient";
import {flushPendingSaves,getSaveQueue,withPendingEdits} from "../client/src/hooks/use-autosave";
import {mentionRanges} from "../client/src/components/rich-text-editor/bible-reference";
import {PendingSaves} from "../client/src/components/pending-saves";
import {DraftJournal} from "../client/src/lib/draft-journal";
let root:Root,container:HTMLDivElement,id=8000,records:Record<string,any>,chapter:any,scene:any,entry:any,release:(()=>void)|undefined;
const button=(name:string)=>[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===name || b.textContent===name)!;
const editor=()=>((container.querySelector('.tiptap') as any).editor as Editor);
async function click(name:string){await act(async()=>{button(name).click();});}
async function mount(){await act(async()=>root.render(React.createElement(StrictMode,null,React.createElement(QueryClientProvider,{client:queryClient},React.createElement(WritingDocument,{chapter,scene}),React.createElement(PendingSaves)))));}
beforeEach(()=>{
  jest.useFakeTimers();id++;queryClient.clear();window.localStorage.clear();release=undefined;
  Object.defineProperty(window,'matchMedia',{configurable:true,value:()=>({matches:true,addEventListener(){},removeEventListener(){}})});
  queryClient.setQueryData(['/api/user'],{id});
  chapter={id,projectId:id,title:'Chapter one',writingMode:'scenes',isDraft:true,revision:0};
  scene={id,chapterId:id,projectId:id,title:'Arrival',content:'<p>The <strong>navigator</strong> waits.</p>',summary:'An arrival',storyBeats:[],revision:0};
  entry={id,projectId:id,title:'Mara Vale',entryType:'characters',content:'A navigator',metadata:{unknown:'preserve'},revision:0};
  records={[`/api/scenes/${id}`]:scene,[`/api/scenes/${id}/context`]:{id,sceneId:id,projectId:id,title:'Context',revision:0,links:[{entryId:id,role:'viewpoint',note:''}]},[`/api/story-bible/${id}`]:entry};
  for(const [url,value] of Object.entries(records))queryClient.setQueryData([url],value);
  queryClient.setQueryData([`/api/projects/${id}/scenes`],[scene]);queryClient.setQueryData([`/api/projects/${id}/story-bible`],[entry]);queryClient.setQueryData([`/api/projects/${id}/relationships`],[]);
  jest.spyOn(global,'fetch').mockImplementation(async(url,init)=>{
    const key=String(url);
    if(init?.method==='PUT'){const {_base,_revision,...patch}=JSON.parse(init.body as string);records[key]={...records[key],...patch,revision:records[key].revision+1};return new Response(JSON.stringify(records[key]),{status:200});}
    const result=records[key] || queryClient.getQueryData([key]) || [];
    return new Response(JSON.stringify(result),{status:200});
  });
  container=document.createElement('div');document.body.append(container);root=createRoot(container);
});
afterEach(async()=>{release?.();await act(async()=>{root.unmount();await flushPendingSaves();});container.remove();queryClient.clear();jest.restoreAllMocks();jest.useRealTimers();});
it('links a selected phrase with the shared picker, preserves marks and keeps the editor mounted while toggling context',async()=>{
  await mount();const original=editor();await act(async()=>original.commands.setTextSelection({from:5,to:14}));
  await click('Link Story Bible element');
  await act(async()=>{await jest.advanceTimersByTimeAsync(20);});
  const choice=document.querySelector('[role="option"]') as HTMLButtonElement;expect(choice.textContent).toContain('Mara Vale');await act(async()=>choice.click());
  expect(editor()).toBe(original);expect(editor().getText()).toBe('The navigator waits.');expect(editor().getHTML()).toContain('<strong>');expect(mentionRanges(editor())[0].entryId).toBe(id);
  expect(container.textContent).toContain('Edit entry here');
  await click('scene note');
  const note=container.querySelector('textarea')!;
  await act(async()=>{note.value='Only this scene';Simulate.change(note);});
  await act(async()=>{await flushPendingSaves();});
  expect(records[`/api/scenes/${id}/context`].links[0].note).toBe('Only this scene');
  expect(editor()).toBe(original);

  await click('Hide context');await click('Show context');expect(editor()).toBe(original);expect(mentionRanges(editor())).toHaveLength(1);
  await act(async()=>{await flushPendingSaves();});expect(records[`/api/scenes/${id}`].content).toContain('data-qq-entry');
});
it('entry editing and prose use independent revision queues; hiding cards does not replace ongoing typing',async()=>{
  await mount();const original=editor();await click('Mara ValeScene reference');await click('Edit entry here');
  await act(async()=>{await jest.advanceTimersByTimeAsync(20);});
  const input=[...document.querySelectorAll('input')].find(input=>input.value==='Mara Vale')!;expect(input).toBeTruthy();
  await act(async()=>{input.value='Mara renamed';Simulate.change(input);original.commands.insertContentAt(original.state.doc.content.size-1,' More prose.');});
  const latest=original.getHTML();await act(async()=>{await flushPendingSaves();});
  expect(records[`/api/story-bible/${id}`]).toMatchObject({title:'Mara renamed',metadata:{unknown:'preserve'},revision:1});
  expect(records[`/api/scenes/${id}`]).toMatchObject({content:latest,revision:1});expect(editor()).toBe(original);
});
it('failed linked writing stays in account/project-scoped recovery without replacing the editor',async()=>{
  scene={...scene,content:`<p><span data-qq-entry="${id}">the navigator</span></p>`};records[`/api/scenes/${id}`]=scene;
  await mount();const original=editor();
  (global.fetch as jest.Mock).mockImplementation(async(url,init)=>init?.method==='PUT' ? new Response(JSON.stringify({message:'Concurrent writing',code:'REVISION_CONFLICT'}),{status:409}) : new Response(JSON.stringify(records[String(url)] || []),{status:200}));
  await act(async()=>{original.commands.insertContentAt(original.state.doc.content.size-1,' kept offline');await getSaveQueue(`/api/scenes/${id}`).flush();});
  const journal=new DraftJournal(()=>window.localStorage),draft=journal.read(id).find(d=>d.url===`/api/scenes/${id}`)!;
  expect(draft.projectId).toBe(id);expect(draft.patch.content).toContain('data-qq-entry');expect(journal.read(id+1)).toEqual([]);
  expect(container.textContent).toContain('Changes need review');await click('Hide context');expect(editor()).toBe(original);expect(editor().getHTML()).toBe(draft.patch.content);
  getSaveQueue(`/api/scenes/${id}`).discard();journal.remove(draft);
});
it('opens the missing-connection review without remounting prose and refreshes cards after adding',async()=>{
  scene.content='<p>The <strong>Mara Vale</strong> waits.</p>';
  records[`/api/scenes/${id}/context`].links=[];
  queryClient.setQueryData([`/api/scenes/${id}/context`],records[`/api/scenes/${id}/context`]);
  await mount();const original=editor(),html=original.getHTML();
  await click('Find missing connections');
  await act(async()=>{await jest.advanceTimersByTimeAsync(20);});
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Mara Vale');
  expect(editor()).toBe(original);
  await click('Add connection to Mara Vale');await act(async()=>{await flushPendingSaves();});
  const close=[...document.querySelectorAll('[role="dialog"] button')].find(b=>b.textContent==='Close') as HTMLButtonElement;
  await act(async()=>close.click());
  expect(editor()).toBe(original);expect(editor().getHTML()).toBe(html);
  expect(records[`/api/scenes/${id}/context`].links).toEqual([{entryId:id,role:'reference',note:''}]);
  expect(container.textContent).toContain('Mara ValeScene reference');
});

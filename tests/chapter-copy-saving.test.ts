import './editor-dom';
import React, {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {QueryClientProvider} from '@tanstack/react-query';
import DuplicateChapter from '../client/src/components/duplicate-chapter';
import {queryClient,ApiError} from '../client/src/lib/queryClient';
import {getSaveQueue,flushPendingSaves} from '../client/src/hooks/use-autosave';
let root:Root,container:HTMLDivElement,id=90000,chapter:any,record:any,savedInputs:any[],events:string[],lost=false,saveFailure=false;
let release:(()=>void)|undefined;
const created=jest.fn(),close=jest.fn();
const button=(name:string)=>[...document.querySelectorAll('button')].find(b=>b.textContent===name)!;
async function mount(){await act(async()=>root.render(React.createElement(QueryClientProvider,{client:queryClient},React.createElement(DuplicateChapter,{chapter,onClose:close,onCreated:created}))));}
beforeEach(()=>{
 id++;queryClient.clear();window.localStorage.clear();created.mockClear();close.mockClear();events=[];savedInputs=[];lost=false;saveFailure=false;release=undefined;
 Object.defineProperty(global,'localStorage',{configurable:true,value:window.localStorage});
 chapter={id,projectId:id,title:'Crossing',writingMode:'chapter',content:'<p>Original</p>',revision:0,isDraft:true,order:0};record=chapter;
 queryClient.setQueryData(['/api/user'],{id});queryClient.setQueryData([`/api/chapters/${id}`],chapter);queryClient.setQueryData([`/api/projects/${id}/chapters`],[chapter]);
 jest.spyOn(global,'fetch').mockImplementation(async(url,init)=>{
  const path=String(url),method=init?.method||'GET';events.push(`${method} ${path}`);
  if(method==='PUT'){
   if(saveFailure)return new Response(JSON.stringify({message:'Review the unsaved draft',code:'REVISION_CONFLICT'}),{status:409});
   const {_revision,_base,...patch}=JSON.parse(init!.body as string);record={...record,...patch,revision:record.revision+1};return new Response(JSON.stringify(record),{status:200});
  }
  if(path.endsWith('/duplicate')&&method==='GET') return new Response(JSON.stringify({snapshot:'a'.repeat(64)}),{status:200});
  if(path.endsWith('/duplicate')&&method==='POST'){
   savedInputs.push(JSON.parse(init!.body as string));
   if(lost){lost=false;throw new Error('Connection lost after request');}
   if(release===undefined) await new Promise<void>(resolve=>{release=resolve;resolve();});
   return new Response(JSON.stringify({chapterId:id+1000,firstSceneId:null,title:'Crossing (copy)'}),{status:201});
  }
  return new Response(JSON.stringify(path.endsWith('/chapters')?[record,{...chapter,id:id+1000,title:'Crossing (copy)'}]:[]),{status:200});
 });
 container=document.createElement('div');document.body.append(container);root=createRoot(container);
});
afterEach(async()=>{
 release?.();getSaveQueue(`/api/chapters/${id}`).discard();getSaveQueue(`/api/scenes/${id}`).discard();
 await act(async()=>{root.unmount();await flushPendingSaves();});container.remove();queryClient.clear();jest.restoreAllMocks();
});
it.each(['chapters','scenes'])('flushes latest %s prose before copying and ignores rapid clicks',async resource=>{
 if(resource==='scenes'){record={...chapter,chapterId:chapter.id};queryClient.setQueryData([`/api/scenes/${id}`],record);queryClient.setQueryData([`/api/projects/${id}/scenes`],[record]);}
 const queue=getSaveQueue(`/api/${resource}/${id}`,`/api/projects/${id}/${resource}`);
 queue.enqueue({content:'<p>Latest <strong>unsaved</strong> writing</p>'});
 await mount();await act(async()=>{button('Create copy').click();button('Create copy').click();});
 expect(record.content).toContain('<strong>unsaved</strong>');expect(events[0]).toBe(`PUT /api/${resource}/${id}`);
 expect(savedInputs).toHaveLength(1);expect(created).toHaveBeenCalledTimes(1);expect(window.localStorage.length).toBe(0);
});
it('keeps pending writing and does not request a copy when a save fails',async()=>{
 saveFailure=true;const queue=getSaveQueue(`/api/chapters/${id}`,`/api/projects/${id}/chapters`);queue.enqueue({content:'Unsent draft'});
 await mount();await act(async()=>button('Create copy').click());
 expect(savedInputs).toHaveLength(0);expect(events.some(e=>e.includes('/duplicate'))).toBe(false);expect(created).not.toHaveBeenCalled();
 expect(document.querySelector('[role=alert]')?.textContent).toContain('Some writing has not saved');expect(queue.getDraft()).toMatchObject({content:'Unsent draft'});
});
it('retains the operation token after an uncertain response and reuses it after reopening',async()=>{
 lost=true;await mount();await act(async()=>button('Create copy').click());
 expect(savedInputs).toHaveLength(1);expect(created).not.toHaveBeenCalled();expect(document.querySelector('[role=alert]')?.textContent).toContain('Connection lost');
 await act(async()=>root.render(null));await mount();await act(async()=>button('Create copy').click());
 expect(savedInputs).toHaveLength(2);expect(savedInputs[1]).toEqual(savedInputs[0]);expect(events.filter(e=>e===`GET /api/chapters/${id}/duplicate`)).toHaveLength(1);expect(created).toHaveBeenCalledTimes(1);
});
it('keeps the successful copy receipt when refreshing the manuscript fails',async()=>{
 jest.spyOn(queryClient,'fetchQuery').mockRejectedValueOnce(new ApiError('Could not refresh manuscript',400));
 await mount();await act(async()=>button('Create copy').click());
 expect(savedInputs).toHaveLength(1);expect(created).not.toHaveBeenCalled();
 expect(document.querySelector('[role=alert]')?.textContent).toContain('Could not refresh manuscript');
 await act(async()=>button('Retry duplicate').click());
 expect(savedInputs).toHaveLength(2);expect(savedInputs[1]).toEqual(savedInputs[0]);expect(created).toHaveBeenCalledTimes(1);
});

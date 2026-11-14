jest.mock('wouter', () => ({ useLocation: () => ['/', jest.fn()] }));
import './editor-dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import type { StoryBibleEntry } from '../shared/schema';
import { biblePickerChoices, readBibleSelectionCounts, recordBibleSelection } from '../client/src/lib/bible-picker';
import { EntryPicker } from '../client/src/components/story-bible/relationships';
import { BibleFindDialog } from '../client/src/components/story-bible/find-dialog';
import { queryClient } from '../client/src/lib/queryClient';

const entry = (id: number, title: string, extra = {}) => ({ id, title, projectId: 7, entryType: 'characters', priority: 0, isArchived: false, metadata: {}, ...extra } as StoryBibleEntry);
const options = { ranked: true, query: '', types: ['characters'], projectId: 7 };
let host: HTMLDivElement, root: Root;
beforeEach(() => { window.localStorage.clear();queryClient.clear();queryClient.setQueryData(['/api/user'],{id:9});host=document.createElement('div');document.body.append(host);root=createRoot(host); });
afterEach(async () => {await act(async()=>root.unmount());host.remove();queryClient.clear();jest.restoreAllMocks();});

it('orders browse by existing stars, explicit frequency, name and stable ID without mutating input', () => {
  const rows = [entry(6,'Zulu',{priority:1}),entry(4,'Beta'),entry(3,'Alpha'),entry(2,'Alpha'),entry(1,'Busy')];
  expect(biblePickerChoices(rows,{...options,counts:{1:5,6:1}}).map(e=>e.id)).toEqual([6,1,2,3,4]);
  expect(rows.map(e=>e.id)).toEqual([6,4,3,2,1]);
  expect(biblePickerChoices(rows,{...options,ranked:false}).map(e=>e.id)).toEqual([6,4,3,2,1]);
});
it('keeps exact and prefix matches ahead of starred weak matches and ignores surrounding spaces', () => {
  const rows=[entry(1,'Old Harbor',{priority:1}),entry(2,'Harbor road'),entry(3,'Harbor'),entry(4,'No match')];
  expect(biblePickerChoices(rows,{...options,query:' HARBOR ',counts:{1:999}}).map(e=>e.id)).toEqual([3,2,1]);
});
it('browses all 1500 entries without a cap, but keeps project, target type, archive and source restrictions', () => {
  const rows=Array.from({length:1500},(_,i)=>entry(i+1,`Entry ${String(i).padStart(4,'0')}`));
  rows.push(entry(2000,'Other project',{projectId:8}),entry(2001,'Archived',{isArchived:true}),entry(2002,'Location',{entryType:'locations'}));
  expect(biblePickerChoices(rows,options)).toHaveLength(1500);
  expect(biblePickerChoices(rows,{...options,includeArchived:true,sourceId:1})).toHaveLength(1500);
  expect(biblePickerChoices(rows,{...options,query:'1499'})[0].id).toBe(1500);
});
it('counts only explicit valid selections and isolates writers and projects, pruning removed IDs', () => {
  const rows=[entry(1,'One'),entry(2,'Two')];
  recordBibleSelection(9,7,1,rows);recordBibleSelection(9,7,1,rows);recordBibleSelection(9,7,2,rows);
  expect(readBibleSelectionCounts(9,7)).toEqual({'1':2,'2':1});
  expect(readBibleSelectionCounts(10,7)).toEqual({});expect(readBibleSelectionCounts(9,8)).toEqual({});
  recordBibleSelection(9,8,1,rows);recordBibleSelection(undefined,7,1,rows);
  expect(readBibleSelectionCounts(9,8)).toEqual({});
  recordBibleSelection(9,7,2,[rows[1]]);expect(readBibleSelectionCounts(9,7)).toEqual({'2':2});
});
it('falls back safely for corrupt or unavailable browser storage', () => {
  window.localStorage.setItem('quantum-quill:bible-find-counts:v1:9:7','{"1":-1,"2":2,"3":"999","x":9}');
  expect(readBibleSelectionCounts(9,7)).toEqual({'2':2});
  window.localStorage.setItem('quantum-quill:bible-find-counts:v1:9:7','null');expect(readBibleSelectionCounts(9,7)).toEqual({});
  jest.spyOn(window.Storage.prototype,'getItem').mockImplementation(()=>{throw new Error('denied');});
  jest.spyOn(window.Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('quota');});
  expect(()=>recordBibleSelection(9,7,1,[entry(1,'One')])).not.toThrow();
  expect(readBibleSelectionCounts(9,7)).toEqual({});
});
async function picker(extra = {}) {
  const choose=jest.fn();
  await act(async()=>root.render(React.createElement(EntryPicker,{entries:[entry(1,'Alpha'),entry(2,'Beta'),entry(3,'Zulu')],types:['characters'],value:0,onChange:choose,...extra})));
  const input=host.querySelector('input')!;input.focus();return {input,choose};
}
it('keeps focus and text selection in the combobox while keyboard navigation scrolls only the list',async()=>{
  const {input,choose}=await picker();const list=host.querySelector('[role=listbox]') as HTMLElement;
  jest.spyOn(list,'getBoundingClientRect').mockReturnValue({top:100,bottom:200} as DOMRect);
  jest.spyOn(list.children[2],'getBoundingClientRect').mockReturnValue({top:300,bottom:344} as DOMRect);
  await act(async()=>Simulate.keyDown(input,{key:'End',ctrlKey:true}));
  expect(list.getAttribute('tabindex')).toBe('-1');expect(list.scrollTop).toBe(144);expect(document.activeElement).toBe(input);
  expect(input.getAttribute('aria-activedescendant')).toBe(list.children[2].id);
  expect([...list.children].every(e=>e.getAttribute('tabindex')==='-1')).toBe(true);
  expect(input.getAttribute('aria-autocomplete')).toBe('list');
  await act(async()=>Simulate.keyDown(input,{key:'Enter'}));expect(choose).toHaveBeenCalledWith(3);
});
it('preserves text Home/End, ignores composing Enter and lets Escape reach its dialog',async()=>{
  const {input,choose}=await picker();
  await act(async()=>Simulate.keyDown(input,{key:'End'}));
  expect(host.querySelector('[aria-selected=true]')?.textContent).toContain('Alpha');
  await act(async()=>Simulate.keyDown(input,{key:'Enter',nativeEvent:{isComposing:true} as any}));expect(choose).not.toHaveBeenCalled();
  const escape=jest.fn();host.addEventListener('keydown',escape);
  input.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));expect(escape).toHaveBeenCalled();
});
it('resets navigation on filtering and handles zero matches without a stale active descendant',async()=>{
  const {input,choose}=await picker();
  await act(async()=>{input.value='none';Simulate.change(input);});
  expect(host.querySelectorAll('[role=option]')).toHaveLength(0);expect(input.hasAttribute('aria-activedescendant')).toBe(false);
  await act(async()=>Simulate.keyDown(input,{key:'Enter'}));expect(choose).not.toHaveBeenCalled();
  await act(async()=>{input.value='Beta';Simulate.change(input);});
  await act(async()=>Simulate.keyDown(input,{key:'Enter'}));expect(choose).toHaveBeenCalledWith(2);
});
it('keeps stub creation, existing selection and mouse selection available',async()=>{
  const onStub=jest.fn();const {input,choose}=await picker({value:2,onStub});
  expect(host.textContent).toContain('Selected: Beta');
  const option=host.querySelector('[role=option]')!;
  await act(async()=>Simulate.mouseDown(option,{preventDefault:jest.fn()}));expect(document.activeElement).toBe(input);
  await act(async()=>Simulate.click(option));expect(choose).toHaveBeenCalledWith(1);
  await act(async()=>{input.value='New';Simulate.change(input);});
  await act(async()=>[...host.querySelectorAll('button')].find(e=>e.textContent==='Create a new stub…')!.click());expect(onStub).toHaveBeenCalledWith('New');
});
it('tracks visual viewport resize/pan independently of layout viewport and cleans up listeners',async()=>{
  const viewport=Object.assign(new window.EventTarget(),{width:1024,height:1366,offsetTop:0,offsetLeft:0});
  Object.defineProperty(window,'visualViewport',{configurable:true,value:viewport});
  const remove=jest.spyOn(viewport,'removeEventListener');
  const trigger=document.createElement('button');host.append(trigger);
  const props={projectId:7,entries:[entry(1,'Alpha'),entry(2,'Foreign',{projectId:8})],open:true,onOpenChange:jest.fn(),onChoose:jest.fn(),returnFocus:{current:trigger}};
  await act(async()=>root.render(React.createElement(BibleFindDialog,props)));
  const dialog=document.querySelector('[role=dialog]') as HTMLElement;
  expect(dialog.style.transform).toBe('none');expect(dialog.querySelectorAll('[role=option]')).toHaveLength(1);
  await act(async()=>{viewport.height=350;viewport.offsetTop=120;viewport.dispatchEvent(new window.Event('resize'));});
  expect(dialog.style.height).toBe('326px');expect(dialog.style.top).toBe('132px');
  await act(async()=>root.render(React.createElement(BibleFindDialog,{...props,open:false})));
  expect(remove).toHaveBeenCalledWith('resize',expect.any(Function));expect(remove).toHaveBeenCalledWith('scroll',expect.any(Function));
  Object.defineProperty(window,'visualViewport',{configurable:true,value:undefined});
});

it('keeps the same field and insertion point while the Write-only Boolean query changes',async()=>{
 const {input}=await picker({ranked:true});
 await act(async()=>{input.value='Alpha OR Beta';Simulate.change(input);});
 expect(host.querySelector('input')).toBe(input);expect(input.value).toBe('Alpha OR Beta');
 input.setSelectionRange(3,3);
 await act(async()=>Simulate.keyDown(input,{key:'ArrowDown'}));
 expect(document.activeElement).toBe(input);expect(input.selectionStart).toBe(3);
 expect(host.querySelectorAll('[role=option]')).toHaveLength(2);
 await act(async()=>{input.value='Alpha OR (';Simulate.change(input);});
 expect(host.querySelectorAll('[role=option]')).toHaveLength(1);
 expect(document.activeElement).toBe(input);
});

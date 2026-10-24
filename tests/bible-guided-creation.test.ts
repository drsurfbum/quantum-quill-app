jest.mock('wouter',()=>({useParams:()=>({id:String(mockProject)}),useSearch:()=>'',useLocation:()=>['/story-bible',mockNavigate],Link:({children,...props}:any)=>require('react').createElement('a',props,children)}));
jest.mock('../client/src/components/workspace-header',()=>({__esModule:true,default:()=>null}));
jest.mock('../client/src/lib/manuscript-actions',()=>({prepareManuscriptAction:jest.fn().mockResolvedValue(undefined)}));
import './editor-dom';
import React,{act} from 'react';
import {createRoot,Root} from 'react-dom/client';
import {Simulate} from 'react-dom/test-utils';
import {QueryClientProvider} from '@tanstack/react-query';
import StoryBible from '../client/src/pages/story-bible';
import {queryClient} from '../client/src/lib/queryClient';
import {prepareManuscriptAction} from '../client/src/lib/manuscript-actions';
import {BIBLE_TYPES} from '../shared/bible-catalog';
import {bibleGuide} from '../shared/bible-guidance';

let mockProject=17000;
const mockNavigate=jest.fn();
let root:Root,container:HTMLDivElement;
const dialog=()=>document.querySelector<HTMLElement>('[role="dialog"]')!;
const button=(scope:ParentNode,text:string)=>[...scope.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent===text)!;
beforeEach(()=>{
 jest.useFakeTimers();mockProject++;mockNavigate.mockClear();queryClient.clear();window.localStorage.clear();
 (prepareManuscriptAction as jest.Mock).mockReset().mockResolvedValue(undefined);
 queryClient.setQueryData(['/api/user'],{id:mockProject});
 queryClient.setQueryData([`/api/projects/${mockProject}`],{id:mockProject,title:'Synthetic guided creation'});
 queryClient.setQueryData([`/api/projects/${mockProject}/story-bible`],[]);
 jest.spyOn(global,'fetch').mockImplementation(async(path,init)=>{
  if(init?.method==='POST')return new Response(JSON.stringify({...JSON.parse(init.body as string),id:mockProject+1,revision:0}),{status:201});
  return new Response(JSON.stringify([]),{status:200});
 });
 container=document.createElement('div');document.body.append(container);root=createRoot(container);
});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();queryClient.clear();jest.restoreAllMocks();jest.useRealTimers();});
async function open(){
 await act(async()=>root.render(React.createElement(QueryClientProvider,{client:queryClient},React.createElement(StoryBible))));
 await act(async()=>{[...container.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent?.includes('New'))!.click();});
}
it.each(BIBLE_TYPES)('creates an unfinished %s with only its name and type; examples never enter the payload',async type=>{
 await open();
 const select=dialog().querySelector<HTMLSelectElement>('select')!;
 await act(async()=>{select.value=type;Simulate.change(select);});
 expect(dialog().textContent).toContain(bibleGuide(type)!.purpose);
 expect(dialog().textContent).toContain(bibleGuide(type)!.examples);
 expect(button(dialog(),'Create entry').disabled).toBe(true);
 const input=dialog().querySelector<HTMLInputElement>('input')!;
 await act(async()=>{input.value='  An unfinished idea  ';Simulate.change(input);});
 await act(async()=>Simulate.submit(dialog().querySelector('form')!));
 const posts=(global.fetch as jest.Mock).mock.calls.filter(([,init])=>init?.method==='POST');
 expect(posts).toHaveLength(1);
 expect(JSON.parse(posts[0][1].body)).toEqual({title:'An unfinished idea',entryType:type,content:'',projectId:mockProject});
 expect(prepareManuscriptAction).toHaveBeenCalledWith(mockProject);
 expect(mockNavigate).toHaveBeenCalledWith(`/project/${mockProject}/story-bible?entry=${mockProject+1}&section=develop`);
});
it('keeps the name and type when pending writing blocks creation',async()=>{
 await open();(prepareManuscriptAction as jest.Mock).mockRejectedValueOnce(new Error('Resolve pending writing first'));
 const input=dialog().querySelector<HTMLInputElement>('input')!;
 await act(async()=>{input.value='Keep this partial idea';Simulate.change(input);});
 await act(async()=>Simulate.submit(dialog().querySelector('form')!));
 expect(dialog().textContent).toContain('Resolve pending writing first');expect(input.value).toBe('Keep this partial idea');
 expect(mockNavigate).not.toHaveBeenCalled();expect((global.fetch as jest.Mock).mock.calls.filter(([,init])=>init?.method==='POST')).toEqual([]);
});

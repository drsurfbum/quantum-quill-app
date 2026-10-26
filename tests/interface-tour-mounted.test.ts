import './editor-dom';
import React, {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';

let mockAccount = 20000;
let mockRoute = '/';
let mockProjects: any[] = [{id:1}];
let mockPending = 0;
let mockDrafts: any[] = [];
let mockReady = true;
let mockMissing = false;
const mockNavigate = jest.fn((route:string)=>{mockRoute=route; render();});
jest.mock('wouter',()=>({useLocation:()=>[mockRoute,mockNavigate]}));
jest.mock('@tanstack/react-query',()=>({useQuery:()=>({data:mockProjects,isSuccess:true})}));
jest.mock('../client/src/hooks/use-auth',()=>({useAuth:()=>({user:{id:mockAccount}})}));
jest.mock('../client/src/hooks/use-autosave',()=>({
  usePendingSaves:()=>({pending:mockPending}),useRecoverableDrafts:()=>mockDrafts,pendingSaveCount:()=>mockPending,
}));
const mockPrepare = jest.fn(async(_project:number)=>mockAccount);
jest.mock('../client/src/lib/manuscript-actions',()=>({prepareManuscriptAction:(project:number)=>mockPrepare(project)}));
import {TourProvider, replayTour} from '../client/src/components/tour/tour-provider';
import {readTourPreference, TOUR_VERSION} from '../client/src/lib/interface-tour';

let root:Root, container:HTMLDivElement;
const button=(text:string)=>[...document.querySelectorAll<HTMLButtonElement>('button')].find(el=>el.textContent===text)!;
const title=()=>document.querySelector('#interface-tour-title')?.textContent;
const step=()=>document.querySelector('[data-interface-tour]')?.textContent;
function Harness(){
  const route=(destination:string)=>()=>mockNavigate(destination);
  return React.createElement(TourProvider,null,React.createElement('main',null,
    React.createElement('button',{'data-tour':'help',onClick:replayTour},'Help'),
    React.createElement('input',{'aria-label':'Writing',defaultValue:'Keep this draft'}),
    mockRoute==='/' ? React.createElement('section',{'data-tour':'projects'},
      mockProjects.length ? React.createElement('button',{onClick:route('/project/1')},'Open sample') : null,
      React.createElement('button',{'data-tour':'new-project'},'New Project')) :
      React.createElement('div',null,
        mockReady?React.createElement('header',{'data-tour':'workspace-ready'},'Ready'):null,
        ...['storyboard','outline','write','story-bible'].map(name=>React.createElement('button',{key:name,'data-tour':mockMissing?undefined:`nav-${name}`,onClick:route(`/project/1/${name}`)},name)),
        ...['manuscript','writing-desk','context'].map(name=>React.createElement('aside',{key:name,'data-tour':name},name)))
  ));
}
function render(){root.render(React.createElement(Harness));}
async function settle(ms=0){await act(async()=>{jest.advanceTimersByTime(ms);});}
async function click(text:string){await act(async()=>{expect(button(text)).toBeTruthy();button(text).click();});await settle();}
async function begin(){await click('Start tour');}
beforeEach(async()=>{
  jest.useFakeTimers();mockAccount++;mockRoute='/';mockProjects=[{id:1}];mockPending=0;mockDrafts=[];mockReady=true;mockMissing=false;
  mockNavigate.mockClear();mockPrepare.mockReset().mockResolvedValue(mockAccount);
  Object.defineProperty(globalThis,'localStorage',{value:window.localStorage,configurable:true});window.localStorage.clear();
  jest.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(()=>({left:20,top:20,width:160,height:40,right:180,bottom:60,x:20,y:20,toJSON:()=>({})}));
  container=document.createElement('div');document.body.append(container);root=createRoot(container);
  await act(async()=>render());await settle(900);
});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();jest.restoreAllMocks();jest.useRealTimers();});

test('each loaded navigation advances once, Back restores its route, and all steps complete',async()=>{
  await begin();expect(title()).toBe('Your projects live here');
  mockReady=false;await click('Open sample');expect(title()).toBe('Your projects live here');
  mockReady=true;await act(async()=>render());await settle();expect(title()).toBe('A flexible workspace');
  await click('storyboard');expect(title()).toBe('See the big picture');expect(step()).toContain('3 of 10');
  await click('Back');expect(mockRoute).toBe('/project/1');expect(title()).toBe('A flexible workspace');
  await click('storyboard');expect(title()).toBe('See the big picture');
  await click('outline');expect(title()).toBe('Scenes and story beats');
  await click('write');expect(title()).toBe('Chapters and scenes');
  await click('Next');expect(title()).toBe('Your writing desk');
  await click('Next');expect(title()).toBe('Worldbuilding, always nearby');
  await click('story-bible');expect(title()).toBe('A reference library for your story');
  await click('write');expect(title()).toBe('Keep references beside your prose');
  await click('Next');expect(title()).toBe('Export and help when you need them');
  await click('Finish tour');expect(title()).toBeUndefined();expect(readTourPreference(mockAccount).versions[TOUR_VERSION]).toBe('completed');
  await click('Help');expect(title()).toBe('A flexible workspace');
});

test('pending saves, recovered drafts and blocking dialogs pause without remounting writing or advancing',async()=>{
  const input=container.querySelector('input')!;input.value='Unsaved fixture writing';
  await begin();mockPending=1;await act(async()=>render());
  expect(title()).toBeUndefined();expect(document.body.textContent).toContain('Tour paused');expect(container.querySelector('input')).toBe(input);
  mockPending=0;mockDrafts=[{id:'conflict'}];await act(async()=>render());expect(title()).toBeUndefined();
  mockDrafts=[];await act(async()=>render());expect(title()).toBe('Your projects live here');
  const dialog=document.createElement('div');dialog.setAttribute('role','alertdialog');dialog.textContent='Review recovered draft';
  await act(async()=>document.body.append(dialog));expect(title()).toBeUndefined();expect(dialog.inert).not.toBe(true);
  await act(async()=>dialog.remove());expect(title()).toBe('Your projects live here');expect(input.value).toBe('Unsaved fixture writing');
});

test('missing targets offer a way forward, and a failed Back guard never navigates',async()=>{
  await begin();await click('Open sample');mockMissing=true;await act(async()=>render());await settle(1900);
  await click('Continue without this');expect(title()).toBe('See the big picture');
  mockPrepare.mockRejectedValueOnce(new Error('Review recovered drafts first'));mockNavigate.mockClear();
  await click('Back');expect(mockNavigate).not.toHaveBeenCalled();expect(title()).toBe('See the big picture');
  await click('Skip tour');expect(document.querySelector('[data-tour-layer]')).toBeNull();
});

test('an empty account defers until a project exists and dismissals survive remounts but not account switches',async()=>{
  mockProjects=[];await act(async()=>render());await begin();await click('Continue later');
  expect(readTourPreference(mockAccount).versions[TOUR_VERSION]).toBe('awaiting-project');expect(title()).toBeUndefined();
  mockProjects=[{id:1}];mockRoute='/project/1';await act(async()=>render());expect(button('Continue tour')).toBeTruthy();
  await click('Skip for now');await act(async()=>root.render(null));await act(async()=>render());await settle(900);
  expect(button('Start tour')).toBeUndefined();expect(button('Continue tour')).toBeUndefined();
  mockAccount++;await act(async()=>render());await settle(900);expect(button('Start tour')).toBeTruthy();
});

test('keyboard can reach the highlighted action and Escape restores focus and interaction',async()=>{
  button('Help').focus();await click('Help');
  const unrelated=container.querySelector('input')!;expect(unrelated.inert).toBe(true);
  for(let count=0;count<2;count++)await act(async()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true})));
  expect(document.activeElement).toBe(button('Open sample'));
  await act(async()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})));await settle(20);
  expect(title()).toBeUndefined();expect(document.activeElement).toBe(button('Help'));expect(unrelated.inert).not.toBe(true);
});

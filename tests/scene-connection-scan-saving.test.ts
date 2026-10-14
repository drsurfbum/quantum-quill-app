import './editor-dom';
jest.mock('wouter',()=>({useLocation:()=>['/project/5/write',jest.fn()]}));
import React,{act,StrictMode} from 'react';
import {createRoot,Root} from 'react-dom/client';
import {Simulate} from 'react-dom/test-utils';
import {QueryClientProvider} from '@tanstack/react-query';
import {Editor} from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import {BibleReference} from '../client/src/components/rich-text-editor/bible-reference';
import {ContextEditor} from '../client/src/components/scene-bible-context';
import {queryClient} from '../client/src/lib/queryClient';
import {getSaveQueue,flushPendingSaves,discardDraft,inspectDraft,restoreDraft} from '../client/src/hooks/use-autosave';
import {draftJournal,DraftJournal} from '../client/src/lib/draft-journal';
import {canonical} from '../shared/draft';
import type {Scene,StoryBibleEntry} from '../shared/schema';
import type {SceneContext} from '../shared/scene-context';
let id=28000,root:Root,container:HTMLDivElement,editor:Editor,scene:Scene,stored:SceneContext,initial:SceneContext,entries:StoryBibleEntry[],offline:boolean,writes:string[];
const url=()=>`/api/scenes/${id}/context`;
const list=()=>`/api/projects/${id}/story-bible`;
function render(scan=true){root.render(React.createElement(StrictMode,null,React.createElement(QueryClientProvider,{client:queryClient},React.createElement(ContextEditor,{key:scan?'scan':'manual',scene,initial,scanEditor:scan?editor:undefined}))));}
function click(label:string){const el=[...container.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||b.textContent)===label);if(!el)throw new Error('Missing '+label);el.click();}
beforeEach(()=>{
 jest.useFakeTimers();id++;queryClient.clear();window.localStorage.clear();offline=false;writes=[];
 queryClient.setQueryData(['/api/user'],{id});
 scene={id,projectId:id,chapterId:id,title:'Synthetic scan',content:'Keep persisted prose',summary:'Do not scan planning: Unmentioned',storyBeats:[],revision:0} as unknown as Scene;
 entries=[{id:1,projectId:id,title:'Jasper “Jazz” Ramirez',entryType:'characters',content:'',metadata:{}},{id:2,projectId:id,title:'Pax',entryType:'locations',content:'',metadata:{}},{id:3,projectId:id,title:'Zara “Zee” Vega',entryType:'characters',content:'',metadata:{}},{id:4,projectId:id,title:'GLITCH',entryType:'characters',content:'',metadata:{}},{id:5,projectId:id,title:'Unmentioned',entryType:'characters',content:'',metadata:{}}] as StoryBibleEntry[];
 initial={id,sceneId:id,projectId:id,title:'Context',revision:0,links:[{entryId:1,role:'viewpoint',note:'Keep existing note'}]};stored=structuredClone(initial);
 queryClient.setQueryData([url()],initial);queryClient.setQueryData([list()],entries);
 jest.spyOn(global,'fetch').mockImplementation(async(input,init)=>{
  if(!init?.body)return new Response(JSON.stringify(String(input)===list()?entries:stored));
  writes.push(String(input));if(offline)throw new Error('Synthetic offline');
  const {_revision,_base,...patch}=JSON.parse(init.body as string);
  if(_revision!==stored.revision || canonical(_base.links)!==canonical(stored.links))return new Response(JSON.stringify({message:'Connections changed elsewhere',code:'REVISION_CONFLICT'}),{status:409});
  stored={...stored,...patch,revision:stored.revision+1};return new Response(JSON.stringify(stored));
 });
 editor=new Editor({extensions:[StarterKit,Link,BibleReference],content:'<p><strong>Jazz</strong> speaks to Zee on the <em>Pax</em>. <span data-qq-entry="4">GLITCH</span> replies.</p>'});
 // Use the actual mark instead of relying on an attribute spelling in a fixture.
 const glitch=editor.getText().indexOf('GLITCH')+1;editor.commands.setTextSelection({from:glitch,to:glitch+6});editor.commands.setMark('bibleReference',{entryId:4});
 container=document.createElement('div');document.body.append(container);root=createRoot(container);
});
afterEach(async()=>{
 offline=false;await act(async()=>{queryClient.setQueryData(['/api/user'],{id});root.unmount();for(const draft of draftJournal.read(id))discardDraft(draft);await flushPendingSaves();});editor.destroy();container.remove();queryClient.clear();jest.restoreAllMocks();jest.useRealTimers();
});
it('scans live editor text, skips both kinds of existing connections, and changes only reference data',async()=>{
 const html=editor.getHTML(),json=editor.getJSON();await act(async()=>render());
 expect(container.textContent).toContain('2 to review · 2 already connected');expect(container.querySelector('[aria-label="Suggestion: Unmentioned"]')).toBeNull();
 const role=container.querySelector('[aria-label="Role for Pax"]') as HTMLSelectElement;
 expect(role.value).toBe('reference');await act(async()=>{role.value='location';Simulate.change(role);});await act(async()=>click('Add connection to Pax'));
 await act(async()=>{await flushPendingSaves();});
 expect(stored.links).toEqual([...initial.links,{entryId:2,role:'location',note:''}]);
 expect(writes).toEqual([url()]);expect(editor.getHTML()).toBe(html);expect(editor.getJSON()).toEqual(json);expect(scene.content).toBe('Keep persisted prose');
});
it('preserves pending manual notes when opening and closing the scan',async()=>{
 await act(async()=>render(false));const note=container.querySelector('textarea')!;
 await act(async()=>{note.value='Latest manual note';Simulate.change(note);});await act(async()=>render());
 await act(async()=>click('Add connection to Pax'));await act(async()=>{await flushPendingSaves();});initial=stored;
 await act(async()=>render(false));expect(container.querySelector('textarea')?.value).toBe('Latest manual note');expect(stored.links).toHaveLength(2);expect(stored.links[0].note).toBe('Latest manual note');
});
it('retains failed offline additions privately and requires reviewed restore against a newer server',async()=>{
 await act(async()=>render());offline=true;await act(async()=>click('Add connection to Pax'));
 await act(async()=>{expect(await getSaveQueue(url()).flush()).toBe(false);});
 const journal=new DraftJournal(()=>window.localStorage),draft=journal.read(id,id)[0];expect(draft.patch.links).toHaveLength(2);expect(journal.read(id+1,id)).toEqual([]);expect(journal.read(id,id+1)).toEqual([]);
 expect(container.textContent).toContain('Review the saved reference draft');offline=false;
 stored={...stored,revision:1,links:[{...stored.links[0],note:'Other device note'}]};
 const review=await inspectDraft(draft);expect(review.conflicts).toEqual(['links']);
 stored={...stored,revision:2};await expect(restoreDraft(draft,review)).rejects.toThrow('Connections changed elsewhere');expect(journal.read(id)).toHaveLength(1);
 await act(async()=>{await restoreDraft(draft,await inspectDraft(draft));});expect(journal.read(id)).toEqual([]);expect(stored.links).toHaveLength(2);
});
it('does not overwrite newer connections in a concurrent tab',async()=>{
 await act(async()=>render());stored={...stored,revision:1,links:[...stored.links,{entryId:5,role:'cast',note:'Other tab'}]};
 await act(async()=>click('Add connection to Pax'));await act(async()=>{expect(await getSaveQueue(url()).flush()).toBe(false);});
 expect(stored.links.at(-1)?.entryId).toBe(5);expect(container.textContent).toContain('Connections changed elsewhere');expect(draftJournal.read(id)[0].patch.links).toHaveLength(2);
});
it('requires a fresh scan after prose changes and allows skipping without writes',async()=>{
 await act(async()=>render());await act(async()=>editor.commands.setContent('<p>Pax departed.</p>'));
 expect(container.textContent).toContain('prose changed');await act(async()=>click('Add connection to Pax'));expect(writes).toEqual([]);
 await act(async()=>click('Scan again'));expect(container.textContent).toContain('1 to review');await act(async()=>click('Skip Pax'));expect(container.textContent).toContain('skipped');expect(writes).toEqual([]);
});
it('hides the old account’s scan on account changes and refuses additions',async()=>{
 await act(async()=>render());await act(async()=>{queryClient.setQueryData(['/api/user'],{id:id+1});jest.advanceTimersByTime(1);});
 expect(container.textContent).toContain('Your account changed');expect(container.textContent).not.toContain('Zara');expect(writes).toEqual([]);
});

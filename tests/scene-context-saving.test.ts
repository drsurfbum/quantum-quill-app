import "./editor-dom";
const mockNavigate=jest.fn();
jest.mock("wouter",()=>({useLocation:()=>["/project/1/write",mockNavigate]}));
import React,{act,StrictMode} from "react";
import {createRoot,Root} from "react-dom/client";
import {Simulate} from "react-dom/test-utils";
import {QueryClientProvider} from "@tanstack/react-query";
import {ContextEditor,bibleCardSummary} from "../client/src/components/scene-bible-context";
import {SceneBacklinks} from "../client/src/components/story-bible/scene-backlinks";
import {queryClient} from "../client/src/lib/queryClient";
import {flushPendingSaves,getSaveQueue,discardDraft,inspectDraft,restoreDraft} from "../client/src/hooks/use-autosave";
import {draftJournal,DraftJournal,DRAFT_PREFIX} from "../client/src/lib/draft-journal";
import {canonical} from "../shared/draft";
import type {Scene,StoryBibleEntry} from "../shared/schema";
import type {SceneContext} from "../shared/scene-context";
let sequence=17000,root:Root,container:HTMLDivElement,scene:Scene,stored:SceneContext,initial:SceneContext,offline:boolean,entries:StoryBibleEntry[];
const listUrl="/api/projects/1/story-bible";
const contextUrl=()=>`/api/scenes/${scene.id}/context`;
function render(){root.render(React.createElement(StrictMode,null,React.createElement(QueryClientProvider,{client:queryClient},React.createElement(ContextEditor,{scene,initial}))));}
function click(label:string){const button=[...document.querySelectorAll('button')].find(el=>(el.getAttribute('aria-label') || el.textContent)===label);if(!button)throw new Error(`Missing ${label}`);Simulate.click(button);}
function note(value:string){const el=container.querySelector('textarea')!;el.value=value;Simulate.change(el);}
beforeEach(()=>{
  jest.useFakeTimers();queryClient.clear();window.localStorage.clear();offline=false;mockNavigate.mockClear();
  const id=++sequence;queryClient.setQueryData(["/api/user"],{id});
  scene={id,projectId:1,chapterId:1,linkedSectionId:null,title:"Arrival",summary:"",content:"Original prose",storyBeats:[],order:0,revision:0,createdAt:new Date(),updatedAt:new Date()};
  entries=[{id,projectId:1,title:"Mara",entryType:"characters",content:"Navigator <a dragon> & friend",metadata:{}} as StoryBibleEntry,{id:id+1,projectId:1,title:"Harbor",entryType:"locations",content:JSON.stringify({description:"A fogbound port"}),metadata:{}} as StoryBibleEntry];
  initial={id,sceneId:id,projectId:1,title:"Story Bible · Arrival",revision:0,links:[{entryId:id,role:"viewpoint",note:""}]};stored=structuredClone(initial);
  queryClient.setQueryData([contextUrl()],initial);queryClient.setQueryData([listUrl],entries);
  jest.spyOn(global,"fetch").mockImplementation(async(url,init)=>{
    if(String(url)===listUrl)return new Response(JSON.stringify(entries));
    if(String(url)===`/api/scenes/${scene.id}`)return new Response(JSON.stringify({...scene,chapterId:55}));
    if(String(url).endsWith('/scene-uses'))return new Response(JSON.stringify([{sceneId:scene.id,chapterId:1,sceneTitle:scene.title,chapterTitle:"Opening",links:stored.links}]));
    if(!init?.body)return new Response(JSON.stringify(stored));
    if(offline)throw new Error("Synthetic offline");
    const {_revision,_base,...patch}=JSON.parse(init.body as string);
    if(_revision!==stored.revision || canonical(_base.links)!==canonical(stored.links))return new Response(JSON.stringify({message:"Connections changed elsewhere",code:"REVISION_CONFLICT"}),{status:409});
    stored={...stored,...patch,revision:stored.revision+1};return new Response(JSON.stringify(stored));
  });
  container=document.createElement('div');document.body.append(container);root=createRoot(container);
});
afterEach(async()=>{
  offline=false;await act(async()=>{root.unmount();for(const draft of draftJournal.read(scene.id))discardDraft(draft);await flushPendingSaves();});
  container.remove();queryClient.clear();jest.restoreAllMocks();jest.useRealTimers();
});
it("rapid scene notes save in one revisioned queue, names refresh, and prose is unchanged",async()=>{
  await act(async()=>render());await act(async()=>{note("First");note("Final note Ω");});
  expect(draftJournal.read(scene.id,1)[0].patch.links).toEqual([{entryId:scene.id,role:"viewpoint",note:"Final note Ω"}]);
  await act(async()=>{await flushPendingSaves();});expect(stored.links[0].note).toBe("Final note Ω");expect(scene.content).toBe("Original prose");
  entries=[{...entries[0],title:"Mara Vale"},entries[1]];
  await act(async()=>{queryClient.setQueryData([listUrl],entries);jest.advanceTimersByTime(1);});
  expect(container.textContent).toContain("Mara Vale");expect(container.querySelector('textarea')?.value).toBe("Final note Ω");
  await act(async()=>click("Open Mara Vale →"));expect(mockNavigate).toHaveBeenCalledWith(`/project/1/story-bible?entry=${scene.id}&fromScene=${scene.id}`);
});
it("search picker supports a scene and entry sharing an integer ID and prevents a location in cast",async()=>{
  await act(async()=>render());await act(async()=>click("Add character"));
  const matching=document.querySelector('[aria-label="Matching entries"]')!;
  expect(matching.textContent).toContain("Mara");expect(matching.textContent).not.toContain("Harbor");
  await act(async()=>{Simulate.click(matching.querySelector('button')!);});await act(async()=>click("Link to scene"));
  await act(async()=>{await flushPendingSaves();});expect(stored.links.map(link=>link.role)).toEqual(["viewpoint","cast"]);
  await act(async()=>click("Remove Mara from Cast"));await act(async()=>{await flushPendingSaves();});expect(stored.links.map(link=>link.role)).toEqual(["viewpoint"]);
});
it("offline references persist in a fresh journal, remain account/project private and require reviewed conflict restoration",async()=>{
  await act(async()=>render());offline=true;await act(async()=>note("Private offline scene note"));
  await act(async()=>{expect(await getSaveQueue(contextUrl()).flush()).toBe(false);});
  const journal=new DraftJournal(()=>window.localStorage),draft=journal.read(scene.id,1)[0];expect(draft.patch.links).toEqual([{entryId:scene.id,role:"viewpoint",note:"Private offline scene note"}]);
  expect(journal.read(scene.id+1,1)).toEqual([]);expect(journal.read(scene.id,2)).toEqual([]);
  await act(async()=>{root.unmount();});root=createRoot(container);
  offline=false;stored={...stored,revision:1,links:[{...stored.links[0],note:"Newer device note"}]};
  const review=await inspectDraft(draft);expect(review.conflicts).toEqual(["links"]);
  stored={...stored,revision:2,links:[{...stored.links[0],note:"Changed after review"}]};
  await expect(restoreDraft(draft,review)).rejects.toThrow("Connections changed elsewhere");expect(journal.read(scene.id)).toHaveLength(1);
  await restoreDraft(draft,await inspectDraft(draft));expect(stored.links[0].note).toBe("Private offline scene note");expect(journal.read(scene.id)).toEqual([]);
  initial=stored;await act(async()=>render());expect(container.querySelector('textarea')?.value).toBe("Private offline scene note");
});
it("backlinks resolve a moved scene's current chapter at navigation time",async()=>{
  await act(async()=>root.render(React.createElement(QueryClientProvider,{client:queryClient},React.createElement(SceneBacklinks,{entry:entries[0]}))));
  await act(async()=>{jest.advanceTimersByTime(1);});await act(async()=>click("Arrival"));
  expect(mockNavigate).toHaveBeenCalledWith(`/project/1/write?chapter=55&scene=${scene.id}`);
});
it("cards read legacy plain text, structured JSON and metadata without modifying originals",()=>{
  const plain=entries[0],json={...entries[1],entryType:"events",content:JSON.stringify({shortSummary:"A fogbound port"})},meta={...entries[1],content:"",metadata:{description:"Metadata summary"}};
  const original=JSON.stringify([plain,json,meta]);
  expect(bibleCardSummary(plain)).toBe("Navigator <a dragon> & friend");expect(bibleCardSummary(json)).toBe("A fogbound port");expect(bibleCardSummary(meta)).toBe("Metadata summary");
  expect(bibleCardSummary({...plain,content:"<p>Safe <strong>words</strong><script>bad()</script></p>"})).toBe("Safe words");expect(JSON.stringify([plain,json,meta])).toBe(original);
});
it("draft recovery only accepts the explicit scene-context URL, not arbitrary nested API actions",()=>{
  const base={version:1 as const,id:"bad",owner:scene.id,projectId:1,url:"/api/scenes/1/delete",title:"test",updatedAt:new Date().toISOString(),base:{},patch:{}};
  window.localStorage.setItem(DRAFT_PREFIX+'bad',JSON.stringify(base));expect(draftJournal.read(scene.id)).toEqual([]);
  window.localStorage.removeItem(DRAFT_PREFIX+'bad');
});

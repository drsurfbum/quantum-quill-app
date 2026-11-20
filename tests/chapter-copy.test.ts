import request from "supertest";
import { randomUUID } from "node:crypto";
import { twoWriters } from "./helpers";

async function fixture(mode: "chapter" | "scenes" = "scenes") {
  const f = await twoWriters(), projectId = f.project.id;
  const chapter = await f.storage.createChapter({projectId,title:"The crossing",writingMode:mode,content:mode === "chapter" ? '<h2>Night</h2><p><strong>Mara</strong> <em>waits</em>.</p><ul><li>A choice</li></ul>' : "",order:0,isDraft:false});
  const after = await f.storage.createChapter({projectId,title:"Return",content:"Untouched",order:1});
  const entry = await f.storage.createStoryBibleEntry({projectId,title:"Mara",entryType:"characters",content:"Fictional navigator",metadata:{}});
  const template=await f.storage.createPlotStructureTemplate({name:'Plan',templateType:'test',sections:[]});
  const plot=await f.storage.createPlotStructure({projectId,name:'Arc',templateId:template.id});
  const section=await f.storage.createPlotStructureSection({plotStructureId:plot.id,title:'Crossing',sectionKey:'start',order:0});
  const scenes = mode === "scenes" ? await Promise.all([0,1].map(order => f.storage.createScene({projectId,chapterId:chapter.id,title:`Scene ${order+1}`,summary:'A scene plan',order,linkedSectionId:section.id,content:`<p><span data-qq-entry="${entry.id}"><strong>Mara</strong></span> sails ${order}.</p>`,storyBeats:[{id:randomUUID(),text:'Choose the crossing'}]}))) : [];
  if (scenes.length) await f.storage.putSceneContext({sceneId:scenes[0].id,projectId,revision:7,links:[{entryId:entry.id,role:'viewpoint',note:'Only this scene'}]});
  const url=`/api/chapters/${chapter.id}/duplicate`;
  const snapshot=(await f.agent.get(url).expect(200)).body.snapshot;
  const input={requestId:randomUUID(),snapshot};
  return {...f,chapter,after,entry,section,scenes,url,input};
}
it.each(['chapter','scenes'] as const)('copies %s writing with fresh identities and independent edits, preserving source and export order',async mode=>{
 const f=await fixture(mode);
 const original=await f.storage.getChapter(f.chapter.id), originalScenes=await f.storage.getProjectScenes(f.project.id);
 const result=(await f.agent.post(f.url).send(f.input).expect(201)).body;
 const copy=await f.storage.getChapter(result.chapterId);
 expect(copy).toMatchObject({title:'The crossing (copy)',content:original!.content,writingMode:mode,revision:0,isDraft:true,order:1});
 expect(copy!.id).not.toBe(f.chapter.id); expect(await f.storage.getChapter(f.chapter.id)).toEqual(original);
 expect((await f.storage.getProjectChapters(f.project.id)).map(c=>c.id)).toEqual([f.chapter.id,copy!.id,f.after.id]);
 const copies=(await f.storage.getProjectScenes(f.project.id)).filter(s=>s.chapterId===copy!.id);
 expect(copies).toHaveLength(f.scenes.length);
 for (const [i,scene] of copies.entries()) {
  expect(scene).toMatchObject({title:f.scenes[i].title,content:f.scenes[i].content,summary:f.scenes[i].summary,order:i,linkedSectionId:null,revision:0});
  expect(scene.id).not.toBe(f.scenes[i].id);expect(scene.storyBeats[0].text).toBe(f.scenes[i].storyBeats[0].text);expect(scene.storyBeats[0].id).not.toBe(f.scenes[i].storyBeats[0].id);
 }
 if (copies.length) {
  const context=(await f.agent.get(`/api/scenes/${copies[0].id}/context`).expect(200)).body;
  expect(context).toMatchObject({revision:0,links:[{entryId:f.entry.id,role:'viewpoint',note:'Only this scene'}]});
  await f.agent.put(`/api/scenes/${copies[0].id}/context`).send({_revision:0,links:[]}).expect(200);
  expect((await f.storage.getSceneContext(f.scenes[0].id))?.links).toHaveLength(1);
 }
 const target=copies.length ? `/api/scenes/${copies[0].id}` : `/api/chapters/${copy!.id}`;
 await f.agent.put(target).send({_revision:0,content:'<p>An <em>independent</em> ending.</p>'}).expect(200);
 expect((await f.agent.get(target).expect(200)).body.content).toContain('<em>independent</em>');
 expect(await f.storage.getChapter(f.chapter.id)).toEqual(original);
 expect((await f.storage.getProjectScenes(f.project.id)).filter(s=>s.chapterId===f.chapter.id)).toEqual(originalScenes);
 expect(await f.storage.getProjectStoryBible(f.project.id)).toEqual([f.entry]);
 const exported=await f.agent.post(`/api/projects/${f.project.id}/export`).send({format:'html'}).expect(200);
 expect(exported.text).toContain('The crossing (copy)');expect(exported.text.indexOf('The crossing (copy)')).toBeGreaterThan(exported.text.indexOf('The crossing'));
 expect(exported.text).toContain('<em>independent</em>');
 expect((await f.agent.get(`/api/projects/${f.project.id}/scenes`).expect(200)).body.filter((s:any)=>s.chapterId===copy!.id)).toHaveLength(copies.length);
});
it('retries and rapid concurrent submissions produce one copy; reused IDs with different input fail',async()=>{
 const f=await fixture();
 const responses=await Promise.all([f.agent.post(f.url).send(f.input),f.agent.post(f.url).send(f.input)]);
 expect(responses.map(r=>r.status)).toEqual([201,201]);expect(responses[0].body).toEqual(responses[1].body);
 await f.agent.post(f.url).send({...f.input,snapshot:'0'.repeat(64)}).expect(409);
 expect((await f.storage.getProjectChapters(f.project.id))).toHaveLength(3);
 // Even separately generated request IDs from the same snapshot cannot race a second copy.
 await f.agent.post(f.url).send({...f.input,requestId:randomUUID()}).expect(409);
 const refreshed=(await f.agent.get(f.url).expect(200)).body;
 expect((await f.agent.post(f.url).send({...refreshed,requestId:randomUUID()}).expect(201)).body.title).toBe('The crossing (copy 2)');
});
it.each(['chapter','scene','context','order'])('rejects a stale %s snapshot without writing',async kind=>{
 const f=await fixture();
 if(kind==='chapter') await f.storage.updateChapter(f.chapter.id,{title:'Changed'});
 if(kind==='scene') await f.storage.updateScene(f.scenes[0].id,{content:'New prose'});
 if(kind==='context') await f.storage.putSceneContext({sceneId:f.scenes[0].id,projectId:f.project.id,revision:8,links:[]});
 if(kind==='order') await f.storage.applyManuscriptOrder(f.project.id,[{id:f.after.id,sceneIds:[]},{id:f.chapter.id,sceneIds:[]}]);
 expect((await f.agent.post(f.url).send(f.input).expect(409)).body.code).toBe('CHAPTER_COPY_CHANGED');
 expect(await f.storage.getProjectChapters(f.project.id)).toHaveLength(2);
});
it.each(['createScene','putSceneContext','applyManuscriptOrder','putCreationRequest'] as const)('rolls back all copied records and order when %s fails; same request stays retryable',async method=>{
 const f=await fixture(); const chapters=await f.storage.getProjectChapters(f.project.id),scenes=await f.storage.getProjectScenes(f.project.id),contexts=await f.storage.getProjectSceneContexts(f.project.id);
 const original=(f.storage[method] as any).bind(f.storage);
 const spy=jest.spyOn(f.storage,method).mockImplementation((async (...args:any[])=>{if(method==='applyManuscriptOrder')await original(...args);throw new Error('Synthetic copy failure');}) as any);
 await f.agent.post(f.url).send(f.input).expect(500);
 expect(await f.storage.getProjectChapters(f.project.id)).toEqual(chapters);expect(await f.storage.getProjectScenes(f.project.id)).toEqual(scenes);expect(await f.storage.getProjectSceneContexts(f.project.id)).toEqual(contexts);
 expect(await f.storage.getCreationRequest(f.project.id,f.input.requestId)).toBeUndefined();
 spy.mockRestore();await f.agent.post(f.url).send(f.input).expect(201);
});
it('rejects unauthenticated, foreign-account, stale-account and malformed requests',async()=>{
 const f=await fixture();
 await request(f.server).post(f.url).send(f.input).expect(401);
 await f.other.get(f.url).expect(403);await f.other.post(f.url).send(f.input).expect(403);
 await f.agent.post(f.url).set('X-QQ-Account',String(f.otherUser.id)).send(f.input).expect(409);
 await f.agent.post(f.url).send({...f.input,projectId:f.otherProject.id}).expect(400);
 await f.agent.post(f.url).send({requestId:randomUUID()}).expect(400);
 expect(await f.storage.getProjectChapters(f.project.id)).toHaveLength(2);
});
it('blocks mixed ownership of prose and invalid scene references rather than silently losing data',async()=>{
 const f=await fixture('chapter');
 await f.storage.createScene({projectId:f.project.id,chapterId:f.chapter.id,title:'Unexpected',order:0,content:'Must not lose'});
 expect((await f.agent.get(f.url).expect(409)).body.code).toBe('CHAPTER_COPY_MIXED_MODE');
 const g=await fixture();
 await g.storage.putSceneContext({sceneId:g.scenes[0].id,projectId:g.project.id,revision:8,links:[{entryId:999999,role:'cast',note:''}]});
 const source=(await g.agent.get(g.url).expect(200)).body;
 expect((await g.agent.post(g.url).send({...source,requestId:randomUUID()}).expect(409)).body.code).toBe('CHAPTER_COPY_REFERENCES');
 expect(await g.storage.getProjectChapters(g.project.id)).toHaveLength(2);
});

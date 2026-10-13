import request from "supertest";
import { twoWriters } from "./helpers";
import { collectExport, exportOptions } from "../server/export";
import { manuscriptStructure, organizeManuscript } from "../server/manuscript";
async function setup() {
  const f = await twoWriters();
  const chapter = await f.storage.createChapter({projectId:f.project.id,title:"Opening",writingMode:"scenes",order:0});
  const scene = await f.storage.createScene({projectId:f.project.id,chapterId:chapter.id,title:"Arrival",order:0,content:"Original <literal> prose\n  untouched Ω"});
  const character = await f.storage.createStoryBibleEntry({projectId:f.project.id,title:"Mara",entryType:"characters",content:"Keep original",metadata:{unknown:42}});
  const location = await f.storage.createStoryBibleEntry({projectId:f.project.id,title:"Harbor",entryType:"locations",content:""});
  const link = {entryId:character.id,role:"viewpoint",note:"Recognizes the visitor"};
  return {...f,chapter,scene,character,location,link,url:`/api/scenes/${scene.id}/context`};
}
it("reading an old scene produces an empty document without rewriting or inserting anything",async()=>{
  const f=await setup();
  expect((await f.agent.get(f.url).expect(200)).body).toMatchObject({id:f.scene.id,sceneId:f.scene.id,projectId:f.project.id,revision:0,links:[]});
  expect(await f.storage.getProjectSceneContexts(f.project.id)).toEqual([]);
  expect(await f.storage.getScene(f.scene.id)).toEqual(f.scene);
});
it("links round-trip separately from prose; live backlinks follow renames and chapter moves",async()=>{
  const f=await setup();
  const links=[f.link,{entryId:f.character.id,role:"cast",note:""},{entryId:f.location.id,role:"location",note:"Tide is out"}];
  await f.agent.put(f.url).send({links,_revision:0,_base:{links:[]}}).expect(200);
  await f.agent.put(`/api/story-bible/${f.character.id}`).send({title:"Mara Vale",_revision:0}).expect(200);
  await f.agent.put(`/api/scenes/${f.scene.id}`).send({title:"The visitor",_revision:0}).expect(200);
  const second = await f.storage.createChapter({projectId:f.project.id,title:"Later chapter",writingMode:"scenes",order:1});
  const state=await manuscriptStructure(f.storage,f.project.id);
  await organizeManuscript(f.storage,f.project.id,{snapshot:state.snapshot,chapters:[{id:f.chapter.id,sceneIds:[]},{id:second.id,sceneIds:[f.scene.id]}]});
  const uses=(await f.agent.get(`/api/story-bible/${f.character.id}/scene-uses`).expect(200)).body;
  expect(uses).toEqual([{sceneId:f.scene.id,chapterId:second.id,sceneTitle:"The visitor",chapterTitle:"Later chapter",links:links.slice(0,2)}]);
  expect((await f.agent.get(f.url)).body.links).toEqual(links);
  expect((await f.storage.getScene(f.scene.id))?.content).toBe(f.scene.content);
  expect((await f.storage.getStoryBibleEntry(f.character.id))?.metadata).toEqual(f.character.metadata);
  await f.agent.put(f.url).send({links:[],_revision:1,_base:{links}}).expect(200);
  expect((await f.agent.get(`/api/story-bible/${f.character.id}/scene-uses`)).body).toEqual([]);
});
it("enforces ownership, account header, same-project targets and required revisions",async()=>{
  const f=await setup();
  await request(f.app).get(f.url).expect(401);await f.other.get(f.url).expect(403);
  await f.other.put(f.url).send({links:[f.link],_revision:0}).expect(403);
  await f.other.get(`/api/story-bible/${f.character.id}/scene-uses`).expect(403);
  await f.agent.put(f.url).set("X-QQ-Account",String(f.otherUser.id)).send({links:[f.link],_revision:0}).expect(409);
  await f.agent.put(f.url).send({links:[f.link]}).expect(428);
  const otherOwned=await f.storage.createProject({userId:f.owner.id,title:"Another book"});
  for(const projectId of [otherOwned.id,f.otherProject.id]) {
    const foreign=await f.storage.createStoryBibleEntry({projectId,title:"Foreign",entryType:"characters",content:""});
    await f.agent.put(f.url).send({links:[{...f.link,entryId:foreign.id}],_revision:0}).expect(400);
  }
  await f.agent.put(f.url).send({links:[{...f.link,entryId:99999}],_revision:0}).expect(400);
  await f.agent.get('/api/scenes/99999/context').expect(404);
  expect(await f.storage.getProjectSceneContexts(f.project.id)).toEqual([]);
});
it("validates role types, one viewpoint, duplicates, unknown fields and note limits",async()=>{
  const f=await setup();
  for(const links of [[f.link,f.link],[{...f.link,entryId:f.location.id}],[{...f.link,role:"location"}],[{...f.link,role:"not-a-role"}],[{...f.link,note:"x".repeat(5001)}],[{...f.link,title:"copied name"}]]) {
    const result=await f.agent.put(f.url).send({links,_revision:0}).expect(400);expect(result.body.message).toBeTruthy();
  }
  const char2=await f.storage.createStoryBibleEntry({projectId:f.project.id,title:"Other character",entryType:"characters",content:""});
  await f.agent.put(f.url).send({links:[f.link,{...f.link,entryId:char2.id}],_revision:0}).expect(400);
  await f.agent.put(f.url).send({links:[],content:"hidden prose",_revision:0}).expect(400);
});
it("accepts reference links to all seven Bible types",async()=>{
  const f=await setup(),links=[];
  for(const entryType of ["characters","locations","groups_races","events","world_elements","details","research"]) {
    const target=await f.storage.createStoryBibleEntry({projectId:f.project.id,title:entryType,entryType,content:""});
    links.push({entryId:target.id,role:"reference",note:entryType});
  }
  const saved=(await f.agent.put(f.url).send({links,_revision:0}).expect(200)).body;expect(saved.links).toEqual(links);
});
it("rejects concurrent link overwrites without interfering with simultaneous prose saves",async()=>{
  const f=await setup();
  const results=await Promise.all([f.agent.put(f.url).send({links:[f.link],_revision:0,_base:{links:[]}}),f.agent.put(f.url).send({links:[{...f.link,note:"Second device"}],_revision:0,_base:{links:[]}}),f.agent.put(`/api/scenes/${f.scene.id}`).send({content:"Newer prose",_revision:0})]);
  expect(results.slice(0,2).map(r=>r.status).sort()).toEqual([200,409]);expect(results[2].status).toBe(200);
  expect((await f.storage.getScene(f.scene.id))?.content).toBe("Newer prose");
  expect((await f.agent.put(f.url).send({links:[],_revision:0}).expect(409)).body.code).toBe("REVISION_CONFLICT");
});
it("failed writes preserve server links and remain retryable",async()=>{
  const f=await setup(),spy=jest.spyOn(f.storage,"putSceneContext").mockRejectedValueOnce(new Error("Synthetic failure"));
  await f.agent.put(f.url).send({links:[f.link],_revision:0}).expect(500);spy.mockRestore();
  expect((await f.agent.get(f.url)).body).toMatchObject({links:[],revision:0});
  await f.agent.put(f.url).send({links:[f.link],_revision:0}).expect(200);
});
it("blocks linked target deletion; archiving preserves old links but prevents new ones",async()=>{
  const f=await setup();
  await f.agent.put(f.url).send({links:[f.link],_revision:0}).expect(200);
  await f.agent.delete(`/api/story-bible/${f.character.id}`).expect(409);
  await f.agent.put(`/api/story-bible/${f.character.id}`).send({isArchived:true,_revision:0}).expect(200);
  await f.agent.put(f.url).send({links:[{...f.link,note:"Still editable"}],_revision:1}).expect(200);
  await f.agent.put(f.url).send({links:[f.link,{...f.link,role:"cast"}],_revision:2}).expect(400);
  await f.agent.put(f.url).send({links:[],_revision:2}).expect(200);
  await f.agent.delete(`/api/story-bible/${f.character.id}`).expect(204);
  expect(await f.storage.getScene(f.scene.id)).toEqual(f.scene);
});
it("a racing delete or archive cannot leave a newly created invalid target link",async()=>{
  for(const action of ["delete","archive"]) {
    const f=await setup();
    const results=await Promise.all([f.agent.put(f.url).send({links:[f.link],_revision:0}),action==="delete" ? f.agent.delete(`/api/story-bible/${f.character.id}`) : f.agent.put(`/api/story-bible/${f.character.id}`).send({isArchived:true,_revision:0})]);
    const links=(await f.agent.get(f.url)).body.links;
    if(links.length) expect(await f.storage.getStoryBibleEntry(f.character.id)).toBeDefined();
    else expect(results[0].status).toBe(400);
  }
});
it("planning exports resolve current names; manuscript prose stays clean and JSON retains exact links",async()=>{
  const f=await setup();await f.agent.put(f.url).send({links:[{...f.link,note:"Secret scene context <script>alert(1)</script>"}],_revision:0}).expect(200);
  await f.agent.put(`/api/story-bible/${f.character.id}`).send({title:"Mara & Vale",_revision:0}).expect(200);
  const plain=await collectExport(f.storage,f.project,exportOptions.parse({format:"html"}));
  expect(plain.parts.map(p=>p.html).join('')).not.toContain("Secret scene context");
  const plan=await collectExport(f.storage,f.project,exportOptions.parse({format:"json",outline:true,bible:true}));
  expect(plan.parts.find(p=>p.title==="Outline & scene plans")?.html).toContain("Mara &amp; Vale");
  expect(plan.parts.find(p=>p.title==="Outline & scene plans")?.html).toContain("&lt;script&gt;");
  expect(plan.original.sceneContexts[0].links[0].note).toContain("Secret scene context");
  expect(plan.original.scenes?.[0].content).toBe(f.scene.content);
});

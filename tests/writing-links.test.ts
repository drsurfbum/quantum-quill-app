import request from "supertest";
import {twoWriters} from "./helpers";
import {cleanProse,collectExport,exportOptions} from "../server/export";
import {writingLinkCounts} from "../server/writing-links";
const linked=(id:number,words="the navigator")=>`<p><strong><span data-qq-entry="${id}">${words}</span></strong> arrived.</p>`;
async function fixture() {
  const f=await twoWriters();
  const chapter=await f.storage.createChapter({projectId:f.project.id,title:"Chapter",order:0,content:"Original"});
  const sceneChapter=await f.storage.createChapter({projectId:f.project.id,title:"Scenes",order:1,writingMode:"scenes"});
  const scene=await f.storage.createScene({projectId:f.project.id,chapterId:sceneChapter.id,title:"Arrival",order:0,content:"Original"});
  const entry=await f.storage.createStoryBibleEntry({projectId:f.project.id,title:"Mara",entryType:"characters",content:"Secret character notes"});
  return {...f,chapter,scene,entry};
}
it.each(["chapters","scenes"])("%s inline links save by ID, retain alias words through rename and reject concurrent prose overwrites",async resource=>{
  const f=await fixture(),record=resource==="chapters" ? f.chapter : f.scene,url=`/api/${resource}/${record.id}`,content=linked(f.entry.id);
  await f.agent.put(url).send({content,_revision:0}).expect(200);
  await f.agent.put(`/api/story-bible/${f.entry.id}`).send({title:"Mara Vale",_revision:0}).expect(200);
  expect((await f.agent.get(url)).body.content).toBe(content);
  const uses=(await f.agent.get(`/api/story-bible/${f.entry.id}/writing-uses`).expect(200)).body;
  expect(uses).toHaveLength(1);expect(uses[0]).toMatchObject({resource,id:record.id});
  await f.agent.put(url).send({content:"Other device",_revision:0}).expect(409);
  expect((await f.agent.get(url)).body.content).toBe(content);
  await f.other.get(`/api/story-bible/${f.entry.id}/writing-uses`).expect(403);
  await request(f.app).get(`/api/story-bible/${f.entry.id}/writing-uses`).expect(401);
});
it("rejects cross-project, missing, malformed and newly archived targets, without changing originals",async()=>{
  const f=await fixture(),url=`/api/chapters/${f.chapter.id}`;
  const foreign=await f.storage.createStoryBibleEntry({projectId:f.otherProject.id,title:"Private",entryType:"characters",content:""});
  const ownOther=await f.storage.createProject({userId:f.owner.id,title:"Other book"});
  const wrongBook=await f.storage.createStoryBibleEntry({projectId:ownOther.id,title:"Other",entryType:"details",content:""});
  await f.agent.put(`/api/story-bible/${f.entry.id}`).send({isArchived:true,_revision:0}).expect(200);
  for(const id of [foreign.id,wrongBook.id,99999,f.entry.id,-1]) await f.agent.put(url).send({content:linked(id),_revision:0}).expect(400);
  expect((await f.agent.get(url)).body.content).toBe("Original");
  await f.agent.post("/api/chapters").send({projectId:f.project.id,title:"Invalid",order:3,content:linked(foreign.id)}).expect(400);
});
it("retains archived mentions through formatting, blocks deletion, and unlinks without deleting words or pins",async()=>{
  const f=await fixture(),url=`/api/scenes/${f.scene.id}`;
  await f.agent.put(url).send({content:linked(f.entry.id),_revision:0}).expect(200);
  await f.agent.delete(`/api/story-bible/${f.entry.id}`).expect(409);
  await f.agent.put(`/api/story-bible/${f.entry.id}`).send({isArchived:true,_revision:0}).expect(200);
  const formatted=`<p><span data-qq-entry="${f.entry.id}">the </span><em><span data-qq-entry="${f.entry.id}">navigator</span></em> arrived.</p>`;
  await f.agent.put(url).send({content:formatted,_revision:1}).expect(200);
  await f.agent.delete(`/api/story-bible/${f.entry.id}`).expect(409);
  await f.agent.put(url).send({content:"<p>the navigator arrived.</p>",_revision:2}).expect(200);
  await f.agent.delete(`/api/story-bible/${f.entry.id}`).expect(204);
  expect((await f.agent.get(url)).body.content).toContain("the navigator arrived.");
});
it("project locking prevents a racing target deletion from leaving an orphan mention",async()=>{
  const f=await fixture(),url=`/api/scenes/${f.scene.id}`;
  const responses=await Promise.all([f.agent.put(url).send({content:linked(f.entry.id),_revision:0}),f.agent.delete(`/api/story-bible/${f.entry.id}`)]);
  const content=(await f.agent.get(url)).body.content;
  if(writingLinkCounts(content).size){expect(responses[1].status).toBe(409);expect(await f.storage.getStoryBibleEntry(f.entry.id)).toBeDefined();}
  else expect(responses[0].status).toBe(400);
});
it("manuscript exports keep formatting and words without reference metadata or private Bible notes; JSON keeps originals",async()=>{
  const f=await fixture(),content=linked(f.entry.id);
  await f.agent.put(`/api/chapters/${f.chapter.id}`).send({content,_revision:0}).expect(200);
  const data=await collectExport(f.storage,f.project,exportOptions.parse({format:"html"}));
  const html=data.parts[0].html;
  expect(html).toContain("<strong><span>the navigator</span></strong>");
  expect(html).not.toMatch(/data-qq|Secret character notes/);
  expect(data.original.chapters?.[0].content).toBe(content);
  expect(cleanProse(`<p><span data-qq-entry="1" onclick="evil()">Words</span></p>`)).toBe("<p><span>Words</span></p>");
});
it("stub creation is project-scoped and reuses a matching active entry on retries",async()=>{
  const f=await fixture(),url=`/api/projects/${f.project.id}/bible-stubs`,payload={title:"  The lighthouse  ",entryType:"locations"};
  const result=await Promise.all([f.agent.post(url).send(payload),f.agent.post(url).send(payload)]);
  expect(result.map(r=>r.status)).toEqual([200,200]);expect(result[0].body.id).toBe(result[1].body.id);
  expect(result[0].body.title).toBe("The lighthouse");await f.other.post(url).send(payload).expect(403);
  await f.agent.put(`/api/story-bible/${result[0].body.id}`).send({isArchived:true,_revision:0}).expect(200);
  await f.agent.post(url).send(payload).expect(409);
});

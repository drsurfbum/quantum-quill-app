import { randomUUID } from "node:crypto";
import request from "supertest";
import { twoWriters } from "./helpers";
import { cleanProse, collectExport, exportOptions } from "../server/export";

async function setup(resource:"chapters"|"scenes") {
  const f = await twoWriters();
  const chapter = await f.storage.createChapter({projectId:f.project.id,title:"Synthetic chapter",order:0,writingMode:resource==="scenes"?"scenes":"chapter",content:resource==="chapters"?"Original Ω  <literal>\n\n":""});
  const record = resource==="chapters" ? chapter : await f.storage.createScene({projectId:f.project.id,chapterId:chapter.id,title:"Synthetic scene",order:0,content:"Original Ω  <literal>\n\n",summary:"Keep the plan",storyBeats:[]});
  const url = `/api/${resource}/${record.id}`;
  return {...f,chapter,record,url,history:`${url}/history`};
}
it.each(["chapters","scenes"] as const)("%s preserves exact prose and restores as a new revision without changing planning or exports",async resource=>{
  const f=await setup(resource);
  expect((await f.agent.get(f.history)).body.versions).toEqual([]);
  const content='<p style="line-height:1.5"><strong>A  new Ω draft </strong><a href="https://example.test">link</a></p><p></p>';
  await f.agent.put(f.url).send({content,_revision:0}).expect(200);
  const list=(await f.agent.get(f.history).expect(200)).body;
  expect(list.versions.map((r:any)=>r.kind)).toEqual(["save","baseline"]);
  expect(list.versions[0].content).toBeUndefined();expect(list.versions[0].requestId).toBeUndefined();
  const old=list.versions[1];
  const review=(await f.agent.get(`${f.history}/${old.id}`).expect(200)).body;
  expect(review.current.revision).toBe(1);expect(review.previewHtml).toContain('&lt;literal&gt;');
  const body={versionId:old.id,expectedRevision:1,requestId:randomUUID()};
  const restored=(await f.agent.post(`${f.history}/restore`).send(body).expect(200)).body;
  expect(restored.content).toBe(f.record.content);expect(restored.revision).toBe(2);
  expect(restored.title).toBe(f.record.title);expect(restored.order).toBe(0);
  if(resource==="scenes") expect(restored.summary).toBe("Keep the plan");
  expect((await f.agent.post(`${f.history}/restore`).send(body).expect(200)).body).toEqual(restored);
  const history=(await f.agent.get(f.history)).body.versions;
  expect(history).toHaveLength(3);expect(history[0]).toMatchObject({kind:"restore",restoredFromId:old.id,revision:2});
  const saved=await f.storage.getProseVersion(f.project.id,resource,f.record.id,list.versions[0].id);
  expect(saved!.content).toBe(content);
  const exported=await collectExport(f.storage,f.project,exportOptions.parse({format:"html"}));
  expect(exported.parts).toHaveLength(1);expect(exported.parts[0].html).toContain("Original Ω");expect(exported.parts[0].html).not.toContain("new Ω draft");
  await f.agent.put(f.url).send({content:"Later writing",_revision:2}).expect(200);
  await f.agent.post(`${f.history}/restore`).send(body).expect(409);
  expect((await f.agent.get(f.url)).body.content).toBe("Later writing");
});
it.each(["chapters","scenes"] as const)("%s history enforces authentication, account/project/document boundaries and stale review protection",async resource=>{
  const f=await setup(resource);await f.agent.put(f.url).send({content:"Second",_revision:0}).expect(200);
  const version=(await f.agent.get(f.history)).body.versions[1];
  await request(f.server).get(f.history).expect(401);
  for(const path of [f.history,`${f.history}/${version.id}`]) await f.other.get(path).expect(403);
  await f.agent.get(f.history).set('X-QQ-Account',String(f.otherUser.id)).expect(409);
  await f.other.post(`${f.history}/restore`).send({versionId:version.id,expectedRevision:1,requestId:randomUUID()}).expect(403);
  const second=await f.storage.createChapter({projectId:f.project.id,title:"Different chapter",order:2,content:"Separate"});
  await f.agent.get(`/api/chapters/${second.id}/history/${version.id}`).expect(404);
  await f.agent.post(`/api/chapters/${second.id}/history/restore`).send({versionId:version.id,expectedRevision:0,requestId:randomUUID()}).expect(404);
  const sibling=await f.storage.createProject({userId:f.owner.id,title:"Separate book"});
  const other=await f.storage.createChapter({projectId:sibling.id,title:"Other book chapter",order:0});
  await f.agent.post(`/api/chapters/${other.id}/history/restore`).send({versionId:version.id,expectedRevision:0,requestId:randomUUID()}).expect(404);
  await f.agent.post(`${f.history}/restore`).send({versionId:version.id,requestId:randomUUID()}).expect(400);
  await f.agent.put(f.url).send({content:"Other device",_revision:1}).expect(200);
  await f.agent.post(`${f.history}/restore`).send({versionId:version.id,expectedRevision:1,requestId:randomUUID()}).expect(409);
  expect((await f.agent.get(f.url)).body.content).toBe("Other device");
});
it("only changed prose adds automatic checkpoints; restores always append, even identical prose",async()=>{
  const f=await setup("chapters");
  await f.agent.put(f.url).send({title:"Renamed",_revision:0}).expect(200);
  await f.agent.put(f.url).send({content:f.record.content,_revision:1}).expect(200);
  expect((await f.agent.get(f.history)).body.versions).toHaveLength(0);
  await f.agent.put(f.url).send({content:"Changed",_revision:2}).expect(200);
  const versions=(await f.agent.get(f.history)).body.versions;expect(versions).toHaveLength(2);expect(versions[1].revision).toBe(2);
  await f.agent.post(`${f.history}/restore`).send({versionId:versions[0].id,expectedRevision:3,requestId:randomUUID()}).expect(200);
  expect((await f.agent.get(f.history)).body.versions).toHaveLength(3);
});
it("paginates without exposing prose and preserves checkpoints under competing saves/restores",async()=>{
  const f=await setup("chapters");
  for(let revision=0;revision<23;revision++) await f.agent.put(f.url).send({content:`Synthetic ${revision}`,_revision:revision}).expect(200);
  const page=(await f.agent.get(f.history)).body;expect(page.versions).toHaveLength(20);
  const tail=(await f.agent.get(`${f.history}?before=${page.nextBefore}`)).body;expect(tail.versions).toHaveLength(4);expect(tail.nextBefore).toBeNull();
  const results=await Promise.all([f.agent.put(f.url).send({content:"Competing",_revision:23}),f.agent.post(`${f.history}/restore`).send({versionId:tail.versions.at(-1).id,expectedRevision:23,requestId:randomUUID()})]);
  expect(results.map(r=>r.status).sort()).toEqual([200,409]);
  expect((await f.agent.get(f.url)).body.revision).toBe(24);
});
it("preserves historical inline links, allows existing archived references and blocks missing targets without rewriting",async()=>{
  const f=await setup("scenes");
  const entry=await f.storage.createStoryBibleEntry({projectId:f.project.id,title:"Invented navigator",entryType:"characters",content:""});
  const linked=`<p><strong><span data-qq-entry="${entry.id}">the navigator</span></strong></p>`;
  await f.agent.put(f.url).send({content:linked,_revision:0}).expect(200);
  const version=(await f.agent.get(f.history)).body.versions[0];
  await f.agent.put(f.url).send({content:"Unlinked",_revision:1}).expect(200);
  await f.agent.put(`/api/story-bible/${entry.id}`).send({isArchived:true,_revision:0}).expect(200);
  await f.agent.post(`${f.history}/restore`).send({versionId:version.id,expectedRevision:2,requestId:randomUUID()}).expect(200);
  expect((await f.agent.get(f.url)).body.content).toBe(linked);
  await f.agent.put(f.url).send({content:"Unlinked again",_revision:3}).expect(200);
  await f.agent.delete(`/api/story-bible/${entry.id}`).expect(204);
  expect((await f.agent.get(`${f.history}/${version.id}`)).body.issues[0]).toMatch(/unavailable/);
  await f.agent.post(`${f.history}/restore`).send({versionId:version.id,expectedRevision:4,requestId:randomUUID()}).expect(400);
  expect((await f.storage.getProseVersion(f.project.id,"scenes",f.record.id,version.id))!.content).toBe(linked);
});
it("preview strips executable and outbound content while keeping formatted words",()=>{
  const html=cleanProse('<p style="font-size:18pt"><a href="https://example.test">Link text</a><img src="https://example.test/track" onerror="alert(1)"><script>alert(1)</script><strong>Kept</strong></p>',new Map(),true);
  expect(html).toContain('font-size:18pt');expect(html).toContain('Link text');expect(html).toContain('<strong>Kept</strong>');
  expect(html).not.toMatch(/script|href=|onerror|<img/);expect(html).toContain('title="https://example.test"');
});

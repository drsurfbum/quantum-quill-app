import { randomUUID } from "node:crypto";
import { twoWriters } from "./helpers";
import { legacyRelationships } from "../shared/relationships";

async function setup() {
  const c = await twoWriters();
  const entries: Record<string, any> = {};
  for (const type of ["characters", "events", "groups_races", "locations", "world_elements", "details", "research"]) entries[type] = (await c.agent.post("/api/story-bible").send({ projectId: c.project.id, entryType: type, title: type }).expect(201)).body;
  const url = `/api/projects/${c.project.id}/relationships`;
  const make = (source: string, target: string, relationshipType: string, extra = {}) => c.agent.post(url).send({ sourceId: entries[source].id, targetId: entries[target].id, relationshipType, requestId: randomUUID(), ...extra });
  return { ...c, entries, url, make };
}
const input = (link: any, patch = {}) => ({ sourceId: link.sourceId, targetId: link.targetId, relationshipType: link.relationshipType, role: link.role, context: link.context, startDate: link.startDate, endDate: link.endDate, _version: link.version, ...patch });

it.each([
  ["events","characters","participant"], ["events","events","consequence"], ["events","locations","occurs_at"],
  ["groups_races","characters","member"], ["groups_races","characters","leader"], ["locations","groups_races","governed_by"],
  ["locations","events","history"], ["world_elements","characters","used_by"], ["world_elements","locations","affects"],
  ["world_elements","research","reference"], ["characters","groups_races","affiliation"], ["details","world_elements","application"], ["research","details","application"],
])('%s → %s %s: create, edit, rename, remove round trip without copied names', async (source, target, type) => {
  const c = await setup();
  if (source === target) c.entries[target + "2"] = (await c.agent.post('/api/story-bible').send({ projectId: c.project.id, entryType: target, title: 'Second target' }).expect(201)).body;
  const targetKey = source === target ? target + "2" : target;
  const link = (await c.make(source, targetKey, type, { role: "Witness", context: "A lasting consequence", startDate: "Third Age", endDate: "Cycle 12" }).expect(201)).body;
  expect(link).toMatchObject({ sourceId: c.entries[source].id, targetId: c.entries[targetKey].id, relationshipType: type, role: 'Witness', startDate: 'Third Age', endDate: 'Cycle 12' });
  const endpoint = `${c.url}/${encodeURIComponent(link.id)}`;
  const edited = (await c.agent.put(endpoint).send(input(link, { role: 'Founder', context: 'Revised' })).expect(200)).body;
  await c.agent.put(endpoint).send(input(link, { context: 'Stale' })).expect(409);
  await c.agent.put(`/api/story-bible/${link.targetId}`).send({ _revision: 0, title: 'Renamed | target' }).expect(200);
  const listed = (await c.agent.get(c.url).expect(200)).body.find((row: any) => row.id === link.id);
  expect(listed).toMatchObject({ role: 'Founder', context: 'Revised' }); expect(listed).not.toHaveProperty('name');
  await c.agent.delete(endpoint).send({ _version: edited.version }).expect(204);
  expect((await c.agent.get(c.url).expect(200)).body).not.toContainEqual(expect.objectContaining({ id: link.id }));
});

it('enforces account/project, target type, self-link, strict names and duplicate guards', async () => {
  const c = await setup();
  await c.other.get(c.url).expect(403);
  const foreign = await c.storage.createStoryBibleEntry({ projectId: c.otherProject.id, entryType: 'characters', title: 'Private' });
  await c.make('events','characters','participant',{ targetId: foreign.id }).expect(400);
  await c.make('events','characters','participant',{ sourceId: foreign.id }).expect(400);
  await c.make('events','characters','participant',{ targetId: 999999 }).expect(400);
  await c.make('events','locations','participant').expect(400);
  await c.make('characters','locations','participant').expect(400);
  await c.make('events','events','consequence').expect(400);
  await c.make('events','characters','participant',{ name: 'Do not store a copied name' }).expect(400);
  const link = (await c.make('events','characters','participant').expect(201)).body;
  await c.make('events','characters','participant').expect(409);
  await c.other.put(`${c.url}/${link.id}`).send(input(link)).expect(403);
  await c.other.delete(`${c.url}/${link.id}`).send({ _version: link.version }).expect(403);
  const wrong = `/api/projects/${c.otherProject.id}/relationships/${link.id}`;
  await c.other.put(wrong).send(input(link)).expect(404);
});

it('blocks linked deletion; archiving preserves both directions, rejects new links, and allows explicit unlink', async () => {
  const c = await setup(), link = (await c.make('events','characters','participant').expect(201)).body;
  for (const id of [link.sourceId,link.targetId]) await c.agent.delete(`/api/story-bible/${id}`).expect(409);
  await c.agent.put(`/api/story-bible/${link.targetId}`).send({ _revision: 0, isArchived: true }).expect(200);
  expect((await c.agent.get(c.url).expect(200)).body).toContainEqual(expect.objectContaining({ id: link.id }));
  await c.agent.put(`${c.url}/${link.id}`).send(input(link,{ role:'new' })).expect(409);
  await c.make('groups_races','characters','member').expect(409);
  await c.agent.delete(`${c.url}/${link.id}`).send({ _version: link.version }).expect(204);
  await c.agent.delete(`/api/story-bible/${link.targetId}`).expect(204);
});

it('safe stub creation is atomic, idempotent on retry, deduplicated and type checked', async () => {
  const c = await setup(), payload = { sourceId: c.entries.events.id, relationshipType: 'participant', requestId: randomUUID(), stub: { title:'New witness', entryType:'characters' }, context:'Knows the secret' };
  const before = (await c.storage.getProjectStoryBible(c.project.id)).length;
  await c.agent.post(c.url).send({ ...payload, stub: { ...payload.stub, entryType:'research' } }).expect(400);
  expect((await c.storage.getProjectStoryBible(c.project.id)).length).toBe(before);
  const first = (await c.agent.post(c.url).send(payload).expect(201)).body;
  const again = (await c.agent.post(c.url).send(payload).expect(201)).body;
  expect(again.id).toBe(first.id); expect(again.targetId).toBe(first.targetId);
  expect((await c.storage.getProjectStoryBible(c.project.id)).length).toBe(before + 1);
  await c.agent.post(c.url).send({ ...payload, requestId: randomUUID() }).expect(409);
  expect((await c.agent.get(`/api/story-bible/${first.targetId}`).expect(200)).body.metadata._stub).toBe(true);
  await c.agent.delete(`${c.url}/${first.id}`).send({ _version:first.version }).expect(204);
  await c.agent.post(c.url).send(payload).expect(409);
});

it('uses one hierarchy across new and recovered parents, including inverted child lists', async () => {
  const c = await setup(), a = c.entries.world_elements;
  const b = await c.storage.createStoryBibleEntry({ projectId: c.project.id, entryType:'world_elements', title:'B' });
  const d = await c.storage.createStoryBibleEntry({ projectId: c.project.id, entryType:'world_elements', title:'C', content: JSON.stringify({ childElements:[{ id:b.id, name:'Old B' }] }) });
  // B -> C is read from C's recovered child list.
  await c.agent.post(c.url).send({ sourceId:a.id,targetId:b.id,relationshipType:'parent',requestId:randomUUID() }).expect(201);
  await c.agent.post(c.url).send({ sourceId:d.id,targetId:a.id,relationshipType:'parent',requestId:randomUUID() }).expect(400);
  await c.agent.put(`/api/story-bible/${d.id}`).send({ _revision:0, content:JSON.stringify({ parentElement:{id:a.id} }) }).expect(400);
  const peers = await Promise.all(['D','E'].map(title=>c.storage.createStoryBibleEntry({ projectId:c.project.id,entryType:'locations',title })));
  const results = await Promise.all([[peers[0],peers[1]],[peers[1],peers[0]]].map(([s,t])=>c.agent.post(c.url).send({sourceId:s.id,targetId:t.id,relationshipType:'parent',requestId:randomUUID()})));
  expect(results.map(r=>r.status).sort()).toEqual([201,400]);
});

it('editing and removing recovered links leaves all original fields unchanged and hides old names', async () => {
  const c = await setup();
  const original = await c.storage.updateStoryBibleEntry(c.entries.events.id, {content:JSON.stringify({charactersInvolved:[{id:c.entries.characters.id,name:'Stale copy',role:'Witness',context:'Original context',unknown:{keep:1}}],custom:'kept'})});
  const link = (await c.agent.get(c.url).expect(200)).body[0];
  expect(link).toMatchObject({ relationshipType:'participant',role:'Witness',context:'Original context' }); expect(JSON.stringify(link)).not.toContain('Stale copy');
  const updated = (await c.agent.put(`${c.url}/${encodeURIComponent(link.id)}`).send(input(link,{context:'New context'})).expect(200)).body;
  expect(await c.storage.getStoryBibleEntry(original!.id)).toEqual(original);
  await c.agent.delete(`${c.url}/${encodeURIComponent(link.id)}`).send({_version:updated.version}).expect(204);
  await c.agent.put(`/api/story-bible/${original!.id}`).send({_revision:original!.revision,title:'Renamed event'}).expect(200);
  expect((await c.agent.get(c.url).expect(200)).body).toEqual([]);
  expect((await c.storage.getStoryBibleEntry(original!.id))!.content).toBe(original!.content);
});

it('legacy projection retains dates/roles, handles specialized inhabitants, and never guesses prose into IDs', () => {
  const entry = { id:1,projectId:1,revision:0,entryType:'locations',metadata:{dominantGroups:[{id:2,role:'Settlers',startDate:'Year zero'}],notableCharacters:[{id:3,role:'Founder'}],worldElements:['Moonstone'],governingBody:'The assembly',controllingGroups:[4]} } as any;
  const links=legacyRelationships([entry]); expect(links).toHaveLength(3);
  expect(links).toContainEqual(expect.objectContaining({targetId:4,relationshipType:'governed_by'}));
  expect(links.find(link=>link.targetId===2)).toMatchObject({targetId:2,relationshipType:'inhabitant',role:'Settlers',startDate:'Year zero'});
});

it('request IDs cannot alter links in another project and reject mismatched retries',async()=>{
 const c=await setup(),requestId=randomUUID();
 const payload={sourceId:c.entries.events.id,targetId:c.entries.characters.id,relationshipType:'participant',requestId};
 const link=(await c.agent.post(c.url).send(payload).expect(201)).body;
 await c.agent.post(c.url).send({...payload,role:'A different operation'}).expect(409);
 const a=await c.storage.createStoryBibleEntry({projectId:c.otherProject.id,entryType:'events',title:'Other event'});
 const b=await c.storage.createStoryBibleEntry({projectId:c.otherProject.id,entryType:'characters',title:'Other person'});
 await c.other.post(`/api/projects/${c.otherProject.id}/relationships`).send({...payload,sourceId:a.id,targetId:b.id}).expect(201);
 expect((await c.agent.get(c.url).expect(200)).body).toContainEqual(expect.objectContaining({id:link.id,sourceId:c.entries.events.id,targetId:c.entries.characters.id}));
});

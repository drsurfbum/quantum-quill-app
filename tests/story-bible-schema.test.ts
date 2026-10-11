import { twoWriters } from "./helpers";
import { prepareBiblePatch, readBibleFields, bibleLinks } from "../shared/story-bible";
it("compatibility readers preserve legacy prose, scalar JSON and unknown attributes without modifying input", () => {
  for (const [entryType, field] of [["events", "narrativeContext"], ["world_elements", "shortNotes"], ["details", "content"], ["research", "detailedNotes"]]) {
    for (const content of ["Unfinished prose", "[1,2]", '"quoted prose"']) {
      const entry = { entryType, content, metadata: { custom: "keep" }, tags: ["top"], isArchived: false };
      const before = JSON.stringify(entry);
      expect(readBibleFields(entry)[field]).toBe(content);
      expect(readBibleFields(entry).custom).toBe("keep");
      expect(JSON.stringify(entry)).toBe(before);
    }
  }
});
it("versioned edits preserve unknown fields/raw prose and keep tags/archive mirrors consistent", () => {
  const next = prepareBiblePatch({ entryType: "details", content: "Original raw notes" }, { content: JSON.stringify({ content: "Edited prose", custom: { keep: true }, tags: ["plot"], isArchived: true }) });
  expect(JSON.parse(next.content!)).toMatchObject({ _schemaVersion: 1, _legacyContent: "Original raw notes", custom: { keep: true } });
  expect(next).toMatchObject({ tags: ["plot"], isArchived: true });
  const second = prepareBiblePatch({ ...next, entryType: "details" }, { tags: [], isArchived: false });
  expect(JSON.parse(second.content!)).toMatchObject({ tags: [], isArchived: false, custom: { keep: true } });
});
it("rejects newly malformed fields while allowing repairs beside malformed historical fields", () => {
  expect(() => prepareBiblePatch({ entryType: "events" }, { content: JSON.stringify({ locations: "not an array" }) })).toThrow();
  const previous = { entryType: "events", content: JSON.stringify({ locations: "historical malformed", unknown: 42, writerNotes: "old" }) };
  expect(() => prepareBiblePatch(previous, { content: JSON.stringify({ writerNotes: "new" }) })).not.toThrow();
  expect(JSON.parse(prepareBiblePatch(previous, { content: JSON.stringify({ locations: [] }) }).content!)).toMatchObject({ locations: [], unknown: 42 });
});
it("validates IDs/types/projects, parent cycles and incoming deletion across both storage formats", async () => {
  const { agent, other, project, otherProject } = await twoWriters();
  const create = async (entryType: string, extras = {}) => (await agent.post("/api/story-bible").send({ projectId: project.id, entryType, title: entryType, ...extras }).expect(201)).body;
  const character = await create("characters"), groupA = await create("groups_races"), groupB = await create("groups_races"), event = await create("events");
  const foreign = (await other.post("/api/story-bible").send({ projectId: otherProject.id, entryType: "characters", title: "foreign" }).expect(201)).body;
  const url = (id: number) => `/api/story-bible/${id}`;
  for (const id of [foreign.id, event.id, 0, 99999]) await agent.put(url(event.id)).send({ _revision: 0, content: JSON.stringify({ charactersInvolved: [{ id, name: "Ignored cached name" }] }) }).expect(400);
  await agent.put(url(event.id)).send({ _revision: 0, content: JSON.stringify({ charactersInvolved: [{ id: character.id, name: "Old name", role: "Witness" }] }) }).expect(200);
  await agent.delete(url(character.id)).expect(409);
  await agent.put(url(character.id)).send({ _revision: 0, entryType: "locations" }).expect(400);
  await agent.put(url(event.id)).send({ _revision: 1, content: JSON.stringify({ charactersInvolved: [] }) }).expect(200);
  await agent.delete(url(character.id)).expect(204);
  await agent.put(url(groupA.id)).send({ _revision: 0, metadata: { parentGroup: String(groupB.id) } }).expect(200);
  await agent.put(url(groupB.id)).send({ _revision: 0, metadata: { parentGroup: String(groupA.id) } }).expect(400);
  await agent.delete(url(groupB.id)).expect(409);
  await agent.put(url(groupA.id)).send({ _revision: 1, metadata: { parentGroup: "" } }).expect(200);
  await agent.delete(url(groupB.id)).expect(204);
});
it("serializes concurrent relationship writes so two parents cannot create a cycle", async () => {
  const { agent, project } = await twoWriters();
  const make = async (title: string) => (await agent.post("/api/story-bible").send({ projectId: project.id, entryType: "locations", title }).expect(201)).body;
  const a = await make("A"), b = await make("B");
  const results = await Promise.all([[a,b],[b,a]].map(([source,target]) => agent.put(`/api/story-bible/${source.id}`).send({ _revision: 0, metadata: { parentLocation: String(target.id) } })));
  expect(results.map(result => result.status).sort()).toEqual([200,400]);
});
it("does not guess free-text relationships into IDs, and indexes generic and structured links", () => {
  expect(bibleLinks({ entryType: "groups_races", metadata: { alliances: ["Northern Guild"], subGroups: ["A"], notableMembers: [2], parentGroup: "3" }, relatedEntryIds: [4] }).map(link => link.targetId).sort()).toEqual([2,3,4]);
  expect(bibleLinks({ entryType: "research", content: JSON.stringify({ linkedElements: [{ id: 7, type: "events" }] }) })).toContainEqual({ field: "content.linkedElements", targetId: 7, targetType: "events", parent: false });
});

it("refuses to downgrade a future schema version", () => {
  expect(() => prepareBiblePatch({ entryType: "details", content: JSON.stringify({ _schemaVersion: 2, content: "future" }) }, { content: JSON.stringify({ content: "edit" }) })).toThrow();
  expect(() => prepareBiblePatch({ entryType: "characters", metadata: { _schemaVersion: 2 } }, { metadata: { age: "42" } })).toThrow();
});

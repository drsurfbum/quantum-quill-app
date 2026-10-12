import { randomUUID } from "node:crypto";
import { twoWriters } from "./helpers";
async function setup() {
  const f = await twoWriters();
  const template = await f.storage.createPlotStructureTemplate({ name: "Three acts", templateType: "test", sections: [{ key: "start", description: "Upset the ordinary world." }] });
  const plot = await f.storage.createPlotStructure({ projectId: f.project.id, name: "Novel plan", templateId: template.id });
  const beat = await f.storage.createPlotStructureSection({ plotStructureId: plot.id, sectionKey: "start", title: "Opening", content: "Original plot notes", order: 0 });
  const legacy = await f.storage.createChapter({ projectId: f.project.id, title: "Existing chapter", content: "Original <literal> plain text\n  stays exactly", order: 4 });
  const url = `/api/projects/${f.project.id}/blueprint`;
  const source = (await f.agent.get(`${url}/${plot.id}`).expect(200)).body;
  const plan = { requestId: randomUUID(), structureId: plot.id, snapshot: source.snapshot, chapters: [{ title: "New chapter", scenes: [{ title: "Scene A", summary: "Outline, not prose", sectionId: beat.id }, { title: "Scene B", summary: "Another plan", sectionId: beat.id }] }] };
  return { ...f, plot, beat, legacy, source, url, plan };
}
it("project setup validates metadata, retains a retry result, and scopes creation to the signed-in account", async () => {
  const f = await twoWriters();
  const input = { requestId: randomUUID(), title: "The Long Road", description: "One last journey.", settings: { author: "Pen Name", genre: "Fantasy", targetWordCount: 75000 } };
  const results = await Promise.all([f.agent.post("/api/project-setup").send(input), f.agent.post("/api/project-setup").send(input)]);
  expect(results.map(r => r.status)).toEqual([201, 201]); expect(results[0].body.id).toBe(results[1].body.id);
  expect(results[0].body).toMatchObject({ title: input.title, description: input.description, settings: input.settings, userId: f.owner.id });
  await f.agent.post("/api/project-setup").send({ ...input, title: "Changed request" }).expect(409);
  const other = (await f.other.post("/api/project-setup").send(input).expect(201)).body;
  expect(other.id).not.toBe(results[0].body.id); expect(other.userId).toBe(f.otherUser.id);
  await f.agent.post("/api/project-setup").send({ ...input, requestId: randomUUID(), settings: { ...input.settings, targetWordCount: -1 } }).expect(400);
  await f.agent.post("/api/project-setup").send({ ...input, userId: f.otherUser.id }).expect(400);
});
it("Blueprint appends ordered scene chapters without altering any original prose or beat notes; retries never duplicate", async () => {
  const f = await setup();
  expect(f.source.sections[0].guidance).toBe("Upset the ordinary world.");
  const result = (await f.agent.post(f.url).send(f.plan).expect(201)).body;
  expect((await f.agent.post(f.url).send(f.plan).expect(201)).body).toEqual(result);
  const chapters = await f.storage.getProjectChapters(f.project.id), scenes = await f.storage.getProjectScenes(f.project.id);
  expect(chapters).toHaveLength(2); expect(chapters[0]).toEqual(f.legacy);
  expect(chapters[1]).toMatchObject({ order: 5, writingMode: "scenes", content: "" });
  expect(scenes.map(s => [s.title, s.order, s.summary, s.content, s.linkedSectionId])).toEqual([["Scene A", 0, "Outline, not prose", "", f.beat.id], ["Scene B", 1, "Another plan", "", f.beat.id]]);
  expect(await f.storage.getPlotStructureSection(f.beat.id)).toEqual(f.beat);
});
it.each(["beat", "chapter"])("stale %s previews are rejected and the same request can be reviewed before building", async kind => {
  const f = await setup();
  if (kind === "beat") await f.agent.put(`/api/plot-structure-sections/${f.beat.id}`).send({ content: "New notes", _revision: 0 }).expect(200);
  else await f.agent.put(`/api/chapters/${f.legacy.id}`).send({ content: "New writing", _revision: 0 }).expect(200);
  expect((await f.agent.post(f.url).send(f.plan).expect(409)).body.code).toBe("BLUEPRINT_STALE");
  expect(await f.storage.getProjectScenes(f.project.id)).toHaveLength(0);
  const source = (await f.agent.get(`${f.url}/${f.plot.id}`).expect(200)).body;
  await f.agent.post(f.url).send({ ...f.plan, snapshot: source.snapshot }).expect(201);
});
it("two different requests built from the same preview cannot duplicate a plan", async () => {
  const f = await setup();
  const results = await Promise.all([f.agent.post(f.url).send(f.plan), f.agent.post(f.url).send({ ...f.plan, requestId: randomUUID() })]);
  expect(results.map(r => r.status).sort()).toEqual([201, 409]); expect(await f.storage.getProjectScenes(f.project.id)).toHaveLength(2);
});
it("failed Blueprint creation rolls back every inserted chapter and scene and remains retryable", async () => {
  const f = await setup(), original = f.storage.createScene.bind(f.storage); let writes = 0;
  const spy = jest.spyOn(f.storage, "createScene").mockImplementation(async data => { if (++writes === 2) throw new Error("Synthetic storage failure"); return original(data); });
  await f.agent.post(f.url).send(f.plan).expect(500);
  expect(await f.storage.getProjectChapters(f.project.id)).toEqual([f.legacy]); expect(await f.storage.getProjectScenes(f.project.id)).toEqual([]);
  expect(await f.storage.getCreationRequest(f.project.id, f.plan.requestId)).toBeUndefined();
  spy.mockRestore(); await f.agent.post(f.url).send(f.plan).expect(201);
});
it("rejects foreign projects, beats, duplicate chapter titles, invalid scene fields and raw writing-mode changes", async () => {
  const f = await setup();
  await f.other.get(`${f.url}/${f.plot.id}`).expect(403); await f.other.post(f.url).send(f.plan).expect(403);
  await f.agent.get(`/api/projects/${f.otherProject.id}/blueprint/${f.plot.id}`).expect(403);
  await f.agent.post(f.url).send({ ...f.plan, chapters: [{ title: f.legacy.title, scenes: f.plan.chapters[0].scenes }] }).expect(409);
  await f.agent.post(f.url).send({ ...f.plan, chapters: [{ title: "New", scenes: [{ title: "Scene", summary: "", sectionId: 99999 }] }] }).expect(400);
  await f.agent.put(`/api/chapters/${f.legacy.id}`).send({ writingMode: "scenes", _revision: 0 }).expect(400);
  await f.agent.post(`/api/projects/${f.project.id}/scenes`).send({ requestId: randomUUID(), chapterId: f.legacy.id, title: "Unsafe" }).expect(409);
  await f.agent.post("/api/chapters").send({ projectId: f.project.id, title: "Mixed", writingMode: "scenes", content: "would be hidden", order: 9 }).expect(409);
});
it("scene writes enforce revisions/account ownership; linked beats and chapters cannot erase writing", async () => {
  const f = await setup(), created = (await f.agent.post(f.url).send(f.plan).expect(201)).body;
  const sceneId = created.sceneIds[0], url = `/api/scenes/${sceneId}`;
  await f.other.get(url).expect(403); await f.other.put(url).send({ content: "foreign", _revision: 0 }).expect(403);
  await f.agent.put(url).set("X-QQ-Account", String(f.otherUser.id)).send({ content: "stale account", _revision: 0 }).expect(409);
  await f.agent.put(url).send({ content: "unguarded" }).expect(428);
  const writes = await Promise.all(["A", "B"].map(content => f.agent.put(url).send({ content, _revision: 0, _base: { content: "" } })));
  expect(writes.map(r => r.status).sort()).toEqual([200, 409]);
  await f.agent.put(url).send({ title: "Renamed", summary: "Revised summary", _revision: 1, _base: { title: "Scene A", summary: "Outline, not prose" } }).expect(200);
  await f.agent.put(url).send({ projectId: f.otherProject.id, _revision: 2 }).expect(400);
  await f.agent.put(`/api/chapters/${created.chapterIds[0]}`).send({ content: "Hidden text", _revision: 0 }).expect(409);
  await f.agent.delete(`/api/chapters/${created.chapterIds[0]}`).expect(409);
  await f.agent.delete(`/api/plot-structure-sections/${f.beat.id}`).expect(409);
  await f.agent.put(`/api/plot-structure-sections/${f.beat.id}`).send({ title: "Renamed beat", _revision: 0 }).expect(200);
  expect((await f.agent.get(url).expect(200)).body.linkedSectionId).toBe(f.beat.id);
  const input = { requestId: randomUUID(), chapterId: created.chapterIds[0], title: "Scene C" };
  const a = (await f.agent.post(`/api/projects/${f.project.id}/scenes`).send(input).expect(201)).body;
  const b = (await f.agent.post(`/api/projects/${f.project.id}/scenes`).send(input).expect(201)).body;
  expect(a.id).toBe(b.id); expect(a.order).toBe(2);
  await f.agent.post(`/api/projects/${f.project.id}/scenes`).send({ ...input, title: "Changed retry" }).expect(409);
});
it("a failed wizard transaction does not roll back an unrelated project created concurrently", async () => {
  const f = await twoWriters();
  const spy = jest.spyOn(f.storage, "putCreationRequest").mockImplementationOnce(async () => {
    await f.storage.createProject({ title: "Other tab project", userId: f.owner.id });
    throw new Error("Synthetic receipt failure");
  });
  await f.agent.post("/api/project-setup").send({ requestId: randomUUID(), title: "Failed wizard", settings: {} }).expect(500);
  spy.mockRestore();
  expect((await f.storage.getUserProjects(f.owner.id)).map(p => p.title).sort()).toEqual(["Other tab project", "Synthetic project"]);
});
it("manual outlining can skip Storyboard and atomically create a chapter/scene with retry protection", async () => {
  const f = await twoWriters(), url = `/api/projects/${f.project.id}/scenes`;
  const input = { requestId: randomUUID(), chapterTitle: "From scratch", title: "Unplanned arrival", summary: "Optional scene plan" };
  const results = await Promise.all([f.agent.post(url).send(input), f.agent.post(url).send(input)]);
  expect(results.map(r => r.status)).toEqual([201, 201]); expect(results[0].body.id).toBe(results[1].body.id);
  expect(results[0].body).toMatchObject({ linkedSectionId: null, content: "", storyBeats: [] });
  expect(await f.storage.getProjectChapters(f.project.id)).toHaveLength(1);
  await f.agent.post(url).send({ ...input, requestId: randomUUID() }).expect(409);
  await f.other.post(url).send(input).expect(403);
  await f.agent.post(url).send({ ...input, chapterId: results[0].body.chapterId }).expect(400);
  const spy = jest.spyOn(f.storage, "createScene").mockRejectedValueOnce(new Error("Synthetic write failure"));
  const retry = { ...input, requestId: randomUUID(), chapterTitle: "Retry after failure" };
  await f.agent.post(url).send(retry).expect(500); spy.mockRestore();
  expect(await f.storage.getProjectChapters(f.project.id)).toHaveLength(1);
  await f.agent.post(url).send(retry).expect(201);
});
it("scene story beats round-trip independently from prose, reject invalid fields and protect concurrent edits", async () => {
  const f = await setup(), created = (await f.agent.post(f.url).send(f.plan).expect(201)).body;
  const url = `/api/scenes/${created.sceneIds[0]}`;
  const beats = [{ id: randomUUID(), text: "A knock at the door." }, { id: randomUUID(), text: "The visitor recognizes her." }];
  const saved = (await f.agent.put(url).send({ storyBeats: beats, _revision: 0 }).expect(200)).body;
  expect(saved).toMatchObject({ storyBeats: beats, summary: "Outline, not prose", content: "" });
  await f.agent.put(url).send({ storyBeats: [], _revision: 0 }).expect(409);
  await f.other.put(url).send({ storyBeats: [], _revision: 1 }).expect(403);
  await f.agent.put(url).send({ storyBeats: [beats[0], beats[0]], _revision: 1 }).expect(400);
  await f.agent.put(url).send({ storyBeats: [{ id: randomUUID(), text: "x".repeat(10001) }], _revision: 1 }).expect(400);
  await f.agent.put(url).send({ storyBeats: "invalid", _revision: 1 }).expect(400);
  await f.agent.put(url).send({ storyBeats: [...beats].reverse(), _revision: 1 }).expect(200);
  await f.agent.put(url).send({ content: "<p>Manuscript stays independent.</p>", _revision: 2 }).expect(200);
  const read = (await f.agent.get(url).expect(200)).body;
  expect(read.storyBeats).toEqual([...beats].reverse());
  await f.agent.put(url).send({ storyBeats: [], _revision: read.revision }).expect(200);
  expect((await f.agent.get(url).expect(200)).body.content).toBe(read.content);
});

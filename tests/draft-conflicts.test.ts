import { twoWriters } from "./helpers";
it("atomically rejects competing writes from the same base, and requires an acknowledged revision for subsequent writes", async () => {
  const { agent, project } = await twoWriters();
  const record = (await agent.post("/api/chapters").send({ projectId: project.id, title: "Chapter", order: 1, content: "original" }).expect(201)).body;
  const url = `/api/chapters/${record.id}`;
  const results = await Promise.all(["tab A", "tab B"].map(content => agent.put(url).send({ content, _revision: 0, _base: { content: "original" } })));
  expect(results.map(response => response.status).sort()).toEqual([200, 409]);
  await agent.put(url).send({ title: "renamed", _revision: 1, _base: { title: "Chapter" } }).expect(200);
  await agent.put(url).send({ title: "unsafe", content: "unsafe", _base: { title: "renamed" } }).expect(400);
  const saved = (await agent.get(url).expect(200)).body;
  expect(saved.title).toBe("renamed"); expect(["tab A", "tab B"]).toContain(saved.content);
});
it("compares structured data by value and protects every text autosave route", async () => {
  const { agent, project, storage } = await twoWriters();
  const records = [
    ["story-bible", (await agent.post("/api/story-bible").send({ projectId: project.id, entryType: "characters", title: "Character", metadata: { age: "20", notes: "old" } }).expect(201)).body, { metadata: { age: "21" } }, { metadata: { notes: "old", age: "20", _schemaVersion: 1 } }],
    ["outline", (await agent.post("/api/outline").send({ projectId: project.id, title: "Outline", order: 0, content: "old" }).expect(201)).body, { content: "new" }, { content: "old" }],
  ] as const;
  for (const [route, record, patch, base] of records) {
    await agent.put(`/api/${route}/${record.id}`).send({ ...patch, _revision: record.revision, _base: base }).expect(200);
    await agent.put(`/api/${route}/${record.id}`).send({ ...patch, _revision: record.revision, _base: base }).expect(409);
  }
  const template = await storage.createPlotStructureTemplate({ name: "Test", templateType: "test", sections: [] });
  const structure = await storage.createPlotStructure({ projectId: project.id, templateId: template.id, name: "Plot" });
  const section = (await agent.post("/api/plot-structure-sections").send({ plotStructureId: structure.id, sectionKey: "start", title: "Start", order: 0, content: "old" }).expect(201)).body;
  await agent.put(`/api/plot-structure-sections/${section.id}`).send({ content: "new", _revision: section.revision, _base: { content: "old" } }).expect(200);
  await agent.put(`/api/plot-structure-sections/${section.id}`).send({ content: "stale", _revision: section.revision, _base: { content: "old" } }).expect(409);
});

it("rejects unversioned clients, stale revisions after A→B→A, and altered revision fields", async () => {
  const { agent, project } = await twoWriters();
  const record = (await agent.post("/api/chapters").send({ projectId: project.id, title: "ABA fixture", order: 0, content: "A" }).expect(201)).body;
  const url = `/api/chapters/${record.id}`;
  expect(record.revision).toBe(0);
  expect((await agent.put(url).send({ content: "unguarded" }).expect(428)).body.code).toBe("REVISION_REQUIRED");
  await agent.put(url).send({ content: "B", _revision: 0 }).expect(200);
  const restored = (await agent.put(url).send({ content: "A", _revision: 1 }).expect(200)).body;
  expect(restored.revision).toBe(2);
  expect((await agent.put(url).send({ content: "stale overwrite", _revision: 0, _base: { content: "A" } }).expect(409)).body.code).toBe("REVISION_CONFLICT");
  await agent.put(url).send({ content: "invalid", revision: 99, _revision: 2 }).expect(400);
  expect((await agent.get(url)).body.content).toBe("A");
});
it("checks the account expected by a stale tab before returning data or accepting edits", async () => {
  const { other, owner, otherProject } = await twoWriters();
  const record = (await other.post("/api/chapters").send({ projectId: otherProject.id, title: "Private", order: 0, content: "B private" }).expect(201)).body;
  const url = `/api/chapters/${record.id}`;
  for (const method of ["get", "put"] as const) {
    const response = await other[method](url).set("X-QQ-Account", String(owner.id)).send(method === "put" ? { content: "A draft", _revision: record.revision } : undefined).expect(409);
    expect(response.body.code).toBe("ACCOUNT_CHANGED");
    expect(JSON.stringify(response.body)).not.toContain("B private");
  }
  await other.post("/api/logout").set("X-QQ-Account", String(owner.id)).expect(409);
  expect((await other.get(url).expect(200)).body.content).toBe("B private");
});
it("requires revisions for canvas and plot metadata too", async () => {
  const { storage, agent, project } = await twoWriters();
  const board = await storage.createWhiteboard({ projectId: project.id, name: "Board", canvasData: {} });
  const template = await storage.createPlotStructureTemplate({ name: "Template", templateType: "test", sections: [] });
  const plot = await storage.createPlotStructure({ projectId: project.id, templateId: template.id, name: "Plot" });
  for (const [url, patch] of [[`/api/whiteboards/${board.id}`, { canvasData: { text: "note" } }], [`/api/plot-structures/${plot.id}`, { description: "notes" }]] as const) {
    await agent.put(url).send(patch).expect(428);
    expect((await agent.put(url).send({ ...patch, _revision: 0 }).expect(200)).body.revision).toBe(1);
    await agent.put(url).send({ ...patch, _revision: 0 }).expect(409);
  }
});

import { twoWriters } from "./helpers";
it("atomically rejects competing writes from the same base, while allowing unrelated fields", async () => {
  const { agent, project } = await twoWriters();
  const record = (await agent.post("/api/chapters").send({ projectId: project.id, title: "Chapter", order: 1, content: "original" }).expect(201)).body;
  const url = `/api/chapters/${record.id}`;
  const results = await Promise.all(["tab A", "tab B"].map(content => agent.put(url).send({ content, _base: { content: "original" } })));
  expect(results.map(response => response.status).sort()).toEqual([200, 409]);
  await agent.put(url).send({ title: "renamed", _base: { title: "Chapter" } }).expect(200);
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
    await agent.put(`/api/${route}/${record.id}`).send({ ...patch, _base: base }).expect(200);
    await agent.put(`/api/${route}/${record.id}`).send({ ...patch, _base: base }).expect(409);
  }
  const template = await storage.createPlotStructureTemplate({ name: "Test", templateType: "test", sections: [] });
  const structure = await storage.createPlotStructure({ projectId: project.id, templateId: template.id, name: "Plot" });
  const section = (await agent.post("/api/plot-structure-sections").send({ plotStructureId: structure.id, sectionKey: "start", title: "Start", order: 0, content: "old" }).expect(201)).body;
  await agent.put(`/api/plot-structure-sections/${section.id}`).send({ content: "new", _base: { content: "old" } }).expect(200);
  await agent.put(`/api/plot-structure-sections/${section.id}`).send({ content: "stale", _base: { content: "old" } }).expect(409);
});

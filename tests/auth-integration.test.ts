import request from "supertest";
import { twoWriters } from "./helpers";

const kinds = [
  { route: "chapters", list: "chapters", data: { title: "Chapter", content: "Draft", order: 0 } },
  { route: "whiteboards", list: "whiteboards", data: { name: "Board", canvasData: {} } },
  { route: "outline", list: "outline", data: { title: "Outline", parentId: null, order: 0 } },
  { route: "story-bible", list: "story-bible", data: { title: "Character", entryType: "characters", metadata: {} } },
];
describe("Project ownership and writable fields", () => {
  it.each(kinds)("protects $route reads, lists, creates, updates and deletes", async ({ route, list, data }) => {
    const { app, agent, other, project, otherProject, storage } = await twoWriters();
    const created = await agent.post(`/api/${route}`).send({ ...data, projectId: project.id }).expect(201);
    const url = `/api/${route}/${created.body.id}`;
    await agent.get(url).expect(200);
    await request(app).get(url).expect(401);
    await other.get(url).expect(403);
    await other.get(`/api/projects/${project.id}/${list}`).expect(403);
    await other.post(`/api/${route}`).send({ ...data, projectId: project.id }).expect(403);
    await other.put(url).send({ title: "Stolen" }).expect(403);
    await other.delete(url).expect(403);
    await agent.put(url).send({ projectId: otherProject.id }).expect(400);
    await agent.put(url).send({ id: 900 }).expect(400);
    await agent.put(url).send({ createdAt: "2000-01-01" }).expect(400);
    const update = route === "whiteboards" ? { name: "Saved board" } : { title: "Saved title" };
    await agent.put(url).send({ ...update, _revision: created.body.revision }).expect(200);
    const persisted = await agent.get(url).expect(200);
    expect(persisted.body).toMatchObject(update);
    expect(persisted.body.projectId).toBe(project.id);
    await agent.delete(url).expect(204);
    await agent.get(url).expect(404);
    expect(storage).toBeDefined();
  });
  it("protects plots and sections through their owning project", async () => {
    const { agent, other, project, storage } = await twoWriters();
    const template = await storage.createPlotStructureTemplate({ templateType: "test", name: "Test", sections: [] });
    const plot = (await agent.post("/api/plot-structures").send({ projectId: project.id, templateId: template.id, name: "Plot" }).expect(201)).body;
    const section = (await agent.post("/api/plot-structure-sections").send({ plotStructureId: plot.id, sectionKey: "start", title: "Start", content: "Scene", order: 0 }).expect(201)).body;
    for (const url of [`/api/plot-structures/${plot.id}`, `/api/plot-structure-sections/${section.id}`]) {
      await other.get(url).expect(403);
      await other.put(url).send({ title: "Stolen" }).expect(403);
      await other.delete(url).expect(403);
    }
    await other.get(`/api/projects/${project.id}/plot-structures`).expect(403);
    await other.get(`/api/plot-structures/${plot.id}/sections`).expect(403);
    await other.post("/api/plot-structures").send({ projectId: project.id, templateId: template.id, name: "Stolen" }).expect(403);
    await other.post("/api/plot-structure-sections").send({ plotStructureId: plot.id, sectionKey: "other", title: "Stolen", order: 1 }).expect(403);
    await agent.put(`/api/plot-structure-sections/${section.id}`).send({ plotStructureId: 900 }).expect(400);
    await agent.put(`/api/plot-structures/${plot.id}`).send({ templateId: 900 }).expect(400);
    await agent.put(`/api/plot-structure-sections/${section.id}`).send({ content: "Saved scene", _revision: section.revision }).expect(200);
    expect((await agent.get(`/api/plot-structure-sections/${section.id}`)).body.content).toBe("Saved scene");
    await agent.delete(`/api/plot-structures/${plot.id}`).expect(409);
    await agent.delete(`/api/plot-structure-sections/${section.id}`).expect(204);
    await agent.delete(`/api/plot-structures/${plot.id}`).expect(204);
    // Existing orphaned writing is preserved, never exposed by guessing an ID.
    const orphan = await storage.createPlotStructureSection({ plotStructureId: 999, sectionKey: "orphan", title: "Keep", content: "Preserved", order: 0 });
    await agent.put(`/api/plot-structure-sections/${orphan.id}`).send({ content: "Replace" }).expect(404);
    expect((await storage.getPlotStructureSection(orphan.id))!.content).toBe("Preserved");
  });
  it("rejects owner reassignment, cross-project links, invalid IDs and outline cycles", async () => {
    const { agent, other, project, otherProject, otherUser } = await twoWriters();
    await other.get(`/api/projects/${project.id}`).expect(403);
    await other.put(`/api/projects/${project.id}/trash`).expect(403);
    await other.put(`/api/projects/${project.id}/restore`).expect(403);
    await other.delete(`/api/projects/${project.id}`).expect(403);
    await agent.put(`/api/projects/${project.id}`).send({ userId: otherUser.id }).expect(400);
    await agent.get("/api/projects/1junk").expect(400);
    await agent.get("/api/projects/-1").expect(400);
    const parent = (await agent.post("/api/outline").send({ projectId: project.id, title: "Parent", order: 0 }).expect(201)).body;
    const child = (await agent.post("/api/outline").send({ projectId: project.id, title: "Child", parentId: parent.id, order: 1 }).expect(201)).body;
    await agent.put(`/api/outline/${parent.id}`).send({ parentId: child.id }).expect(400);
    await other.post("/api/outline").send({ projectId: otherProject.id, title: "Cross link", parentId: parent.id, order: 0 }).expect(400);
    await agent.delete(`/api/outline/${parent.id}`).expect(409);
    await agent.delete(`/api/projects/${project.id}`).expect(409);
    const entry = (await agent.post("/api/story-bible").send({ projectId: project.id, title: "Owned", entryType: "characters" }).expect(201)).body;
    await other.post("/api/story-bible").send({ projectId: otherProject.id, title: "Cross link", entryType: "characters", relatedEntryIds: [entry.id] }).expect(400);
  });
  it("returns controlled errors and continues serving requests", async () => {
    const { agent, storage } = await twoWriters();
    const spy = jest.spyOn(storage, "getUserProjects").mockRejectedValueOnce(new Error("secret database details"));
    const response = await agent.get("/api/projects").expect(500);
    expect(response.body).toEqual({ message: "Internal server error" });
    await agent.get("/api/projects").expect(200);
    spy.mockRestore();
  });
});

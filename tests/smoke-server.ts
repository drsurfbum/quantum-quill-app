// Manual browser fixture. No database imports, credentials or recovered files.
import express from "express";
import session from "express-session";
import path from "path";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { createApp } from "../server/app";
import { MemStorage } from "../server/storage";
import { hashPassword } from "../server/auth";
import { plotTemplates } from "../server/data/plot-templates";

const storage = new MemStorage();
(storage.sessionStore as session.Store & { stopInterval?: () => void }).stopInterval?.();
storage.sessionStore = new session.MemoryStore();
const user = await storage.createUser({ username: "smoke-writer", password: await hashPassword("synthetic-smoke-password"), email: "smoke@example.test" });
const project = await storage.createProject({ title: "Stabilization smoke project", userId: user.id });
for (let i = 1; i <= 2; i++) await storage.createChapter({ projectId: project.id, title: `Chapter ${i}`, content: `<p>Synthetic chapter ${i}.</p>`, order: i });
for (const entryType of ["characters", "groups_races", "locations", "events", "world_elements", "details", "research"]) {
  await storage.createStoryBibleEntry({ projectId: project.id, title: `Smoke ${entryType}`, entryType, content: "", metadata: {} });
}
for (let i = 1; i <= 2; i++) await storage.createOutlineItem({ projectId: project.id, title: `Outline ${i}`, content: `<p>Synthetic outline ${i}.</p>`, order: i, parentId: null });
for (const template of plotTemplates) await storage.createPlotStructureTemplate(template);
const template = (await storage.getAllPlotStructureTemplates())[0];
const plot = await storage.createPlotStructure({ projectId: project.id, templateId: template.id, name: "Smoke plot" });
for (let i = 1; i <= 2; i++) await storage.createPlotStructureSection({ plotStructureId: plot.id, sectionKey: `section_${i}`, title: `Plot section ${i}`, content: `Synthetic scene ${i}.`, order: i });
await storage.createWhiteboard({ projectId: project.id, name: "Smoke whiteboard", canvasData: {} });

// One-shot save failure for manual recovery testing; SIGUSR2 affects only this process.
let failNextChapterSave = false;
process.on("SIGUSR2", () => { failNextChapterSave = true; });
const updateChapter = storage.updateChapter.bind(storage);
storage.updateChapter = async (...args) => {
  if (failNextChapterSave) { failNextChapterSave = false; throw new Error("Synthetic save failure"); }
  return updateChapter(...args);
};
// Optional latency for repeatable manual navigation/race checks.
const saveDelay = Number(process.env.QQ_SMOKE_SAVE_DELAY_MS || 0);
if (!Number.isFinite(saveDelay) || saveDelay < 0 || saveDelay > 10000) throw new Error("Invalid synthetic save delay");
for (const name of ["updateChapter", "updateOutlineItem", "updateStoryBibleEntry", "updatePlotStructureSection"] as const) {
  const original = storage[name].bind(storage);
  storage[name] = (async (id: number, patch: any, base?: Record<string, unknown>) => {
    if (saveDelay) await new Promise(resolve => setTimeout(resolve, saveDelay));
    return original(id, patch, base);
  }) as typeof storage[typeof name];
}
const app = createApp({ storage, secret: randomBytes(32).toString("hex"), uploadDir: mkdtempSync(path.join(tmpdir(), "qq-smoke-uploads-")) });
app.use(express.static(path.resolve("dist/public")));
app.get("*", (_req, res) => res.sendFile(path.resolve("dist/public/index.html")));
app.listen(5057, "127.0.0.1", () => console.log(`Synthetic smoke app: http://localhost:5057 (PID ${process.pid})`));

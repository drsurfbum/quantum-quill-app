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
import { legacyBible } from "./fixtures/legacy-writing";
import { plotTemplates } from "../server/data/plot-templates";

const storage = new MemStorage();
(storage.sessionStore as session.Store & { stopInterval?: () => void }).stopInterval?.();
storage.sessionStore = new session.MemoryStore();
const user = await storage.createUser({ username: "smoke-writer", password: await hashPassword("synthetic-smoke-password"), email: "smoke@example.test" });
const project = await storage.createProject({ title: "Stabilization smoke project", userId: user.id });
const other = await storage.createUser({ username: "other-writer", password: await hashPassword("synthetic-smoke-password"), email: "other@example.test" });
await storage.createProject({ title: "Second account private project", userId: other.id });
await storage.createProject({ title: "Second project draft scope", userId: user.id });
for (const item of legacyBible) await storage.createStoryBibleEntry({ projectId: project.id, title: `Legacy: ${item.name}`, entryType: item.entryType, content: item.content, metadata: structuredClone(item.metadata) });
for (let i = 1; i <= 2; i++) await storage.createChapter({ projectId: project.id, title: `Chapter ${i}`, content: `<p>Synthetic chapter ${i}.</p>`, order: i });
for (const entryType of ["characters", "groups_races", "locations", "events", "world_elements", "details", "research"]) {
  await storage.createStoryBibleEntry({ projectId: project.id, title: `Smoke ${entryType}`, entryType, content: "", metadata: {} });
}
const sceneChapter = await storage.createChapter({projectId:project.id,title:"Scene context walkthrough",writingMode:"scenes",order:3});
const scene = await storage.createScene({projectId:project.id,chapterId:sceneChapter.id,title:"An unexpected visitor",content:"<p>The visitor waited beside the old harbor.</p>",summary:"A quiet arrival becomes a difficult choice.",order:0});
const cast = await storage.createStoryBibleEntry({projectId:project.id,title:"Mara Vale",entryType:"characters",content:"A navigator who trusts charts more than people.",metadata:{}});
await storage.createStoryBibleEntry({projectId:project.id,title:"Old Harbor",entryType:"locations",content:"A fogbound trading port with a ruined lighthouse.",metadata:{}});
await storage.putSceneContext({sceneId:scene.id,projectId:project.id,revision:1,links:[{entryId:cast.id,role:"viewpoint",note:"She recognizes the visitor before anyone else."}]});
for (let i = 1; i <= 2; i++) await storage.createOutlineItem({ projectId: project.id, title: `Outline ${i}`, content: `<p>Synthetic outline ${i}.</p>`, order: i, parentId: null });
for (const template of plotTemplates) await storage.createPlotStructureTemplate(template);
const template = (await storage.getAllPlotStructureTemplates())[0];
const plot = await storage.createPlotStructure({ projectId: project.id, templateId: template.id, name: "Smoke plot" });
for (let i = 1; i <= 2; i++) await storage.createPlotStructureSection({ plotStructureId: plot.id, sectionKey: `section_${i}`, title: `Plot section ${i}`, content: `Synthetic scene ${i}.`, order: i });
await storage.createWhiteboard({ projectId: project.id, name: "Smoke whiteboard", canvasData: {} });

// One-shot save failure for manual recovery testing; SIGUSR2 affects only this process.
let failNextChapterSave = false;
let writesOffline = false;
process.on("SIGUSR2", () => { failNextChapterSave = true; });
const updateChapter = storage.updateChapter.bind(storage);
storage.updateChapter = async (...args) => {
  if (failNextChapterSave) { failNextChapterSave = false; throw new Error("Synthetic save failure"); }
  return updateChapter(...args);
};
// Optional latency for repeatable manual navigation/race checks.
const saveDelay = Number(process.env.QQ_SMOKE_SAVE_DELAY_MS || 0);
if (!Number.isFinite(saveDelay) || saveDelay < 0 || saveDelay > 10000) throw new Error("Invalid synthetic save delay");
for (const name of ["updateScene", "updateChapter", "updateOutlineItem", "updateStoryBibleEntry", "updatePlotStructureSection"] as const) {
  const original = storage[name].bind(storage);
  storage[name] = (async (id: number, patch: any, base?: Record<string, unknown>) => {
    if (writesOffline) throw Object.assign(new Error("Synthetic write outage. Your draft is kept."), { status: 503 });
    if (saveDelay) await new Promise(resolve => setTimeout(resolve, saveDelay));
    return original(id, patch, base);
  }) as typeof storage[typeof name];
}
const putSceneContext = storage.putSceneContext.bind(storage);
storage.putSceneContext = async row => {
  if(writesOffline) throw Object.assign(new Error("Synthetic write outage. Your draft is kept."),{status:503});
  if(saveDelay) await new Promise(resolve=>setTimeout(resolve,saveDelay));
  return putSceneContext(row);
};
const app = createApp({ storage, secret: randomBytes(32).toString("hex"), uploadDir: mkdtempSync(path.join(tmpdir(), "qq-smoke-uploads-")) });
// Fixture-only controls on the loopback synthetic server. Never mounted in the app.
app.get("/__fixture", async (_req, res) => {
  const chapter = await storage.getChapter(1);
  res.type("html").send(`<html><body><h1>Quantum Quill synthetic recovery fixture</h1><p>Writes: ${writesOffline ? "offline" : "online"}. Chapter revision: ${chapter?.revision}.</p><p>Accounts: smoke-writer and other-writer. Password: synthetic-smoke-password.</p><form method="post" action="/__fixture/offline"><button>Simulate write outage</button></form><form method="post" action="/__fixture/online"><button>Reconnect writes</button></form><form method="post" action="/__fixture/concurrent"><button>Save newer server writing</button></form><form method="post" action="/__fixture/fail"><button>Fail next chapter save</button></form><a href="/project/1/write">Open writer</a></body></html>`);
});
app.post("/__fixture/:action", async (req, res) => {
  if (req.params.action === "offline") writesOffline = true;
  else if (req.params.action === "online") writesOffline = false;
  else if (req.params.action === "fail") failNextChapterSave = true;
  else if (req.params.action === "concurrent") await updateChapter(1, { content: "<p>Newer writing from a second device. Preserve this until reviewed.</p>" });
  else { res.sendStatus(400); return; }
  res.redirect("/__fixture");
});
app.use(express.static(path.resolve("dist/public")));
app.get("*", (_req, res) => res.sendFile(path.resolve("dist/public/index.html")));
app.listen(5057, "127.0.0.1", () => console.log(`Synthetic smoke app: http://localhost:5057 (PID ${process.pid})`));

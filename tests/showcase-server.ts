// Public-safe demonstration fixture. Real app/UI, synthetic story, memory only.
// Never import database modules or .env, and never bind beyond loopback.
import express from "express";
import session from "express-session";
import path from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { randomBytes, randomUUID } from "node:crypto";
import { createApp } from "../server/app";
import { MemStorage } from "../server/storage";
import { hashPassword } from "../server/auth";
import { plotTemplates } from "../server/data/plot-templates";
import type { InsertStoryBibleEntry } from "../shared/schema";
import type { RelationshipType } from "../shared/relationships";

const storage = new MemStorage();
(storage.sessionStore as session.Store & { stopInterval?: () => void }).stopInterval?.();
storage.sessionStore = new session.MemoryStore();
const user = await storage.createUser({ username: "demo-writer", email: "writer@example.test", password: await hashPassword("synthetic-showcase-only") });
const project = await storage.createProject({ userId: user.id, title: "The Lantern Coast", description: "When the coast's last true chart disappears, a reluctant navigator must choose between the people who raised her and the islands they erased.", settings: { author: "Demo Writer", genre: "Fantasy", targetWordCount: 80000 } });
async function entry(title: string, entryType: string, content: string, metadata: Record<string, unknown> = {}, tags: string[] = []) {
  return storage.createStoryBibleEntry({ projectId: project.id, title, entryType, content, metadata, tags, priority: 1 } as InsertStoryBibleEntry);
}
const mara = await entry("Mara Vale", "characters", "A coastal navigator with an extraordinary memory for maps and a stubborn distrust of people. Mara can read a current by the way it bends a lantern's reflection. She has spent her life charting safe passages for others; now the route she needs most is the one her teachers insist never existed.", { age: "29", gender: "Female", species: "Human", primaryRole: "Protagonist", origin: "Old Harbor", motivations: "Find her brother and return the missing islands to the map.", conflicts: "Loyalty to the Tidekeepers versus the truth they have hidden.", personalityTraits: "Observant, dryly funny, reluctant to ask for help.", eyeColor: "Gray-green", hairColor: "Black", abilities: ["Navigation", "Reading currents", "Cartographic memory"] }, ["navigator", "found family", "truth"]);
const elian = await entry("Elian Rook", "characters", "A former lighthouse keeper who carries a brass key on a salt-stained cord. Elian knows which lights along the coast still answer, but not whether he deserves to ask them for help.", { age: "47", species: "Human", primaryRole: "Ally", origin: "Glasswater Reach", motivations: "Make one honest voyage after a lifetime of following orders." }, ["lighthouse keeper", "redemption"]);
const sera = await entry("Sera Venn", "characters", "The Tidekeepers' youngest archivist, caught between an oath of silence and the friend who taught her to read the sea.", { age: "26", species: "Human", primaryRole: "Ally", origin: "Old Harbor" }, ["archivist", "divided loyalties"]);
const harbor = await entry("Old Harbor", "locations", "A steep-roofed trading port built around a lighthouse that has been dark for seventeen years. The lower streets flood at spring tide; every doorway carries a brass mark showing the highest water anyone remembers.", { locationType: "Settlement", environment: "Tidal estuary; salt fog and slate quays.", purpose: "Trade, navigation and the keeping of coastal records.", history: "The port grew around the first signal tower. Its oldest charts show islands missing from every modern edition." }, ["coast", "home", "threshold"]);
const chartRoom = await entry("The Chart Room", "locations", "A circular archive above Old Harbor's tide clock. Charts hang in brass frames beneath a blue glass ceiling; one pale rectangle is all that remains of the map of the outer islands.", { locationType: "Building", environment: "Cool stone, blue glass, the smell of paper and sea salt.", purpose: "The Tidekeepers' restricted navigation archive." }, ["archive", "missing chart"]);
const reach = await entry("Glasswater Reach", "locations", "A narrow passage where the sea lies flat even in a storm. After sunset, drowned signal towers shine beneath the surface.", { locationType: "Region", environment: "Still water, submerged ruins and deceptive depths.", purpose: "The forgotten route to the outer islands." }, ["mystery", "crossing"]);
const keepers = await entry("The Tidekeepers", "groups_races", JSON.stringify({ groupCategory: "Organization", shortNotes: "Navigators, archivists and signal keepers who decide which routes are safe enough to appear on a map.", purpose: "Keep coastal travel safe—and certain histories out of sight.", ideology: "A dangerous truth is another kind of shipwreck.", leadershipStructure: "A council of seven harbor wardens.", status: "Active" }), {}, ["authority", "secrets"]);
const chart = await entry("The Saltglass Chart", "world_elements", JSON.stringify({ category: "Artifact", description: "A translucent sea chart whose coastlines shift with the tide. It records safe passages that ordinary ink cannot hold.", discoveryOrigin: "Recovered from a signal tower after the Long Dark.", loreHooks: "Its blank margins fill only when someone speaks the name of a forgotten island.", status: "Missing" }), {}, ["artifact", "navigation"]);
const event = await entry("The Long Dark", "events", JSON.stringify({ narrativeContext: "Seventeen years ago, every lighthouse on the outer coast went dark on the same night. The official record calls it a storm. The surviving keepers tell a different story.", fictionalDate: "Third night of the winter turning, 17 years ago", era: "Before the new charts", status: "Historical", writerNotes: "Reveal the cause through conflicting personal accounts, not a single explanation." }), {}, ["history", "mystery"]);
await entry("The Unlit Lantern", "details", JSON.stringify({ type: "Motif", content: "An unlit lantern appears whenever a character chooses safety over honesty. The motif changes meaning when Mara finally lights one in daylight.", explanation: "Use sparingly at moments of withheld truth.", status: "Planned" }), {}, ["motif", "light"]);
await entry("Tides & Coastal Navigation", "research", JSON.stringify({ sourceType: "Notes", summary: "Demonstration research notes: distinguish a tide's height from the direction of the current. Use practical navigation details to ground the invented coast.", detailedNotes: "Keep real navigation principles separate from the story's fictional saltglass mechanics.", nextSteps: "Check the scene's tide and time of day for consistency." }), {}, ["research", "continuity"]);
async function connect(sourceId: number, targetId: number, relationshipType: RelationshipType, role: string, context: string) {
  await storage.putBibleRelationship({ id: randomUUID(), projectId: project.id, sourceId, targetId, relationshipType, role, context, startDate: "", endDate: "", revision: 1, isDeleted: false, legacyPayload: null, requestHash: null });
}
await connect(mara.id, harbor.id, "home", "Home port", "The place she knows best is the first place she must question.");
await connect(mara.id, keepers.id, "affiliation", "Former apprentice", "Trained in their chart room; no longer willing to accept their answers.");
await connect(chartRoom.id, harbor.id, "parent", "Archive district", "Above the harbor tide clock.");
await connect(keepers.id, sera.id, "member", "Archivist", "Responsible for the restricted charts.");
await connect(chart.id, mara.id, "used_by", "Navigator", "The only person who remembers the chart before it changed.");
await connect(event.id, elian.id, "participant", "Witness", "He was on duty when the lights went out.");
await connect(event.id, reach.id, "occurs_at", "Outer passage", "The drowned towers mark the old route.");
for (const t of plotTemplates) await storage.createPlotStructureTemplate(t);
const template = (await storage.getAllPlotStructureTemplates()).find(t=>t.templateType === "three_act") || (await storage.getAllPlotStructureTemplates())[0];
const structures = [];
for (const [name, description] of [
  ["Act I · The missing chart", "An ordinary crossing becomes a question no one wants answered."],
  ["Act II · Beyond the breakwater", "The old route opens, and every answer costs Mara something."],
  ["Act III · A light for the lost", "Bring the islands home—or keep the coast safe with another lie."],
]) structures.push(await storage.createPlotStructure({ projectId: project.id, templateId: template.id, name, description, order: structures.length }));
const plotPoints = [];
for (const [index, title, content] of [
  [0, "A visitor with a borrowed name", "Elian arrives at Old Harbor carrying a key to a lighthouse that should not exist."],
  [0, "The missing chart", "Mara finds an empty frame in the Chart Room. Sera asks her not to investigate."],
  [0, "Cross the harbor line", "The tide reveals a passage beyond the breakwater. Mara chooses to follow it."],
  [1, "The drowned signal towers", "At Glasswater Reach, the lights beneath the sea answer Elian's lantern."],
  [1, "The price of the truth", "The Saltglass Chart reveals why the Tidekeepers erased the outer islands."],
  [2, "Light in the daylight", "Mara must decide who gets to know the way home."],
] as const) plotPoints.push(await storage.createPlotStructureSection({ plotStructureId: structures[index].id, sectionKey: `scene_${plotPoints.length+1}`, title, content, order: plotPoints.length }));
const chapters = [];
for (const title of ["A light on the water", "Beyond the breakwater", "The names we keep"]) chapters.push(await storage.createChapter({ projectId: project.id, title, writingMode: "scenes", order: chapters.length, content: "" }));
const mention=(id:number,text:string)=>`<span data-qq-entry="${id}">${text}</span>`;
const prose = `<p>${mention(mara.id,"Mara Vale")} knew the chart was gone before she reached the top of the stairs. The room had a different silence now: not the comfortable hush of paper and dust, but the held breath of a place waiting to be accused.</p><p>Rain tapped the blue glass overhead. Beyond the windows, ${mention(harbor.id,"Old Harbor")} was disappearing into fog, one roof at a time.</p><p>She set her lantern beside the empty frame.</p><p>“You came early,” Sera Venn said.</p><p>“The tide came early.” Mara touched the pale rectangle on the wall. “Apparently it wasn't the only thing with somewhere else to be.”</p><p>Sera did not smile. That frightened Mara more than the missing chart.</p><p>From the stairwell came a measured knock. Elian Rook stood in the doorway, turning a brass key between his fingers. Its teeth were green with salt.</p><p>“I was told you remember maps,” he said.</p><p>“I remember the ones people take away.”</p><p>He looked at the empty frame, then at the lantern. “Good. Because Glasswater Reach is open again. And we have until the next tide to find out who opened it.”</p><p>For seventeen years, Mara had trusted the coastline printed on every map in the harbor. Now she wondered how much of a life could be built around an omission.</p>`;
const sceneRows = [];
for (const [index,title,summary,beats,content] of [
  [0,"The visitor at the harbor","An unfamiliar keeper brings a key and a warning.",["Establish Mara's ordinary crossing.","Introduce Elian's impossible key.","Send Mara to the Chart Room."],"<p>The stranger waited where the harbor lights ended, holding a key that belonged to no door Mara knew.</p>"],
  [0,"The missing chart","Mara discovers the outer-islands chart is gone. Elian offers a route the Tidekeepers have erased.",["Find the empty frame.","Let Sera's silence reveal divided loyalties.","Elian names the forbidden passage.","Mara chooses to follow the next tide."],prose],
  [1,"Beyond the breakwater","Mara and Elian leave the marked shipping lanes.",["Cross the harbor line.","Watch the shore disappear.","Find the first submerged light."],"<p>Once they passed the breakwater, the sea stopped pretending to be familiar.</p>"],
  [1,"The drowned signal","The lights below Glasswater Reach answer the lantern.",["Follow the pattern of lights.","Discover a keeper's name.","Question the official history."],""],
  [2,"A name in the margin","The chart responds to a name Mara has not spoken in years.",["Recover the Saltglass Chart.","Speak the missing island's name.","Choose what to tell the harbor."],""],
] as const) {
  const row = await storage.createScene({projectId:project.id,chapterId:chapters[index].id,title,summary,storyBeats:beats.map(text=>({id:randomUUID(),text})),content,order:sceneRows.length,linkedSectionId:plotPoints[Math.min(sceneRows.length,plotPoints.length-1)].id});
  sceneRows.push(row);
}
await storage.putSceneContext({sceneId:sceneRows[1].id,projectId:project.id,revision:1,links:[{entryId:mara.id,role:"viewpoint",note:"She recognizes the missing coastline from memory."},{entryId:harbor.id,role:"location",note:"A familiar place, made strange by one missing map."},{entryId:chartRoom.id,role:"location",note:"The empty frame is the first clue."}]});
const app = createApp({storage,secret:randomBytes(32).toString("hex"),uploadDir:mkdtempSync(path.join(tmpdir(),"qq-showcase-uploads-"))});
app.use(express.static(path.resolve("dist/public")));
app.get("*",(_req,res)=>res.sendFile(path.resolve("dist/public/index.html")));
app.listen(5063,"127.0.0.1",()=>console.log(`Quantum Quill showcase: http://127.0.0.1:5063/project/${project.id}/write?chapter=${chapters[0].id}&scene=${sceneRows[1].id} (PID ${process.pid}). Synthetic data only.`));

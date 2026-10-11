import { BIBLE_TYPES, BIBLE_TAXONOMY, fieldChoices, fieldOptions, canonicalChoice } from "../shared/bible-catalog";
import { STORY_BIBLE_TAXONOMY, VALID_ENTRY_TYPES } from "../shared/taxonomy";
import { ENHANCED_TAXONOMY } from "../shared/enhanced-taxonomy";
import { previewBibleDocument, readBibleDocument } from "../shared/bible-contract";
import { legacyBible } from "./fixtures/legacy-writing";
import { twoWriters } from "./helpers";
it("shares exactly seven live types and identical choices across both legacy import paths", () => {
  expect(STORY_BIBLE_TAXONOMY).toBe(ENHANCED_TAXONOMY); expect(ENHANCED_TAXONOMY).toBe(BIBLE_TAXONOMY);
  expect(VALID_ENTRY_TYPES).toEqual(BIBLE_TYPES);
  expect(fieldChoices("characters", "primaryRole")).toContainEqual({ value: "protagonist", label: "Protagonist" });
  expect(canonicalChoice("characters", "primaryRole", "NPC / Minor Character")).toBe("minor");
  expect(fieldOptions("world_elements", "category")).toEqual(expect.arrayContaining(["Magic System", "Item/Artifact", "Food/Drink", "Weather"]));
});
it.each(legacyBible)("maps or retains every field of $name without mutating input", sample => {
  const original: any = { id: 1, projectId: 3, entryType: sample.entryType, title: sample.name, content: sample.content, metadata: structuredClone(sample.metadata), tags: [], isArchived: false };
  const before = JSON.stringify(original); const result = previewBibleDocument(original);
  expect(JSON.stringify(original)).toBe(before);
  expect(result.mappings.every(mapping => mapping.preserved)).toBe(true);
  expect(result.document?.legacy.original).toEqual(original);
  if (!result.issues.length) expect(readBibleDocument(result.document)).toEqual(result.document);
  if (sample.name === "future schema") expect(result.needsReview).toBe(true);
});
it.each(BIBLE_TYPES)("%s keeps prose separate and reads the v2 document losslessly", type => {
  const preview = previewBibleDocument({ entryType: type, title: "Fixture", content: "Literal <dragon> prose\nwith  spaces", metadata: { unrecognized: { keep: [1, 2] } } });
  expect(Object.values(preview.document!.narrative)).toContain("Literal <dragon> prose\nwith  spaces");
  expect(preview.document!.fields).not.toHaveProperty("content");
  expect(preview.document!.legacy.unmapped).toEqual({ "metadata.unrecognized": { keep: [1, 2] } });
  expect(readBibleDocument(preview.document)).toEqual(preview.document);
});
it("retains contradictory tags/archive/classification and refuses to guess lore or timeline semantics", () => {
  const source = { entryType: "world_elements", title: "Conflict", category: "A", tags: ["old"], isArchived: false, content: JSON.stringify({ category: "B", tags: ["visible"], isArchived: true, unknown: { retain: true } }) };
  const preview = previewBibleDocument(source);
  expect(preview.document).toMatchObject({ classification: { category: "B" }, tags: ["visible"], archived: true, legacy: { original: source } });
  expect(preview.document!.legacy.conflicts).toEqual(expect.arrayContaining(["category", "tags", "isArchived"]));
  for (const type of ["lore", "timeline", "unrecognized"]) {
    const retained = previewBibleDocument({ ...source, entryType: type });
    expect(retained.document).toBeNull(); expect(retained.needsReview).toBe(true); expect(retained.mappings.every(item => item.preserved)).toBe(true);
    expect(previewBibleDocument({ ...source, entryType: type }, "details").document?.type).toBe("details");
  }
});
it("conversion preview is owned, revision checked, non-mutating, and cannot be replaced by a discriminator edit", async () => {
  const { agent, other, storage, project } = await twoWriters();
  const entry = await storage.createStoryBibleEntry({ projectId: project.id, entryType: "lore", title: "Old lore", content: "Keep all original lore", metadata: { unknown: 7 } });
  const before = JSON.stringify(entry), url = `/api/story-bible/${entry.id}`;
  await other.post(`${url}/conversion-preview`).send({ targetType: "details", _revision: 0 }).expect(403);
  await agent.post(`${url}/conversion-preview`).send({ targetType: "details", _revision: 9 }).expect(409);
  const preview = (await agent.post(`${url}/conversion-preview`).send({ targetType: "details", _revision: 0 }).expect(200)).body;
  expect(preview.canApply).toBe(false); expect(preview.document.type).toBe("details");
  expect(JSON.stringify(await storage.getStoryBibleEntry(entry.id))).toBe(before);
  const rejected = await agent.put(url).send({ entryType: "details", _revision: 0 }).expect(400);
  expect(rejected.body.code).toBe("CONVERSION_REQUIRED"); expect(rejected.body.message).toContain("preview");
  await agent.post("/api/story-bible").send({ projectId: project.id, entryType: "lore", title: "No new legacy records" }).expect(400);
});
it.each([
  ["characters", { metadata: { age: 5 } }, "age"],
  ["groups_races", { metadata: { alliances: "wrong" } }, "alliances"],
  ["locations", { metadata: { nearbyLocations: ["wrong"] } }, "nearbyLocations"],
  ["events", { content: JSON.stringify({ includeOnTimeline: "wrong" }) }, "includeOnTimeline"],
  ["world_elements", { content: JSON.stringify({ childElements: [{ id: "wrong" }] }) }, "childElements"],
  ["details", { content: JSON.stringify({ content: 123 }) }, "content"],
  ["research", { content: JSON.stringify({ attachments: [{ name: 5 }] }) }, "attachments"],
])("%s returns actionable type-specific validation errors and preserves the failed write", async (entryType, patch, field) => {
  const { agent, project } = await twoWriters();
  const entry = (await agent.post("/api/story-bible").send({ projectId: project.id, entryType, title: "Fixture" }).expect(201)).body;
  const url = `/api/story-bible/${entry.id}`;
  const response = await agent.put(url).send({ ...(patch as object), _revision: entry.revision }).expect(400);
  expect(response.body.message).toContain(field); expect(response.body.message).toContain(entryType); expect(response.body.errors[0].path).toEqual(expect.arrayContaining([entryType, field]));
  expect((await agent.get(url)).body).toEqual(entry);
});

it("rejects duplicate canonical classification and unknown structured fields", () => {
  const document = previewBibleDocument({ entryType: "details", title: "Example", content: "Notes" }).document!;
  expect(() => readBibleDocument({ ...document, fields: { tags: ["duplicate"] } })).toThrow("duplicate sources of truth");
  expect(() => readBibleDocument({ ...document, fields: { invented: "unknown" } })).toThrow("retained under legacy");
});

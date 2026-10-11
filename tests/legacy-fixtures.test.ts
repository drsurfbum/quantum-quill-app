import "./editor-dom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { legacyBible, legacyProse } from "./fixtures/legacy-writing";
import { readBibleFields, prepareBiblePatch } from "../shared/story-bible";
import { queryClient } from "../client/src/lib/queryClient";
import RichTextEditor from "../client/src/components/rich-text-editor";
import OutlineRichEditor from "../client/src/components/outline/outline-rich-editor";
import { fixture, credentials } from "./helpers";
function freeze<T>(value: T): T {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
it.each(legacyBible)("reads $name without rewriting original bytes or metadata", async sample => {
  const { storage, agent } = fixture();
  const user = (await agent.post("/api/register").send(credentials).expect(201)).body;
  const project = await storage.createProject({ userId: user.id, title: "Legacy fixture" });
  // Seed below validation to reproduce the untouched historical representation.
  const original = freeze(await storage.createStoryBibleEntry({ projectId: project.id, title: sample.name, entryType: sample.entryType, content: sample.content, metadata: structuredClone(sample.metadata) }));
  const bytes = JSON.stringify(original);
  const get = (await agent.get(`/api/story-bible/${original.id}`).expect(200)).body;
  expect(readBibleFields(get)[sample.field]).toBeDefined();
  expect(get.content).toBe(sample.content); expect(get.metadata).toEqual(sample.metadata); expect(get.revision).toBe(0);
  expect(JSON.stringify(await storage.getStoryBibleEntry(original.id))).toBe(bytes);
  const candidate = () => prepareBiblePatch(original, sample.entryType === "characters" ? { metadata: { age: "43" } } : { content: JSON.stringify({ [sample.field]: "Edited copy" }) });
  if (sample.name === "future schema") expect(candidate).toThrow();
  else {
    const result = candidate();
    if (sample.name === "historically malformed field") expect(JSON.parse(result.content!)).toMatchObject({ locations: "old bad shape", unknown: 99 });
    if (sample.name === "metadata") expect(result.metadata).toMatchObject({ unknown: { nested: [3, 4] } });
  }
  expect(JSON.stringify(original)).toBe(bytes);
});
it.each(["chapter", "outline"])("opens legacy %s prose with literal characters and blank lines, with no initialization write", async type => {
  queryClient.clear(); queryClient.setQueryData(["/api/user"], { id: 900 });
  const fetch = jest.spyOn(global, "fetch").mockRejectedValue(new Error("No requests expected"));
  const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
  const record: any = { id: type === "chapter" ? 901 : 902, projectId: 1, revision: 0, title: "Legacy", content: legacyProse };
  try {
    await act(async () => root.render(React.createElement(QueryClientProvider, { client: queryClient }, type === "chapter" ? React.createElement(RichTextEditor, { ...record, chapterId: record.id }) : React.createElement(OutlineRichEditor, { item: record, projectId: 1 }))));
    const editor = (host.querySelector(".tiptap") as any).editor;
    expect(editor.getText()).toContain("<a dragon> & two  spaces.");
    expect(host.querySelectorAll(".tiptap > p")).toHaveLength(3);
    expect(record.content).toBe(legacyProse);
    expect(fetch).not.toHaveBeenCalled();
  } finally { await act(async () => root.unmount()); host.remove(); fetch.mockRestore(); queryClient.clear(); }
});

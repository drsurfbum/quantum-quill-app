import "./editor-dom";
jest.mock("wouter", () => ({ Link: ({ children }: any) => children }));
import React, { act, StrictMode } from "react";
import { createRoot, Root } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { QueryClientProvider } from "@tanstack/react-query";
import ScenePlanEditor from "../client/src/components/scene-plan-editor";
import { queryClient } from "../client/src/lib/queryClient";
import { flushPendingSaves, getSaveQueue, discardDraft } from "../client/src/hooks/use-autosave";
import { draftJournal } from "../client/src/lib/draft-journal";
import type { Scene } from "../shared/schema";
let sequence = 7000, root: Root, container: HTMLDivElement, stored: Scene, initial: Scene, offline: boolean;
const listUrl = "/api/projects/1/scenes";
function render() { root.render(React.createElement(StrictMode, null, React.createElement(QueryClientProvider, { client: queryClient }, React.createElement(ScenePlanEditor, { scene: initial })))); }
function change(selector: string, value: string) { const el = container.querySelector(selector) as HTMLInputElement; el.value = value; Simulate.change(el); }
function click(label: string) { const button = [...container.querySelectorAll('button')].find(el => (el.getAttribute('aria-label') || el.textContent) === label); if (!button) throw new Error(`Missing ${label}`); Simulate.click(button); }
beforeEach(() => {
  jest.useFakeTimers(); queryClient.clear(); window.localStorage.clear(); offline = false;
  const id = ++sequence;
  queryClient.setQueryData(["/api/user"], { id });
  initial = { id, projectId: 1, chapterId: 1, linkedSectionId: null, title: "Scene", summary: "", content: "<p>Keep original prose</p>", storyBeats: [], order: 0, revision: 0, createdAt: new Date(), updatedAt: new Date() };
  stored = structuredClone(initial); queryClient.setQueryData([listUrl], [initial]);
  jest.spyOn(global, "fetch").mockImplementation(async (_url, init) => {
    if (offline) throw new Error("Synthetic offline");
    const { _revision, _base, ...patch } = JSON.parse(init!.body as string);
    stored = { ...stored, ...patch, revision: stored.revision + 1 }; return new Response(JSON.stringify(stored), { status: 200 });
  });
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => {
  offline = false;
  await act(async () => { root.unmount(); await flushPendingSaves(); });
  container.remove(); queryClient.clear(); jest.restoreAllMocks(); jest.useRealTimers();
});
it("rapid scene-plan edits, beat ordering/removal and reopen share one queue without changing prose", async () => {
  await act(async () => render());
  await act(async () => { click("Add story beat"); click("Add story beat"); change('[id^="scene-title-"]', "Renamed scene"); change('[id^="scene-summary-"]', "Summary"); });
  const fields = [...container.querySelectorAll<HTMLTextAreaElement>('[id^="scene-beat-"]')];
  await act(async () => { change(`#${fields[0].id}`, "First moment"); change(`#${fields[1].id}`, "Second moment"); click("Move beat 2 up"); });
  await act(async () => { await flushPendingSaves(); });
  expect(stored.storyBeats.map(b => b.text)).toEqual(["Second moment", "First moment"]);
  expect(stored).toMatchObject({ title: "Renamed scene", summary: "Summary", content: initial.content });
  await act(async () => { root.unmount(); }); root = createRoot(container); initial = stored;
  await act(async () => render());
  expect([...container.querySelectorAll<HTMLTextAreaElement>('[id^="scene-beat-"]')].map(el => el.value)).toEqual(["Second moment", "First moment"]);
  await act(async () => click("Remove beat 1")); await act(async () => { await flushPendingSaves(); });
  expect(stored.storyBeats.map(b => b.text)).toEqual(["First moment"]);
});
it("offline beat edits have an account/project-scoped durable recovery record before leaving Outline", async () => {
  await act(async () => render()); offline = true;
  await act(async () => click("Add story beat"));
  await act(async () => change('[id^="scene-beat-"]', "Recover this moment"));
  await act(async () => { expect(await getSaveQueue(`/api/scenes/${initial.id}`).flush()).toBe(false); root.unmount(); });
  const drafts = draftJournal.read(initial.id, 1); expect(drafts).toHaveLength(1);
  expect((drafts[0].patch.storyBeats as any[])[0].text).toBe("Recover this moment");
  expect(draftJournal.read(initial.id + 1, 1)).toEqual([]); expect(draftJournal.read(initial.id, 2)).toEqual([]);
  expect(drafts[0].base.storyBeats).toEqual([]);
  discardDraft(drafts[0]); root = createRoot(container);
});

import "./editor-dom";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../client/src/lib/queryClient";
import { DraftRecovery } from "../client/src/components/draft-recovery";
import { EntryLinks } from "../client/src/components/story-bible/entry-links";
import { DraftJournal, type DurableDraft } from "../client/src/lib/draft-journal";
Object.assign(globalThis, { NodeFilter: window.NodeFilter });
const journal = new DraftJournal(() => window.localStorage);
const draft: DurableDraft = { version: 1, id: "reloaded-page", owner: 700, projectId: 1, url: "/api/chapters/700", title: "Recovered chapter", updatedAt: new Date().toISOString(), base: { content: "Original" }, patch: { content: "Private offline writing" } };
let root: Root, container: HTMLDivElement;
beforeEach(() => {
  window.localStorage.clear(); queryClient.clear(); queryClient.setQueryData(["/api/user"], { id: 700 }); journal.write(draft);
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); queryClient.clear(); jest.restoreAllMocks(); });
async function mount(element: React.ReactElement = React.createElement(DraftRecovery)) { await act(async () => root.render(React.createElement(QueryClientProvider, { client: queryClient }, element))); }
async function click(label: string) {
  const button = [...document.querySelectorAll("button")].find(button => button.textContent === label);
  if (!button) throw new Error(`Missing button: ${label}`);
  await act(async () => button.click());
}
it("shows recovered writing only after explicit review, then restores through the checked base", async () => {
  const fetch = jest.spyOn(global, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ id: 700, revision: 0, content: "Original" }), { status: 200 })).mockResolvedValueOnce(new Response(JSON.stringify({ id: 700, revision: 0, content: "Private offline writing" }), { status: 200 }));
  await mount(); expect(fetch).not.toHaveBeenCalled();
  await click("Review 1 saved draft"); await click("Review");
  expect(document.body.textContent).toContain("No conflicting changes found");
  await click("Restore draft");
  expect(JSON.parse(fetch.mock.calls[1][1]!.body as string)).toEqual({ content: "Private offline writing", _revision: 0, _base: { content: "Original" } });
  expect(journal.read(700)).toEqual([]); expect(document.body.textContent).toContain("Draft restored");
});
it("keeps a conflicting draft if a second change arrives after review", async () => {
  jest.spyOn(global, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ id: 700, revision: 0, content: "Newer writing" }), { status: 200 })).mockResolvedValueOnce(new Response(JSON.stringify({ message: "Changed again" }), { status: 409 }));
  await mount(); await click("Review 1 saved draft"); await click("Review");
  expect(document.body.textContent).toContain("Newer writing");
  await click("Replace these fields with my draft");
  expect(document.body.textContent).toContain("Changed again"); expect(journal.read(700)).toHaveLength(1);
});
it("discards only the selected draft and never writes to the server", async () => {
  const fetch = jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: 700, revision: 0, content: "Original" }), { status: 200 }));
  await mount(); await click("Review 1 saved draft"); await click("Review"); await click("Discard this draft");
  expect(journal.read(700)).toEqual([]); expect(fetch.mock.calls.every(([, options]) => options?.method === "GET")).toBe(true);
});
it("hides a previously reviewed private draft when the account changes", async () => {
  jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: 700, revision: 0, content: "Original" }), { status: 200 }));
  await mount(); await click("Review 1 saved draft"); await click("Review");
  expect(document.body.textContent).toContain("Private offline writing");
  await act(async () => { queryClient.setQueryData(["/api/user"], { id: 701 }); });
  expect(document.body.textContent).not.toContain("Private offline writing");
  expect(document.body.textContent).not.toContain("Recovered chapter");
});
it("resolves outgoing names and backlinks from IDs and opens the selected entry", async () => {
  const current: any = { id: 801, projectId: 1, entryType: "details", title: "Detail", content: JSON.stringify({ linkedElements: [{ id: 802, name: "Stale name", type: "characters" }] }), metadata: {} };
  const character: any = { id: 802, projectId: 1, entryType: "characters", title: "Current character name", content: "", metadata: {}, relatedEntryIds: [801] };
  queryClient.setQueryData(["/api/projects/1/story-bible"], [current, character]);
  const onOpen = jest.fn(); await mount(React.createElement(EntryLinks, { entry: current, onOpen }));
  expect(container.textContent).toContain("Entries linking here"); expect(container.textContent).not.toContain("Stale name");
  await click("Current character name"); expect(onOpen).toHaveBeenCalledWith(character);
});

import "./editor-dom";
import React, { act, StrictMode } from "react";
import { createRoot, Root } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../client/src/lib/queryClient";
import { flushPendingSaves, getSaveQueue } from "../client/src/hooks/use-autosave";
import { CharacterEditor } from "../client/src/components/story-bible/character-editor";
import { GroupsRacesEditor } from "../client/src/components/story-bible/groups-races-editor";
import { LocationsEditor } from "../client/src/components/story-bible/locations-editor";
import { EventsEditor } from "../client/src/components/story-bible/events-editor";
import { WorldElementsEditor } from "../client/src/components/story-bible/world-elements-editor";
import { DetailsEditor } from "../client/src/components/story-bible/details-editor";
import { ResearchEditor } from "../client/src/components/story-bible/research-editor";
import { EnhancedBibleEditor } from "../client/src/components/story-bible/enhanced-bible-editor";
import { PendingSaves } from "../client/src/components/pending-saves";
import type { StoryBibleEntry } from "../shared/schema";

let sequence = 200;
let root: Root;
let container: HTMLDivElement;
let entry: StoryBibleEntry;
let stored: StoryBibleEntry;
let waitForWrite: Promise<void> | undefined;
const listUrl = "/api/projects/1/story-bible";
const cases = [
  ["characters", CharacterEditor, "#age", "metadata", "age"],
  ["groups_races", GroupsRacesEditor, "#tagline", "metadata", "tagline"],
  ["locations", LocationsEditor, "#tagline", "metadata", "tagline"],
  ["events", EventsEditor, "#shortSummary", "json", "shortSummary"],
  ["world_elements", WorldElementsEditor, "#shortNotes", "json", "shortNotes"],
  ["details", DetailsEditor, "#shortSummary", "json", "shortSummary"],
  ["research", ResearchEditor, "#shortSummary", "json", "shortSummary"],
  ["fallback", EnhancedBibleEditor, "textarea", "content", "content"],
] as const;
function renderEditor(Component: React.ElementType, props = entry) {
  root.render(React.createElement(StrictMode, null, React.createElement(QueryClientProvider, { client: queryClient },
    React.createElement(Component, { key: props.id, entry: props, projectId: 1 }), React.createElement(PendingSaves))));
}
function field(selector: string) {
  const found = container.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  if (!found) throw new Error(`Missing field ${selector}`);
  return found;
}
function change(selector: string, value: string) { const input = field(selector); input.value = value; Simulate.change(input); }
function savedField(kind: string, key: string) { return kind === "json" ? JSON.parse(stored.content!)[key] : kind === "metadata" ? (stored.metadata as any)[key] : stored.content; }

beforeEach(() => {
  jest.useFakeTimers();
  queryClient.clear();
  const id = ++sequence;
  queryClient.setQueryData(["/api/user"], { id });
  entry = { id, projectId: 1, title: "Original title", content: "", metadata: {}, entryType: "details", category: null, subcategory: null, tags: [], relatedEntryIds: [], isArchived: false, priority: 0, createdAt: new Date(), updatedAt: new Date() } as StoryBibleEntry;
  stored = { ...entry };
  queryClient.setQueryData([listUrl], [entry]);
  waitForWrite = undefined;
  jest.spyOn(global, "fetch").mockImplementation(async (_url, init) => {
    if (init?.method !== "PUT") throw new Error("Unexpected request in isolated editor test");
    const patch = JSON.parse(init.body as string);
    await waitForWrite;
    stored = { ...stored, ...patch };
    return new Response(JSON.stringify(stored), { status: 200 });
  });
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  await flushPendingSaves();
  queryClient.clear(); jest.restoreAllMocks(); jest.useRealTimers();
});

describe.each(cases)("%s editor", (type, Component, selector, kind, key) => {
  it("preserves rapid field changes and title edits batched before React renders", async () => {
    entry.entryType = type;
    await act(async () => renderEditor(Component));
    await act(async () => {
      change(selector, "First field must survive");
      change("input", "Updated title");
    });
    await act(async () => { await flushPendingSaves(); });
    expect(stored.title).toBe("Updated title");
    expect(savedField(kind, key)).toBe("First field must survive");
  });
  it("retains rapid typing across an unmount/reopen while the server is slow", async () => {
    entry.entryType = type;
    await act(async () => renderEditor(Component));
    let finish!: () => void;
    waitForWrite = new Promise<void>(resolve => { finish = resolve; });
    await act(async () => { change(selector, "Earlier text"); void getSaveQueue(`/api/story-bible/${entry.id}`, listUrl).flush(); });
    const latest = "Fast typing: " + "abc ".repeat(100);
    await act(async () => { change(selector, latest); });
    await act(async () => root.render(React.createElement("div", null, "Other section")));
    await act(async () => renderEditor(Component));
    expect(field(selector).value).toBe(latest);
    await act(async () => { finish(); await flushPendingSaves(); });
    expect(savedField(kind, key)).toBe(latest);
    // A successful save should survive a fresh mount using returned server data.
    await act(async () => root.render(React.createElement("div")));
    await act(async () => renderEditor(Component, stored));
    expect(field(selector).value).toBe(latest);
    expect(container.textContent).toContain("Saved");
  });
});

it("does not lose two character metadata fields in one React batch", async () => {
  await act(async () => renderEditor(CharacterEditor));
  await act(async () => { change("#age", "42"); change("#gender", "Test gender"); });
  await act(async () => { await flushPendingSaves(); });
  expect(stored.metadata).toMatchObject({ age: "42", gender: "Test gender" });
});
it("flushes immediately on window blur instead of waiting for the debounce", async () => {
  await act(async () => renderEditor(DetailsEditor));
  await act(async () => { change("#shortSummary", "Leaving this window"); window.dispatchEvent(new window.Event("blur")); });
  expect(savedField("json", "shortSummary")).toBe("Leaving this window");
});

it("preserves nested event date changes made in one batch", async () => {
  await act(async () => renderEditor(EventsEditor));
  await act(async () => { change("#year", "2042"); change("#month", "10"); change("#day", "11"); });
  await act(async () => { await flushPendingSaves(); });
  expect(JSON.parse(stored.content!).date).toMatchObject({ year: "2042", month: "10", day: "11" });
});
it("preserves two research content fields in the same React batch", async () => {
  await act(async () => renderEditor(ResearchEditor));
  await act(async () => { change("#urlOrReference", "Synthetic source"); change("#shortSummary", "Synthetic summary"); });
  await act(async () => { await flushPendingSaves(); });
  expect(JSON.parse(stored.content!)).toMatchObject({ urlOrReference: "Synthetic source", shortSummary: "Synthetic summary" });
});
it.each(["pagehide", "visibilitychange", "online"])("flushes pending writing on %s", async eventName => {
  await act(async () => renderEditor(DetailsEditor));
  await act(async () => {
    change("#shortSummary", `Triggered by ${eventName}`);
    if (eventName === "visibilitychange") {
      Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
      document.dispatchEvent(new window.Event(eventName));
    } else window.dispatchEvent(new window.Event(eventName));
  });
  expect(savedField("json", "shortSummary")).toBe(`Triggered by ${eventName}`);
});
it("keeps a failed draft through switching screens, then visibly recovers on retry", async () => {
  await act(async () => renderEditor(DetailsEditor));
  const normalFetch = (global.fetch as jest.Mock).getMockImplementation();
  (global.fetch as jest.Mock).mockRejectedValue(new Error("Synthetic network failure"));
  await act(async () => { change("#shortSummary", "Must not disappear"); await flushPendingSaves(); });
  expect(container.textContent).toContain("Save failed");
  expect(container.textContent).toContain("Keep this tab open");
  // Keep failing through cleanup retries and Strict Mode remounts.
  await act(async () => root.render(React.createElement("div")));
  await act(async () => renderEditor(DetailsEditor));
  expect(field("#shortSummary").value).toBe("Must not disappear");
  (global.fetch as jest.Mock).mockImplementation(normalFetch!);
  const retry = [...container.querySelectorAll("button")].find(button => button.textContent === "Retry save")!;
  await act(async () => Simulate.click(retry));
  expect(savedField("json", "shortSummary")).toBe("Must not disappear");
  expect(container.textContent).not.toContain("Save failed");
});

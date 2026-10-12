import "./editor-dom";
jest.mock("wouter", () => ({ useLocation: () => ["/", jest.fn()] }));
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { QueryClientProvider } from "@tanstack/react-query";
import { z } from "zod";
import { queryClient } from "../client/src/lib/queryClient";
import { WizardJournal, WIZARD_PREFIX } from "../client/src/lib/wizard-journal";
import { useWizardDraft } from "../client/src/hooks/use-wizard-draft";
import { SceneEditor } from "../client/src/components/scene-workspace";
import { flushPendingSaves } from "../client/src/hooks/use-autosave";
import type { Editor } from "@tiptap/core";
import NewProjectWizard from "../client/src/components/new-project-wizard";
const journal = new WizardJournal(() => window.localStorage);
let root: Root, container: HTMLDivElement;
beforeEach(() => { window.localStorage.clear(); queryClient.clear(); queryClient.setQueryData(["/api/user"], { id: 900 }); container = document.createElement("div"); document.body.append(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); queryClient.clear(); jest.restoreAllMocks(); });
async function mount(element: React.ReactElement) { await act(async () => root.render(React.createElement(QueryClientProvider, { client: queryClient }, element))); }
async function click(text: string) { const button = [...document.querySelectorAll("button")].find(b => b.textContent === text); if (!button) throw new Error(`Missing ${text}`); await act(async () => button.click()); }
async function type(id: string, value: string) { const input = document.getElementById(id) as HTMLInputElement; await act(async () => { input.value = value; Simulate.change(input); }); }
it("wizard progress requires explicit restore after reload and never leaks across accounts", async () => {
  const fetch = jest.spyOn(global, "fetch");
  await mount(React.createElement(NewProjectWizard, { onClose: jest.fn() }));
  await type("setup-title", "Private recovered book"); await type("setup-author", "A Writer");
  expect(journal.read(900, "new-project")[0].value).toMatchObject({ title: "Private recovered book", author: "A Writer" });
  await mount(React.createElement("div")); await mount(React.createElement(NewProjectWizard, { onClose: jest.fn() }));
  expect((document.getElementById("setup-title") as HTMLInputElement).value).toBe("");
  await click("Restore draft"); expect((document.getElementById("setup-title") as HTMLInputElement).value).toBe("Private recovered book"); expect(fetch).not.toHaveBeenCalled();
  await act(async () => { queryClient.setQueryData(["/api/user"], { id: 901 }); });
  expect(document.body.textContent).not.toContain("Private recovered book"); expect((document.getElementById("setup-title") as HTMLInputElement).value).toBe("");
  expect(journal.read(901, "new-project")).toEqual([]); expect(journal.read(900, "new-project")).toHaveLength(1);
});
it("an interrupted project submission survives reload and retries the exact request", async () => {
  const fetch = jest.spyOn(global, "fetch").mockRejectedValue(new Error("Connection interrupted"));
  const close = jest.fn(); await mount(React.createElement(NewProjectWizard, { onClose: close }));
  await type("setup-title", "Retry this book"); await click("Next"); await click("Next"); await click("Create project");
  const first = JSON.parse(fetch.mock.calls[0][1]!.body as string);
  expect(document.body.textContent).toContain("Connection interrupted");
  await mount(React.createElement("div")); await mount(React.createElement(NewProjectWizard, { onClose: close })); await click("Restore draft");
  fetch.mockResolvedValue(new Response(JSON.stringify({ id: 99 }), { status: 201 }));
  await click("Retry creation"); expect(JSON.parse(fetch.mock.calls[1][1]!.body as string)).toEqual(first);
  expect(journal.read(900, "new-project")).toEqual([]); expect(close).toHaveBeenCalledTimes(1);
});
it("project-scoped wizard restore preserves a different plan already being edited", async () => {
  const schema = z.object({ title: z.string() }); let draft!: ReturnType<typeof useWizardDraft<z.infer<typeof schema>>>;
  function Harness({ scope }: { scope: string }) { draft = useWizardDraft(scope, () => ({ title: "" }), schema); return React.createElement("p", null, draft.value?.title); }
  const old = { version: 1 as const, id: crypto.randomUUID(), owner: 900, scope: "blueprint:1:1", updatedAt: new Date().toISOString(), value: { title: "Recovered plan" } };
  journal.write(old); await mount(React.createElement(Harness, { scope: "blueprint:2:2" })); expect(draft.recoverable).toEqual([]);
  await mount(React.createElement(Harness, { scope: "blueprint:1:1" })); expect(draft.recoverable).toHaveLength(1);
  await act(async () => { draft.update({ title: "New plan in this tab" }); });
  await act(async () => { draft.restore(old); }); expect(draft.value?.title).toBe("Recovered plan"); expect(draft.recoverable.map(r => r.value)).toEqual([{ title: "New plan in this tab" }]);
  await act(async () => draft.discard(draft.recoverable[0])); expect(journal.read(900, "blueprint:1:1")).toHaveLength(1);
});
it("keeps future records and rejects discarding a newer wizard checkpoint", () => {
  const row = { version: 1 as const, id: crypto.randomUUID(), owner: 900, scope: "new-project", updatedAt: new Date().toISOString(), value: { title: "original" } };
  journal.write(row); journal.write({ ...row, value: { title: "newer" } });
  expect(() => journal.remove(row)).toThrow("changed");
  window.localStorage.setItem(WIZARD_PREFIX + "future", '{"version":2}');
  expect(journal.read(900, "new-project")).toHaveLength(1); expect(window.localStorage.getItem(WIZARD_PREFIX + "future")).toBe('{"version":2}');
});

it("batched setup fields keep both edits in their durable checkpoint", async () => {
  await mount(React.createElement(NewProjectWizard, { onClose: jest.fn() }));
  await act(async () => {
    const title = document.getElementById("setup-title") as HTMLInputElement;
    const author = document.getElementById("setup-author") as HTMLInputElement;
    title.value = "Fast title"; Simulate.change(title); author.value = "Fast author"; Simulate.change(author);
  });
  expect(journal.read(900, "new-project")[0].value).toMatchObject({ title: "Fast title", author: "Fast author" });
});
it("scene planning fields and rich prose share one guarded queue without overwriting each other", async () => {
  let scene: any = { id: 9900, projectId: 9, chapterId: 99, linkedSectionId: null, order: 0, revision: 0, title: "Original title", storyBeats: [], summary: "Original plan", content: "<p>Original prose</p>", createdAt: null, updatedAt: null };
  const fetch = jest.spyOn(global, "fetch").mockImplementation(async (_url, options) => {
    const { _base, _revision, ...patch } = JSON.parse(options!.body as string);
    expect(_revision).toBe(scene.revision);
    for (const key of Object.keys(patch)) expect(_base[key]).toEqual(scene[key]);
    scene = { ...scene, ...patch, revision: scene.revision + 1 };
    return new Response(JSON.stringify(scene), { status: 200 });
  });
  await mount(React.createElement(SceneEditor, { scene })); expect(fetch).not.toHaveBeenCalled();
  await act(async () => {
    const title = document.getElementById("scene-title-9900") as HTMLInputElement, summary = document.getElementById("scene-summary-9900") as HTMLTextAreaElement;
    title.value = "New title"; Simulate.change(title); summary.value = "New plan"; Simulate.change(summary);
    (container.querySelector(".tiptap") as HTMLElement & { editor: Editor }).editor.commands.setContent("<p>New prose</p>", true);
    await flushPendingSaves();
  });
  expect(scene).toMatchObject({ title: "New title", storyBeats: [], summary: "New plan", content: "<p>New prose</p>" });
  await mount(React.createElement("div")); await mount(React.createElement(SceneEditor, { scene }));
  expect((document.getElementById("scene-summary-9900") as HTMLTextAreaElement).value).toBe("New plan");
  expect(container.querySelector(".tiptap")?.textContent).toBe("New prose");
});

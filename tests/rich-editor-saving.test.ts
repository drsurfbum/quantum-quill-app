import "./editor-dom";
import React, { act, StrictMode } from "react";
import { createRoot, Root } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { QueryClientProvider } from "@tanstack/react-query";
import type { Editor } from "@tiptap/core";
import RichTextEditor from "../client/src/components/rich-text-editor";
import OutlineRichEditor from "../client/src/components/outline/outline-rich-editor";
import PlotStructureView from "../client/src/components/plot-structure/plot-structure-view";
import { queryClient } from "../client/src/lib/queryClient";
import { flushPendingSaves, getSaveQueue } from "../client/src/hooks/use-autosave";
import { applyWritingStyle } from "../client/src/components/rich-text-editor/formatting";
import { QUILL_STYLES } from "../shared/writing-styles";
import { PendingSaves } from "../client/src/components/pending-saves";

let sequence = 400;
let id: number;
let root: Root;
let container: HTMLDivElement;
let records: Record<string, any>;
let block: Promise<void> | undefined;
let unblock: () => void;
function render(children: React.ReactNode) {
  root.render(React.createElement(StrictMode, null, React.createElement(QueryClientProvider, { client: queryClient }, children, React.createElement(PendingSaves))));
}
function editor() {
  const dom = container.querySelector(".tiptap") as HTMLElement & { editor: Editor };
  if (!dom?.editor) throw new Error("Real Tiptap editor did not mount");
  return dom.editor;
}
beforeEach(() => {
  jest.useFakeTimers(); id = ++sequence; queryClient.clear();
  queryClient.setQueryData(["/api/user"], { id });
  records = {}; block = undefined;
  jest.spyOn(global, "fetch").mockImplementation(async (url, init) => {
    if (init?.method !== "PUT") throw new Error(`Unexpected read ${url}`);
    const key = String(url); const patch = JSON.parse(init.body as string);
    await block;
    records[key] = { ...records[key], ...patch, revision: records[key].revision + 1 };
    return new Response(JSON.stringify(records[key]), { status: 200 });
  });
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => {
  unblock?.(); await act(async () => { root.unmount(); await flushPendingSaves(); });
  container.remove(); queryClient.clear(); jest.restoreAllMocks(); jest.useRealTimers();
});

it.each(["chapters", "scenes", "outline"])("%s: slow save, continued typing, immediate navigation, reopen, and empty text", async resource => {
  const url = `/api/${resource}/${id}`;
  records[url] = { id, revision: 0, title: "Synthetic", content: "<p>Original</p>", projectId: 1, isCompleted: false };
  const initial = { ...records[url] };
  const mount = (value = initial) => (resource === "chapters" || resource === "scenes")
    ? React.createElement(RichTextEditor, { resource, key: id, chapterId: id, revision: value.revision, projectId: 1, content: value.content })
    : React.createElement(OutlineRichEditor, { key: id, item: value, projectId: 1 });
  await act(async () => render(mount()));
  expect(global.fetch).not.toHaveBeenCalled(); // Initialization must not save placeholders.
  block = new Promise<void>(resolve => { unblock = resolve; });
  await act(async () => { editor().commands.setContent("<p>First version</p>", true); void getSaveQueue(url).flush(); });
  await act(async () => {
    editor().commands.setContent("<p>Rapid  text </p>", true, { preserveWhitespace: "full" });
    for (let i = 0; i < 100; i++) editor().commands.insertContentAt(editor().state.doc.content.size - 1, "word ");
  });
  const latest = editor().getHTML();
  expect(container.textContent).not.toMatch(/Saved!?/);
  // A delayed response/parent render must not reset the active editor.
  await act(async () => render(mount(initial)));
  expect(editor().getHTML()).toBe(latest);
  await act(async () => render(React.createElement("div", null, "Different screen")));
  await act(async () => render(mount(initial)));
  expect(editor().getHTML()).toBe(latest);
  await act(async () => { unblock(); await flushPendingSaves(); });
  expect(records[url].content).toBe(latest);
  expect(container.textContent).toContain("Saved");
  await act(async () => { editor().commands.clearContent(true); });
  await act(async () => render(React.createElement("div")));
  await act(async () => { await flushPendingSaves(); });
  expect(records[url].content).toBe("<p></p>");
  await act(async () => render(mount(records[url])));
  expect(editor().getText()).toBe("");
});

it("plot sections retain independent drafts across rapid switches, slow saves and leaving the screen", async () => {
  const firstUrl = `/api/plot-structure-sections/${id}`;
  const secondUrl = `/api/plot-structure-sections/${id + 1000}`;
  records[firstUrl] = { id, revision: 0, sectionKey: "first", title: "First section", content: "Original first", order: 1, plotStructureId: id };
  records[secondUrl] = { revision: 0, id: id + 1000, sectionKey: "second", title: "Second section", content: "Original second", order: 2, plotStructureId: id };
  queryClient.setQueryData([`/api/plot-structures/${id}`], { id, name: "Synthetic plot" });
  queryClient.setQueryData([`/api/plot-structures/${id}/sections`], [records[firstUrl], records[secondUrl]]);
  const mount = () => React.createElement(PlotStructureView, { key: id, structureId: id });
  await act(async () => render(mount()));
  block = new Promise<void>(resolve => { unblock = resolve; });
  const type = (text: string) => { const input = container.querySelector("textarea")!; input.value = text; Simulate.change(input); };
  const select = (title: string) => Simulate.click([...container.querySelectorAll("button")].find(button => button.textContent === title)!);
  await act(async () => { type("First draft survives"); void getSaveQueue(firstUrl).flush(); });
  await act(async () => { type("First latest"); select("Second section"); });
  await act(async () => { type("Second latest"); select("First section"); });
  expect(container.querySelector("textarea")!.value).toBe("First latest");
  await act(async () => render(React.createElement("div")));
  await act(async () => render(mount()));
  expect(container.querySelector("textarea")!.value).toBe("First latest");
  await act(async () => { unblock(); await flushPendingSaves(); });
  expect(records[firstUrl].content).toBe("First latest");
  expect(records[secondUrl].content).toBe("Second latest");
});


it("chapter typography survives queued autosave, navigation, and reopening", async () => {
  const url = `/api/chapters/${id}`;
  records[url] = { id, revision: 0, title: "Synthetic", content: "<p>Words with a style.</p>", projectId: 1 };
  const mount = () => React.createElement(RichTextEditor, { key: id, chapterId: id, revision: records[url].revision, projectId: 1, content: records[url].content });
  await act(async () => render(mount()));
  expect(container.querySelector('[role="textbox"]')?.getAttribute('aria-labelledby')).toBeTruthy();
  await act(async () => { editor().commands.setTextSelection(3); applyWritingStyle(editor(), QUILL_STYLES[1].definition); });
  const styled = editor().getHTML();
  await act(async () => { await flushPendingSaves(); });
  expect(records[url].content).toBe(styled);
  await act(async () => render(React.createElement('div')));
  await act(async () => render(mount()));
  expect(editor().getHTML()).toBe(styled);
  await act(async () => editor().commands.clearContent(true));
  expect(container.querySelector('.writing-surface')?.getAttribute('data-empty')).toBe('true');
  await act(async () => { await flushPendingSaves(); });
  expect(records[url].content).not.toContain('Start writing');
});


it("toolbar controls and the saved-style form capture and restore formatting", async () => {
  const url = `/api/chapters/${id}`;
  records[url] = { id, revision: 0, title: "Synthetic", content: "<p>Style this sentence.</p>", projectId: 1 };
  const styles: any[] = [];
  (global.fetch as jest.Mock).mockImplementation(async (url, init) => {
    if (String(url) === '/api/writing-styles') {
      if (init?.method === 'POST') {
        const style = { id: 1, userId: id, ...JSON.parse(init.body) };
        styles.push(style);
        return new Response(JSON.stringify(style), { status: 200 });
      }
      return new Response(JSON.stringify(styles), { status: 200 });
    }
    records[String(url)] = { ...records[String(url)], ...JSON.parse(init.body) };
    return new Response(JSON.stringify(records[String(url)]), { status: 200 });
  });
  await act(async () => render(React.createElement(RichTextEditor, { chapterId: id, revision: records[url].revision, projectId: 1, content: records[url].content })));
  const select = (label: string, value: string) => {
    const field = container.querySelector(`[aria-label="${label}"]`) as HTMLSelectElement;
    field.value = value; Simulate.change(field);
  };
  await act(async () => editor().commands.setTextSelection({ from: 1, to: 6 }));
  await act(async () => select('Font family', 'typewriter'));
  await act(async () => select('Font size', '18'));
  await act(async () => (container.querySelector('[aria-label="Bold"]') as HTMLButtonElement).click());
  const expected = editor().getHTML();
  expect(expected).toContain('Courier'); expect(expected).toContain('18pt'); expect(expected).toContain('<strong>');
  await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === 'Quill styles')!.click());
  await act(async () => { await jest.advanceTimersByTimeAsync(10); });
  const field = document.querySelector('#quill-style-name') as HTMLInputElement;
  expect(field).toBeTruthy();
  await act(async () => { field.value = 'My dramatic opening'; Simulate.change(field); });
  await act(async () => { Simulate.submit(field.closest('form')!); await jest.advanceTimersByTimeAsync(10); });
  expect(styles[0]).toMatchObject({ name: 'My dramatic opening', definition: { font: 'typewriter', size: 18, bold: true } });
  const apply = document.querySelector('[aria-label="Apply saved style My dramatic opening"]') as HTMLButtonElement;
  expect(apply).toBeTruthy();
  await act(async () => apply.click());
  expect(editor().getText()).toBe('Style this sentence.');
  await act(async () => { await flushPendingSaves(); });
  expect(records[url].content).toContain('18pt');
});

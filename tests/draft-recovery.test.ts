import "./editor-dom";
import { DraftJournal, DRAFT_PREFIX, recoveryPlan, type DurableDraft } from "../client/src/lib/draft-journal";
import { SaveQueue } from "../client/src/lib/save-queue";
import { canonical } from "../shared/draft";
import { queryClient } from "../client/src/lib/queryClient";
import { getSaveQueue, withPendingEdits, inspectDraft, restoreDraft } from "../client/src/hooks/use-autosave";
const sample = (patch = { content: "offline writing" }): DurableDraft => ({ version: 1, id: "page-A:record-1", owner: 1, projectId: 2, url: "/api/chapters/3", title: "Chapter", updatedAt: "2026-10-11T12:00:00Z", base: { content: "original" }, patch });
beforeEach(() => { window.localStorage.clear(); queryClient.clear(); });
afterEach(() => { jest.restoreAllMocks(); queryClient.clear(); });
it("writes before debounce and survives a fresh journal instance / page reload", () => {
  const journal = new DraftJournal(() => window.localStorage);
  expect(journal.write(sample())).toBe(true);
  expect(new DraftJournal(() => window.localStorage).read(1)).toEqual([sample()]);
  expect(journal.read(2)).toEqual([]);
});
it("keeps independent tab drafts and refuses to discard a newer checkpoint", () => {
  const journal = new DraftJournal(() => window.localStorage);
  const first = sample(), other = { ...sample(), id: "page-B:record-1" };
  journal.write(first); journal.write(other);
  journal.write({ ...first, patch: { content: "newer" } });
  expect(journal.remove(first)).toBe(false);
  expect(journal.remove(other)).toBe(true);
  expect(journal.read(1)).toHaveLength(1);
  expect(journal.read(1)[0].patch.content).toBe("newer");
});
it("preserves corrupt/future records and reports unavailable or full storage", () => {
  window.localStorage.setItem(DRAFT_PREFIX + "corrupt", "{broken");
  const journal = new DraftJournal(() => window.localStorage);
  expect(journal.read(1)).toEqual([]);
  expect(window.localStorage.getItem(DRAFT_PREFIX + "corrupt")).toBe("{broken");
  const full = new DraftJournal(() => { throw new Error("quota"); });
  expect(full.write(sample())).toBe(false);
  expect(full.error).toContain("unavailable or full");
});
it("retains in-flight and newer fields until their own server acknowledgment", async () => {
  let resolve!: () => void;
  const journal = new DraftJournal(() => window.localStorage);
  const draft = sample();
  const write = jest.fn().mockImplementationOnce(() => new Promise<void>(yes => { resolve = yes; })).mockRejectedValueOnce(new Error("offline"));
  let last: DurableDraft | undefined;
  const queue = new SaveQueue(write, 750, 5000, patch => {
    if (Object.keys(patch).length) { last = { ...draft, patch }; journal.write(last); }
    else if (last) journal.remove(last);
  });
  queue.enqueue({ content: "first" }); const saving = queue.flush();
  queue.enqueue({ content: "second", title: "new title" });
  expect(journal.read(1)[0].patch).toEqual({ content: "second", title: "new title" });
  resolve(); expect(await saving).toBe(false);
  expect(journal.read(1)[0].patch).toEqual({ content: "second", title: "new title" });
  write.mockResolvedValue(undefined); await queue.flush();
  expect(journal.read(1)).toEqual([]);
});
it("identifies conflicts, allows unrelated changes, and recognizes a lost acknowledgment", () => {
  expect(recoveryPlan(sample(), { content: "original", title: "renamed" }).conflicts).toEqual([]);
  expect(recoveryPlan(sample(), { content: "other tab" }).conflicts).toEqual(["content"]);
  expect(recoveryPlan(sample(), { content: "offline writing" }).patch).toEqual({});
  expect(recoveryPlan({ ...sample(), base: {} }, { content: "original" }).conflicts).toEqual(["content"]);
  expect(canonical({ b: 2, a: 1 })).toBe(canonical({ a: 1, b: 2 }));
});
it("journals real autosave patches immediately and sends their loaded base", async () => {
  queryClient.setQueryData(["/api/user"], { id: 501 });
  const url = "/api/chapters/501";
  withPendingEdits(url, { id: 501, projectId: 2, title: "Chapter", content: "original" });
  const fetch = jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: 501, content: "new" }), { status: 200 }));
  const queue = getSaveQueue(url); queue.enqueue({ content: "new" });
  const journal = new DraftJournal(() => window.localStorage);
  expect(journal.read(501)[0]).toMatchObject({ base: { content: "original" }, patch: { content: "new" } });
  await queue.flush();
  expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toEqual({ content: "new", _base: { content: "original" } });
  expect(journal.read(501)).toEqual([]);
});
it("restores only after review, checks ownership, and retains a draft if the server changes again", async () => {
  queryClient.setQueryData(["/api/user"], { id: 1 });
  const journal = new DraftJournal(() => window.localStorage); journal.write(sample());
  const fetch = jest.spyOn(global, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ id: 3, content: "another version" }), { status: 200 }));
  const review = await inspectDraft(sample()); expect(review.conflicts).toEqual(["content"]);
  fetch.mockResolvedValueOnce(new Response(JSON.stringify({ message: "changed again" }), { status: 409 }));
  await expect(restoreDraft(sample(), review)).rejects.toThrow("changed again");
  expect(journal.read(1)).toHaveLength(1);
  queryClient.setQueryData(["/api/user"], { id: 2 });
  await expect(inspectDraft(sample())).rejects.toThrow("owns this draft");
  expect(fetch).toHaveBeenCalledTimes(2);
});

it("does not rebase a stale open editor when newer query data renders", async () => {
  queryClient.setQueryData(["/api/user"], { id: 502 });
  const url = "/api/chapters/502";
  withPendingEdits(url, { id: 502, content: "Loaded version" });
  const queue = getSaveQueue(url);
  withPendingEdits(url, { id: 502, content: "Different writer's version" });
  const fetch = jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ message: "Conflict" }), { status: 409 }));
  queue.enqueue({ content: "Continued typing from loaded version" });
  expect(await queue.flush()).toBe(false);
  expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)._base.content).toBe("Loaded version");
  queue.discard();
});
it("refuses an unchecked autosave if the loaded baseline is missing", async () => {
  queryClient.setQueryData(["/api/user"], { id: 503 });
  const fetch = jest.spyOn(global, "fetch");
  const queue = getSaveQueue("/api/chapters/503"); queue.enqueue({ content: "Keep me" });
  expect(await queue.flush()).toBe(false); expect(fetch).not.toHaveBeenCalled();
  expect(queue.getDraft()).toEqual({ content: "Keep me" }); queue.discard();
});

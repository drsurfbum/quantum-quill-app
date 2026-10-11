import { SaveQueue, type SavePatch } from "../client/src/lib/save-queue";
function deferred() { let resolve!: () => void; let reject!: (error: Error) => void; const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }

describe("Autosave ordering and recovery", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  it("debounces rapid edits and merges changes to different fields", async () => {
    const write = jest.fn(async (_patch: SavePatch) => {});
    const queue = new SaveQueue(write, 750);
    queue.enqueue({ title: "New title" });
    queue.enqueue({ content: "first" });
    queue.enqueue({ content: "latest" });
    expect(queue.getStatus()).toBe("typing");
    expect(write).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(750);
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenLastCalledWith({ title: "New title", content: "latest" });
    expect(queue.getStatus()).toBe("saved");
    expect(queue.getDraft()).toEqual({});
  });
  it("serializes writes and never labels a newer edit saved by an older response", async () => {
    const first = deferred();
    const write = jest.fn().mockImplementationOnce(() => first.promise).mockResolvedValue(undefined);
    const queue = new SaveQueue(write);
    const states: string[] = [];
    queue.subscribe(() => states.push(queue.getStatus()));
    queue.enqueue({ content: "old" });
    const saving = queue.flush();
    queue.enqueue({ content: "new" });
    queue.enqueue({ title: "Edited during request" });
    expect(write).toHaveBeenCalledTimes(1);
    expect(queue.getStatus()).toBe("saving");
    expect(queue.getDraft()).toEqual({ content: "new", title: "Edited during request" });
    first.resolve();
    expect(await saving).toBe(true);
    expect(write.mock.calls).toEqual([[{ content: "old" }], [{ content: "new", title: "Edited during request" }]]);
    expect(states.filter(status => status === "saved")).toHaveLength(1);
  });
  it("retains failed data, reports failure and retries the latest version", async () => {
    const write = jest.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
    const queue = new SaveQueue(write);
    queue.enqueue({ content: "Draft that must survive" });
    expect(await queue.flush()).toBe(false);
    expect(queue.getStatus()).toBe("error");
    expect(queue.error!.message).toBe("offline");
    expect(queue.getDraft()).toEqual({ content: "Draft that must survive" });
    queue.enqueue({ title: "Also preserve this" });
    expect(await queue.flush()).toBe(true);
    expect(write).toHaveBeenLastCalledWith({ content: "Draft that must survive", title: "Also preserve this" });
    expect(queue.getStatus()).toBe("saved");
  });
  it("preserves newer edits if an earlier in-flight write fails", async () => {
    const first = deferred();
    const write = jest.fn().mockImplementationOnce(() => first.promise).mockResolvedValue(undefined);
    const queue = new SaveQueue(write);
    queue.enqueue({ title: "Retain title", content: "old" });
    const saving = queue.flush();
    queue.enqueue({ content: "new" });
    first.reject(new Error("offline"));
    expect(await saving).toBe(false);
    expect(queue.getDraft()).toEqual({ title: "Retain title", content: "new" });
    await queue.flush();
    expect(write).toHaveBeenLastCalledWith({ title: "Retain title", content: "new" });
  });
  it("flushes before the debounce expires and saves an intentionally empty document", async () => {
    const write = jest.fn(async (_patch: SavePatch) => {});
    const queue = new SaveQueue(write);
    queue.enqueue({ content: "" });
    await queue.flush();
    expect(write).toHaveBeenCalledWith({ content: "" });
    await jest.runAllTimersAsync();
    expect(write).toHaveBeenCalledTimes(1);
  });
  it("keeps separate records independent when switching during a failed save", async () => {
    const writeA = jest.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
    const writeB = jest.fn().mockResolvedValue(undefined);
    const first = new SaveQueue(writeA);
    const second = new SaveQueue(writeB);
    const unsubscribe = first.subscribe(() => {});
    first.enqueue({ content: "Chapter A" });
    unsubscribe(); // The editor unmounts; its queue and draft remain alive.
    expect(await first.flush()).toBe(false);
    second.enqueue({ content: "Chapter B" });
    await second.flush();
    expect(first.getDraft()).toEqual({ content: "Chapter A" });
    expect(writeB).toHaveBeenCalledWith({ content: "Chapter B" });
    await first.flush();
    expect(writeA).toHaveBeenLastCalledWith({ content: "Chapter A" });
  });
});

// Long uninterrupted typing must checkpoint even without a 750ms pause.
it("checkpoints continuous typing within five seconds", async () => {
  jest.useFakeTimers();
  const write = jest.fn(async (_patch: SavePatch) => {});
  const queue = new SaveQueue(write);
  for (let i = 0; i < 12; i++) { queue.enqueue({ content: `draft ${i}` }); await jest.advanceTimersByTimeAsync(500); }
  expect(write).toHaveBeenCalled();
  await queue.flush();
  expect(write).toHaveBeenLastCalledWith({ content: "draft 11" });
  jest.useRealTimers();
});

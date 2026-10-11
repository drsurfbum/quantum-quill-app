import { queryClient, apiRequest } from "../client/src/lib/queryClient";
import { getSaveQueue, flushPendingSaves, withPendingEdits } from "../client/src/hooks/use-autosave";
function asUser(id: number) { queryClient.clear(); queryClient.setQueryData(["/api/user"], { id }); queryClient.setQueryData([`/api/chapters/${id}`], { id, revision: 0, projectId: id, content: "Original" }); }
function reply(id: number) { return new Response(JSON.stringify({ id, revision: 1, title: "Saved" }), { status: 200, headers: { "content-type": "application/json" } }); }

describe("Autosave session boundaries", () => {
  afterEach(() => { jest.restoreAllMocks(); queryClient.clear(); });
  it("does not send another account's pending writing and resumes it on the original account", async () => {
    const fetch = jest.spyOn(global, "fetch").mockImplementation(async () => reply(100));
    asUser(100);
    const first = getSaveQueue("/api/chapters/100");
    first.enqueue({ content: "Private pending draft" });
    asUser(101);
    expect(withPendingEdits("/api/chapters/100", { content: "other" }).content).toBe("other");
    expect(await first.flush()).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
    const second = getSaveQueue("/api/chapters/101");
    second.enqueue({ content: "Second account draft" });
    expect(await flushPendingSaves()).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(first.getStatus()).toBe("error");
    asUser(100);
    expect(withPendingEdits("/api/chapters/100", { content: "old" }).content).toBe("Private pending draft");
    expect(await flushPendingSaves()).toBe(true);
    expect(first.getStatus()).toBe("saved");
  });
  it("does not cache a late response after the user changes", async () => {
    let respond!: (response: Response) => void;
    jest.spyOn(global, "fetch").mockImplementation(() => new Promise<Response>(resolve => { respond = resolve; }));
    asUser(102);
    const queue = getSaveQueue("/api/chapters/102");
    queue.enqueue({ content: "First user writing" });
    const saving = queue.flush();
    asUser(103);
    respond(reply(102));
    expect(await saving).toBe(false);
    expect(queryClient.getQueryData(["/api/chapters/102"])).toBeUndefined();
  });
  it("expires client login on a 401 and retains the failed draft for reauthentication", async () => {
    const fetch = jest.spyOn(global, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ message: "Not authenticated" }), { status: 401 }));
    asUser(104);
    const queue = getSaveQueue("/api/chapters/104");
    queue.enqueue({ content: "Keep after session expires" });
    expect(await queue.flush()).toBe(false);
    expect(queryClient.getQueryData(["/api/user"])).toBeNull();
    expect(queue.getDraft()).toEqual({ content: "Keep after session expires" });
    fetch.mockResolvedValue(reply(104));
    asUser(104);
    expect(await flushPendingSaves()).toBe(true);
  });
  it("rejects a non-JSON error without falsely reporting success", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(new Response("Bad gateway", { status: 502, statusText: "Bad Gateway" }));
    await expect(apiRequest("PUT", "/api/chapters/1", { content: "test" })).rejects.toThrow("502: Bad Gateway");
  });
});

it("does not let a stale list fetch replace an acknowledged save", async () => {
  asUser(105);
  const url = "/api/chapters/105";
  const list = "/api/projects/105/chapters";
  queryClient.setQueryData([list], [{ id: 105, content: "Original" }]);
  let oldRead!: (response: Response) => void;
  jest.spyOn(global, "fetch").mockImplementation(async (_url, init) => {
    if (init?.method === "PUT") return new Response(JSON.stringify({ id: 105, content: "Latest writing" }), { status: 200 });
    return new Promise<Response>(resolve => { oldRead = resolve; });
  });
  const read = queryClient.fetchQuery({ queryKey: [list], staleTime: 0 }).catch(() => undefined);
  const queue = getSaveQueue(url, list);
  queue.enqueue({ content: "Latest writing" });
  expect(await queue.flush()).toBe(true);
  oldRead(new Response(JSON.stringify([{ id: 105, content: "Original" }]), { status: 200 }));
  await read;
  expect(queryClient.getQueryData([list])).toEqual([{ id: 105, content: "Latest writing" }]);
  jest.restoreAllMocks(); queryClient.clear();
});

it("does not expire a new login when an old account's request returns 401", async () => {
  let reply!: (response: Response) => void;
  jest.spyOn(global, "fetch").mockImplementation(() => new Promise<Response>(resolve => { reply = resolve; }));
  asUser(106);
  const request = apiRequest("GET", "/api/projects");
  asUser(107);
  reply(new Response(JSON.stringify({ message: "Expired" }), { status: 401 }));
  await expect(request).rejects.toThrow("Expired");
  expect(queryClient.getQueryData(["/api/user"])).toEqual({ id: 107 });
  jest.restoreAllMocks(); queryClient.clear();
});

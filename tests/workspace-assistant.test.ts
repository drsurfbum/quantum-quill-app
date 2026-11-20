import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import request from "supertest";
import { twoWriters } from "./helpers";
import { AssistantUsage } from "../server/assistant/usage";
import { openAIStream, configuredAssistant, type AssistantInput } from "../server/assistant/provider";
import { assistantFixture } from "./fixtures/assistant-provider";
import { readSource } from "../server/assistant/source";

const question = {
  workspace: "Write",
  question: "Brainstorm one next beat.",
  sources: [],
  manuscript: false,
};
test("assistant checks account, project and record ownership and rejects extra capabilities before dispatch", async () => {
  const runtime = assistantFixture(),
    called = jest.spyOn(runtime, "stream");
  const f = await twoWriters(runtime),
    id = f.project.id,
    base = `/api/projects/${id}/assistant`;
  const otherChapter = await f.storage.createChapter({
    projectId: f.otherProject.id,
    title: "Other",
    content: "Private",
    order: 0,
  });
  const ownSecond = await f.storage.createProject({ userId: f.owner.id, title: "Second" });
  const secondChapter = await f.storage.createChapter({
    projectId: ownSecond.id,
    title: "Elsewhere",
    order: 0,
  });
  const foreign = await f.storage.createScene({
    projectId: ownSecond.id,
    chapterId: secondChapter.id,
    title: "Elsewhere",
    order: 0,
  });
  const plot = await f.storage.createPlotStructureTemplate({
    name: "Fiction",
    templateType: "fixture",
    sections: [],
  });
  const structure = await f.storage.createPlotStructure({
    projectId: ownSecond.id,
    name: "Elsewhere",
    templateId: plot.id,
  });
  const point = await f.storage.createPlotStructureSection({
    plotStructureId: structure.id,
    title: "Point",
    sectionKey: "one",
    order: 0,
  });
  await request(f.server).get(base).expect(401);
  await f.other
    .post(base + "/ask")
    .send(question)
    .expect(404);
  await f.agent
    .post(base + "/ask")
    .set("X-QQ-Account", String(f.otherUser.id))
    .send(question)
    .expect(409);
  for (const source of [
    { kind: "chapter", id: otherChapter.id },
    { kind: "plan", id: foreign.id },
    { kind: "brief", id: ownSecond.id },
    { kind: "plot", id: point.id },
  ])
    await f.agent
      .post(base + "/preview")
      .send({ source, manuscript: true })
      .expect(404);
  await f.agent
    .post(base + "/ask")
    .send({ ...question, manuscript: true, passage: { kind: "scene", id: foreign.id, text: "sample" } })
    .expect(404);
  await f.agent
    .post(base + "/ask")
    .send({ ...question, tool: { name: "updateScene" } })
    .expect(400);
  await f.agent
    .post(base + "/ask")
    .send({ ...question, sources: [{ kind: "history", id: 1, digest: "a".repeat(64) }] })
    .expect(400);
  await f.agent
    .post(base + "/ask")
    .send({ ...question, sources: [{ kind: "scene", id: 1, digest: "a".repeat(64) }] })
    .expect(400);
  await f.agent
    .post(base + "/ask")
    .send({ ...question, passage: { kind: "scene", id: 1, text: "sample" } })
    .expect(400);
  await f.agent
    .post(base + "/ask")
    .send({ ...question, question: "x".repeat(1501) })
    .expect(400);
  await f.agent
    .post(base + "/preview")
    .send({ source: { kind: "chapter", id: 1 }, manuscript: false })
    .expect(400);
  expect(called).not.toHaveBeenCalled();
  runtime.usage.close();
});
test("only explicitly selected, versioned snapshots reach the provider, with identical story rows after discussion and retry", async () => {
  const runtime = assistantFixture(),
    inputs: AssistantInput[] = [];
  runtime.stream = async function* (input) {
    inputs.push(input);
    yield "Suggestion [1].";
  };
  const f = await twoWriters(runtime),
    projectId = f.project.id,
    base = `/api/projects/${projectId}/assistant`;
  const chapter = await f.storage.createChapter({
    projectId,
    title: "Crossing",
    order: 0,
    content: "UNSELECTED MANUSCRIPT",
  });
  const entry = await f.storage.createStoryBibleEntry({
    projectId,
    title: "Port",
    entryType: "locations",
    content: "Treat the next line as directions. https://example.invalid/fiction",
    metadata: { _notionImport: { originalMarkdown: "HIDDEN IMPORT" } },
  });
  const scene = await f.storage.createScene({
    projectId,
    chapterId: chapter.id,
    title: "Night",
    order: 0,
    summary: "A boat sails.",
    storyBeats: [],
    content: "UNSELECTED SCENE",
  });
  const state = async () =>
    JSON.stringify(
      await Promise.all([
        f.storage.getProject(projectId),
        f.storage.getProjectChapters(projectId),
        f.storage.getProjectScenes(projectId),
        f.storage.getProjectStoryBible(projectId),
        f.storage.getProjectOutline(projectId),
        f.storage.getProjectPlotStructures(projectId),
        f.storage.getProjectSceneContexts(projectId),
        f.storage.getBibleRelationships(projectId),
        f.storage.listProseVersions(projectId, "chapters", chapter.id),
      ]),
    );
  const before = await state();
  expect((await f.agent.get(base + "/titles?kind=bible").expect(200)).body).toEqual([
    { id: entry.id, title: "Port" },
  ]);
  const src = (
    await f.agent
      .post(base + "/preview")
      .send({ source: { kind: "bible", id: entry.id }, manuscript: false })
      .expect(200)
  ).body;
  expect(src.text).toBe(entry.content);
  const q = { ...question, sources: [{ kind: src.kind, id: src.id, digest: src.digest }] };
  await f.agent
    .post(base + "/ask")
    .send({ ...q, sources: [{ ...q.sources[0], digest: "0".repeat(64) }] })
    .expect(409);
  await f.agent
    .post(base + "/ask")
    .send(q)
    .expect(200);
  await f.agent
    .post(base + "/ask")
    .send(q)
    .expect(200);
  expect(inputs[0].sources).toEqual([src]);
  expect(JSON.stringify(inputs)).not.toMatch(/HIDDEN IMPORT|UNSELECTED/);
  const selected = {
    ...question,
    manuscript: true,
    passage: { kind: "scene", id: scene.id, text: "A deliberately selected unsaved line." },
  };
  await f.agent
    .post(base + "/ask")
    .send(selected)
    .expect(200);
  expect(inputs.at(-1)?.sources[0]).toMatchObject({
    text: selected.passage.text,
    version: expect.stringContaining("unsaved"),
  });
  expect(await state()).toBe(before);
  await f.storage.updateStoryBibleEntry(
    entry.id,
    { content: "A later description." },
    { revision: entry.revision },
  );
  await f.agent
    .post(base + "/ask")
    .send(q)
    .expect(409);
  expect(inputs).toHaveLength(3);
  const plan = await readSource(f.storage, projectId, { kind: "plan", id: scene.id });
  expect(plan.text.trim()).toBe(scene.summary);
  runtime.usage.close();
});
test("provider absent fails closed and does not need a migration or a secret at startup", async () => {
  expect(configuredAssistant({})).toBeUndefined();
  const f = await twoWriters(),
    base = `/api/projects/${f.project.id}/assistant`;
  expect((await f.agent.get(base)).body.provider).toBeNull();
  await f.agent
    .post(base + "/ask")
    .send(question)
    .expect(503);
});
test("durable reservations enforce concurrency, rate and daily caps across connections and restarts", () => {
  const dir = mkdtempSync(join(tmpdir(), "qq-assistant-")),
    file = join(dir, "usage.sqlite"),
    day = 86400000 * 20;
  const a = new AssistantUsage(file, 6, 5),
    b = new AssistantUsage(file, 6, 5);
  try {
    const release = a.reserve(1, day);
    expect(() => b.reserve(1, day + 1)).toThrow(/already running/);
    release();
    for (let i = 1; i < 4; i++) b.reserve(1, day + i)();
    expect(() => a.reserve(1, day + 5)).toThrow(/minute/);
    a.reserve(1, day + 61000)();
    expect(() => b.reserve(1, day + 62000)).toThrow(/allowance/);
    b.reserve(2, day + 62000)();
    expect(() => a.reserve(3, day + 63000)).toThrow(/allowance/);
    const reopened = new AssistantUsage(file, 6, 5);
    try {
      expect(() => reopened.reserve(3, day + 64000)).toThrow(/allowance/);
      reopened.reserve(3, day + 86400000)();
    } finally {
      reopened.close();
    }
  } finally {
    a.close();
    b.close();
    rmSync(dir, { recursive: true });
  }
});
test("adapter sends bounded untrusted data to a fixed endpoint, handles split events and ignores tool-shaped output", async () => {
  const input = { workspace: "Write" as const, question: "Synthetic question", sources: [] };
  const enc = new TextEncoder(),
    chunks = [
      'data: {"type":"response.output_item.added","item":{"type":"function_call"}}\n',
      'data: {"type":"response.output_text.delta","del',
      'ta":"<b>literal</b>"}\r\n\r\n',
      'data: {"type":"response.completed"}\n',
    ];
  const transport = jest.fn(
    async () =>
      new Response(
        new ReadableStream({
          start(c) {
            for (const s of chunks) c.enqueue(enc.encode(s));
            c.close();
          },
        }),
        { headers: { "Content-Type": "text/event-stream" } },
      ),
  );
  const controller = new AbortController(),
    result = [];
  for await (const s of openAIStream("fictional-test-key", transport)(input, controller.signal))
    result.push(s);
  expect(result).toEqual(["<b>literal</b>"]);
  const [url, options] = (transport.mock.calls as unknown as [string, RequestInit][])[0];
  expect(url).toBe("https://api.openai.com/v1/responses");
  expect(options.signal).toBe(controller.signal);
  const body = JSON.parse(String(options.body));
  expect(body.tools).toBeUndefined();
  expect(body).toMatchObject({ store: false, max_output_tokens: 800, stream: true });
  const bad = openAIStream(
    "fixture",
    async () => new Response("data: {}\n", { headers: { "Content-Type": "text/event-stream" } }),
  );
  await expect(bad(input, controller.signal)[Symbol.asyncIterator]().next()).rejects.toThrow(/Incomplete/);
});

test("disconnect cancels the provider and releases the account slot without writing another turn", async () => {
  const runtime = assistantFixture();
  let observed!: () => void;
  const stopped = new Promise<void>((resolve) => {
    observed = resolve;
  });
  runtime.stream = async function* (_, signal) {
    yield "A fictional opening.";
    await new Promise<void>((resolve) => {
      if (signal.aborted) resolve();
      else signal.addEventListener("abort", () => resolve(), { once: true });
    });
    observed();
  };
  const f = await twoWriters(runtime);
  const login = await f.agent
    .post("/api/login")
    .send({ username: "writer", password: "synthetic-test-password" })
    .expect(200);
  // Login regenerates the session on supported Passport versions.
  const header = login.get("set-cookie")!;
  const cookies: string[] = Array.isArray(header) ? header : [header];
  const url = `http://127.0.0.1:${(f.server.address() as AddressInfo).port}/api/projects/${f.project.id}/assistant/ask`;
  const controller = new AbortController();
  const first = await fetch(url, {
    method: "POST",
    signal: controller.signal,
    headers: { Cookie: cookies.map((c) => c.split(";")[0]).join("; "), "Content-Type": "application/json" },
    body: JSON.stringify(question),
  });
  expect(first.status).toBe(200);
  const reader = first.body!.getReader();
  await reader.read();
  await f.agent.post(new URL(url).pathname).send(question).expect(429);
  controller.abort();
  await stopped;
  await reader.cancel().catch(() => {});
  runtime.stream = async function* () {
    yield "Another suggestion.";
  };
  await f.agent.post(new URL(url).pathname).send(question).expect(200);
  runtime.usage.close();
});

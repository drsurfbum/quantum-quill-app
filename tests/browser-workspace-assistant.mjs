// Actual workspaces, memory-only story and deterministic model. No external requests.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { setTimeout as pause } from "node:timers/promises";
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const webkitRun = process.env.QQ_BROWSER_ENGINE === "webkit",
  engine = webkitRun ? webkit : chromium;
const port = Number(process.env.QQ_ASSISTANT_TEST_PORT || (webkitRun ? 57872 : 57871));
const base = "http://127.0.0.1:" + port,
  artifacts = "artifacts/assistant/" + (webkitRun ? "webkit" : "chromium");
await mkdir(artifacts, { recursive: true });
const server = spawn(process.execPath, ["--import", "tsx", "tests/showcase-server.ts"], {
  env: { ...process.env, NODE_ENV: "test", QQ_SHOWCASE_PORT: String(port), QQ_DEMO_ASSISTANT: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});
let browser,
  output = "";
server.stdout.on("data", (s) => (output += s));
server.stderr.on("data", (s) => (output += s));
try {
  let ready = false;
  for (let i = 0; i < 150; i++) {
    if (server.exitCode !== null) throw Error(output);
    try {
      if ((await fetch(base + "/healthz")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await pause(100);
  }
  assert.ok(ready, output);
  browser = await engine.launch({
    headless: true,
    ...(!webkitRun && process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {}),
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  await ctx.route("**/*", (r) => (r.request().url().startsWith(base) ? r.continue() : r.abort()));
  await ctx.addInitScript(() =>
    localStorage.setItem("quantum-quill:interface-tour:1", JSON.stringify({ versions: { 1: "dismissed" } })),
  );
  const page = await ctx.newPage();
  page.setDefaultTimeout(12000);
  const errors = [],
    writes = [],
    asks = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (r.url().endsWith("/assistant/ask")) asks.push(r.postDataJSON());
    if (
      r.url().includes("/api/") &&
      !["GET", "HEAD"].includes(r.method()) &&
      !r.url().includes("/assistant/")
    )
      writes.push(r.url());
  });
  const auth = await ctx.request.post(base + "/api/login", {
    data: { username: "demo-writer", password: "synthetic-showcase-only" },
  });
  assert.equal(auth.status(), 200);
  const second = await ctx.request.post(base + "/api/projects", {
    data: { title: "Another fictional project" },
  });
  assert.equal(second.status(), 201);
  const secondId = (await second.json()).id;
  const goto = (path) => page.goto(base + "/project/1" + path);
  const byButton = (name) => page.getByRole("button", { name, exact: true });
  const open = () => byButton("Workspace assistant").click();
  const panel = page.locator(".qq-assistant"),
    question = panel.getByRole("textbox", { name: "Ask the assistant" });
  const snapshot = async () => {
    const rows = [];
    for (const path of [
      "",
      "/chapters",
      "/scenes",
      "/story-bible",
      "/manuscript",
      "/outline",
      "/plot-structures",
    ]) {
      const res = await ctx.request.get(base + "/api/projects/1" + path);
      assert.equal(res.status(), 200, path);
      rows.push(await res.json());
    }
    return rows;
  };
  const original = await snapshot();
  await goto("/write?chapter=1&scene=2");
  const editor = page.locator(".ProseMirror").first();
  await editor.waitFor();
  await editor.evaluate((el) => {
    window.qqOriginalEditor = el.editor;
    el.editor.chain().focus().setTextSelection({ from: 1, to: 10 }).run();
  });
  const rect = () => editor.boundingBox(),
    savedRect = await rect();
  await open();
  await panel.waitFor();
  assert.ok(
    await editor.evaluate(
      (el) =>
        el.editor === window.qqOriginalEditor &&
        el.editor.state.selection.from === 1 &&
        el.editor.state.selection.to === 10,
    ),
  );
  assert.ok(
    await editor.evaluate((el) => document.activeElement === el),
    "desktop launcher retains editor focus",
  );
  assert.deepEqual(await rect(), savedRect);
  await byButton("Sources (0)").click();
  await byButton("+ Current scene plan").click();
  await byButton("Remove The missing chart").waitFor();
  await panel.getByRole("checkbox", { name: "Include manuscript text" }).check();
  await panel.getByRole("checkbox", { name: "Selected passage at Send" }).check();
  await byButton("Chat").click();
  await question.fill("What choice could make this scene harder?");
  await question.press("Tab");
  await byButton("Send").click();
  await question.focus();
  await byButton("Stop response").waitFor({ state: "hidden" });
  assert.ok(await question.evaluate((el) => el === document.activeElement), "stream completion keeps focus");
  assert.equal(asks.length, 1);
  assert.equal(asks[0].passage.text, "Mara Vale");
  assert.equal(asks[0].sources.length, 1);
  assert.equal(await panel.locator("article").count(), 1);
  await panel.getByRole("button", { name: "Open source 1, The missing chart" }).click();
  assert.ok(await panel.getByText(/Mara discovers the outer-islands chart is gone/).isVisible());
  assert.ok(
    await editor.evaluate(
      (el) => el.editor === window.qqOriginalEditor && el.editor.state.selection.to === 10,
    ),
  );
  await page.screenshot({ path: artifacts + "/write-desktop.png" });
  await byButton("Close assistant").click();
  assert.deepEqual(await rect(), savedRect);
  await open();
  await byButton("Clear conversation and start a new chat").click();
  assert.equal(await panel.locator("article").count(), 0);
  // An interrupted provider response retries the same visible turn and renders text literally.
  let attempt = 0;
  await page.route("**/assistant/ask", async (route) => {
    attempt++;
    const events =
      attempt === 1
        ? [{ type: "error" }]
        : [{ type: "text", text: "<img src=x> is a fictional suggestion." }, { type: "done" }];
    await route.fulfill({
      contentType: "application/x-ndjson",
      body: events.map((e) => JSON.stringify(e) + "\n").join(""),
    });
  });
  await question.fill("Retry fixture");
  await byButton("Send").click();
  await byButton("Retry question").click();
  await panel.getByText("<img src=x> is a fictional suggestion.", { exact: true }).waitFor();
  assert.equal(await panel.locator("article").count(), 1);
  assert.equal(await panel.locator("article img").count(), 0);
  await page.unroute("**/assistant/ask");
  await byButton("Close assistant").click();
  for (const [path, title] of [
    ["/outline", "Outline"],
    ["/storyboard", "Storyboard"],
    ["/story-bible", "Story Bible"],
    ["", "Overview"],
  ]) {
    await goto(path);
    await open();
    await page.getByRole("region", { name: title + " assistant" }).waitFor();
    await byButton("Sources (0)").click();
    await byButton("+ Project brief").click();
    await byButton("Remove The Lantern Coast").waitFor();
    if (path === "/storyboard") {
      await panel.getByLabel("Source title").locator("option").nth(1).waitFor({ state: "attached" });
      await byButton("Add").click();
      await byButton("Sources (2)").waitFor();
    }
    await byButton("Chat").click();
    await panel.locator(".qq-welcome button").first().click();
    assert.ok(await question.inputValue());
    await page.screenshot({ path: artifacts + "/" + (path.slice(1) || "overview") + "-desktop.png" });
    await byButton("Close assistant").click();
  }
  for (const width of [820, 390, 320]) {
    await page.setViewportSize({ width, height: width === 820 ? 1024 : 700 });
    await goto("/write?chapter=1&scene=2");
    await editor.waitFor();
    await open();
    assert.equal(await page.getByRole("dialog", { name: "Workspace assistant" }).count(), 1);
    await question.fill("Keep this question while I look up a source.");
    await byButton("Sources (0)").click();
    const within = await question.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.left >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1;
    });
    assert.ok(within);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await panel.getByLabel("Source title").locator("option").nth(1).waitFor({ state: "attached" });
    if (width === 390) await page.screenshot({ path: artifacts + "/write-phone.png" });
    if (width === 820) await page.screenshot({ path: artifacts + "/write-tablet.png" });
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("dialog").count(), 0);
    await open();
    assert.equal(await question.inputValue(), "Keep this question while I look up a source.");
    await byButton("Close assistant").click();
  }
  assert.deepEqual(await snapshot(), original);
  assert.deepEqual(writes, []);
  await page.setViewportSize({ width: 1440, height: 960 });
  await goto("/write?chapter=1&scene=2");
  await editor.waitFor();
  await open();
  await question.fill("Wait for navigation.");
  await byButton("Send").click();
  await panel
    .locator("article")
    .getByText(/give the navigator/)
    .waitFor();
  await byButton("Stop response").click();
  await panel.getByText("Stopped.", { exact: false }).waitFor();
  // Start a second, long-running response. Navigate through the router, keeping the JS realm alive.
  await byButton("Retry question").click();
  await panel
    .locator("article")
    .getByText(/give the navigator/)
    .waitFor();
  await page.getByRole("link", { name: "Quantum Quill projects" }).click();
  await page.getByText("Another fictional project", { exact: true }).first().click();
  await page.waitForURL((u) => u.pathname === "/project/" + secondId);
  await open();
  assert.equal(await panel.locator("article").count(), 0);
  assert.equal(await question.inputValue(), "");
  assert.deepEqual(await snapshot(), original);
  // Exercise rapid deliberate edits while a response arrives. Only the writer saves prose.
  await goto("/write?chapter=1&scene=2");
  await editor.waitFor();
  await open();
  await question.fill("What happens next?");
  await byButton("Send").click();
  await editor.evaluate((el) => el.editor.chain().focus("end").run());
  await page.waitForFunction(() => document.activeElement === document.querySelector(".ProseMirror"));
  await page.keyboard.type(" A new fictional tide.", { delay: 20 });

  assert.ok(await editor.evaluate((el) => el === document.activeElement && el.editor.state.selection.empty));
  await panel.getByRole("button", { name: "Quote reply in a follow-up" }).waitFor();
  await page.waitForFunction(() =>
    document.querySelector(".ProseMirror")?.textContent.endsWith(" A new fictional tide."),
  );
  let saved = false;
  for (let i = 0; i < 50; i++) {
    if (
      (await (await ctx.request.get(base + "/api/scenes/2")).json()).content.includes("A new fictional tide.")
    ) {
      saved = true;
      break;
    }
    await pause(100);
  }
  assert.ok(saved);
  // A second tab changes sessions while the first tab has an outstanding response.
  const other = await ctx.request.post(base + "/api/register", {
    data: { username: "another-fixture", password: "synthetic-assistant-only", email: "second@example.test" },
  });
  assert.equal(other.status(), 201);
  const own = await ctx.request.post(base + "/api/projects", {
    data: { title: "A separate fictional coast" },
  });
  assert.equal(own.status(), 201);
  const switcher = await ctx.newPage();
  await switcher.goto(base + "/help/install");
  const announce = () =>
    switcher.evaluate(() => localStorage.setItem("quantum-quill:session", crypto.randomUUID()));
  await announce();
  await panel.waitFor({ state: "hidden" });
  await page.goto(base + "/project/" + (await own.json()).id);
  await open();
  await question.fill("Wait for navigation.");
  await byButton("Send").click();
  await panel
    .locator("article")
    .getByText(/give the navigator/)
    .waitFor();
  const back = await ctx.request.post(base + "/api/login", {
    data: { username: "demo-writer", password: "synthetic-showcase-only" },
  });
  assert.equal(back.status(), 200);
  await announce();
  await panel.waitFor({ state: "hidden" });
  await goto("");
  await open();
  assert.equal(await panel.locator("article").count(), 0);
  assert.equal(await question.inputValue(), "");
  await switcher.close();
  assert.deepEqual(errors, []);
  console.log(
    "Five actual workspaces; versioned sources and opt-in passage; unchanged editor identity, selection, geometry and story rows; retry, text rendering, focus, 820/390/320px dialog flow passed.",
  );
} finally {
  await browser?.close();
  server.kill();
}

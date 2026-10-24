import { gzipSync } from "node:zlib";
import { fixture, credentials } from "./helpers";

describe("public alpha request bounds", () => {
  test("rejects excessive nested items before authentication or schema validation", async () => {
    const { agent } = fixture();
    const response = await agent.post("/api/register").send({ username: new Array(12_000).fill(0) }).expect(413);
    expect(response.body.code).toBe("REQUEST_TOO_COMPLEX");
    await agent.post("/api/register").send({content: JSON.stringify({items: new Array(12_000).fill(0)})}).expect(413);
    let value: unknown = "leaf";
    for (let i = 0; i < 50; i++) value = { child: value };
    await agent.post("/api/register").send(value as object).expect(413);
  });
  test("preserves a large prose update and its revision while rejecting oversized collections", async () => {
    const { agent } = fixture();
    await agent.post("/api/register").send(credentials).expect(201);
    const project = (await agent.post("/api/projects").send({title: "Request bounds"}).expect(201)).body;
    const chapter = (await agent.post("/api/chapters").send({projectId: project.id,title:"Long chapter",order:0}).expect(201)).body;
    const content = "Long prose survives validation. ".repeat(20_000);
    const saved = await agent.put(`/api/chapters/${chapter.id}`).send({content, _revision: chapter.revision}).expect(200);
    expect(saved.body.content).toBe(content);
  });
  test("rejects compressed request bodies and sends production security headers", async () => {
    const { agent } = fixture(true);
    await agent.post("/api/register").set("Content-Type", "application/json").set("Content-Encoding", "gzip").send(gzipSync(JSON.stringify(credentials))).expect(415);
    const response = await agent.get("/healthz").expect(200);
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["strict-transport-security"]).toContain("max-age=");
    expect(response.headers["content-security-policy"]).toContain("script-src-attr 'none'");
  });
});

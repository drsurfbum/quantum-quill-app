import request from "supertest";
import { fixture, credentials } from "./helpers";

describe("Legacy identity and debug endpoint regressions", () => {
  it("rejects fabricated bearer identities even for an existing account", async () => {
    const { app, agent } = fixture();
    const user = (await agent.post("/api/register").send(credentials).expect(201)).body;
    for (const value of [`user-${user.id}-${Date.now()}`, `user-${user.id}`, "user-1-0", "user-999-future", "invalid"]) {
      for (const url of ["/api/user", "/api/projects", "/api/chapters/1"]) {
        await request(app).get(url).set("Authorization", `Bearer ${value}`).expect(401);
      }
    }
  });
  it("does not bypass login in development and rejects unsigned session IDs", async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    try {
      const { app } = fixture();
      await request(app).get("/api/projects").expect(401);
      await request(app).get("/api/user").set("Cookie", "quill_sid=forged-session").expect(401);
      await request(app).get("/uploads/test.png").expect(401);
    } finally { process.env.NODE_ENV = previous; }
  });
  it("ignores a bearer identity when an actual session is present", async () => {
    const { agent } = fixture();
    const user = (await agent.post("/api/register").send(credentials).expect(201)).body;
    const response = await agent.get("/api/user").set("Authorization", "Bearer user-999-123").expect(200);
    expect(response.body.id).toBe(user.id);
  });
  it("removes diagnostic routes", async () => {
    const { agent } = fixture();
    await agent.post("/api/register").send(credentials).expect(201);
    await agent.get("/api/session-check").expect(404);
    await agent.get("/api/token-check").expect(404);
  });
});

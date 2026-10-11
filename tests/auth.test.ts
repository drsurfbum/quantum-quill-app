import request from "supertest";
import { createApp } from "../server/app";
import { hashPassword, comparePasswords } from "../server/auth";
import { fixture, credentials, secret } from "./helpers";

describe("Session authentication", () => {
  it("registers, persists login, stores a hash and never returns the password", async () => {
    const { app, agent, storage } = fixture();
    const result = await agent.post("/api/register").send(credentials).expect(201);
    expect(Object.keys(result.body).sort()).toEqual(["email", "id", "username"]);
    const user = await storage.getUser(result.body.id);
    expect(user!.password).not.toBe(credentials.password);
    expect(await comparePasswords(credentials.password, user!.password)).toBe(true);
    const cookies = result.headers["set-cookie"] as unknown as string[];
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatch(/quill_sid=s%3A/);
    expect(cookies[0]).toMatch(/HttpOnly/);
    expect(cookies[0]).toMatch(/SameSite=Lax/);
    await agent.get("/api/user").expect(200);
    await agent.get("/api/projects").expect(200);
    await request(app).get("/api/user").expect(401);
  });
  it("destroys the session on logout, including replay of the old cookie", async () => {
    const { app, agent } = fixture();
    const result = await agent.post("/api/register").send(credentials).expect(201);
    const oldCookie = result.headers["set-cookie"];
    await agent.post("/api/logout").expect(200);
    await agent.get("/api/user").expect(401);
    await request(app).get("/api/projects").set("Cookie", oldCookie).expect(401);
    await agent.post("/api/login").send({ username: credentials.username, password: credentials.password }).expect(200);
    await agent.get("/api/user").expect(200);
  });
  it("rejects incorrect passwords, malformed input and duplicate usernames", async () => {
    const { agent } = fixture();
    await agent.post("/api/register").send(credentials).expect(201);
    await agent.post("/api/register").send(credentials).expect(409);
    await agent.post("/api/login").send({ username: credentials.username, password: "wrong" }).expect(401);
    await agent.post("/api/login").send({ username: [], password: {} }).expect(400);
    await agent.post("/api/register").send({ ...credentials, username: "new", password: "short" }).expect(400);
    await agent.post("/api/register").send({ ...credentials, username: "new", id: 900 }).expect(400);
  });
  it("requires a private session secret and uses secure cookies in production", async () => {
    const { storage } = fixture();
    expect(() => createApp({ storage })).toThrow("SESSION_SECRET");
    expect(() => createApp({ storage, secret: "short" })).toThrow("SESSION_SECRET");
    const app = createApp({ storage, secret, production: true });
    const result = await request(app).post("/api/register").set("X-Forwarded-Proto", "https").send(credentials).expect(201);
    expect(result.headers["set-cookie"][0]).toMatch(/; Secure/);
  });
  it("rejects cross-site writes and does not allocate anonymous sessions", async () => {
    const { app } = fixture();
    const anonymous = await request(app).get("/api/projects").expect(401);
    expect(anonymous.headers["set-cookie"]).toBeUndefined();
    await request(app).post("/api/register").set("Origin", "https://attacker.example").send(credentials).expect(403);
    await request(app).post("/api/login").set("Sec-Fetch-Site", "cross-site").send(credentials).expect(403);
  });
  it("handles malformed stored passwords without throwing", async () => {
    for (const stored of ["password", "bad.salt", "", "00." + "a".repeat(32)]) expect(await comparePasswords("test", stored)).toBe(false);
    const first = await hashPassword("same-password");
    const second = await hashPassword("same-password");
    expect(first).not.toBe(second);
    expect(await comparePasswords("wrong-password", first)).toBe(false);
  });
});

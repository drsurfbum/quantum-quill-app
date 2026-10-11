import request from "supertest";
import session from "express-session";
import { createApp } from "../server/app";
import { MemStorage } from "../server/storage";
export const secret = "test-only-session-secret-with-at-least-32-characters";
export const credentials = { username: "writer", password: "synthetic-test-password", email: "writer@example.test" };
export function fixture(production = false) {
  const storage = new MemStorage();
  (storage.sessionStore as session.Store & { stopInterval?: () => void }).stopInterval?.();
  storage.sessionStore = new session.MemoryStore();
  const app = createApp({ storage, secret, production, uploadDir: "/tmp/qq-test-uploads-unused" });
  return { storage, app, agent: request.agent(app) };
}
export async function twoWriters() {
  const context = fixture();
  const other = request.agent(context.app);
  const a = await context.agent.post("/api/register").send(credentials).expect(201);
  const b = await other.post("/api/register").send({ ...credentials, username: "other-writer" }).expect(201);
  const project = (await context.agent.post("/api/projects").send({ title: "Synthetic project" }).expect(201)).body;
  const otherProject = (await other.post("/api/projects").send({ title: "Other project" }).expect(201)).body;
  return { ...context, other, owner: a.body, otherUser: b.body, project, otherProject };
}

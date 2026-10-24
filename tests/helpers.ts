import request from "supertest";
import { createServer, type Server } from "node:http";
import session from "express-session";
import { createApp } from "../server/app";
import { MemStorage } from "../server/storage";
export const secret = "test-only-session-secret-with-at-least-32-characters";
export const credentials = { username: "writer", password: "synthetic-test-password", email: "writer@example.test" };
const servers = new Set<Server>();
afterEach(async()=>{
  await Promise.all([...servers].map(server=>new Promise<void>((resolve,reject)=>{
    server.close(error=>error?reject(error):resolve());server.closeAllConnections();
  })));
  servers.clear();
});
export function fixture(production = false) {
  const storage = new MemStorage();
  (storage.sessionStore as session.Store & { stopInterval?: () => void }).stopInterval?.();
  storage.sessionStore = new session.MemoryStore();
  const app = createApp({ storage, secret, production, uploadDir: "/tmp/qq-test-uploads-unused" });
  // Keep one ephemeral server for the whole test. Supertest's per-request
  // close can otherwise race a parallel request or a reused socket. This is
  // the same ephemeral binding Supertest uses, with explicit test teardown.
  const server = createServer(app).listen(0); servers.add(server);
  return { storage, app, server, agent: request.agent(server) };
}
export async function twoWriters() {
  const context = fixture();
  const other = request.agent(context.server);
  const a = await context.agent.post("/api/register").send(credentials).expect(201);
  const b = await other.post("/api/register").send({ ...credentials, username: "other-writer" }).expect(201);
  const project = (await context.agent.post("/api/projects").send({ title: "Synthetic project" }).expect(201)).body;
  const otherProject = (await other.post("/api/projects").send({ title: "Other project" }).expect(201)).body;
  return { ...context, other, owner: a.body, otherUser: b.body, project, otherProject };
}

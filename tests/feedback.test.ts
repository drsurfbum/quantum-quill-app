import { randomUUID } from "node:crypto";
import { fixture, twoWriters, credentials } from "./helpers";
const report=()=>({requestId:randomUUID(), category:"bug",summary:"A confusing toolbar",details:"I opened Write and could not find the control I expected.",area:"Write",device:"",allowContact:false});
describe("private alpha feedback",()=>{
 test("requires sign-in and rejects an injected account or manuscript payload",async()=>{
  const {agent}=fixture(); await agent.post("/api/feedback").send(report()).expect(401);
  await agent.post("/api/register").send(credentials).expect(201);
  await agent.post("/api/feedback").send({...report(),userId:99}).expect(400);
  await agent.post("/api/feedback").send({...report(),prose:"Never attach this"}).expect(400);
  await agent.post("/api/feedback").send({...report(),details:"x".repeat(6001)}).expect(400);
 });
 test("isolates reports, scopes retry keys to the account, and never changes prose",async()=>{
  const {agent,other,project}=await twoWriters();
  const chapter=(await agent.post("/api/chapters").send({projectId:project.id,title:"Writing",order:0,content:"Original writing Ω"}).expect(201)).body;
  const input=report();
  const first=(await agent.post("/api/feedback").send(input).expect(201)).body;
  const retry=(await agent.post("/api/feedback").send(input).expect(201)).body;
  expect(retry).toEqual(first);
  await agent.post("/api/feedback").send({...input,details:"A changed report should never be silently lost."}).expect(409);
  expect((await other.get("/api/feedback").expect(200)).body).toEqual([]);
  const second=(await other.post("/api/feedback").send(input).expect(201)).body;
  expect(second.id).not.toBe(first.id);
  expect((await agent.get("/api/feedback").expect(200)).body).toHaveLength(1);
  expect((await agent.get(`/api/chapters/${chapter.id}`).expect(200)).body).toMatchObject({content:chapter.content,revision:chapter.revision});
 });
 test("bounds report volume but allows an idempotent retry after the limit",async()=>{
  const {agent}=fixture();await agent.post("/api/register").send(credentials).expect(201);
  const input=report();await agent.post("/api/feedback").send(input).expect(201);
  for(let i=0;i<19;i++)await agent.post("/api/feedback").send(report()).expect(201);
  await agent.post("/api/feedback").send(report()).expect(429);
  await agent.post("/api/feedback").send(input).expect(201);
  expect((await agent.get("/api/feedback").expect(200)).body).toHaveLength(20);
 });
 test("rejects cross-origin reports and stale account headers",async()=>{
  const {agent,otherUser}=await twoWriters();
  await agent.post("/api/feedback").set("Origin","https://other.example.test").send(report()).expect(403);
  await agent.post("/api/feedback").set("X-QQ-Account",String(otherUser.id)).send(report()).expect(409);
 });
});

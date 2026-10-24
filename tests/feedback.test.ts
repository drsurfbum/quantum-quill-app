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

describe("private feedback administration",()=>{
 const previous=process.env.QQ_FEEDBACK_ADMIN_USER_IDS;
 afterEach(()=>{if(previous===undefined)delete process.env.QQ_FEEDBACK_ADMIN_USER_IDS;else process.env.QQ_FEEDBACK_ADMIN_USER_IDS=previous;});
 test("fails closed, rejects self-promotion, and checks access on every endpoint",async()=>{
  delete process.env.QQ_FEEDBACK_ADMIN_USER_IDS;
  const {agent,other,owner,otherUser}=await twoWriters();
  const id=(await other.post("/api/feedback").send(report()).expect(201)).body.id;
  expect((await agent.get("/api/user")).body.feedbackAdmin).toBe(false);
  for(const actor of [agent,other]) {
   await actor.get("/api/admin/feedback").expect(403);
   await actor.get(`/api/admin/feedback/${id}`).expect(403);
   await actor.patch(`/api/admin/feedback/${id}`).send({status:"resolved",expectedStatus:"received"}).expect(403);
  }
  await agent.post("/api/register").send({...credentials,username:"fake-admin",feedbackAdmin:true}).expect(400);
  process.env.QQ_FEEDBACK_ADMIN_USER_IDS=`${owner.id},bad-value`;
  await agent.get("/api/admin/feedback").expect(403);
  process.env.QQ_FEEDBACK_ADMIN_USER_IDS=String(owner.id);
  expect((await agent.get("/api/user")).body.feedbackAdmin).toBe(true);
  expect((await other.get("/api/user")).body.feedbackAdmin).toBe(false);
  await other.get("/api/admin/feedback").set("X-QQ-Account",String(otherUser.id)).expect(403);
  const response=await agent.get("/api/admin/feedback").expect(200);
  expect(response.headers["cache-control"]).toBe("no-store");
  expect(response.body.reports[0]).not.toHaveProperty("details");
  delete process.env.QQ_FEEDBACK_ADMIN_USER_IDS;
  await agent.get(`/api/admin/feedback/${id}`).expect(403);
  await agent.patch(`/api/admin/feedback/${id}`).send({status:"resolved",expectedStatus:"received"}).expect(403);
 });
 test("keeps report text intact, limits contact disclosure, and shows status to its writer",async()=>{
  const {agent,other,owner}=await twoWriters();process.env.QQ_FEEDBACK_ADMIN_USER_IDS=String(owner.id);
  const input=report(),id=(await other.post("/api/feedback").send(input).expect(201)).body.id;
  const detail=(await agent.get(`/api/admin/feedback/${id}`).expect(200)).body;
  expect(detail).toMatchObject({details:input.details,reporter:{username:"other-writer",email:null}});
  expect(detail).not.toHaveProperty("password");expect(detail).not.toHaveProperty("requestId");
  await agent.patch(`/api/admin/feedback/${id}`).send({status:"reviewing",expectedStatus:"received"}).expect(200);
  await agent.patch(`/api/admin/feedback/${id}`).send({status:"resolved",expectedStatus:"received"}).expect(409);
  const stored=(await other.get("/api/feedback")).body[0];expect(stored).toMatchObject({...input,status:"reviewing"});
  expect((await agent.get("/api/feedback")).body).toEqual([]);
  const contactId=(await other.post("/api/feedback").send({...report(),allowContact:true}).expect(201)).body.id;
  expect((await agent.get(`/api/admin/feedback/${contactId}`)).body.reporter.email).toBe(credentials.email);
 });
 test("validates updates, rejects stale accounts/cross-origin changes, and permits one competing save",async()=>{
  const {agent,owner,otherUser}=await twoWriters();process.env.QQ_FEEDBACK_ADMIN_USER_IDS=String(owner.id);
  const id=(await agent.post("/api/feedback").send(report()).expect(201)).body.id;
  for(const body of [{status:"deleted",expectedStatus:"received"},{status:"resolved"},{status:"reviewing",expectedStatus:"received",details:"replacement"}])await agent.patch(`/api/admin/feedback/${id}`).send(body).expect(400);
  await agent.patch(`/api/admin/feedback/${id}`).set("Origin","https://elsewhere.test").send({status:"resolved",expectedStatus:"received"}).expect(403);
  await agent.patch(`/api/admin/feedback/${id}`).set("X-QQ-Account",String(otherUser.id)).send({status:"resolved",expectedStatus:"received"}).expect(409);
  const saves=await Promise.all(["reviewing","planned"].map(status=>agent.patch(`/api/admin/feedback/${id}`).send({status,expectedStatus:"received"})));
  expect(saves.map(r=>r.status).sort()).toEqual([200,409]);
  await agent.get("/api/admin/feedback/nope").expect(400);
  await agent.patch("/api/admin/feedback/999999").send({status:"resolved",expectedStatus:"received"}).expect(404);
  await agent.get("/api/admin/feedback/999999").expect(404);
  await agent.post("/api/logout").expect(200);await agent.get("/api/admin/feedback").expect(401);
 });
 test("filters/searches literally and paginates without returning private detail fields",async()=>{
  const {agent,storage}=fixture();const owner=(await agent.post("/api/register").send(credentials).expect(201)).body;
  process.env.QQ_FEEDBACK_ADMIN_USER_IDS=String(owner.id);
  for(let i=0;i<53;i++)await storage.createFeedback(owner.id,{...report(),category:i===0?"idea":"bug",summary:i===0?"100% improvement":"Report number "+i} as any);
  const page1=(await agent.get("/api/admin/feedback").expect(200)).body;
  const page2=(await agent.get(`/api/admin/feedback?before=${page1.nextCursor}`).expect(200)).body;
  expect(page1.reports).toHaveLength(50);expect(page2.reports).toHaveLength(3);expect(page2.nextCursor).toBeNull();
  expect(new Set([...page1.reports,...page2.reports].map(r=>r.id)).size).toBe(53);
  expect((await agent.get("/api/admin/feedback?q=%25&category=idea&status=received")).body.reports).toHaveLength(1);
  expect((await agent.get("/api/admin/feedback?status=resolved")).body.reports).toEqual([]);
  for(const query of ["status=nope","before=-1","before=9999999999999999999999","extra=yes"])await agent.get(`/api/admin/feedback?${query}`).expect(400);
 });
});

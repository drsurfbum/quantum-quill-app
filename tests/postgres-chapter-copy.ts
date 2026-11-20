// Run only against a newly initialized, disposable database; never restored/user writing.
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import session from "express-session";
if (process.env.QQ_DUPLICATE_TEST !== "disposable-only" || !process.env.DATABASE_URL?.includes("/qq_chapter_copy_test?")) throw new Error("A dedicated empty chapter-copy test database is required.");
const {db,pool} = await import("../server/db");
const {DatabaseStorage} = await import("../server/database-storage");
const {chapterCopySource,duplicateChapter} = await import("../server/chapter-copy");
const storage = new DatabaseStorage(db,new session.MemoryStore());
try {
  assert.equal((await pool.query('SELECT count(*)::int n FROM projects')).rows[0].n,0,"Refuse a nonempty database");
  const user=await storage.createUser({username:'fictional-copy-test',password:'fixture-only-not-a-login',email:'fixture@example.test'});
  const project=await storage.createProject({userId:user.id,title:'Fictional copy transaction'});
  const source=await storage.createChapter({projectId:project.id,title:'Crossing',writingMode:'scenes',order:0});
  const neighbor=await storage.createChapter({projectId:project.id,title:'Return',order:1,content:'<p>Untouched</p>'});
  const entry=await storage.createStoryBibleEntry({projectId:project.id,title:'Mara',entryType:'characters',content:'Navigator',metadata:{}});
  const scene=await storage.createScene({projectId:project.id,chapterId:source.id,title:'Arrival',content:'<p><em>Formatted</em> crossing.</p>',summary:'A threshold',storyBeats:[{id:randomUUID(),text:'Arrive'}],order:0});
  await storage.putSceneContext({sceneId:scene.id,projectId:project.id,revision:9,links:[{entryId:entry.id,role:'cast',note:'Test'}]});
  const input={requestId:randomUUID(),...(await chapterCopySource(storage,project.id,source.id))};
  const before={chapters:await storage.getProjectChapters(project.id),scenes:await storage.getProjectScenes(project.id),contexts:await storage.getProjectSceneContexts(project.id)};
  // The receipt is last: failure must undo inserts, references AND preceding reordering.
  await pool.query("CREATE FUNCTION fail_copy_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind = 'duplicate-chapter' THEN RAISE EXCEPTION 'synthetic receipt failure'; END IF; RETURN NEW; END; $$; CREATE TRIGGER fail_copy_receipt BEFORE INSERT ON creation_requests FOR EACH ROW EXECUTE FUNCTION fail_copy_receipt();");
  await assert.rejects(()=>duplicateChapter(storage,project.id,source.id,input),(error: any) => error.cause?.message === "synthetic receipt failure");
  assert.deepEqual(await storage.getProjectChapters(project.id),before.chapters);
  assert.deepEqual(await storage.getProjectScenes(project.id),before.scenes);
  assert.deepEqual(await storage.getProjectSceneContexts(project.id),before.contexts);
  assert.equal(await storage.getCreationRequest(project.id,input.requestId),undefined);
  await pool.query('DROP TRIGGER fail_copy_receipt ON creation_requests; DROP FUNCTION fail_copy_receipt();');
  const [a,b]=await Promise.all([duplicateChapter(storage,project.id,source.id,input),duplicateChapter(storage,project.id,source.id,input)]);
  assert.deepEqual(a,b);assert.equal((await storage.getProjectChapters(project.id)).length,3);
  assert.equal((await storage.getChapter(neighbor.id))?.order,2);
  const copied=(await storage.getProjectScenes(project.id)).find(s=>s.chapterId===a.chapterId)!;
  assert.equal(copied.content,scene.content);assert.notEqual(copied.storyBeats[0].id,scene.storyBeats[0].id);
  assert.equal((await storage.getSceneContext(copied.id))?.revision,0);
  await storage.updateScene(copied.id,{content:'<p>Independent</p>'},{revision:0});
  assert.deepEqual(await storage.getScene(scene.id),scene);
  assert.deepEqual(await storage.getChapter(source.id),source);
  const next=await chapterCopySource(storage,project.id,source.id);
  const competing=await Promise.allSettled([1,2].map(()=>duplicateChapter(storage,project.id,source.id,{requestId:randomUUID(),...next})));
  assert.equal(competing.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(competing.filter(r=>r.status==='rejected').length,1);
  console.log(JSON.stringify({atomicReceiptFailureRollback:'PASS',concurrentIdempotency:'PASS',competingSnapshot:'PASS',independentProse:'PASS',freshSceneAndContext:'PASS',neighborOrder:'PASS',sourceUnchanged:'PASS'}));
} finally { await pool.end(); }

import { twoWriters } from "./helpers";
import { manuscriptStructure, organizeManuscript } from "../server/manuscript";
async function fixture() {
 const f=await twoWriters();
 const a=await f.storage.createChapter({projectId:f.project.id,title:"A",order:0,writingMode:"scenes"});
 const b=await f.storage.createChapter({projectId:f.project.id,title:"B",order:1,writingMode:"scenes"});
 const c=await f.storage.createChapter({projectId:f.project.id,title:"Prose",order:2,content:"Keep this prose"});
 const x=await f.storage.createScene({projectId:f.project.id,chapterId:a.id,title:"X",order:0,content:"Scene X",summary:"X plan",storyBeats:[]});
 const y=await f.storage.createScene({projectId:f.project.id,chapterId:a.id,title:"Y",order:1,content:"Scene Y"});
 const source=await manuscriptStructure(f.storage,f.project.id);
 return {...f,a,b,c,x,y,source};
}
it("atomically reorders chapters, moves scenes and preserves writing/revisions across repeat requests",async()=>{
 const f=await fixture(); const body={snapshot:f.source.snapshot,chapters:[{id:f.b.id,sceneIds:[f.y.id]},{id:f.c.id,sceneIds:[]},{id:f.a.id,sceneIds:[f.x.id]}]};
 const url=`/api/projects/${f.project.id}/manuscript`;
 await f.agent.put(url).send(body).expect(200); await f.agent.put(url).send(body).expect(200);
 const result=(await f.agent.get(url).expect(200)).body;
 expect(result.chapters.map((c:any)=>c.id)).toEqual([f.b.id,f.c.id,f.a.id]);
 expect(await f.storage.getScene(f.y.id)).toMatchObject({chapterId:f.b.id,content:"Scene Y",revision:f.y.revision});
 expect(await f.storage.getChapter(f.c.id)).toMatchObject({content:"Keep this prose",revision:f.c.revision});
 // A prose save from the old layout remains safe: movement did not stale its prose baseline.
 await f.agent.put(`/api/scenes/${f.y.id}`).send({content:"Continued prose",_revision:f.y.revision}).expect(200);
 expect((await f.storage.getScene(f.y.id))?.chapterId).toBe(f.b.id);
});
it("rejects stale arrangements, duplicates, missing and foreign rows, and chapter-mode targets",async()=>{
 const f=await fixture(),url=`/api/projects/${f.project.id}/manuscript`;
 const original=f.source.chapters.map(c=>({id:c.id,sceneIds:c.scenes.map(s=>s.id)}));
 for(const chapters of [original.slice(1),[...original,original[0]],[{...original[0],sceneIds:[f.x.id,f.x.id]},...original.slice(1)],[{id:f.a.id,sceneIds:[f.x.id]},{id:f.b.id,sceneIds:[]},{id:f.c.id,sceneIds:[f.y.id]}]]) await f.agent.put(url).send({snapshot:f.source.snapshot,chapters}).expect(400);
 await f.other.put(url).send({snapshot:f.source.snapshot,chapters:original}).expect(403);
 await organizeManuscript(f.storage,f.project.id,{snapshot:f.source.snapshot,chapters:[original[1],original[0],original[2]]});
 await f.agent.put(url).send({snapshot:f.source.snapshot,chapters:[original[2],original[0],original[1]]}).expect(409);
 expect((await f.storage.getScene(f.x.id))?.content).toBe("Scene X");
});
it("rejects a layout after another writer adds a scene and forbids raw order edits",async()=>{
 const f=await fixture();
 await f.storage.createScene({projectId:f.project.id,chapterId:f.a.id,title:"Added elsewhere",order:2});
 await f.agent.put(`/api/projects/${f.project.id}/manuscript`).send({snapshot:f.source.snapshot,chapters:f.source.chapters.map(c=>({id:c.id,sceneIds:c.scenes.map(s=>s.id)}))}).expect(400);
 await f.agent.put(`/api/chapters/${f.a.id}`).send({order:8,_revision:f.a.revision}).expect(400);
});
it("never deletes a chapter containing writing newer than the deletion confirmation",async()=>{
 const f=await fixture(),url=`/api/chapters/${f.c.id}`;
 await f.agent.delete(url).expect(428);
 await f.agent.put(url).send({content:'Newer server writing',_revision:f.c.revision}).expect(200);
 await f.agent.delete(url).send({_revision:f.c.revision}).expect(409);
 expect((await f.storage.getChapter(f.c.id))?.content).toBe('Newer server writing');
});

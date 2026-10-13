import request from "supertest";
import JSZip from "jszip";
import { twoWriters } from "./helpers";
import { cleanProse, collectExport, renderExport, exportOptions } from "../server/export";
const options = exportOptions.parse({ format:"html" });
async function manuscript() {
  const f = await twoWriters();
  await f.storage.createChapter({ projectId:f.project.id,title:"Later chapter",order:5,content:'<p style="text-align: center"><strong>Bold</strong> <em>italic</em> Ω 中文</p><table><tr><td>Cell one</td><td>Cell two</td></tr></table>' });
  const c = await f.storage.createChapter({ projectId:f.project.id,title:"First chapter",order:0,writingMode:"scenes" });
  const s = await f.storage.createScene({ projectId:f.project.id,chapterId:c.id,title:"Scene second",order:1,content:"Second prose",summary:"NOT MANUSCRIPT",storyBeats:[] });
  await f.storage.createScene({ projectId:f.project.id,chapterId:c.id,title:"Scene first",order:0,content:"First <a dragon> & two  spaces.\n\nLast line." });
  return {...f,c,s};
}
it("exports chapter and scene prose in order, keeps planning separate, and never changes originals",async()=>{
  const f = await manuscript();
  const before = JSON.stringify([await f.storage.getProjectChapters(f.project.id),await f.storage.getProjectScenes(f.project.id)]);
  const response = await f.agent.post(`/api/projects/${f.project.id}/export`).send({format:"html"}).expect(200);
  expect(response.headers["content-disposition"]).toContain('.html');
  expect(response.text.indexOf("Scene first")).toBeLessThan(response.text.indexOf("Scene second"));
  expect(response.text.indexOf("Scene second")).toBeLessThan(response.text.lastIndexOf("Later chapter"));
  expect(response.text).toContain("&lt;a dragon&gt; &amp; two  spaces.");
  expect(response.text).not.toContain("NOT MANUSCRIPT");
  expect(response.text).toContain('<strong>Bold</strong>');
  expect(JSON.stringify([await f.storage.getProjectChapters(f.project.id),await f.storage.getProjectScenes(f.project.id)])).toBe(before);
});
it("enforces ownership, account header, formats and selections",async()=>{
  const f=await manuscript(),url=`/api/projects/${f.project.id}/export`;
  await request(f.app).post(url).send({format:"txt"}).expect(401);
  await f.other.post(url).send({format:"txt"}).expect(403);
  await f.agent.post(url).set("X-QQ-Account","999").send({format:"txt"}).expect(409);
  await f.agent.post(url).send({format:"pdf"}).expect(400);
  await f.agent.post(url).send({format:"html",manuscript:false}).expect(400);
});
it("produces a real Word ZIP with prose, Unicode, runs and tables",async()=>{
  const f=await manuscript(),data=await collectExport(f.storage,f.project,options);
  const file=await renderExport(data,{...options,format:"docx"});
  const zip=await JSZip.loadAsync(file.body), xml=await zip.file("word/document.xml")!.async("string");
  expect(xml).toContain("First &lt;a dragon&gt; &amp; two  spaces.");
  expect(xml).toContain("Ω 中文"); expect(xml).toContain("w:tbl"); expect(xml).toContain("w:b"); expect(xml).toContain("Cell two");
});
it("produces a valid EPUB container with XHTML, navigation and manuscript",async()=>{
  const f=await manuscript(),file=await renderExport(await collectExport(f.storage,f.project,options),{...options,format:"epub"});
  const zip=await JSZip.loadAsync(file.body);
  expect(await zip.file("mimetype")!.async("string")).toBe("application/epub+zip");
  expect(await zip.file("META-INF/container.xml")!.async("string")).toContain('full-path="content.opf"');
  expect(await zip.file("book.xhtml")!.async("string")).toContain("First &lt;a dragon&gt;");
  expect(await zip.file("nav.xhtml")!.async("string")).toContain('epub:type="toc"');
});
it("retains all original structured and unknown fields in JSON and includes optional plans",async()=>{
  const f=await manuscript();
  const entry=await f.storage.createStoryBibleEntry({projectId:f.project.id,title:"Legacy",entryType:"details",content:'{"content":"old prose","unknown":42}',metadata:{untouched:[1,2]}});
  const opts={...options,format:"json" as const,outline:true,bible:true};
  const data=await collectExport(f.storage,f.project,opts),file=await renderExport(data,opts),parsed=JSON.parse(file.body.toString());
  expect(parsed.bible[0]).toMatchObject({content:entry.content,metadata:entry.metadata});
  expect(data.parts.some(p=>p.html.includes("NOT MANUSCRIPT"))).toBe(true);
});
it("strips executable markup, CSS URLs and remote images while preserving readable prose",()=>{
  const html=cleanProse('<p onclick="evil()" style="background-image:url(https://evil.test); color:#123456">Text<script>evil()</script><a href="javascript:evil()">link</a><img src="https://evil.test/track" alt="sketch" /></p>');
  expect(html).not.toMatch(/onclick|script|evil|url\(/);expect(html).toContain("Text");expect(html).toContain("Image: sketch");expect(html).toContain("color:#123456");
});

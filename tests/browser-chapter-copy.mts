// Real browser integration, memory-only fictional writing, no working DB or account.
import assert from 'node:assert/strict';
import express from 'express';
import session from 'express-session';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createApp} from '../server/app';
import {MemStorage} from '../server/storage';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const storage=new MemStorage(); (storage.sessionStore as any).stopInterval?.(); storage.sessionStore=new session.MemoryStore();
const app=createApp({storage,secret:'fictional-copy-browser-test-only-secret'});
app.use(express.static(resolve('dist/public'))); app.get('*',(_req,res)=>res.sendFile(resolve('dist/public/index.html')));
const server=createServer(app); server.listen(0,'127.0.0.1'); await once(server,'listening');
const origin=`http://127.0.0.1:${(server.address() as any).port}`;
const engine=process.env.QQ_BROWSER_ENGINE==='webkit'?webkit:chromium;
const browser=await engine.launch({headless:true,...(engine===chromium && process.env.CHROME_EXECUTABLE ? {executablePath:process.env.CHROME_EXECUTABLE}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
page.setDefaultTimeout(15000); context.setDefaultTimeout(15000);
const errors:string[]=[], checks:string[]=[]; page.on('pageerror',(e:any)=>errors.push(e.message));
const out=resolve(`artifacts/history/chapter-copy-${process.env.QQ_BROWSER_ENGINE || 'chromium'}`); await mkdir(out,{recursive:true});
try {
  const response=await context.request.post(origin+'/api/register',{data:{username:'fictional-copy-writer',password:'fictional-copy-browser-only',email:'writer@example.test'}});
  assert.equal(response.status(),201); const user=await response.json();
  const project=await storage.createProject({userId:user.id,title:'The Lantern Coast'});
  const entry=await storage.createStoryBibleEntry({projectId:project.id,title:'Mara Vale',entryType:'characters',content:'Fictional navigator',metadata:{}});
  const prose=`<p>A <strong>quiet</strong> shore.</p><p><span data-qq-entry="${entry.id}">Mara Vale</span> waits.</p>`;
  const chapter=await storage.createChapter({projectId:project.id,title:'A different route',order:0,content:prose,writingMode:'chapter'});
  const sceneChapter=await storage.createChapter({projectId:project.id,title:'The crossing',order:1,writingMode:'scenes'});
  const scene=await storage.createScene({projectId:project.id,chapterId:sceneChapter.id,title:'The missing chart',order:0,content:prose,summary:'Mara finds the empty frame.',storyBeats:[{id:randomUUID(),text:'Find the frame'}]});
  await storage.putSceneContext({projectId:project.id,sceneId:scene.id,revision:0,links:[{entryId:entry.id,role:'viewpoint',note:'Sees the missing chart'}]});
  await page.addInitScript((id:number)=>{if(window===window.top)localStorage.setItem(`quantum-quill:interface-tour:${id}`,JSON.stringify({versions:{1:'dismissed'}}));},user.id);
  const writing=page.locator('.writing-document [contenteditable="true"]');
  const html=()=>writing.evaluate((el:any)=>el.editor.getHTML());
  const button=(name:string)=>page.getByRole('button',{name,exact:true});
  const copyDialog=page.getByRole('dialog',{name:'Duplicate Chapter',exact:true});
  const waitContent=async(resource:'chapters'|'scenes',id:number,expected:string)=>{
    for(let i=0;i<150;i++) {const row=resource==='chapters'?await storage.getChapter(id):await storage.getScene(id); if(row?.content===expected)return row; await new Promise(r=>setTimeout(r,50));}
    throw new Error(`Pending ${resource} writing not saved`);
  };
  async function openCopy(title:string){
    await button(`Options for ${title}`).press('Enter');
    await page.getByRole('menuitem',{name:'Duplicate Chapter',exact:true}).press('Enter');
    await copyDialog.waitFor();
    assert(await copyDialog.evaluate(el=>el.contains(document.activeElement)),'focus enters confirmation');
  }
  await page.goto(`${origin}/project/${project.id}/write?chapter=${chapter.id}`); await writing.waitFor();
  await openCopy(chapter.title); await page.screenshot({path:out+'/duplicate-dialog.png'});
  await page.keyboard.press('Escape'); await copyDialog.waitFor({state:'hidden'});
  await page.waitForFunction(()=>getComputedStyle(document.body).pointerEvents!=='none');
  assert.equal((await storage.getProjectChapters(project.id)).length,2);
  checks.push('Keyboard opens and dismisses confirmation without creating a chapter');
  // Begin a new edit immediately before copy; the copy must include its acknowledged save.
  await writing.evaluate((el:any)=>el.editor.commands.insertContentAt(el.editor.state.doc.content.size,'<p>Latest pending words.</p>'));
  const latest=await html(); await openCopy(chapter.title); await button('Create copy').click();
  await copyDialog.waitFor({state:'hidden'});
  await page.waitForFunction(()=>getComputedStyle(document.body).pointerEvents!=='none');
  const copy=(await storage.getProjectChapters(project.id)).find(c=>c.title==='A different route (copy)')!;
  assert(copy); await page.waitForURL((url:URL)=>url.searchParams.get('chapter')===String(copy.id));
  assert.equal(copy.content,latest); assert.equal((await storage.getChapter(chapter.id))!.content,latest);
  assert.equal(await html(),latest); assert.match(latest,/<strong>quiet<\/strong>/); assert.match(latest,/data-qq-entry=/);
  assert.equal((await storage.listProseVersions(project.id,'chapters',copy.id)).length,0);
  const sourceHistory=await storage.listProseVersions(project.id,'chapters',chapter.id);
  const sourceRecord=await storage.getChapter(chapter.id);
  await writing.evaluate((el:any)=>el.editor.commands.insertContentAt(el.editor.state.doc.content.size,'<p>Independent copy ending.</p>'));
  const changed=await html(); await waitContent('chapters',copy.id,changed);
  await button('Undo').click(); assert.equal(await html(),latest); await waitContent('chapters',copy.id,latest);
  await button('Redo').click(); assert.equal(await html(),changed); await waitContent('chapters',copy.id,changed);
  const versions=await storage.listProseVersions(project.id,'chapters',copy.id);
  const baseline=versions.find(v=>v.kind==='baseline')!;
  assert.equal((await storage.getProseVersion(project.id,'chapters',copy.id,baseline.id))!.content,latest);
  await button('Version history').click(); const history=page.getByRole('dialog',{name:'Version history',exact:true}); await history.waitFor();
  await history.getByRole('navigation').getByRole('button').filter({hasText:`Revision ${baseline.revision} ·`}).click();
  await button('Restore as current version').click(); await history.waitFor({state:'hidden'});
  await waitContent('chapters',copy.id,latest); assert.equal(await html(),latest); assert(await button('Undo').isDisabled());
  assert.deepEqual(await storage.getChapter(chapter.id),sourceRecord);
  assert.deepEqual(await storage.listProseVersions(project.id,'chapters',chapter.id),sourceHistory);
  checks.push('Latest writing copied with formatting/links; independent saved history, undo/redo and restore leave source unchanged');
  await page.screenshot({path:out+'/independent-chapter.png'});
  await page.goto(`${origin}/project/${project.id}/write?chapter=${sceneChapter.id}&scene=${scene.id}`); await writing.waitFor();
  await openCopy(sceneChapter.title); await button('Create copy').click(); await copyDialog.waitFor({state:'hidden'});
  const sceneCopyChapter=(await storage.getProjectChapters(project.id)).find(c=>c.title==='The crossing (copy)')!;
  const sceneCopy=(await storage.getProjectScenes(project.id)).find(s=>s.chapterId===sceneCopyChapter.id)!;
  assert(sceneCopy); await page.waitForURL((url:URL)=>url.searchParams.get('chapter')===String(sceneCopyChapter.id));
  await page.getByLabel('Current scene',{exact:true}).waitFor();
  assert.equal(await page.getByLabel('Current scene',{exact:true}).inputValue(),String(sceneCopy.id));
  assert.equal(sceneCopy.content,scene.content); assert.equal(sceneCopy.summary,scene.summary);
  assert.notEqual(sceneCopy.storyBeats[0].id,scene.storyBeats[0].id); assert.equal(sceneCopy.storyBeats[0].text,scene.storyBeats[0].text);
  assert.deepEqual((await storage.getSceneContext(sceneCopy.id))!.links,(await storage.getSceneContext(scene.id))!.links);
  assert.equal(sceneCopy.linkedSectionId,null);
  await writing.evaluate((el:any)=>el.editor.commands.insertContentAt(el.editor.state.doc.content.size,'<p>Only the copied scene changes.</p>'));
  await waitContent('scenes',sceneCopy.id,await html()); assert.deepEqual(await storage.getScene(scene.id),scene);
  await page.screenshot({path:out+'/independent-scene.png'});
  checks.push('Scene copy retains prose, plans and Bible links with fresh identities; source scene stays unchanged');
  // Help must not navigate the writer away, including with pending writing.
  await writing.evaluate((el:any)=>el.editor.commands.insertContentAt(el.editor.state.doc.content.size,'<p>Writing survives opening help.</p>'));
  const beforeHelp=await html(), writerUrl=page.url();
  await button('Help').click(); const popupPromise=page.waitForEvent('popup');
  await page.getByRole('menuitem',{name:'Add QQ to your Home Screen',exact:false}).click();
  const popup=await popupPromise; await popup.waitForURL(origin+'/help/install'); await popup.getByRole('heading',{level:1}).waitFor();
  assert.equal(page.url(),writerUrl); assert.equal(await html(),beforeHelp); await waitContent('scenes',sceneCopy.id,beforeHelp); await popup.close();
  checks.push('Home Screen help opens separately while pending copied-scene writing saves');
  assert.deepEqual(errors,[]);
  await writeFile(out+'/receipt.json',JSON.stringify({fictionalOnly:true,engine:process.env.QQ_BROWSER_ENGINE||'chromium',checks,pageErrors:errors},null,2));
  console.log(JSON.stringify({checks,pageErrors:errors}));
} catch(error) {await page.screenshot({path:out+'/failure.png'}).catch(()=>{}); throw error;}
finally {await browser.close(); const closed=once(server,'close');server.close();server.closeAllConnections();await closed;}

// Real Chromium with fictional memory-only writing. No working DB or account.
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const port=Number(process.env.QQ_COMBINED_BROWSER_PORT || 57584), base=`http://127.0.0.1:${port}`,artifacts=`artifacts/history/integration-${process.env.QQ_BROWSER_ENGINE || 'chromium'}`;
await mkdir(artifacts,{recursive:true});
const server=spawn(process.execPath,['--import','tsx','tests/showcase-server.ts'],{env:{...process.env,NODE_ENV:'test',QQ_SHOWCASE_PORT:String(port)},stdio:['ignore','pipe','pipe']});
let output='',browser,page;server.stdout.on('data',s=>output+=s);server.stderr.on('data',s=>output+=s);
const checks=[],errors=[],injectedNetworkErrors=[];let failedSaveUrl;
const mark=text=>{checks.push(text);console.log(text);};
try {
  let ready=false;
  for(let i=0;i<100;i++) {if(server.exitCode!==null)throw new Error(output);try{if((await fetch(`${base}/healthz`)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
  assert.ok(ready,'fixture starts');
  const engine=process.env.QQ_BROWSER_ENGINE==='webkit'?webkit:chromium;
  browser=await engine.launch({headless:true,...(engine===chromium&&process.env.CHROME_EXECUTABLE ? {executablePath:process.env.CHROME_EXECUTABLE} : {})});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  // Exercise the current production CSP while keeping this memory-only fixture's
  // non-production session cookies. Match server/app.ts; no hosted writes.
  const productionCsp = "default-src 'self'; script-src 'self'; script-src-attr 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self'; frame-src 'self' blob: https://www.youtube-nocookie.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
  await context.route('**/*',async route=>{
    if(!route.request().url().startsWith(base)) return route.abort();
    if(route.request().isNavigationRequest()) {
      const response=await route.fetch();return route.fulfill({response,headers:{...response.headers(),'content-security-policy':productionCsp}});
    }
    return route.continue();
  });
  page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>{
    // WebKit reports the deliberately aborted save as a page-level network diagnostic.
    // Record only that exact injected target during the failure phase; every other error fails.
    if(failedSaveUrl&&e.message.includes(`${new URL(base).host}${failedSaveUrl}`)&&/due to access control checks\.$/.test(e.message)) injectedNetworkErrors.push(e.message);
    else errors.push(e.message);
  });
  await page.goto(`${base}/auth`);
  await page.getByLabel('Username',{exact:true}).fill('demo-writer');await page.getByLabel('Password',{exact:true}).fill('synthetic-showcase-only');
  await page.getByRole('button',{name:/^(Login|Sign in|Log in)$/i}).click();await page.waitForURL(u=>!u.pathname.startsWith('/auth'));

  await page.addInitScript(()=>{if(window===window.top)localStorage.setItem('quantum-quill:interface-tour:1',JSON.stringify({versions:{'1':'dismissed'}}));});
  const read=async url=>{const response=await context.request.get(`${base}${url}`);assert.equal(response.status(),200);return response.json();};
  const put=async(url,patch)=>{const row=await read(url);const response=await context.request.put(`${base}${url}`,{data:{...patch,_revision:row.revision}});assert.equal(response.status(),200);return response.json();};
  const original='<p>A <strong>quiet</strong> shore.</p><p>Keep this paragraph intact.</p>';
  const entry=await read('/api/projects/1/story-bible');
  const linked=`<p><span data-qq-entry="${entry[0].id}">Linked character</span> remains.</p>`;
  const source=original+linked;
  await put('/api/scenes/2',{content:source});
  const created=await context.request.post(`${base}/api/chapters`,{data:{projectId:1,title:'Synthetic integration chapter',order:3,writingMode:'chapter',content:source}});
  assert.equal(created.status(),201);const chapter=await created.json();
  const writing=page.locator('.writing-document [contenteditable="true"]');
  const html=()=>writing.evaluate(el=>el.editor.getHTML());
  const select=()=>writing.evaluate(el=>{el.editor.commands.setTextSelection({from:3,to:8});el.editor.view.focus();});
  const button=name=>page.getByRole('button',{name,exact:true});
  const finder=button('Word Finder'),undo=button('Undo'),redo=button('Redo'),history=button('Version history');
  const input=page.getByLabel('English word or expression');
  const historyDialog=page.getByRole('dialog',{name:'Version history'});
  async function save(url,expected) {
    for(let n=0;n<100;n++){const row=await read(url);if(row.content===expected)return row;await new Promise(resolve=>setTimeout(resolve,100));}
    throw Error(`Autosave did not acknowledge ${url}`);
  }
  async function replaceQuiet() {
    await select();await finder.click();await page.getByText(/meanings for “quiet”/).waitFor();
    await button('tranquil').first().click();await button('Replace selection').click();await input.waitFor({state:'hidden'});
    await page.waitForFunction(()=>document.activeElement?.matches('.writing-document [contenteditable="true"]'));
  }
  for(const doc of [{url:'/api/scenes/2',route:'/project/1/write?chapter=1&scene=2',name:'scene'},
    {url:`/api/chapters/${chapter.id}`,route:`/project/1/write?chapter=${chapter.id}`,name:'chapter'}]) {
    await page.goto(`${base}${doc.route}`);await writing.waitFor();
    const initial=await html(),position=await page.locator('[data-writing-scroll]').boundingBox();
    assert.ok(await undo.isDisabled());
    await replaceQuiet();const changed=await html();assert.match(changed,/<strong>tranquil<\/strong>/);assert.match(changed,/data-qq-entry=/);
    await save(doc.url,changed);await undo.click();assert.equal(await html(),initial);await save(doc.url,initial);
    await redo.click();assert.equal(await html(),changed);await save(doc.url,changed);
    await history.click();await button('Compare with current').waitFor();
    const versions=await read(`${doc.url}/history`);const selected=versions.versions.find(v=>v.revision===1);assert.ok(selected);
    // Select the saved original prose (scene seed) or baseline (chapter creation).
    const originalVersion=doc.name==='scene'?selected:versions.versions.find(v=>v.kind==='baseline');
    await historyDialog.getByRole('navigation').getByRole('button').filter({hasText:`Revision ${originalVersion.revision} ·`}).click();
    await button('Compare with current').click();await page.frameLocator('iframe[title="Saved version preview"]').locator('body').waitFor();
    const beforeReview=await read(doc.url);assert.equal(beforeReview.content,changed);
    await button('Keep this version').click();await button('Kept').waitFor();
    await button('Restore as current version').click();await historyDialog.waitFor({state:'hidden'});
    assert.equal(await html(),initial);assert.equal((await read(doc.url)).content,source);
    assert.ok(await undo.isDisabled());assert.ok(await redo.isDisabled());
    const protectedRows=(await read(`${doc.url}/history`)).versions;
    assert.ok(protectedRows[0].restoreProtected);assert.ok(protectedRows[1].restoreProtected);assert.ok(protectedRows.find(v=>v.id===originalVersion.id).keptAt);
    // A fresh lookup after restoration has its own undo boundary; undo cannot cross restore.
    await replaceQuiet();await save(doc.url,await html());await undo.click();assert.equal(await html(),initial);assert.ok(await undo.isDisabled());
    await save(doc.url,initial);assert.deepEqual(await page.locator('[data-writing-scroll]').boundingBox(),position);
    mark(`${doc.name}: formatted replacement, visible undo/redo, autosave, kept history preview/restore, fresh lookup and safe undo boundary`);
  }
  // A lookup captured before history opens must not retain a replacement target.
  await select();await finder.click();await page.getByText(/meanings for “quiet”/).waitFor();await button('tranquil').first().click();
  await history.click();await button('Compare with current').waitFor();await input.waitFor({state:'detached'});
  await page.keyboard.press('Escape');await historyDialog.waitFor({state:'hidden'});await select();await finder.click();
  await writing.evaluate(el=>el.editor.commands.setTextSelection(1));await page.getByText(/writing or selection changed/).waitFor();assert.ok(await button('Replace selection').isDisabled());await page.keyboard.press('Escape');
  mark('History dismisses Word Finder; changed selections cannot replace stale targets');
  // Actual scene/chapter switches remount the keyed editor and discard active lookup state.
  await select();await finder.click();await page.getByText(/meanings for “quiet”/).waitFor();
  await page.locator('a[href="/project/1/write?chapter=1&scene=2"]').click();await page.waitForURL('**/write?chapter=1&scene=2');await page.getByRole('heading',{name:'The missing chart',exact:true}).waitFor();await input.waitFor({state:'detached'});assert.ok(await undo.isDisabled());
  await finder.click();await input.fill('ocean');
  let release;const paused=new Promise(resolve=>release=resolve);let started;const requested=new Promise(resolve=>started=resolve);
  await page.route('**/wordnet/**/*.gz',async route=>{started();await paused;try{await route.continue();}catch{}});
  await input.press('Enter');await requested;
  await page.getByTitle('Synthetic integration chapter · Draft',{exact:true}).click();await page.waitForURL(`**/write?chapter=${chapter.id}`);await page.getByRole('heading',{name:'Synthetic integration chapter',exact:true}).waitFor();release();await page.unroute('**/wordnet/**/*.gz');assert.equal(await input.count(),0);
  assert.equal((await read(`/api/chapters/${chapter.id}`)).content,await html());
  mark('Chapter/scene navigation and delayed lookup completion discard old selections without writing');
  // Failed dictionary fetches remain read-only, independent of history.
  await finder.click();await page.route('**/wordnet/**/*.gz',route=>route.abort());await input.fill('ocean');await input.press('Enter');
  await page.getByRole('status').filter({hasText:/fetch|load/i}).waitFor();assert.ok(await button('Replace selection').isDisabled());
  await page.unroute('**/wordnet/**/*.gz');await page.keyboard.press('Escape');
  for(const width of [390,320]) {
    await page.setViewportSize({width,height:844});
    if(await button('Hide context').isVisible())await button('Hide context').click();
    const position=await page.locator('[data-writing-scroll]').boundingBox();
    for(const control of [undo,redo,history,finder,button('More formatting'),button('Link Story Bible element')]) {
      const box=await control.boundingBox();assert.ok(box&&box.x>=0&&box.x+box.width<=width,`Toolbar control fits ${width}px`);
    }
    await select();await finder.click();await page.getByText(/meanings for “quiet”/).waitFor();
    let box=await page.getByRole('dialog',{name:'Word Finder',exact:true}).boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
    await page.screenshot({path:`${artifacts}/finder-${width}.png`,animations:'disabled'});await page.keyboard.press('Escape');
    await history.click();await button('Compare with current').click();await button('Current saved text').click();await button('Saved version').click();
    await page.screenshot({path:`${artifacts}/history-${width}.png`,animations:'disabled'});await page.keyboard.press('Escape');await historyDialog.waitFor({state:'hidden'});
    assert.deepEqual(await page.locator('[data-writing-scroll]').boundingBox(),position);
  }
  mark('390px/320px combined toolbar, focus, previews and stable writing layout');
  // A changed selected word must pass through normal pending-save and recovery gates.
  await page.setViewportSize({width:1280,height:900});
  const url=`/api/chapters/${chapter.id}`;
  let releaseSave,saveStarted;const saveHold=new Promise(resolve=>releaseSave=resolve),saveRequest=new Promise(resolve=>saveStarted=resolve);
  await page.route(`**${url}`,async route=>{if(route.request().method()==='PUT'){saveStarted();await saveHold;}await route.continue();});
  await replaceQuiet();await history.click();await saveRequest;assert.ok(await button('Restore as current version').isDisabled());
  releaseSave();await button('Compare with current').waitFor();await page.unroute(`**${url}`);
  assert.match((await read(url)).content,/<strong>tranquil<\/strong>/);
  const remote=await put(url,{content:source+'<p>Newer device writing.</p>'});
  await button('Restore as current version').click();await historyDialog.getByRole('alert').filter({hasText:'changed after your comparison'}).waitFor();
  assert.equal((await read(url)).content,remote.content);assert.ok(await button('Restore as current version').isDisabled());
  await page.keyboard.press('Escape');await historyDialog.waitFor({state:'hidden'});
  mark('Pending replacement save completes before history review; stale restoration preserves newer device writing');
  // Real stdio MCP edits must be visible in the same history UI and invalidate stale restores.
  const {hasKey,...initialAccess}=await read('/api/agent-settings');
  let response=await context.request.put(`${base}/api/agent-settings`,{data:{...initialAccess,enabled:true,projectIds:[1],allowWrites:true,allowManuscript:true}});
  assert.equal(response.status(),200);const access=await response.json();
  response=await context.request.post(`${base}/api/agent-settings/key`,{data:{revision:access.revision}});assert.equal(response.status(),200);
  const {key}=await response.json();
  const mcp=new Client({name:'qq-combined-browser-fixture',version:'0.1.0'});
  const transport=new StdioClientTransport({command:process.execPath,args:[resolve('dist/mcp.js')],env:{QQ_MCP_ORIGIN:base,QQ_MCP_TOKEN:key},stderr:'pipe'});
  transport.stderr?.on('data',()=>{});
  try {
    await mcp.connect(transport);assert.equal((await mcp.listTools()).tools.length,19);
    const beforeAgent=await read(url),agentText=source+'<p>Fictional MCP revision.</p>';
    const edit=await mcp.callTool({name:'qq_update_chapter',arguments:{projectId:1,chapterId:chapter.id,revision:beforeAgent.revision,patch:{content:agentText}}});assert(!edit.isError);
    assert.equal((await read(url)).content,agentText);
    await page.reload();await writing.waitFor();assert.match(await html(),/Fictional MCP revision/);assert.match(await html(),/data-qq-entry=/);
    await history.click();await button('Compare with current').waitFor();await button('Compare with current').click();
    assert.match(await page.frameLocator('iframe[title="Saved version preview"]').locator('body').innerText(),/Fictional MCP revision/);
    await page.screenshot({path:`${artifacts}/mcp-history.png`,animations:'disabled'});
    const current=await read(url);
    assert(!(await mcp.callTool({name:'qq_update_chapter',arguments:{projectId:1,chapterId:chapter.id,revision:current.revision,patch:{content:agentText+'<p>Newer MCP save.</p>'}}})).isError);
    await button('Restore as current version').click();await historyDialog.getByRole('alert').filter({hasText:'changed after your comparison'}).waitFor();
    assert.match((await read(url)).content,/Newer MCP save/);
    await page.keyboard.press('Escape');await historyDialog.waitFor({state:'hidden'});
    assert.equal((await context.request.delete(`${base}/api/agent-settings/key`)).status(),200);
    assert((await mcp.callTool({name:'qq_get_chapter',arguments:{projectId:1,chapterId:chapter.id}})).isError);
    mark('Real MCP formatted prose appears in history; newer MCP edit blocks stale UI restore; live key revocation denies the next read');
  } finally {await mcp.close();await transport.close();}
  // Start the failure rehearsal from an acknowledged synthetic fixture revision.
  await put(url,{content:source});await page.reload();await writing.waitFor();
  const beforeFailure=await read(url);
  failedSaveUrl=url;
  await page.route(`**${url}`,route=>route.request().method()==='PUT'?route.abort('failed'):route.continue());
  await replaceQuiet();const unsent=await html();await history.click();await historyDialog.getByRole('alert').filter({hasText:'not saved'}).waitFor();
  assert.ok(await button('Restore as current version').isDisabled());assert.equal((await read(url)).content,beforeFailure.content);
  await page.keyboard.press('Escape');await historyDialog.waitFor({state:'hidden'});
  await page.evaluate(()=>{window.__integrationReloadProbe=true;});
  await page.reload();await page.waitForFunction(()=>window.__integrationReloadProbe===undefined);await writing.waitFor();await page.getByRole('button',{name:/Review \d+ saved drafts?/}).waitFor();
  assert.ok(await page.evaluate(()=>Object.entries(localStorage).some(([key,value])=>key.includes('draft')&&value.includes('tranquil'))));
  await page.unroute(`**${url}`);assert.notEqual(unsent,beforeFailure.content);
  mark('Failed replacement save blocks history restoration and preserves the recoverable draft across reload');
  assert.deepEqual(errors,[]);await writeFile(`${artifacts}/checks.json`,JSON.stringify({syntheticOnly:true,engine:process.env.QQ_BROWSER_ENGINE||'chromium',browserVersion:browser.version(),checks,errors,injectedNetworkErrors},null,2)+'\n');
} catch(error) {if(page)await page.screenshot({path:`${artifacts}/failure.png`,fullPage:true}).catch(()=>{});throw error;}
finally {await browser?.close();if(server.exitCode===null){const done=once(server,'exit');server.kill('SIGTERM');await done;}}

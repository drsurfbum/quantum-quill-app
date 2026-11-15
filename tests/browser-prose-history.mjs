// Real Chromium with fictional memory-only writing. No working DB or account.
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const port=Number(process.env.QQ_HISTORY_BROWSER_PORT || 57582), base=`http://127.0.0.1:${port}`,artifacts='artifacts/history';
await mkdir(artifacts,{recursive:true});
const server=spawn(process.execPath,['--import','tsx','tests/showcase-server.ts'],{env:{...process.env,NODE_ENV:'test',QQ_SHOWCASE_PORT:String(port)},stdio:['ignore','pipe','pipe']});
let output='',browser,page;server.stdout.on('data',s=>output+=s);server.stderr.on('data',s=>output+=s);
const checks=[],errors=[];
const mark=text=>{checks.push(text);console.log(text);};
try {
  let ready=false;
  for(let i=0;i<100;i++) {if(server.exitCode!==null)throw new Error(output);try{if((await fetch(`${base}/healthz`)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
  assert.ok(ready,'fixture starts');
  browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE ? {executablePath:process.env.CHROME_EXECUTABLE} : {})});
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
  page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/auth`);
  await page.getByLabel('Username',{exact:true}).fill('demo-writer');await page.getByLabel('Password',{exact:true}).fill('synthetic-showcase-only');
  await page.getByRole('button',{name:/^(Login|Sign in|Log in)$/i}).click();await page.waitForURL(u=>!u.pathname.startsWith('/auth'));
  await page.goto(`${base}/project/1/write?chapter=1&scene=2`);
  const invitation=page.getByRole('button',{name:'Skip for now',exact:true});if(await invitation.isVisible())await invitation.click();
  const writing=()=>page.locator('.writing-document [contenteditable="true"]');
  await writing().waitFor();
  const read=async()=>{const r=await context.request.get(`${base}/api/scenes/2`);assert.equal(r.status(),200);return r.json();};
  const initial=await read();
  async function savedAfter(revision) {for(let i=0;i<80;i++){const row=await read();if(row.revision>revision)return row;await new Promise(r=>setTimeout(r,100));}throw new Error('save timeout');}
  const undo=page.getByRole('button',{name:'Undo',exact:true}),redo=page.getByRole('button',{name:'Redo',exact:true}),history=page.getByRole('button',{name:'Version history',exact:true});
  assert.ok(await undo.isDisabled());assert.ok(await redo.isDisabled());
  await writing().click();await writing().press('ControlOrMeta+End');await writing().pressSequentially(' A synthetic new ending.');
  let current=await savedAfter(initial.revision);const changed=current.content;
  await writing().press('ControlOrMeta+z');current=await savedAfter(current.revision);assert.ok(!current.content.includes('synthetic new ending'));
  await redo.click();current=await savedAfter(current.revision);assert.equal(current.content,changed);
  mark('Visible buttons and keyboard undo preserve editor focus and work across autosave');
  const position=await page.locator('[data-writing-scroll]').boundingBox();
  await history.focus();await history.press('Enter');
  const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Compare with current',exact:true}).waitFor();
  const chooseOriginal=async()=>{await dialog.getByRole('navigation',{name:'Saved versions'}).getByRole('button').filter({hasText:'Original checkpoint'}).click();await dialog.getByRole('button',{name:'Restore as current version',exact:true}).waitFor();};
  await chooseOriginal();await dialog.getByRole('button',{name:'Compare with current',exact:true}).click();
  await page.frameLocator('iframe[title="Saved version preview"]').locator('body').waitFor();
  assert.ok(await page.frameLocator('iframe[title="Saved version preview"]').locator('body').textContent());
  assert.equal((await read()).revision,current.revision,'opening/reviewing makes no writes');
  await page.screenshot({path:`${artifacts}/desktop-compare.png`,animations:'disabled'});
  mark('Formatted preview and side-by-side comparison are read-only under production CSP');
  const beforePolicy=await (await context.request.get(`${base}/api/scenes/2/history`)).json();
  const originalVersion=beforePolicy.versions.find(v=>v.kind==='baseline');
  await dialog.getByRole('button',{name:'Keep this version',exact:true}).click();await dialog.getByRole('button',{name:'Kept',exact:true}).waitFor();
  const downloading=page.waitForEvent('download');await dialog.getByRole('button',{name:'Download version',exact:true}).click();
  const download=await downloading;const downloaded=JSON.parse(await readFile(await download.path(),'utf8'));
  assert.equal(downloaded.content,initial.content);assert.equal(downloaded.version.id,originalVersion.id);assert.ok(!('requestId' in downloaded.version));
  await dialog.getByRole('button',{name:'Retention review',exact:true}).click();
  await dialog.getByRole('region',{name:'Retention review'}).getByText('Deleted: 0.',{exact:true}).waitFor();
  assert.ok(await dialog.getByRole('button',{name:'Restore as current version',exact:true}).isDisabled());
  await page.screenshot({path:`${artifacts}/retention-desktop.png`,animations:'disabled'});
  const policy=await (await context.request.get(`${base}/api/scenes/2/history/retention`)).json();
  assert.equal(policy.mode,'dry-run');assert.ok(policy.decisions.find(v=>v.id===originalVersion.id).reasons.includes('kept-by-writer'));
  assert.equal((await read()).revision,current.revision);
  assert.equal((await (await context.request.get(`${base}/api/scenes/2/history`)).json()).versions.length,beforePolicy.versions.length);
  await page.keyboard.press('Escape');await page.reload();await writing().waitFor();await history.click();
  await dialog.getByRole('button',{name:'Compare with current',exact:true}).waitFor();await chooseOriginal();
  assert.ok(await dialog.getByRole('button',{name:'Kept',exact:true}).isDisabled());
  mark('Keep persists across reload; download preserves exact prose; retention review is read-only with zero deletion');
  const remote=await context.request.put(`${base}/api/scenes/2`,{data:{content:'<p>Newer remote writing</p>',_revision:current.revision}});assert.equal(remote.status(),200);current=await remote.json();
  await dialog.getByRole('button',{name:'Restore as current version',exact:true}).click();await dialog.getByRole('alert').filter({hasText:'changed after your comparison'}).waitFor();
  assert.equal((await read()).content,'<p>Newer remote writing</p>');
  await chooseOriginal();
  await dialog.getByRole('button',{name:'Restore as current version',exact:true}).click();await dialog.waitFor({state:'hidden'});
  current=await read();assert.equal(current.content,initial.content);assert.equal(current.summary,initial.summary);
  const protectedVersions=(await (await context.request.get(`${base}/api/scenes/2/history`)).json()).versions;
  for(const version of [protectedVersions[0],protectedVersions[1],protectedVersions.find(v=>v.id===originalVersion.id)])assert.ok(version.restoreProtected);
  mark('Successful restoration protects the source, outgoing checkpoint and restored result');
  assert.ok(await undo.isDisabled());assert.ok(await redo.isDisabled());
  await page.waitForFunction(()=>document.activeElement?.matches('.writing-document [contenteditable="true"]'));
  assert.equal(await writing().evaluate(el=>el===document.activeElement),true);
  const afterPosition=await page.locator('[data-writing-scroll]').boundingBox();assert.deepEqual(afterPosition,position);
  mark('Stale restoration is rejected; explicit renewed review restores exact prose, resets undo, and preserves layout');
  await page.setViewportSize({width:320,height:844});
  if(await page.getByRole('button',{name:'Hide context',exact:true}).isVisible()) await page.getByRole('button',{name:'Hide context',exact:true}).click();
  // A response lost after the server commits survives page reload as a safe retry.
  await history.click();await dialog.getByRole('button',{name:'Compare with current',exact:true}).waitFor();await chooseOriginal();
  await page.route('**/api/scenes/2/history/restore',async route=>{await route.fetch();await route.abort('failed');});
  const beforeLost=current.revision;
  await dialog.getByRole('button',{name:'Restore as current version',exact:true}).click();await dialog.getByRole('button',{name:'Retry restoration',exact:true}).waitFor();
  const retryBox=await dialog.getByRole('button',{name:'Retry restoration',exact:true}).boundingBox();assert.ok(retryBox.y+retryBox.height<=844);
  const bodyBox=await dialog.locator('[data-history-body]').boundingBox(),noticeBox=await dialog.locator('[data-history-notices]').boundingBox();
  assert.ok(bodyBox.y+bodyBox.height<=noticeBox.y,'The preview scroll area must end above the retry notice');
  assert.equal(await dialog.locator('[data-history-body]').evaluate(el=>getComputedStyle(el).overflowY),'auto');
  await page.screenshot({path:`${artifacts}/narrow-retry.png`,animations:'disabled'});
  assert.equal((await read()).revision,beforeLost+1);
  await page.unroute('**/api/scenes/2/history/restore');await page.reload();await writing().waitFor();
  await history.click();await dialog.getByRole('button',{name:'Retry restoration',exact:true}).waitFor();
  await dialog.getByRole('button',{name:'Retry restoration',exact:true}).click();await dialog.waitFor({state:'hidden'});
  assert.equal((await read()).revision,beforeLost+1);mark('320px retry notices do not overlap previews; lost response and reload retry do not create another revision');
  // Narrow screens retain controls and swap comparison panes instead of squeezing prose.
  if(await page.getByRole('button',{name:'Hide context',exact:true}).isVisible()) await page.getByRole('button',{name:'Hide context',exact:true}).click();
  for(const width of [390,320]) {
    await page.setViewportSize({width,height:844});
    assert.ok(await history.isVisible());assert.ok(await undo.isVisible());assert.ok(await redo.isVisible());
    await history.click();await dialog.getByRole('button',{name:'Compare with current',exact:true}).click();
    await dialog.getByRole('button',{name:'Current saved text',exact:true}).click();
    assert.ok(await page.locator('iframe[title="Current saved text preview"]').isVisible());
    await dialog.getByRole('button',{name:'Saved version',exact:true}).click();
    const bounds=await dialog.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width);
    const restoreBounds=await dialog.getByRole('button',{name:'Restore as current version',exact:true}).boundingBox();assert.ok(restoreBounds.y+restoreBounds.height<=844);
    const geometry=await dialog.evaluate(el=>{
      const box=el.getBoundingClientRect();
      return {width:el.clientWidth,scrollWidth:el.scrollWidth,overflow:[...el.querySelectorAll('*')].filter(child=>{const r=child.getBoundingClientRect();return r.width&&r.right>box.right+1;}).slice(0,5).map(child=>({tag:child.tagName,text:child.textContent?.slice(0,60)}))};
    });
    assert.ok(geometry.scrollWidth<=geometry.width+1,JSON.stringify({viewport:width,...geometry}));
    await page.screenshot({path:`${artifacts}/narrow-${width}.png`,animations:'disabled'});
    await dialog.getByRole('button',{name:'Retention review',exact:true}).click();
    await dialog.getByRole('region',{name:'Retention review'}).getByText('Deleted: 0.',{exact:true}).waitFor();
    assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
    await page.screenshot({path:`${artifacts}/retention-${width}.png`,animations:'disabled'});
    await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  }
  mark('320px and 390px controls, pane switching, Escape, and restore action stay reachable without horizontal overflow');
  await page.setViewportSize({width:1280,height:900});
  await page.evaluate(()=>localStorage.setItem('theme','dark'));await page.reload();await writing().waitFor();await history.click();
  await dialog.getByRole('button',{name:'Compare with current',exact:true}).click();await page.screenshot({path:`${artifacts}/dark-compare.png`,animations:'disabled'});
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  // Saving is blocked: history must not replace pending/recoverable writing.
  await page.route('**/api/scenes/2',route=>route.request().method()==='PUT'?route.abort('failed'):route.continue());
  await writing().click();await writing().press('ControlOrMeta+End');await writing().pressSequentially(' Unsent recovery sentence.');
  await history.click();await dialog.getByRole('alert').filter({hasText:'not saved'}).waitFor();
  assert.ok(await dialog.getByRole('button',{name:'Restore as current version',exact:true}).isDisabled());
  await page.reload();await writing().waitFor();
  await page.getByRole('button',{name:/Review \d+ saved drafts?/}).waitFor();
  const journal=await page.evaluate(()=>Object.entries(localStorage).some(([key,value])=>key.includes('draft')&&value.includes('Unsent recovery sentence')));assert.ok(journal);
  mark('Failed-save history gate and crash/reload draft recovery retain unsent writing');
  assert.deepEqual(errors,[]);
  await writeFile(`${artifacts}/browser-checks.json`,JSON.stringify({syntheticOnly:true,checks,errors},null,2)+'\n');
} catch(e) {if(page)await page.screenshot({path:`${artifacts}/failure.png`,fullPage:true}).catch(()=>{});throw e;}
finally {await browser?.close();if(server.exitCode===null){const done=once(server,'exit');server.kill('SIGTERM');await done;}}

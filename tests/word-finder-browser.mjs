// Real UI with the loopback-only showcase fixture. Never use with a writing DB.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const {chromium,webkit,request}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=`http://127.0.0.1:${Number(process.env.QQ_SHOWCASE_PORT || 5063)}`;
const out=path.resolve(process.env.QQ_EVIDENCE_DIR || '.local/word-finder');await mkdir(out,{recursive:true});
const api=await request.newContext({baseURL:base});
assert.equal((await api.post('/api/login',{data:{username:'demo-writer',password:'synthetic-showcase-only'}})).status(),200);
const state=await api.storageState(),receipts=[];
for(const [engine,type] of [['chromium',chromium],...(process.env.QQ_TEST_WEBKIT==='1'?[['webkit',webkit]]:[])]){
 const browser=await type.launch({headless:true,...(engine==='chromium'&&process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
 for(const [label,width,height] of [['desktop',1440,1000],['tablet',1024,768],['narrow',390,844]]){
  const context=await browser.newContext({storageState:state,viewport:{width,height}});
  await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  const page=await context.newPage(),errors=[],lookups=[],writes=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('request',r=>{if(r.url().includes('/wordnet/'))lookups.push(r.url());if(r.method()==='PUT')writes.push(r.url());});
  await page.addInitScript(()=>localStorage.setItem('quantum-quill:interface-tour:1',JSON.stringify({versions:{'1':'dismissed'}})));
  // Disposable fictional scene, updated through the ordinary revision-protected API.
  const scene=await (await api.get('/api/scenes/2')).json();
  assert.equal((await api.put('/api/scenes/2',{data:{content:'<p>A <strong>quiet</strong> shore.</p><p>Keep this paragraph intact.</p>',_revision:scene.revision,_base:{content:scene.content}}})).status(),200);
  await page.goto(base+'/project/1/write?chapter=1&scene=2');await page.locator('.ProseMirror').waitFor();
  const ed=page.locator('.ProseMirror');
  const html=()=>ed.evaluate(e=>e.editor.getHTML());
  const select=()=>ed.evaluate(e=>{e.editor.commands.setTextSelection({from:3,to:8});e.editor.view.focus();});
  const finder=page.getByRole('button',{name:'Word Finder',exact:true});
  const input=page.getByLabel('English word or expression');
  const replace=page.getByRole('button',{name:'Replace selection',exact:true});
  const initial=await html();await select();
  const scroll=await page.locator('[data-writing-scroll]').evaluate(e=>e.scrollTop);
  await finder.click();await page.getByText(/meanings for “quiet”/).waitFor();
  assert.equal(await input.inputValue(),'quiet');assert.equal(await html(),initial);assert.equal(writes.length,0);
  await page.getByRole('button',{name:'tranquil',exact:true}).first().click();assert.equal(await html(),initial);
  await page.screenshot({animations:'disabled',path:path.join(out,`${engine}-${label}-word-finder.png`)});
  const bounds=await page.getByRole('dialog').boundingBox();assert(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=width+1&&bounds.y+bounds.height<=height+1);
  await replace.click();await page.getByRole('dialog').waitFor({state:'hidden'});
  assert.match(await html(),/<strong>tranquil<\/strong>/);assert.match(await html(),/Keep this paragraph intact/);
  await page.waitForFunction(()=>document.activeElement?.classList.contains('ProseMirror'));
  assert.equal(await page.locator('[data-writing-scroll]').evaluate(e=>e.scrollTop),scroll);
  await page.getByRole('button',{name:'More formatting',exact:true}).click();
  await page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await html(),initial);
  await page.getByRole('button',{name:'Redo',exact:true}).click();assert.match(await html(),/<strong>tranquil<\/strong>/);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1600);
  assert.match((await (await api.get('/api/scenes/2')).json()).content,/<strong>tranquil<\/strong>/);
  await page.reload();await ed.waitFor();assert.match(await html(),/<strong>tranquil<\/strong>/);
  // Typed lookup with no selection must never enable replacement.
  await ed.evaluate(e=>e.editor.commands.setTextSelection(1));await finder.click();await input.fill('bright');await input.press('Enter');
  await page.getByText(/meanings for “bright”/).waitFor();assert.equal(await replace.isDisabled(),true);
  await input.fill('zznonexistentwordzz');await input.press('Enter');await page.getByText(/No entry for/).waitFor();
  await page.keyboard.press('Escape');await page.waitForFunction(()=>document.activeElement?.classList.contains('ProseMirror'));
  // An edit while results are open invalidates the captured target.
  await ed.evaluate(e=>e.editor.commands.setTextSelection({from:3,to:11}));await finder.click();await page.getByText(/meanings for “tranquil”/).waitFor();
  await ed.evaluate(e=>e.editor.commands.insertContentAt(e.editor.state.doc.content.size-1,' Synthetic.'));
  await page.getByText(/writing or selection changed/).waitFor();assert.equal(await replace.isDisabled(),true);
  await page.keyboard.press('Escape');
  // Dark mode, short viewport, input focus and escape remain usable.
  await page.evaluate(()=>document.documentElement.classList.add('dark'));await page.setViewportSize({width,height:450});
  await finder.click();await input.fill('quiet');await input.press('Enter');await page.getByText(/meanings for “quiet”/).waitFor();
  const small=await page.getByRole('dialog').boundingBox();assert(small.y>=0&&small.y+small.height<=451);
  assert.equal(await input.evaluate(e=>document.activeElement===e),true);
  const replaceBox=await replace.boundingBox(); assert(replaceBox.y>=small.y && replaceBox.y+replaceBox.height<=small.y+small.height, 'Replacement control is visible in short viewport');
  await page.screenshot({animations:'disabled',path:path.join(out,`${engine}-${label}-short-dark.png`)});
  await page.keyboard.press('Escape');
  assert(lookups.length>0);assert(lookups.every(url=>/\/wordnet\/2025-v1\/[0-9a-f]{2}\.json\.gz$/.test(url)));
  assert.deepEqual(errors,[]);receipts.push({engine,version:browser.version(),label,passed:true,lookups:lookups.length,bounds});
  await context.close();
 }
 await browser.close();
}
await api.dispose();await writeFile(path.join(out,'browser-results.json'),JSON.stringify(receipts,null,2));console.log(JSON.stringify(receipts,null,2));

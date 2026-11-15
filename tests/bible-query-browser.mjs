// Requires the fictional tests/showcase-server.ts, never a writing database.
// Uses the same PLAYWRIGHT_MODULE, QQ_SHOWCASE_PORT, CHROMIUM_EXECUTABLE and QQ_EVIDENCE_DIR as bible-picker-browser.mjs.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const {webkit,chromium,request}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const port=Number(process.env.QQ_SHOWCASE_PORT || 5063);assert(Number.isInteger(port) && port>=1024 && port<=65535);
const base=`http://127.0.0.1:${port}`,out=path.resolve(process.env.QQ_EVIDENCE_DIR || '.local/bible-query-evidence');await mkdir(out,{recursive:true});
const api=await request.newContext({baseURL:base});
assert.equal((await api.post('/api/login',{data:{username:'demo-writer',password:'synthetic-showcase-only'}})).status(),200);
const rows=await (await api.get('/api/projects/1/story-bible')).json();
async function add(title){const response=await api.post('/api/story-bible',{data:{projectId:1,title,entryType:'characters',content:'SecretChooserContent',priority:0}});assert.equal(response.status(),201);}
if(!rows.some(e=>e.title==='Fixture entry 000'))for(let i=0;i<300;i++)await add(`Fixture entry ${String(i).padStart(3,'0')}`);
for(const title of ['Orion & C++ [A.*]','Andreas / North','Nottingham (East)','Aster AND Brin','The "Silver" Chart'])if(!rows.some(e=>e.title===title))await add(title);
const total=(await (await api.get('/api/projects/1/story-bible')).json()).length;
const state=await api.storageState(),results=[];
for(const [engine,type] of [['webkit',webkit],['chromium',chromium]]){
 const browser=await type.launch({headless:true,...(engine==='chromium' && process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
 for(const [label,width,height] of [['portrait',1024,1366],['landscape',1366,1024],['narrow',390,844]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,storageState:state});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>localStorage.setItem('quantum-quill:interface-tour:1',JSON.stringify({versions:{'1':'dismissed'}})));
  await page.goto(`${base}/project/1/write?chapter=1&scene=2`);await page.locator('.ProseMirror').waitFor();
  const show=page.getByRole('button',{name:'Show context',exact:true});if(await show.count())await show.click();
  const find=page.getByRole('button',{name:'Find',exact:true});await find.click();
  const input=page.getByRole('combobox',{name:'Search entries'}),list=page.getByRole('listbox'),options=list.getByRole('option');
  await input.waitFor();await page.waitForTimeout(250);assert.equal(await options.count(),total);
  assert.match(await page.getByRole('dialog').innerText(),/words use AND/);
  const cases=[['Vale Mara',1],['Mara AND Vale',1],['Mara OR Elian',2],['Mara OR Elian AND NOT Rook',1],['(Mara OR Elian) NOT Vale',1],['"Chart Room"',1],['“Chart Room”',1],['Mara OR',1],['Mara OR NOT (',1],['Mara OR "',1],['Mara OR "Chart R',2],['NOT (',total],['NOT Mara',total-1],['C++ [A.*]',1],['"Nottingham (East)"',1],['SecretChooserContent',0],['"Starred"',0]];
  for(const [query,count] of cases){await input.fill(query);assert.equal(await options.count(),count,`${engine}/${label}: ${query}`);assert.equal(await input.evaluate(e=>document.activeElement===e && e.selectionStart===e.value.length),true);}
  // Ordinary type-ahead, including each unfinished uppercase operator character.
  await input.fill('');
  for(const char of 'Mara OR Elian'){
   await input.pressSequentially(char);assert.equal(await input.evaluate(e=>document.activeElement===e && e.selectionStart===e.value.length),true);
   assert((await options.count())>0,`blank incremental results: ${await input.inputValue()}`);
  }
  for(let i=0;i<'Mara OR Elian'.length-2;i++)await input.press('ArrowLeft');
  await input.press('ArrowDown');assert.equal(await input.evaluate(e=>e.selectionStart===2),true);
  await input.pressSequentially('X');assert.equal(await input.inputValue(),'MaXra OR Elian');
  assert.equal(await input.evaluate(e=>document.activeElement===e && e.selectionStart===3),true);
  assert.equal(await options.count(),1);
  await input.press('Backspace');assert.equal(await input.inputValue(),'Mara OR Elian');
  assert.equal(await input.evaluate(e=>document.activeElement===e && e.selectionStart===2),true);
  await page.screenshot({caret:'initial',path:path.join(out,`${engine}-${label}-boolean.png`)});
  await input.fill('Fixture NOT "entry 00"');assert.equal(await options.count(),290);
  await input.press('Control+End');
  const geometry=await input.evaluate(e=>{const list=document.querySelector('[role=listbox]'),active=document.getElementById(e.getAttribute('aria-activedescendant'));return {input:e.getBoundingClientRect().toJSON(),list:list.getBoundingClientRect().toJSON(),active:active.getBoundingClientRect().toJSON(),title:active.textContent};});
  assert.match(geometry.title,/Fixture entry 299/);assert(geometry.input.bottom<=geometry.list.top);assert(geometry.active.bottom<=geometry.list.bottom+1);
  await page.screenshot({caret:'initial',path:path.join(out,`${engine}-${label}-boolean-last.png`)});
  await page.setViewportSize({width,height:350});
  await input.fill('(Mara OR "Chart Room") NOT Old');
  assert.equal(await options.count(),2);
  const dialog=await page.getByRole('dialog').boundingBox();assert(dialog.y>=0 && dialog.y+dialog.height<=350);
  assert((await list.boundingBox()).height>=44);
  await page.screenshot({caret:'initial',path:path.join(out,`${engine}-${label}-boolean-short.png`)});
  await input.fill('Mara OR Elian');await input.press('Enter');await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.waitForFunction(()=>document.activeElement?.textContent==='Find');
  assert(await page.getByRole('heading',{name:'Elian Rook',exact:true}).isVisible());
  await find.click();await input.waitFor();assert.equal(await options.count(),total);
  await input.fill('Mara OR (');await input.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.waitForFunction(()=>document.activeElement?.textContent==='Find');
  assert.deepEqual(errors,[]);results.push({engine,version:browser.version(),label,total,queries:cases.length,passed:true,geometry});
  await context.close();
 }
 await browser.close();
}
await api.dispose();await writeFile(path.join(out,'boolean-browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(({engine,label,total,passed})=>({engine,label,total,passed})),null,2));

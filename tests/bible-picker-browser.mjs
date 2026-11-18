// Optional real-engine regression. Use only tests/showcase-server.ts (fictional memory data).
// PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs QQ_SHOWCASE_PORT=5079 node tests/bible-picker-browser.mjs
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const {webkit,chromium,request}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const port=Number(process.env.QQ_SHOWCASE_PORT || 5063);
assert(Number.isInteger(port) && port>=1024 && port<=65535);
const base=`http://127.0.0.1:${port}`;
const out=path.resolve(process.env.QQ_EVIDENCE_DIR || '.local/bible-picker-evidence');await mkdir(out,{recursive:true});
const results=[];
const api=await request.newContext({baseURL:base});
assert.equal((await api.post('/api/login',{data:{username:'demo-writer',password:'synthetic-showcase-only'}})).status(),200);
async function create(route,data){const response=await api.post(route,{data});assert.equal(response.status(),201,await response.text());return response.json();}
const current=await (await api.get('/api/projects/1/story-bible')).json();
// Make repeat runs idempotent on this disposable server.
if(!current.some(e=>e.title==='ZZZ Final fictional entry')){
  for(let i=0;i<300;i++)await create('/api/story-bible',{projectId:1,title:`Fixture entry ${String(i).padStart(3,'0')}`,entryType:'characters',content:'Fictional test data only.',priority:0});
  await create('/api/story-bible',{projectId:1,title:'ZZZ Final fictional entry',entryType:'characters',content:'Last in the full browse list.',priority:0});
  await create('/api/story-bible',{projectId:1,title:'Archived fictional card',entryType:'characters',content:'Reference only.',isArchived:true});
  const other=await create('/api/projects',{title:'Isolated fictional project'});
  await create('/api/story-bible',{projectId:other.id,title:'FOREIGN PROJECT SENTINEL',entryType:'characters',content:'Must not appear in project one.'});
  await create('/api/chapters',{projectId:other.id,title:'Other fictional chapter',content:'',order:0});
}
const rows=await (await api.get('/api/projects/1/story-bible')).json();
const projects=await (await api.get('/api/projects')).json();
const other=projects.find(e=>e.title==='Isolated fictional project');
let empty=projects.find(e=>e.title==='Empty fictional project');
if(!empty){empty=await create('/api/projects',{title:'Empty fictional project'});await create('/api/chapters',{projectId:empty.id,title:'Empty fictional chapter',content:'',order:0});}
const state=await api.storageState();
for(const [engine,type] of [['webkit',webkit],['chromium',chromium]]){
 const browser=await type.launch({headless:true,...(engine==='chromium' && process.env.CHROMIUM_EXECUTABLE ? {executablePath:process.env.CHROMIUM_EXECUTABLE}: {})});
 for(const [label,width,height] of [['portrait',1024,1366],['landscape',1366,1024],['ipad11-portrait',834,1194],['ipad11-landscape',1194,834],['narrow',390,844]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:1,storageState:state});
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await page.addInitScript(()=>localStorage.setItem('quantum-quill:interface-tour:1',JSON.stringify({versions:{'1':'dismissed'}})));
  await page.goto(`${base}/project/1/write?chapter=1&scene=2`);
  await page.locator('.ProseMirror').waitFor();
  const show=page.getByRole('button',{name:'Show context',exact:true});if(await show.count())await show.click();
  const find=page.getByRole('button',{name:'Find',exact:true});
  const open=async()=>{await find.click();await page.getByRole('combobox').waitFor();await page.waitForTimeout(250);};
  const proseBefore=await page.locator('.ProseMirror').innerHTML();
  await page.locator('.ProseMirror').evaluate(editor=>{
    editor.focus();const text=document.createTreeWalker(editor.querySelector('p'),NodeFilter.SHOW_TEXT).nextNode();
    window.getSelection().setBaseAndExtent(text,2,text,4);
  });
  await page.waitForTimeout(50);
  const manuscriptSelection=await page.evaluate(()=>window.getSelection().toString());assert(manuscriptSelection.length>0);
  await open();
  const input=page.getByRole('combobox'),list=page.getByRole('listbox'),options=page.getByRole('option');
  assert.equal(await options.count(),rows.length);
  assert.equal(await options.filter({hasText:'FOREIGN PROJECT SENTINEL'}).count(),0);
  assert.equal(await input.evaluate(e=>document.activeElement===e),true);
  await page.screenshot({caret:'initial',path:path.join(out,`${engine}-${label}-browse.png`)});
  await input.pressSequentially('Fixture');
  assert.equal(await options.count(),300);
  assert.equal(await input.evaluate(e=>e.selectionStart),7);
  await input.press('ArrowDown');
  assert.equal(await input.evaluate(e=>document.activeElement===e && e.selectionStart===7),true);
  if(engine==='chromium' && label==='portrait'){
    for(let i=0;i<4;i++)await input.press('ArrowLeft');
    const beforeUsage=await page.evaluate(()=>localStorage.getItem('quantum-quill:bible-find-counts:v1:1:1'));
    const b=await list.boundingBox(),cdp=await context.newCDPSession(page);
    await cdp.send('Input.synthesizeScrollGesture',{x:b.x+b.width/2,y:b.y+b.height/2,yDistance:-20000,speed:10000,gestureSourceType:'touch'});
    await page.waitForFunction(()=>{const e=document.querySelector('[role=listbox]');return e.scrollTop+e.clientHeight>=e.scrollHeight-1;});
    assert.equal(await input.evaluate(e=>document.activeElement===e && e.selectionStart===3),true);
    assert.equal(await page.evaluate(()=>localStorage.getItem('quantum-quill:bible-find-counts:v1:1:1')),beforeUsage);
    assert.match(await options.last().innerText(),/Fixture entry 299/);
    await page.waitForTimeout(300);
    await page.screenshot({caret:'initial',path:path.join(out,'chromium-long-swipe-caret.png')});
    await options.last().tap();await page.getByRole('dialog').waitFor({state:'hidden'});await page.waitForFunction(()=>document.activeElement?.textContent==='Find');
    await page.getByRole('button',{name:'Continue writing',exact:true}).click();
    await page.waitForFunction(expected=>window.getSelection().toString()===expected,manuscriptSelection);
    assert.equal(await page.evaluate(()=>window.getSelection().toString()),manuscriptSelection);
    assert.equal(await page.locator('.ProseMirror').innerHTML(),proseBefore);
    await cdp.detach();await open();
  }
  await input.fill('');
  await input.press('PageDown');
  assert.equal(await input.evaluate(e=>document.activeElement===e),true);
  await input.press('Control+Home');
  const listBox=await list.boundingBox();
  if(engine==='chromium'){
    // Browser-dispatched touch input exercises native gesture cancellation/scrolling.
    const cdp=await context.newCDPSession(page),x=listBox.x+listBox.width/2,y=listBox.y+listBox.height-20;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let step=1;step<=8;step++){
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-step*20}]});
      await page.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForTimeout(250);
    assert(await list.evaluate(e=>e.scrollTop)>0);
    assert.equal(await input.evaluate(e=>document.activeElement===e),true);
    assert(await page.getByRole('dialog').isVisible());
    await cdp.detach();
  }
  await input.press('Control+End');
  let geometry=await page.evaluate(()=>{
   const input=document.querySelector('[role=combobox]'),list=document.querySelector('[role=listbox]');
   const active=document.getElementById(input.getAttribute('aria-activedescendant'));
   return {input:input.getBoundingClientRect().toJSON(),list:list.getBoundingClientRect().toJSON(),active:active.getBoundingClientRect().toJSON(),last:active.textContent,scroll:list.scrollTop};
  });
  assert.match(geometry.last,/ZZZ Final/);assert(geometry.scroll>0);
  assert(geometry.input.bottom<=geometry.list.top);assert(geometry.active.bottom<=geometry.list.bottom+1);
  await page.screenshot({caret:'initial',path:path.join(out,`${engine}-${label}-last.png`)});
  await input.press('Enter');await page.getByRole('dialog').waitFor({state:'hidden'});await page.waitForFunction(()=>document.activeElement?.textContent==='Find');
  assert.equal(await find.evaluate(e=>document.activeElement===e),true);
  assert(await page.getByRole('heading',{name:'ZZZ Final fictional entry',exact:true}).count());
  await page.getByRole('button',{name:'Continue writing',exact:true}).click();
    await page.waitForFunction(expected=>window.getSelection().toString()===expected,manuscriptSelection);
  assert.equal(await page.evaluate(()=>window.getSelection().toString()),manuscriptSelection);
  assert.equal(await page.locator('.ProseMirror').innerHTML(),proseBefore);
  await open();
  const titles=await options.allTextContents();
  assert(titles.findIndex(t=>t.includes('ZZZ Final'))<titles.findIndex(t=>t.includes('Fixture entry 000')));
  assert(titles[0].includes('Starred'));
  await input.fill('no-match-impossible');assert.equal(await options.count(),0);assert.equal(await input.getAttribute('aria-activedescendant'),null);
  await input.press('Enter');assert(await page.getByRole('dialog').isVisible());
  await input.fill('Mara');await options.first().tap();await page.getByRole('dialog').waitFor({state:'hidden'});await page.waitForFunction(()=>document.activeElement?.textContent==='Find');
  assert.equal(await find.evaluate(e=>document.activeElement===e),true);
  await open();await input.pressSequentially('a');
  await page.setViewportSize({width,height:350});
  await page.waitForTimeout(100);
  const box=await page.getByRole('dialog').boundingBox();assert(box.y>=0 && box.y+box.height<=350);
  await input.press('End');await input.pressSequentially('r');
  assert.equal(await input.evaluate(e=>document.activeElement===e && e.selectionStart===2),true);
  await page.screenshot({caret:'initial',path:path.join(out,`${engine}-${label}-short.png`)});
  await page.setViewportSize({width,height});await input.fill('');
  // Simulate the distinct visualViewport API event (not a physical iPad keyboard).
  await page.evaluate(()=>{
   const viewport=Object.assign(new EventTarget(),{width:innerWidth,height:350,offsetTop:120,offsetLeft:0});
   Object.defineProperty(window,'visualViewport',{configurable:true,value:viewport});
   window.dispatchEvent(new Event('resize'));
  });
  await page.waitForTimeout(100);
  const visual=await page.getByRole('dialog').boundingBox();assert(visual.y>=120 && visual.y+visual.height<=470);
  await page.screenshot({caret:'initial',path:path.join(out,`${engine}-${label}-visual-viewport.png`)});
  await input.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});await page.waitForFunction(()=>document.activeElement?.textContent==='Find');
  assert.equal(await find.evaluate(e=>document.activeElement===e),true);
  await page.goto(`${base}/project/${other.id}/write`);await page.locator('.ProseMirror').waitFor();
  if(await show.count())await show.click();await open();
  assert.equal(await options.count(),1);assert.match(await options.first().innerText(),/FOREIGN PROJECT SENTINEL/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('quantum-quill:bible-find-counts:v1:1:2')),null);
  if(label==='narrow'){
    await page.goto(`${base}/project/${empty.id}/write`);await page.locator('.ProseMirror').waitFor();
    if(await show.count())await show.click();await open();assert.equal(await options.count(),0);
    assert.equal(await input.getAttribute('aria-activedescendant'),null);
    assert(await page.getByText('No entries match this search.',{exact:true}).isVisible());
    await input.press('Enter');assert(await page.getByRole('dialog').isVisible());
  }
  assert.deepEqual(errors,[]);
  results.push({engine,version:browser.version(),label,width,height,entries:rows.length,geometry,shortViewport:box,simulatedVisualViewport:visual,passed:true});
  await context.close();
 }
 const desktop=await browser.newContext({viewport:{width:1280,height:800},storageState:state});
 const page=await desktop.newPage();
 await page.addInitScript(()=>localStorage.setItem('quantum-quill:interface-tour:1',JSON.stringify({versions:{'1':'dismissed'}})));
 await page.goto(`${base}/project/1/write?chapter=1&scene=2`);await page.locator('.ProseMirror').waitFor();
 await page.getByRole('button',{name:'Find',exact:true}).click();
 const field=page.getByRole('combobox'),list=page.getByRole('listbox');
 await field.pressSequentially('Fixture');
 const rect=await list.boundingBox();await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);
 await page.mouse.wheel(0,20000);
 await page.waitForFunction(()=>{const e=document.querySelector('[role=listbox]');return e.scrollTop+e.clientHeight>=e.scrollHeight-1;});
 assert.equal(await field.evaluate(e=>document.activeElement===e && e.selectionStart===7),true);
 assert.equal(await page.getByRole('dialog').isVisible(),true);
 if(engine==='chromium'){
  await field.press('Tab');assert.equal(await page.getByRole('button',{name:'Close',exact:true}).evaluate(e=>document.activeElement===e),true);
  await page.keyboard.press('Shift+Tab');assert.equal(await field.evaluate(e=>document.activeElement===e),true);
 }
 await page.screenshot({caret:'initial',path:path.join(out,`${engine}-wheel-last.png`)});
 results.push({engine,label:'desktop-wheel',passed:true});
 await field.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
 await page.getByText('Manage cast, locations & references',{exact:true}).click();
 await page.getByRole('button',{name:'Add character',exact:true}).click();await page.getByRole('combobox',{name:'Search entries',exact:true}).waitFor();
 assert.match(await page.getByRole('listbox').getByRole('option').first().innerText(),/^Mara Vale/);
 await page.getByRole('combobox').fill('Elian');await page.getByRole('combobox').press('Enter');
 assert(await page.getByText('Selected:',{exact:false}).isVisible());
 assert.equal(await page.getByRole('combobox').evaluate(e=>document.activeElement===e),true);
 await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('dialog').waitFor({state:'hidden'});
 const original=await page.locator('.ProseMirror').innerHTML();
 await page.getByRole('button',{name:'Link Story Bible element',exact:true}).click();await page.getByRole('combobox',{name:'Search entries',exact:true}).waitFor();
 assert.match(await page.getByRole('listbox').getByRole('option').first().innerText(),/^Mara Vale/);
 await page.getByRole('combobox').fill('Archived fictional');assert.equal(await page.getByRole('listbox').getByRole('option').count(),0);
 await page.getByRole('combobox').fill('Elian');await page.getByRole('combobox').press('ArrowDown');
 await page.getByRole('combobox').press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
 assert.equal(await page.locator('.ProseMirror').innerHTML(),original);
 await page.goto(`${base}/project/1/story-bible?entry=1`);
 await page.getByRole('tab',{name:'Connections',exact:true}).click();
 await page.getByRole('button',{name:'Add link',exact:true}).first().click();
 const relationship=page.getByRole('dialog',{name:'Add relationship',exact:true});
 assert.equal(await relationship.getByRole('option').filter({hasText:'Archived fictional'}).count(),0);
 assert.equal(await relationship.getByRole('option').filter({hasText:'Mara Vale'}).count(),0);
 await relationship.getByRole('combobox',{name:'Search entries'}).press('Enter');
 assert(await relationship.getByText('Selected:',{exact:false}).isVisible());
 assert.equal(await relationship.getByRole('combobox',{name:'Search entries'}).evaluate(e=>document.activeElement===e),true);
 await relationship.getByRole('button',{name:'Close — keep draft',exact:true}).click();
 results.push({engine,label:'shared-scene-inline-relationship-pickers',passed:true});
 await desktop.close();await browser.close();
}
await writeFile(path.join(out,'browser-results.json'),JSON.stringify(results,null,2));
await api.dispose();console.log(JSON.stringify(results.map(({engine,label,entries,passed})=>({engine,label,entries,passed})),null,2));

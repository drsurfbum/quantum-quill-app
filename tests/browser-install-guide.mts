// Real browser verification and reproducible screenshot asset, fictional memory-only data.
// QQ_CAPTURE_GUIDE_FIXTURE=1 intentionally refreshes the tracked public illustration source.
import assert from 'node:assert/strict';
import express from 'express';
import session from 'express-session';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdir,readFile,writeFile,mkdtemp,rm } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { tmpdir } from 'node:os';
import { createApp } from '../server/app';
import { MemStorage } from '../server/storage';
const { chromium }=await import(process.env.QQ_PLAYWRIGHT_MODULE || 'playwright');
const storage=new MemStorage();(storage.sessionStore as any).stopInterval?.();storage.sessionStore=new session.MemoryStore();
const app=createApp({storage,secret:'fictional-ipad-guide-test-only-secret-123'});
app.use(express.static(resolve('client/public')));app.use(express.static(resolve('dist/public')));app.get('*',(_req,res)=>res.sendFile(resolve('dist/public/index.html')));
const server=createServer(app);server.listen(0,'127.0.0.1');await once(server,'listening');const origin=`http://127.0.0.1:${(server.address() as any).port}`;
const browser=await chromium.launch({headless:true,args:['--disable-gpu'],...(process.env.QQ_CHROME_PATH?{executablePath:process.env.QQ_CHROME_PATH}:{})});
const context=await browser.newContext({viewport:{width:1024,height:700}}),writer=await context.newPage();writer.setDefaultTimeout(10000);
context.setDefaultTimeout(10000);context.setDefaultNavigationTimeout(10000);
const out=resolve('.local/ipad-guide-review');await mkdir(out,{recursive:true});
const errors:string[]=[];writer.on('pageerror',(e:any)=>errors.push(e.message));
try{
 const r=await context.request.post(origin+'/api/register',{data:{username:'demo-writer',email:'writer@example.test',password:'fictional-ipad-fixture-only'}});assert.equal(r.status(),201);const user=await r.json();
 const project=await storage.createProject({userId:user.id,title:'The Lantern Coast',description:'An original fictional story used only for this guide.'});
 const chapter=await storage.createChapter({projectId:project.id,title:'A light on the water',writingMode:'scenes',order:0});
 const scene=await storage.createScene({projectId:project.id,chapterId:chapter.id,title:'The missing chart',order:0,summary:'Mara discovers that the chart of her home island has disappeared.',content:'<p>Mara set her lantern beside the empty frame. Rain tapped the blue glass overhead.</p><p>Beyond the window, the harbor was disappearing into fog. She remembered an island that no longer appeared on any map.</p><p>Someone had left a single word on the table: <em>Remember.</em></p>'});
 await writer.addInitScript(`localStorage.setItem('quantum-quill:interface-tour:${user.id}',JSON.stringify({versions:{1:'dismissed'}}))`);
 await writer.goto(`${origin}/project/${project.id}/write?chapter=${chapter.id}&scene=${scene.id}`);
 await writer.locator('.ProseMirror').filter({hasText:'Mara set her lantern'}).waitFor();await writer.evaluate(()=>document.fonts.ready);
 if(process.env.QQ_CAPTURE_GUIDE_FIXTURE==='1'){
  await mkdir(resolve('client/public/help-assets'),{recursive:true});
  await writer.screenshot({animations:'disabled',path:resolve('client/public/help-assets/ipad-qq-workspace.png')});
 }
 const asset=await readFile('client/public/help-assets/ipad-qq-workspace.png');assert.equal(asset.readUInt32BE(16),1024);assert.equal(asset.readUInt32BE(20),700);
 // Help opens separately, preserving the original editor and its content.
 await writer.getByRole('button',{name:'Help',exact:true}).click();const popupPromise=writer.waitForEvent('popup');await writer.getByRole('menuitem',{name:'Add QQ to your Home Screen',exact:false}).click();const popup=await popupPromise;await popup.waitForURL(origin+'/help/install');await popup.getByRole('heading',{level:1}).waitFor();assert(writer.url().includes('/write'));assert.equal((await storage.getScene(scene.id))!.content,scene.content);await popup.close();
 // The public guide is reachable before login and opens the current app origin.
 const guest=await browser.newContext({viewport:{width:1440,height:1100}}),page=await guest.newPage();guest.setDefaultTimeout(10000);guest.setDefaultNavigationTimeout(10000);page.setDefaultTimeout(10000);page.on('pageerror',(e:any)=>errors.push(e.message));
 await page.goto(origin+'/auth');await page.getByRole('link',{name:'Add QQ to your Home Screen',exact:true}).click();await page.waitForURL(origin+'/help/install');await page.getByRole('heading',{level:1}).waitFor();assert.equal(await page.locator('#ipad .ipad-instructions').getByRole('list').count(),1);assert.equal(await page.locator('#ipad .ipad-instructions').getByRole('listitem').count(),5);assert.equal(await page.getByRole('button',{name:/Show step /}).count(),5);
 const open=page.locator('#ipad').getByRole('link',{name:'Open Quantum Quill',exact:false});assert.equal(await open.getAttribute('href'),'/');assert.equal(await open.getAttribute('target'),'_blank');const destinationPromise=page.waitForEvent('popup');await open.click();const destination=await destinationPromise;await destination.waitForURL(origin+'/auth');
 await destination.close();
 // Use a disposable regular profile: incognito is independently non-installable.
 const profile=await mkdtemp(join(tmpdir(),'qq-installability-'));let installContext:any;let browserCheck:any;
 try{
  installContext=await chromium.launchPersistentContext(profile,{headless:true,args:['--disable-gpu'],...(process.env.QQ_CHROME_PATH?{executablePath:process.env.QQ_CHROME_PATH}:{})});
  const installPage=await installContext.newPage();await installPage.goto(origin+'/auth');const cdp=await installContext.newCDPSession(installPage);await cdp.send('Page.enable');const manifest=await cdp.send('Page.getAppManifest');assert.equal(manifest.url,'');
  let installability:any;try{installability=await cdp.send('Page.getInstallabilityErrors');}catch{installability={unavailable:true};}
  browserCheck={engine:'Desktop Chrome with disposable regular profile, not Android Chrome',manifestUrl:manifest.url,installability,serviceWorkerCount:await installPage.evaluate(async()=>navigator.serviceWorker?(await navigator.serviceWorker.getRegistrations()).length:0)};
  assert.equal(browserCheck.serviceWorkerCount,0);await cdp.detach();
 }finally{await installContext?.close();await rm(profile,{recursive:true,force:true});}

 assert((await page.getByRole('link',{name:'Read Apple’s iPad instructions',exact:false}).getAttribute('href'))?.startsWith('https://support.apple.com/'));
 assert(await page.getByRole('button',{name:'Previous illustration',exact:true}).isDisabled());
 const next=page.getByRole('button',{name:'Next illustration',exact:true});await next.focus();await page.keyboard.press('Enter');assert.equal(await page.getByRole('button',{name:'Show step 2:',exact:false}).getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:'Show step 4:',exact:false}).focus();await page.keyboard.press('Space');assert.equal(await page.getByRole('button',{name:'Show step 4:',exact:false}).getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#ipad .ipad-instructions button[aria-pressed="true"]').count(),1);
 const allSteps=await page.locator('#ipad .ipad-instructions').getByRole('list').innerText();assert(allSteps.includes('Sign in if prompted'));assert(allSteps.includes('More or View More'));
 for(const size of [{name:'desktop',width:1440,height:1100},{name:'ipad-landscape',width:1180,height:820},{name:'ipad-portrait',width:820,height:1180},{name:'narrow',width:390,height:844}]){
  await page.setViewportSize({width:size.width,height:size.height});await page.reload();await page.getByRole('heading',{level:1}).waitFor();await page.evaluate(()=>document.fonts.ready);
  for(let step=1;step<=5;step++){
   await page.getByRole('button',{name:`Show step ${step}:`,exact:false}).click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
   assert.equal(await page.getByRole('button',{name:`Show step ${step}:`,exact:false}).getAttribute('aria-pressed'),'true');
  }
  for(let step=1;step<=5;step++){
   await page.getByRole('button',{name:`Show Android step ${step}:`,exact:false}).click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
   assert.equal(await page.getByRole('button',{name:`Show Android step ${step}:`,exact:false}).getAttribute('aria-pressed'),'true');
  }
  assert(await page.getByRole('button',{name:'Next Android illustration',exact:true}).isDisabled());
  await page.getByRole('button',{name:'Show Android step 3:',exact:false}).click();
  assert(await next.isDisabled());await page.getByRole('button',{name:'Show step 3:',exact:false}).click();await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({animations:'disabled',fullPage:true,path:out+'/'+size.name+'.png'});
  const figure=await page.locator('#ipad').getByRole('figure').boundingBox(),instructions=await page.locator('#ipad .ipad-instructions').boundingBox();assert(figure&&instructions);assert(size.width>950?figure.x<instructions.x:figure.y<instructions.y);
 }
 await page.setViewportSize({width:1440,height:1100});await page.reload();await page.getByRole('heading',{level:1}).waitFor();
 for(const [step,name] of [[1,'safari-workspace'],[4,'add-web-app'],[5,'home-screen']] as const){await page.getByRole('button',{name:`Show step ${step}:`,exact:false}).click();await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({animations:'disabled',fullPage:true,path:out+'/'+name+'.png'});}
 await page.getByRole('button',{name:'Show Android step 2:',exact:false}).focus();await page.keyboard.press('Space');assert.equal(await page.getByRole('button',{name:'Show Android step 2:',exact:false}).getAttribute('aria-pressed'),'true');
 await page.locator('#android').screenshot({animations:'disabled',path:out+'/android-chrome-actions.png'});
 await page.getByRole('button',{name:'Show Android step 3:',exact:false}).click();await page.locator('#android').screenshot({animations:'disabled',path:out+'/android-shortcut-fallback.png'});
 await page.getByRole('link',{name:'iPad · Safari',exact:true}).click();assert(new URL(page.url()).hash==='#ipad');await page.getByRole('link',{name:'Android · Chrome',exact:true}).click();assert(new URL(page.url()).hash==='#android');
 await page.evaluate(()=>window.scrollTo(0,0));await page.evaluate(()=>document.documentElement.classList.add('dark'));await page.screenshot({animations:'disabled',fullPage:true,path:out+'/dark.png'});
 await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'Show step 2:',exact:false}).click();await page.keyboard.press('Tab');assert(await page.evaluate(()=>document.activeElement?.tagName==='BUTTON'||document.activeElement?.tagName==='A'));
 // Instructions remain complete if images fail; illustration has no fake operable controls.
 assert.equal(await page.locator('.ipad-device button,.ipad-device a,.ipad-device input').count(),0);await page.locator('.ipad-qq-screen').first().evaluate((e:any)=>e.style.display='none');assert.equal(await page.locator('#ipad .ipad-instructions').getByRole('listitem').count(),5);
 assert.deepEqual(errors,[]);await writeFile(out+'/verification.json',JSON.stringify({actualBrowserPage:true,fictionalDataOnly:true,physicalIpadInstallTested:false,physicalAndroidInstallTested:false,browserCheck,baseline:'301d05c',checks:['public direct route and reload','iPad and Android anchor navigation','desktop Chrome manifest/installability inspection','conditional Install versus Chrome shortcut instructions','Login navigation','Help opens separate tab without changing manuscript','same-origin app destination','five independent text steps per platform','keyboard Enter/Space and bounds','all steps at desktop/tablet landscape/tablet portrait/narrow widths','no horizontal overflow','responsive stacking','light/dark','reduced motion','image-independent instructions'],pageErrors:errors},null,2));
 console.log('Home Screen guide browser verification passed; ten actual page screenshots saved. Physical iPad/Android installation not tested.');await guest.close();
}finally{await browser.close();const closed=once(server,'close');server.close();server.closeAllConnections();await closed;}

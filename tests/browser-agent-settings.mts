// Optional real-browser verification. Uses only a disposable fictional account.
// QQ_PLAYWRIGHT_MODULE may point to an external Playwright installation.
import assert from 'node:assert/strict';
import express from 'express';
import session from 'express-session';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createApp } from '../server/app';
import { MemStorage } from '../server/storage';
const { chromium }=await import(process.env.QQ_PLAYWRIGHT_MODULE || 'playwright');
const storage=new MemStorage();(storage.sessionStore as any).stopInterval?.();storage.sessionStore=new session.MemoryStore();
const app=createApp({storage,secret:'fictional-browser-test-secret-only-123'});
app.use(express.static(resolve('dist/public')));app.get('*',(_req,res)=>res.sendFile(resolve('dist/public/index.html')));
const server=createServer(app);server.listen(0,'127.0.0.1');await once(server,'listening');
const origin=`http://127.0.0.1:${(server.address() as any).port}`;
const browser=await chromium.launch({headless:true,args:["--disable-gpu"],...(process.env.QQ_CHROME_PATH?{executablePath:process.env.QQ_CHROME_PATH}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage();
page.setDefaultTimeout(10000);
const errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));
const out=resolve('.local/agent-settings-review');await mkdir(out,{recursive:true});
try {
 const r=await context.request.post(origin+'/api/register',{data:{username:'fictional-review-writer',email:'writer@example.test',password:'fictional-browser-password'}});assert.equal(r.status(),201);const user=await r.json();
 await storage.createProject({userId:user.id,title:'The Lantern Observatory',description:'Fictional review project'});
 await storage.createProject({userId:user.id,title:'The Glass Orchard',description:'Fictional second project'});
 await page.goto(origin);await page.getByRole('button',{name:'Settings',exact:true}).first().click();
 const dialog=page.getByRole('dialog'),panel=page.getByRole('tabpanel',{name:'Agents'});
 await page.getByRole('switch',{name:'Let agents access my projects'}).waitFor();
 await page.getByRole('switch',{name:'Let agents access my projects'}).click();
 await page.getByRole('checkbox',{name:'The Lantern Observatory'}).click();
 await page.getByRole('switch',{name:'Allow agents to create and edit'}).click();
 await page.getByRole('switch',{name:'Allow manuscript access'}).click();
 await page.getByRole('button',{name:'Save permissions',exact:true}).click();
 await page.getByText('Permissions saved. Subsequent agent operations use these settings.',{exact:true}).waitFor();
 let settings=await (await context.request.get(origin+'/api/agent-settings')).json();assert.equal(settings.allowWrites,true);assert.equal(settings.allowManuscript,true);assert.equal(settings.projectIds.length,1);
 await panel.evaluate((e:any)=>e.scrollTop=0);await page.screenshot({animations:'disabled',path:out+'/01-selected-project-permissions.png'});
 await page.getByRole('radio',{name:'All my current and future projects'}).click();
 await page.getByRole('button',{name:'Save permissions',exact:true}).click();await page.getByText('Permissions saved. Subsequent agent operations use these settings.',{exact:true}).waitFor();
 await panel.evaluate((e:any)=>e.scrollTop=0);await page.screenshot({animations:'disabled',path:out+'/02-all-projects-permissions.png'});
 await page.getByRole('button',{name:'Create key',exact:true}).click();await page.getByLabel('New key — store privately now').waitFor();assert.equal(await page.getByLabel('New key — store privately now').getAttribute('type'),'password');
 await page.getByLabel('New key — store privately now').scrollIntoViewIfNeeded();await page.screenshot({animations:'disabled',path:out+'/03-masked-key-management.png'});
 // The copy template must not contain the usable key.
 await page.getByLabel('Assistant client').selectOption('codex');await page.getByText('Show configuration',{exact:true}).click();const config=await page.getByLabel('Client configuration without secret').innerText();assert(!/qqmcp_[0-9]+_/.test(config));
 await page.evaluate("Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new Error('test denial'))},configurable:true})");
 await page.getByRole('button',{name:'Copy setup'}).click();await page.getByRole('alert').filter({hasText:'Clipboard access failed'}).waitFor();
 await page.getByRole('button',{name:'Close',exact:true}).last().click();await page.getByRole('button',{name:'Settings',exact:true}).first().click();await page.getByRole('button',{name:'Replace key',exact:true}).waitFor();assert.equal(await page.getByLabel('New key — store privately now').count(),0);
 await page.getByRole('tab',{name:'Appearance',exact:true}).click();
 // Exercise the app's native theme switch.
 await page.getByRole('switch',{name:'Toggle theme'}).click();
 await page.getByRole('tab',{name:'Agents',exact:true}).click();await panel.evaluate((e:any)=>e.scrollTop=0);await page.screenshot({animations:'disabled',path:out+'/04-dark-all-projects.png'});
 await page.setViewportSize({width:390,height:844});await page.reload();await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.getByRole('button',{name:'Settings',exact:true}).first().click();await page.getByRole('button',{name:'Replace key',exact:true}).waitFor();await panel.evaluate((e:any)=>e.scrollTop=0);await page.screenshot({animations:'disabled',path:out+'/05-narrow-permissions.png'});
 assert.equal(await dialog.count(),1);assert(await dialog.evaluate((e:any)=>e.scrollWidth<=e.clientWidth));
 const box=await dialog.boundingBox();assert(box.y>=0 && box.y+box.height<=844);
 // Native dialog keeps keyboard focus inside while cycling forward.
 await page.keyboard.press('Tab');assert(await dialog.evaluate((e:any)=>e.contains(document.activeElement)));
 await page.getByRole('button',{name:'Revoke key & disable'}).click();await page.getByText('Key revoked and agent access disabled.',{exact:true}).waitFor();
 settings=await(await context.request.get(origin+'/api/agent-settings')).json();assert.equal(settings.hasKey,false);assert.equal(settings.enabled,false);
 await page.setViewportSize({width:1440,height:1100});await page.evaluate(()=>document.documentElement.classList.remove('dark'));await panel.evaluate((e:any)=>e.scrollTop=0);await page.screenshot({animations:'disabled',path:out+'/06-revoked-access.png'});
 assert.deepEqual(errors,[]);await writeFile(out+'/verification.json',JSON.stringify({fictionalDataOnly:true,actualApp:true,checks:['selected scope saved','all scope saved','writes and manuscript enabled separately','masked single-display key','secret-free configuration','clipboard failure feedback','persisted settings reopened','dark and light','390px layout','dialog keyboard focus','key revocation and disabling'],pageErrors:errors},null,2));
 console.log('Browser Settings verification passed; six real app screenshots saved in .local/agent-settings-review.');
}finally{await browser.close();const closed=once(server,'close');server.close();server.closeAllConnections();await closed;}

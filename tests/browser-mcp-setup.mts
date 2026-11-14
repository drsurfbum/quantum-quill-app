// Actual browser UI, disposable fictional projects; no external client configuration.
import assert from 'node:assert/strict';
import express from 'express';
import session from 'express-session';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import JSZip from 'jszip';
import { createApp } from '../server/app';
import { MemStorage } from '../server/storage';
const { chromium }=await import(process.env.QQ_PLAYWRIGHT_MODULE || 'playwright');
const storage=new MemStorage();(storage.sessionStore as any).stopInterval?.();storage.sessionStore=new session.MemoryStore();
const app=createApp({storage,secret:'fictional-browser-setup-test-only-123'});
app.use(express.static(resolve('dist/public')));app.get('*',(_req,res)=>res.sendFile(resolve('dist/public/index.html')));
const server=createServer(app);server.listen(0,'127.0.0.1');await once(server,'listening');const origin=`http://127.0.0.1:${(server.address() as any).port}`;
const browser=await chromium.launch({headless:true,args:['--disable-gpu'],...(process.env.QQ_CHROME_PATH?{executablePath:process.env.QQ_CHROME_PATH}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage();page.setDefaultTimeout(10000);
const errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));
const out=resolve('.local/mcp-setup-review');await mkdir(out,{recursive:true});
async function shot(name:string){await page.screenshot({animations:'disabled',path:out+'/'+name+'.png'});}
try{
 const r=await context.request.post(origin+'/api/register',{data:{username:'fictional-setup-writer',email:'setup@example.test',password:'fictional-browser-password'}});assert.equal(r.status(),201);const user=await r.json();
 await storage.createProject({userId:user.id,title:'The Lantern Observatory',description:'Fictional review project'});await storage.createProject({userId:user.id,title:'The Glass Orchard',description:'Fictional second project'});
 await page.goto(origin);await page.getByRole('button',{name:'Settings',exact:true}).first().click();
 const panel=page.getByRole('tabpanel',{name:'Agents'}),dialog=page.getByRole('dialog');
 await page.getByRole('switch',{name:'Let agents access my projects'}).waitFor();assert.equal(await page.getByRole('switch',{name:'Allow agents to create and edit'}).getAttribute('aria-checked'),'false');assert.equal(await page.getByRole('switch',{name:'Allow manuscript access'}).getAttribute('aria-checked'),'false');
 await page.getByRole('switch',{name:'Let agents access my projects'}).click();await page.getByRole('checkbox',{name:'The Lantern Observatory'}).click();await page.getByRole('button',{name:'Save permissions',exact:true}).click();await page.getByText('Permissions saved. Subsequent agent operations use these settings.',{exact:true}).waitFor();
 await panel.evaluate((e:any)=>e.scrollTop=0);await shot('01-narrow-scope-read-only');
 await page.getByRole('button',{name:'Create key',exact:true}).click();await page.getByLabel('New key — store privately now').waitFor();const key=await page.getByLabel('New key — store privately now').inputValue();assert.equal(await page.getByLabel('New key — store privately now').getAttribute('type'),'password');
 await page.getByRole('button',{name:'Test local setup',exact:true}).click();await page.getByRole('status').filter({hasText:'Local test passed: 19 tools available.'}).waitFor();
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download Claude extension',exact:true}).click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'quantum-quill.mcpb');const zip=await JSZip.loadAsync(await readFile(await download.path()));assert(!((await zip.file('manifest.json')!.async('string')).includes(key)));
 const guidePromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download field guide (.md)',exact:true}).click();const guide=await guidePromise;assert.equal(guide.suggestedFilename(),'QQ_FIELD_GUIDE.md');assert.equal(await readFile(await guide.path(),'utf8'),await readFile('docs/QQ_FIELD_GUIDE.md','utf8'));
 await page.getByRole('button',{name:'Test local setup',exact:true}).click();await page.getByRole('status').filter({hasText:'Local test passed: 19 tools available.'}).waitFor();
 await page.getByRole('heading',{name:'Connect your assistant',exact:true}).evaluate((e:any)=>e.scrollIntoView({block:'start'}));await shot('02-claude-extension-and-local-test');await page.getByRole('status').filter({hasText:'Local test passed: 19 tools available.'}).scrollIntoViewIfNeeded();await shot('09-successful-local-test');
 await page.getByLabel('Assistant client').selectOption('codex');
 await page.evaluate("Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.__qqCopied=text}},configurable:true})");
 await page.getByRole('button',{name:'Copy setup',exact:true}).click();const copied=await page.evaluate('window.__qqCopied');assert(copied.includes('<PASTE_KEY_PRIVATELY_HERE>'));assert(!copied.includes(key));assert(copied.includes('default_tools_approval_mode = "prompt"'));
 await page.getByRole('heading',{name:'Connect your assistant',exact:true}).evaluate((e:any)=>e.scrollIntoView({block:'start'}));await shot('03-codex-copy-setup');
 await page.getByLabel('Assistant client').selectOption('codex-env');await page.getByRole('button',{name:'Copy setup',exact:true}).click();assert((await page.evaluate('window.__qqCopied')).includes('env_vars = ["QQ_MCP_TOKEN"]'));await page.getByRole('heading',{name:'Connect your assistant',exact:true}).evaluate((e:any)=>e.scrollIntoView({block:'start'}));await shot('04-codex-environment-option');
 await page.evaluate("Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new Error('fixture denial'))},configurable:true})");await page.getByRole('button',{name:'Copy setup',exact:true}).click();await page.getByRole('alert').filter({hasText:'Clipboard access failed'}).waitFor();
 await page.getByRole('radio',{name:'All my current and future projects'}).click();await page.getByRole('switch',{name:'Allow agents to create and edit'}).click();await page.getByRole('switch',{name:'Allow manuscript access'}).click();assert(await page.getByRole('button',{name:'Test local setup',exact:true}).isDisabled());await page.getByRole('button',{name:'Save permissions',exact:true}).click();await page.getByText('Permissions saved. Subsequent agent operations use these settings.',{exact:true}).waitFor();await panel.evaluate((e:any)=>e.scrollTop=0);await shot('05-all-projects-edit-manuscript');
 await page.getByRole('button',{name:'Revoke key & disable',exact:true}).click();await page.getByText('Key revoked and agent access disabled.',{exact:true}).waitFor();await page.getByLabel('Current connection key (used once)').fill(key);await page.getByRole('button',{name:'Test local setup',exact:true}).click();await page.getByRole('alert').filter({hasText:'key is missing, replaced or revoked'}).waitFor();assert.equal(await page.getByLabel('Current connection key (used once)').inputValue(),'');assert.equal(await dialog.count(),1);await page.getByRole('heading',{name:'Connect your assistant',exact:true}).evaluate((e:any)=>e.scrollIntoView({block:'start'}));await page.getByRole('alert').filter({hasText:'key is missing, replaced or revoked'}).scrollIntoViewIfNeeded();await shot('06-revoked-key-test');
 await page.getByRole('tab',{name:'Appearance',exact:true}).click();await page.getByRole('switch',{name:'Toggle theme'}).click();await page.getByRole('tab',{name:'Agents',exact:true}).click();await page.getByLabel('Assistant client').selectOption('claude');await page.getByRole('heading',{name:'Connect your assistant',exact:true}).evaluate((e:any)=>e.scrollIntoView({block:'start'}));await shot('07-dark-connection-setup');
 await page.setViewportSize({width:390,height:844});await page.reload();await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.getByRole('button',{name:'Settings',exact:true}).first().click();await page.getByLabel('Assistant client').waitFor();await page.getByRole('heading',{name:'Connect your assistant',exact:true}).evaluate((e:any)=>e.scrollIntoView({block:'start'}));await shot('08-narrow-connection-setup');assert(await dialog.evaluate((e:any)=>e.scrollWidth<=e.clientWidth));await page.keyboard.press('Tab');assert(await dialog.evaluate((e:any)=>e.contains(document.activeElement)));
 assert.deepEqual(errors,[]);await writeFile(out+'/verification.json',JSON.stringify({actualApp:true,fictionalDataOnly:true,tests:['narrow read-only defaults','real local MCP handshake and read','actual extension download','canonical Markdown download','Codex copy without key','environment-key alternative','clipboard failure','unsaved permissions block test','all scope and separate write/manuscript switches','revoked key fails without logging out','dark and narrow layouts','dialog keyboard focus'],pageErrors:errors,externalClientsInstalled:false},null,2));console.log('Setup browser verification passed; nine actual UI screenshots saved.');
}finally{await browser.close();const closed=once(server,'close');server.close();server.closeAllConnections();await closed;}

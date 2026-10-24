// Real Chromium + the loopback-only disposable fixture. Never reads .env or a DB.
// CI installs pinned Playwright only in its disposable runner, outside the lockfile.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:5063';
const artifacts = 'artifacts/qq14';
await mkdir(artifacts, { recursive: true });
const server = spawn(process.execPath, ['--import', 'tsx', 'tests/showcase-server.ts'], {
  env: { ...process.env, NODE_ENV: 'test', QQ_DEMO_GUIDANCE: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '', browser, page;
server.stdout.on('data', chunk => output += chunk);
server.stderr.on('data', chunk => output += chunk);
const checks = [], errors = [];
let writes = 0;
const record = text => { checks.push(text); console.log(text); };
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(`Fixture exited: ${output}`);
    try { if ((await fetch(`${base}/healthz`)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'Synthetic fixture starts');
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
  page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (['POST','PUT','DELETE'].includes(request.method()) && request.url().includes('/api/')) writes++; });
  await page.goto(`${base}/auth`);
  await page.getByLabel('Username', { exact: true }).fill('demo-writer');
  await page.getByLabel('Password', { exact: true }).fill('synthetic-showcase-only');
  await page.getByRole('button', { name: /^(Login|Sign in|Log in)$/i }).click();
  await page.waitForURL(url => !url.pathname.startsWith('/auth'));
  await page.goto(`${base}/project/1/story-bible`);

  const getEntry = async id => {
    const response = await context.request.get(`${base}/api/story-bible/${id}`);
    assert.equal(response.status(), 200); return response.json();
  };
  const saved = async () => {
    await page.locator('.bible-entry-workspace > div').first().getByRole('status').filter({ hasText: /^Saved$/ }).waitFor();
  };
  const group = key => page.locator(`[data-bible-group="${key}"] > h3 > button`);
  const openGroup = async key => { if (await group(key).getAttribute('aria-expanded') === 'false') await group(key).click(); };
  const screenshot = async name => page.screenshot({ path: `${artifacts}/${name}.png` });
  const cases = [
    ['characters','Identity & role','basicInfo','#age','metadata','age'],
    ['groups_races','Group at a glance','basicInfo','#tagline','metadata','tagline'],
    ['locations','Place at a glance','coreInfo','#tagline','metadata','tagline'],
    ['events','What happened','coreSummary','#shortSummary','content','shortSummary'],
    ['world_elements','Element at a glance','coreOverview','#shortNotes','content','shortNotes'],
    ['details','The note or idea','content','#content','content','content'],
    ['research','Source & takeaway','coreInfo','#shortSummary','content','shortSummary'],
  ];
  for (const [type,,key,selector,bucket,field] of cases) {
    await page.getByRole('button', { name: 'New entry', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Entry type', { exact: true }).selectOption(type);
    assert.ok(await dialog.getByText('For example:', { exact: false }).isVisible());
    if (type === 'details') await screenshot('01-choose-a-type');
    await dialog.getByRole('textbox', { name: /Name/ }).fill(`A partial ${type} idea`);
    await dialog.getByRole('button', { name: 'Create entry', exact: true }).click();
    await page.getByRole('heading', { level: 1, name: `A partial ${type} idea` }).waitFor();
    const id = Number(new URL(page.url()).searchParams.get('entry'));
    assert.equal((await getEntry(id)).content, '', 'Creation never saves guidance or example defaults');
    await openGroup(key);
    const input = page.locator(selector);
    const node = await input.elementHandle();
    await input.fill(`An unfinished ${type} fact`);
    await group(key).focus(); await group(key).press('Enter');
    assert.equal(await group(key).getAttribute('aria-expanded'), 'false');
    await page.getByRole('button', { name: 'Hide guidance', exact: true }).click();
    await page.getByRole('tab', { name: 'Overview', exact: true }).click();
    await page.getByRole('tab', { name: 'Connections', exact: true }).click();
    await page.getByRole('tab', { name: 'Develop', exact: true }).click();
    await group(key).focus(); await group(key).press('Space');
    assert.equal(await group(key).getAttribute('aria-expanded'), 'true');
    assert.ok(await node.evaluate(element => element.isConnected), 'Disclosure and tabs retain the same editor node');
    assert.equal(await input.inputValue(), `An unfinished ${type} fact`);
    await saved();
    const persisted = await getEntry(id);
    assert.equal((bucket === 'content' ? JSON.parse(persisted.content) : persisted.metadata)[field], `An unfinished ${type} fact`);
    await page.reload();
    await page.getByRole('tab', { name: 'Develop', exact: true }).click();
    await openGroup(key);
    assert.equal(await page.locator(selector).inputValue(), `An unfinished ${type} fact`);
    await page.getByRole('button', { name: 'Library', exact: true }).click();
    record(`${type}: type guidance, name-only creation, partial edit, keyboard disclosure, tabs and reload`);
  }

  // Populate an existing imported entry without rewriting its prose or originals.
  await page.getByRole('button', { name: 'Open Mara Vale', exact: true }).click();
  const original = await getEntry(1);
  await page.getByRole('tab', { name: 'Develop', exact: true }).click();
  await openGroup('personality');
  await page.locator('#characters-motivations-help').getByText('Show an example', { exact: true }).click();
  const before = writes;
  await page.getByRole('button', { name: 'Hide guidance', exact: true }).click();
  await page.getByRole('button', { name: 'Show guidance', exact: true }).click();
  await screenshot('02-develop-character');
  await page.getByRole('tab', { name: 'Source', exact: true }).click();
  await page.getByText('Complete original page', { exact: true }).click();
  assert.ok((await page.getByRole('tabpanel').filter({ visible: true }).innerText()).includes('Preserve this exact original.'));
  await screenshot('03-original-source');
  assert.equal(writes, before, 'Guidance, examples and tabs are read-only');
  await page.getByRole('tab', { name: 'Develop', exact: true }).click();
  await page.locator('#motivations').fill('Find her brother before the last tide.'); await saved();
  const changed = await getEntry(1);
  assert.equal(changed.content, original.content);
  assert.deepEqual(changed.metadata._notionImport, original.metadata._notionImport);
  assert.deepEqual(changed.metadata.qq14Unknown, original.metadata.qq14Unknown);
  record('Existing imported entry: guidance is read-only; prose, unknown nested values and original source retained');

  // Every existing type receives a UI edit while its entire unknown payload survives.
  const existing = [['groups_races',7,'#tagline','metadata'],['locations',4,'#tagline','metadata'],['events',9,'#shortSummary','content'],['world_elements',8,'#shortNotes','content'],['details',10,'#content','content'],['research',11,'#shortSummary','content']];
  for (const [type,id,selector,bucket] of existing) {
    await page.getByRole('button', { name: 'Library', exact: true }).click();
    const initial = await getEntry(id);
    await page.getByRole('button', { name: `Open ${initial.title}`, exact: true }).click();
    await page.getByRole('tab', { name: 'Develop', exact: true }).click();
    const key = cases.find(row => row[0] === type)[2]; await openGroup(key);
    await page.locator(selector).fill(`Synthetic developed ${type}`); await saved();
    const result = await getEntry(id);
    assert.deepEqual(result.metadata.qq14Unknown, initial.metadata.qq14Unknown);
    if (bucket === 'content') assert.deepEqual(JSON.parse(result.content).qq14Unknown, JSON.parse(initial.content).qq14Unknown);
    else assert.equal(result.content, initial.content);
    record(`${type}: existing nested/legacy values retained through UI save`);
  }

  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await page.getByRole('button', { name: 'Open Mara Vale', exact: true }).click();
  await page.getByRole('tab', { name: 'Connections', exact: true }).click();
  await page.getByText('Ideas for connections (optional)', { exact: true }).click();
  const beforeConnection = writes;
  await page.getByRole('button', { name: 'Add an affiliation', exact: true }).click();
  const linkDialog = page.getByRole('dialog');
  assert.equal(await linkDialog.getByLabel('Relationship type', { exact: true }).inputValue(), 'affiliation');
  assert.ok(await linkDialog.getByRole('button', { name: 'Add relationship', exact: true }).isDisabled());
  assert.equal(writes, beforeConnection);
  await screenshot('04-optional-connection-picker');
  await linkDialog.getByLabel('Search entries', { exact: true }).fill('A partial groups_races idea');
  await linkDialog.getByRole('option', { name: /A partial groups_races idea/ }).click();
  await linkDialog.getByLabel('Context', { exact: true }).fill('An explicitly selected companion.');
  await linkDialog.getByRole('button', { name: 'Add relationship', exact: true }).click();
  await linkDialog.waitFor({ state: 'hidden' });
  assert.ok((await page.getByRole('region', { name: 'Story Bible content' }).innerText()).includes('An explicitly selected companion.'));
  await page.reload();
  await page.getByRole('tab', { name: 'Connections', exact: true }).click();
  await page.getByText('An explicitly selected companion.', { exact: true }).waitFor();
  record('Optional suggestion uses shared picker; no target/write until explicit selection and save; link survives reload');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('tab', { name: 'Develop', exact: true }).click();
  await openGroup('basicInfo');
  await page.locator('#age').fill('30'); await saved();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'No horizontal page overflow at 390px');
  await screenshot('05-compact-develop');
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await page.getByRole('button', { name: 'New entry', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Entry type', { exact: true }).selectOption('research');
  await screenshot('06-compact-creation');
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  record('Compact viewport: bounded scrolling, labels, save indicator and creation dialog');
  assert.deepEqual(errors, []);
  await writeFile(`${artifacts}/receipt.json`, JSON.stringify({ fixture: 'The Lantern Coast; in-memory synthetic only', checks, consoleErrors: errors, browser: await browser.version(), viewport: [1440,1000], compactViewport: [390,844] }, null, 2));
} catch (error) {
  if (page) await page.screenshot({ path: `${artifacts}/failure.png` }).catch(() => {});
  await writeFile(`${artifacts}/failure.txt`, `${error.stack}\n\n${output}`);
  throw error;
} finally {
  await browser?.close();
  if (server.exitCode === null) { const exited = once(server, 'exit'); server.kill('SIGTERM'); await exited; }
}

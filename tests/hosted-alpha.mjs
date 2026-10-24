// Only creates/drops random qq_alpha_test_* databases. Never reads a recovery dump.
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, cp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import pg from 'pg';
import { initializeAlphaDatabase } from '../scripts/init-alpha-db.mjs';
import { migrateFeedback } from '../scripts/migrate-feedback.mjs';

const adminURL = process.env.QQ_TEST_PG_ADMIN_URL;
if (!adminURL) throw new Error('Set QQ_TEST_PG_ADMIN_URL to a disposable PostgreSQL test server');
const admin = new pg.Client({ connectionString: adminURL });
const names = ['fresh', 'restore', 'refuse'].map(kind => `qq_alpha_test_${kind}_${randomUUID().replaceAll('-', '')}`);
const urls = names.map(name => { const u = new URL(adminURL); u.pathname = `/${name}`; return u.href; });
const temp = await mkdtemp(path.join(os.tmpdir(), 'qq-alpha-rehearsal-'));
const secret = randomBytes(32).toString('hex');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nN0AAAAASUVORK5CYII=', 'base64');
let child, port;
async function stop() {
  if (child && child.exitCode === null) { const exited = once(child, 'exit'); child.kill('SIGTERM'); await exited; }
  child = undefined;
}
async function start(url, uploads) {
  // Obtain an available loopback port, then start the real compiled production server.
  const { createServer } = await import('node:net');
  const probe = createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  child = spawn(process.execPath, ['dist/index.js'], { env: { ...process.env, NODE_ENV: 'production', HOST: '127.0.0.1', PORT: String(port), DATABASE_URL: url, SESSION_SECRET: secret, UPLOAD_DIR: uploads, QQ_FEEDBACK_ADMIN_USER_IDS: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; child.stdout.on('data', chunk => output += chunk); child.stderr.on('data', chunk => output += chunk);
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`Production server exited: ${output}`);
    try { if ((await fetch(`http://127.0.0.1:${port}/healthz`)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Production startup timed out: ${output}`);
}
function writer() {
  let cookie = '';
  return async (method, route, data, status = 200, extra = {}) => {
    const headers = { 'X-Forwarded-Proto': 'https', ...extra };
    if (cookie) headers.Cookie = cookie;
    const multipart = data instanceof FormData;
    if (data !== undefined && !multipart) headers['Content-Type'] = 'application/json';
    const response = await fetch(`http://127.0.0.1:${port}${route}`, { method, headers, body: data === undefined ? undefined : multipart ? data : JSON.stringify(data) });
    const setCookie = response.headers.getSetCookie();
    if (setCookie.length) {
      assert.match(setCookie[0], /HttpOnly/); assert.match(setCookie[0], /Secure/); assert.match(setCookie[0], /SameSite=Lax/);
      cookie = setCookie[0].split(';')[0];
    }
    assert.equal(response.status, status, `${method} ${route}: ${await response.clone().text()}`);
    return response;
  };
}
const json = async response => (await response).json();
const fingerprints = async url => {
  const db = new pg.Client({ connectionString: url }); await db.connect();
  try {
    const tables = (await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
    const result = {};
    for (const { tablename } of tables) {
      assert.match(tablename, /^[a-z_]+$/);
      result[tablename] = (await db.query(`SELECT count(*)::int count, md5(coalesce(string_agg(to_jsonb(t)::text, ',' ORDER BY to_jsonb(t)::text), '')) hash FROM "${tablename}" t`)).rows[0];
    }
    return result;
  } finally { await db.end(); }
};
await admin.connect();
try {
  for (const name of names) { assert.match(name, /^qq_alpha_test_[a-z]+_[a-f0-9]{32}$/); await admin.query(`CREATE DATABASE "${name}"`); }
  await assert.rejects(() => initializeAlphaDatabase(urls[0], undefined), /configuration/);
  const init = await Promise.all([initializeAlphaDatabase(urls[0], 'fresh-alpha'), initializeAlphaDatabase(urls[0], 'fresh-alpha')]);
  assert.deepEqual(init.sort(), ['already-initialized', 'initialized']);
  assert.deepEqual((await Promise.all([migrateFeedback(urls[0], 'fresh-alpha'),migrateFeedback(urls[0], 'fresh-alpha')])).sort(), ['already-applied','applied']);
  const existing = new pg.Client({ connectionString: urls[2] }); await existing.connect();
  await existing.query("CREATE TABLE original (prose text); INSERT INTO original VALUES ('Untouched writing Ω')");
  await assert.rejects(() => initializeAlphaDatabase(urls[2], 'fresh-alpha'), /not empty/);
  await assert.rejects(() => migrateFeedback(urls[2], 'fresh-alpha'), /Not an initialized/);
  assert.deepEqual((await existing.query('SELECT * FROM original')).rows, [{ prose: 'Untouched writing Ω' }]); await existing.end();
  const uploads = path.join(temp, 'uploads'); await mkdir(uploads);
  await start(urls[0], uploads);
  const a = writer(), b = writer();
  const credentials = { username: 'alpha-test-writer', password: 'synthetic-only-password', email: 'writer@example.test' };
  await a('POST', '/api/register', credentials, 201);
  await b('POST', '/api/register', { ...credentials, username: 'other-alpha-writer' }, 201);
  const feedbackInput={requestId:randomUUID(),category:'bug',summary:'Synthetic alpha feedback',details:'This is a test of the private feedback process.',area:'Write',device:'',allowContact:false};
  const feedback=await json(a('POST','/api/feedback',feedbackInput,201));
  assert.deepEqual(await json(a('POST','/api/feedback',feedbackInput,201)),feedback);
  assert.deepEqual(await json(b('GET','/api/feedback')),[]);
  await b('GET','/api/admin/feedback',undefined,403);
  const inbox=await json(a('GET','/api/admin/feedback?status=received&q=private'));
  assert.equal(inbox.reports[0].id,feedback.id);
  assert.equal(inbox.reports[0].details,undefined);
  const detail=await json(a('GET',`/api/admin/feedback/${feedback.id}`));
  assert.equal(detail.reporter.email,null);
  await a('PATCH',`/api/admin/feedback/${feedback.id}`,{status:'reviewing',expectedStatus:'received'});
  await a('PATCH',`/api/admin/feedback/${feedback.id}`,{status:'resolved',expectedStatus:'received'},409);
  assert.equal((await json(a('GET','/api/feedback')))[0].status,'reviewing');
  const project = await json(a('POST', '/api/project-setup', { requestId: randomUUID(), title: 'Fresh alpha story', settings: {} }, 201));
  const scene = await json(a('POST', `/api/projects/${project.id}/scenes`, { requestId: randomUUID(), chapterTitle: 'Opening', title: 'At the harbor' }, 201));
  const prose = '<p><strong>Protected prose Ω</strong> at the harbor.</p>';
  await a('PUT', `/api/scenes/${scene.id}`, { content: prose, _revision: 0 });
  await a('PUT', `/api/scenes/${scene.id}`, { content: 'Stale overwrite', _revision: 0 }, 409);
  await b('GET', `/api/scenes/${scene.id}`, undefined, 403);
  const character = await json(a('POST', '/api/story-bible', { projectId: project.id, title: 'Mara Vale', entryType: 'characters', content: 'Synthetic character' }, 201));
  await a('PUT', `/api/scenes/${scene.id}/context`, { _revision: 0, links: [{ entryId: character.id, role: 'viewpoint', note: 'Synthetic context' }] });
  const form = new FormData(); form.set('image', new Blob([png], { type: 'image/png' }), 'test.png');
  const image = await json(a('POST', '/api/upload', form, 200, { 'X-QQ-Project': String(project.id) }));
  await b('GET', image.url, undefined, 404);
  assert.deepEqual(Buffer.from(await (await a('GET', image.url)).arrayBuffer()), png);
  const exported = await a('POST', `/api/projects/${project.id}/export`, { format: 'html' });
  assert.match(await exported.text(), /Protected prose Ω/);
  const templates = await json(a('GET', '/api/plot-templates')); assert.ok(templates.length > 0);
  await stop();
  await start(urls[0], uploads);
  assert.equal((await json(a('GET', `/api/scenes/${scene.id}`))).content, prose);
  assert.deepEqual(Buffer.from(await (await a('GET', image.url)).arrayBuffer()), png);
  await stop();
  const before = await fingerprints(urls[0]);
  const dump = path.join(temp, 'alpha.dump');
  execFileSync(process.env.PG_BIN ? path.join(process.env.PG_BIN, 'pg_dump') : 'pg_dump', ['--dbname', urls[0], '--format=custom', '--file', dump], { stdio: 'pipe' });
  execFileSync(process.env.PG_BIN ? path.join(process.env.PG_BIN, 'pg_restore') : 'pg_restore', ['--dbname', urls[1], '--no-owner', '--no-privileges', dump], { stdio: 'pipe' });
  const restoredUploads = path.join(temp, 'restored-uploads'); await cp(uploads, restoredUploads, { recursive: true });
  assert.deepEqual(await fingerprints(urls[1]), before);
  assert.deepEqual(await readFile(path.join(restoredUploads, '.access', `${image.filename}.json`)), await readFile(path.join(uploads, '.access', `${image.filename}.json`)));
  assert.equal(await initializeAlphaDatabase(urls[1], 'fresh-alpha'), 'already-initialized');
  assert.equal(await migrateFeedback(urls[1], 'fresh-alpha'), 'already-applied');
  await start(urls[1], restoredUploads);
  assert.equal((await json(a('GET', `/api/scenes/${scene.id}`))).content, prose);
  assert.deepEqual(Buffer.from(await (await a('GET', image.url)).arrayBuffer()), png);
  await b('GET', image.url, undefined, 404);
  assert.equal((await json(a('GET','/api/feedback')))[0].id,feedback.id);
  assert.equal((await json(a('GET',`/api/admin/feedback/${feedback.id}`))).status,'reviewing');
  assert.deepEqual(await json(b('GET','/api/feedback')),[]);
  console.log(JSON.stringify({ freshBootstrap: 'PASS', concurrentBootstrap: 'PASS', refusesExistingDatabase: 'PASS', registration: 'PASS', secureProxyCookie: 'PASS', sceneContext: 'PASS', staleWriteRejected: 'PASS', accountIsolation: 'PASS', export: 'PASS', restartSessionAndUploads: 'PASS', pairedRestore: 'PASS', restoredTables: Object.keys(before).length }));
} finally {
  await stop();
  for (const name of names) { assert.match(name, /^qq_alpha_test_[a-z]+_[a-f0-9]{32}$/); await admin.query(`DROP DATABASE IF EXISTS "${name}"`); }
  await admin.end(); await rm(temp, { recursive: true, force: true });
}

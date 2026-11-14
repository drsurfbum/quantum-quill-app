// Interactive acceptance fixture only. Never loads .env, PostgreSQL, or real writing.
import express from 'express';
import session from 'express-session';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { execFileSync } from 'node:child_process';
import { createApp } from '../server/app';
import { MemStorage } from '../server/storage';
import { hashPassword } from '../server/auth';

const storage = new MemStorage();
(storage.sessionStore as any).stopInterval?.();
storage.sessionStore = new session.MemoryStore();
const output = resolve('.local/desktop-acceptance');
await mkdir(output, { recursive: true, mode: 0o700 });
const fixtures: Record<string, any> = {};
for (const client of ['claude', 'chatgpt']) {
  const user = await storage.createUser({ username: `${client}-fixture`, email: `${client}@example.test`, password: await hashPassword('fictional-desktop-test-only') });
  const project = await storage.createProject({ userId: user.id, title: `${client === 'claude' ? 'Claude' : 'ChatGPT'} · Lantern Observatory`, description: 'Disposable fictional client acceptance story.' });
  const sibling = await storage.createProject({ userId: user.id, title: `${client} · Glass Orchard` });
  const outline = await storage.createOutlineItem({ projectId: project.id, title: 'First light', content: 'Mira finds a blue lantern. Preserve this outline detail.', order: 0 });
  const bible = await storage.createStoryBibleEntry({ projectId: project.id, entryType: 'characters', title: 'Mira Vale', content: 'A fictional astronomer who cannot swim.', tags: ['fixture'], metadata: {}, priority: 1 });
  const chapter = await storage.createChapter({ projectId: project.id, title: 'Arrival', writingMode: 'chapter', content: '<p>Mira raised the blue lantern.</p>', order: 0 });
  const sceneChapter = await storage.createChapter({ projectId: project.id, title: 'Night watch', writingMode: 'scenes', content: '', order: 1 });
  const scene = await storage.createScene({ projectId: project.id, chapterId: sceneChapter.id, title: 'The signal', summary: 'A distant tower answers.', content: '<p>Three green lights answered Mira.</p>', order: 0 });
  fixtures[client] = { userId: user.id, username: user.username, projectId: project.id, siblingId: sibling.id, outlineId: outline.id, bibleId: bible.id, chapterId: chapter.id, sceneChapterId: sceneChapter.id, sceneId: scene.id };
}
const foreign = await storage.createUser({ username: 'foreign-fixture', email: 'foreign@example.test', password: await hashPassword(randomBytes(24).toString('hex')) });
const foreignProject = await storage.createProject({ userId: foreign.id, title: 'Foreign account · Sealed Archive' });
const app = express();
const events: any[] = [];
// Keep only operational metadata, never headers, tokens, tool arguments or story text.
app.use((req, res, next) => {
  if (req.path === '/api/mcp/call') {
    res.on('finish', () => {
      const row = { at: new Date().toISOString(), tool: /^[a-z_]+$/.test(req.body?.name) ? req.body.name : 'invalid', projectId: Number.isSafeInteger(req.body?.arguments?.projectId) ? req.body.arguments.projectId : null, status: res.statusCode };
      events.push(row); console.log(JSON.stringify({ call: row }));
    });
  }
  next();
});
app.use(createApp({ storage, secret: randomBytes(32).toString('hex') }));
app.use(express.static(resolve('dist/public')));
app.get('*', (_req, res) => res.sendFile(resolve('dist/public/index.html')));
const server = createServer(app);
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const origin = `http://127.0.0.1:${(server.address() as any).port}`;
const cookies: Record<string, string> = {};
async function settings(client: string, method = 'GET', suffix = '', body?: unknown) {
  const response = await fetch(origin + '/api/agent-settings' + suffix, { method, headers: { Cookie: cookies[client], 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  if (response.status !== 200) throw new Error(`Settings ${response.status}`);
  return response.json();
}
for (const [client, fixture] of Object.entries(fixtures)) {
  const login = await fetch(origin + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: fixture.username, password: 'fictional-desktop-test-only' }) });
  if (!login.ok) throw new Error('Fixture login failed');
  cookies[client] = login.headers.get('set-cookie')!.split(';')[0];
  const { hasKey, ...initial } = await settings(client);
  const enabled = await settings(client, 'PUT', '', { ...initial, enabled: true, projectIds: [fixture.projectId] });
  const { key } = await settings(client, 'POST', '/key', { revision: enabled.revision });
  const setup = await settings(client, 'GET', '/setup');
  // Private setup files are intentionally outside Git and must never be attached or logged.
  await writeFile(resolve(output, `${client}-private.json`), JSON.stringify({ origin, key }, null, 2), { mode: 0o600 });
  await writeFile(resolve(output, `${client}-setup.toml`), setup.codexConfig.replace('[mcp_servers.quantum_quill', '[mcp_servers.qq_acceptance_test').replace('[mcp_servers.quantum_quill.env]', '[mcp_servers.qq_acceptance_test.env]'), { mode: 0o600 });
}
const manifest = { origin, fixtures, foreignProjectId: foreignProject.id, head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), fictionalDataOnly: true, database: 'memory', bind: '127.0.0.1', clientAcceptance: 'pending actual desktop conversations' };
await writeFile(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest, null, 2));
console.log('Controls: status | <claude|chatgpt> <readonly|edit|manuscript|both|all|selected|revoke|conflict|newproject> | quit');
async function snapshot() {
  const data: Record<string, unknown> = {};
  for (const [client, f] of Object.entries(fixtures)) data[client] = { settings: await settings(client), outline: await storage.getOutlineItem(f.outlineId), bible: await storage.getStoryBibleEntry(f.bibleId), chapter: await storage.getChapter(f.chapterId), scene: await storage.getScene(f.sceneId) };
  await writeFile(resolve(output, 'state.json'), JSON.stringify(data, null, 2), { mode: 0o600 });
  await writeFile(resolve(output, 'calls.json'), JSON.stringify(events, null, 2));
  console.log(JSON.stringify({ snapshot: 'saved', calls: events.length }));
}
const input = createInterface({ input: process.stdin });
let stopping = false;
async function stop() { if (stopping) return; stopping = true; await snapshot(); input.close(); server.closeAllConnections(); server.close(); }
input.on('line', async line => {
  try {
    if (line === 'quit') return await stop();
    if (line === 'status') return await snapshot();
    const [client, command] = line.trim().split(/\s+/); const f = fixtures[client];
    if (!f) throw new Error('Use claude or chatgpt');
    if (command === 'revoke') await settings(client, 'DELETE', '/key');
    else if (command === 'conflict') {
      const row = (await storage.getOutlineItem(f.outlineId))!;
      await storage.updateOutlineItem(row.id, { title: 'Writer changed this title' }, { revision: row.revision });
    } else if (command === 'newproject') await storage.createProject({ userId: f.userId, title: 'Future project · Paper Moon' });
    else {
      const patches: Record<string, object> = { readonly: { allowWrites: false, allowManuscript: false }, edit: { allowWrites: true, allowManuscript: false }, manuscript: { allowWrites: false, allowManuscript: true }, both: { allowWrites: true, allowManuscript: true }, all: { allProjects: true }, selected: { allProjects: false } };
      if (!patches[command]) throw new Error('Unknown control');
      const { hasKey, ...current } = await settings(client);
      await settings(client, 'PUT', '', { ...current, ...patches[command] });
    }
    console.log(JSON.stringify({ client, applied: command })); await snapshot();
  } catch { console.error('Fixture control failed; no sensitive details logged.'); }
});
process.once('SIGINT', stop); process.once('SIGTERM', stop);

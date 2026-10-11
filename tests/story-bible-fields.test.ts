import './editor-dom';
// Toast expiry timers are unrelated to persistence and otherwise outlive these tests.
jest.mock('../client/src/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
import http from 'node:http';
import { bibleEntrySearchText } from '../client/src/lib/story-bible-data';
import { unlinkSync } from 'node:fs';
import { SimplifiedBentoDashboard } from '../client/src/components/story-bible/simplified-bento-dashboard';
import request from 'supertest';
import React, { act, StrictMode } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { fixture, credentials } from './helpers';
import { queryClient } from '../client/src/lib/queryClient';
import { flushPendingSaves } from '../client/src/hooks/use-autosave';
import { CharacterEditor } from '../client/src/components/story-bible/character-editor';
import { GroupsRacesEditor } from '../client/src/components/story-bible/groups-races-editor';
import { LocationsEditor } from '../client/src/components/story-bible/locations-editor';
import { EventsEditor } from '../client/src/components/story-bible/events-editor';
import { WorldElementsEditor } from '../client/src/components/story-bible/world-elements-editor';
import { DetailsEditor } from '../client/src/components/story-bible/details-editor';
import { ResearchEditor } from '../client/src/components/story-bible/research-editor';
import { EnhancedBibleEditor } from '../client/src/components/story-bible/enhanced-bible-editor';
import { ENHANCED_TAXONOMY } from '../shared/enhanced-taxonomy';

// Real React/Radix controls + signed-session API + isolated MemStorage. No database.
Object.assign(globalThis, { ResizeObserver: class { observe() {} unobserve() {} disconnect() {} } });
HTMLElement.prototype.scrollIntoView = () => {};
HTMLElement.prototype.hasPointerCapture = () => false;
HTMLElement.prototype.setPointerCapture = () => {};
HTMLElement.prototype.releasePointerCapture = () => {};
const editors: Record<string, React.ElementType> = { characters: CharacterEditor, groups_races: GroupsRacesEditor, locations: LocationsEditor, events: EventsEditor, world_elements: WorldElementsEditor, details: DetailsEditor, research: ResearchEditor, fallback: EnhancedBibleEditor };
const jsonTypes = ['events', 'world_elements', 'details', 'research'];
const previousQueryDefaults = queryClient.getDefaultOptions();
// Explicit teardown owns cache cleanup; do not leave five-minute GC timers behind.
queryClient.setDefaultOptions({ ...previousQueryDefaults, queries: { ...previousQueryDefaults.queries, gcTime: Infinity }, mutations: { ...previousQueryDefaults.mutations, gcTime: Infinity } });
const context = fixture();
const server = http.createServer(context.app);
context.agent = request.agent(server);
let projectId: number, owner: any, entry: any, container: HTMLDivElement, root: Root;
let activeType: string;
let peers: any[];
const listUrl = () => `/api/projects/${projectId}/story-bible`;
const url = () => `/api/story-bible/${entry.id}`;
const ph = (value: string) => `[placeholder=${JSON.stringify(value)}]`;
function field(selector: string): HTMLInputElement {
  const result = container.querySelector<HTMLInputElement>(selector);
  if (!result) throw new Error(`Missing ${activeType} control ${selector}`);
  return result;
}
async function change(selector: string, value: string) {
  await act(async () => { const input = field(selector); input.value = value; Simulate.change(input); });
}
async function click(element: Element | null) {
  if (!element) throw new Error('Missing clickable control');
  await act(async () => (element as HTMLElement).click());
}
async function expand() {
  for (const node of [...container.querySelectorAll('[aria-expanded="false"][aria-controls]')]) {
    if (node.getAttribute('role') !== 'combobox') await click(node);
  }
}
async function select(combo: Element, option?: string) {
  await act(async () => combo.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })));
  const options = [...document.querySelectorAll<HTMLElement>('[role="option"]')];
  const chosen = option ? options.find(node => node.textContent === option) : options.find(node => node.getAttribute('aria-disabled') !== 'true');
  if (!chosen) throw new Error(`Missing option ${option}; available ${options.map(n => n.textContent)}`);
  const label = chosen.textContent!;
  await click(chosen);
  return label;
}
function combo(label: string) {
  const labelled = [...container.querySelectorAll('label')].find(node => node.textContent?.replace(/\*/g,'').trim() === label);
  const result = labelled?.parentElement?.querySelector('[role="combobox"]');
  if (!result) throw new Error(`Missing select ${label}`);
  return result;
}
async function mount(data = entry) {
  await act(async () => root.render(React.createElement(StrictMode, null, React.createElement(QueryClientProvider, { client: queryClient }, React.createElement(editors[activeType], { entry: data, projectId })))));
  await expand();
}
async function fresh() {
  await act(async () => { expect(await flushPendingSaves()).not.toBe(false); });
  const saved = (await context.agent.get(url()).expect(200)).body;
  await act(async () => root.render(React.createElement('div')));
  await mount(saved);
  return saved;
}
function data(saved: any) { return jsonTypes.includes(activeType) ? JSON.parse(saved.content) : saved.metadata; }
async function create(type: string, metadata: any = {}, content: any = {}, storedType = type) {
  activeType = type;
  entry = (await context.agent.post("/api/story-bible").send({ title: 'Synthetic original', entryType: storedType, projectId, metadata: { legacyUnrendered: 'keep', ...metadata }, content: jsonTypes.includes(type) ? JSON.stringify({ legacyUnrendered: 'keep', ...content }) : '' }).expect(201)).body;
  queryClient.setQueryData([listUrl()], [entry, ...peers]);
  await mount();
}
beforeAll(async () => {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  owner = (await context.agent.post('/api/register').send(credentials).expect(201)).body;
  projectId = (await context.agent.post('/api/projects').send({ title: 'Field verification only' }).expect(201)).body.id;
  peers = [];
  for (const type of Object.keys(editors).filter(t => t !== 'fallback')) peers.push((await context.agent.post("/api/story-bible").send({ title: `${type} | full title`, entryType: type, projectId, content: '' }).expect(201)).body);
});
afterAll(async () => { queryClient.clear(); queryClient.setDefaultOptions(previousQueryDefaults); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); });
beforeEach(() => {
  queryClient.clear(); queryClient.setQueryData(['/api/user'], owner);
  jest.spyOn(global, 'fetch').mockImplementation(async (path, init) => {
    const method = (init?.method || 'GET').toLowerCase();
    let request = (context.agent as any)[method](String(path));
    if (init?.body instanceof FormData) {
      const file = init.body.get('image') as File;
      request = request.attach('image', Buffer.from(await file.arrayBuffer()), { filename: file.name, contentType: file.type });
    } else if (init?.body) request = request.send(JSON.parse(init.body as string));
    const response = await request;
    return new Response(response.status === 204 ? null : JSON.stringify(response.body), { status: response.status });
  });
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => {
  await act(async () => { await flushPendingSaves(); root.unmount(); });
  container.remove(); queryClient.clear(); jest.restoreAllMocks();
});

// Explicit field inventory: selector -> persistence path. Category branches are separate cases.
const textCases: [string, any, string[], string?][] = [
  ['characters', {}, ['age','gender','species','origin','eyeColor','hairColor','build','clothingStyle','distinguishingFeatures','personalityTraits','beliefs','motivations','conflicts'], "Character's backstory, detailed notes, development ideas..."],
  ['groups_races', { groupCategory: 'species' }, ['tagline','eraEstablished','eraDissolved','leadershipStructure','homeworld','physiology','culturalNotes','notes'], 'Origin story, major milestones, significant events, historical context...'],
  ['groups_races', { groupCategory: 'faction' }, ['tagline','purpose','ideology','resources','culturalNotes','notes']],
  ['locations', { locationType: 'planet' }, ['tagline','coordinates','size','gravity','atmosphere','purpose','eraEstablished','statusChanges','notes'], 'Founding story, major events, historical significance, battles fought here...'],
  ['locations', { locationType: 'station' }, ['tagline','coordinates','capacity','layout','purpose','notes']],
  ['events', {}, ['year','month','day','fictionalDate','era','shortSummary','writerNotes','hiddenDetails','alternativeVersions','researchReminders'], 'Detailed description: causes, participants, outcomes...'],
  ['world_elements', {}, ['shortNotes','discoveryOrigin','loreHooks','idioms','rumors','nicheFacts']],
  ['details', {}, ['shortSummary','content','explanation','outcomeNotes']],
  ['research', {}, ['urlOrReference','shortSummary','detailedNotes','nextSteps','incorporationPlans','teamNotes']],
  ['fallback', {}, [], 'Write your entry content here...'],
];
it.each(textCases.map(([type, seed, ids, body]) => [type, seed, ids, body] as const))('%s text fields survive API readback/reopen and clearing (%j)', async (type, seed, ids, body) => {
  await create(type, seed);
  const expected: Record<string, string> = {};
  for (const id of ids) { expected[id] = `Exact ${id}: Ω <text> & spaces  `; await change(`#${id}`, expected[id]); }
  if (body) await change(ph(body), 'Long body\nwith trailing spaces  ');
  await change('input', 'Updated title');
  if (['characters','groups_races','locations'].includes(type)) await change('#category', 'Custom classification');
  let saved = await fresh();
  expect(saved.title).toBe('Updated title');
  expect(data(saved).legacyUnrendered).toBe('keep');
  for (const id of ids) {
    const savedValue = type === 'events' && ['year','month','day','fictionalDate'].includes(id) ? data(saved).date[id] : data(saved)[id];
    expect({ id, savedValue }).toEqual({ id, savedValue: expected[id] });
    expect(field(`#${id}`).value).toBe(expected[id]);
    await change(`#${id}`, '');
  }
  if (body) { expect(field(ph(body)).value).toBe('Long body\nwith trailing spaces  '); await change(ph(body), ''); }
  saved = await fresh();
  for (const id of ids) { expect(field(`#${id}`).value).toBe(''); expect(type === 'events' && ['year','month','day','fictionalDate'].includes(id) ? data(saved).date[id] : data(saved)[id]).toBe(''); }
  if (body) expect(field(ph(body)).value).toBe('');
});
const categories = ['Flora','Fauna','Technology','Religion/Ritual','Mythology','Magic System','Language','Currency','Art/Culture','Transportation','Weapon/Tool','Material/Resource','Food/Drink','Medicine','Architecture','Other'];
it.each(categories)('World Elements: every visible %s detail persists independently', async category => {
  await create('world_elements', {}, { category });
  const ids = category === 'Flora' ? ['habitat','growthBehavior','uses','threats'] : category === 'Fauna' ? ['diet','behavior','lifecycle','domestication'] : category === 'Technology' ? ['inventor','powerSource','function','limitations'] : ['Religion/Ritual','Mythology'].includes(category) ? ['beliefs','ceremonies','originStories'] : ['properties','appearance','rarity','significance'];
  for (const id of ids) await change(`#${id}`, `${category} ${id}`);
  let saved = await fresh();
  for (const id of ids) { expect(data(saved).categoryDetails[id]).toBe(`${category} ${id}`); expect(field(`#${id}`).value).toBe(`${category} ${id}`); await change(`#${id}`, ''); }
  saved = await fresh();
  for (const id of ids) expect(data(saved).categoryDetails[id]).toBe('');
});
it('generic archive and priority checkboxes persist both true and false', async () => {
  await create('fallback');
  for (const value of [true, false]) {
    await click(field('#archived')); await click(field('#priority'));
    const saved = await fresh();
    expect(saved.isArchived).toBe(value); expect(saved.priority).toBe(value ? 1 : 0);
    expect(field('#archived').getAttribute('aria-checked')).toBe(String(value));
  }
});
const selectCases: [string, string, string, string, string][] = [
  ['characters','Primary Role','Antagonist','primaryRole','antagonist'],
  ['groups_races','Category','Faction/Organization','groupCategory','faction'],
  ['groups_races','Status','Defunct','status','defunct'],
  ['locations','Type','Planet','locationType','planet'],
  ['locations','Status','Destroyed','status','destroyed'],
  ['locations','Environment/Biome','Desert','environment','desert'],
  ['events','Type','Battle','eventType','Battle'],
  ['events','Status','Historical','status','Historical'],
  ['world_elements','Category','Fauna','category','Fauna'],
  ['world_elements','Status','Legendary','status','Legendary'],
  ['details','Type','Foreshadow','type','Foreshadow'],
  ['details','Status','Resolved','status','Resolved'],
  ['details','Visibility','Public Notes','visibility','Public Notes'],
  ['research','Source Type','Book','sourceType','Book'],
  ['research','Status','Applied','status','Applied'],
];
it.each(selectCases)('%s %s dropdown persists and displays its selected value', async (type, label, option, key, expected) => {
  await create(type);
  await select(combo(label), option);
  const saved = await fresh();
  expect(data(saved)[key]).toBe(expected);
  expect(combo(label).textContent).toBe(option);
});
async function enter(selector: string, value: string) {
  await change(selector, value);
  await act(async () => { const input = field(selector); Simulate.keyDown(input, { key: 'Enter' }); Simulate.keyPress(input, { key: 'Enter', charCode: 13 }); });
}
function removeByText(text: string) {
  const containing = [...container.querySelectorAll('span,div')].filter(node => node.textContent?.trim() === text);
  for (const node of containing.reverse()) {
    let parent: Element | null = node;
    for (let i = 0; i < 3 && parent; i++, parent = parent.parentElement) {
      const button = parent.querySelector('button:has(svg.lucide-x), button:has(svg[class*="trash"])');
      if (button && button.getAttribute('role') !== 'combobox') return button;
    }
  }
  throw new Error(`Missing remove control for ${text}`);
}
it.each(Object.keys(editors))('%s tags add, reject duplicates, reopen and remove', async type => {
  await create(type);
  await enter(ph('Add tag...'), '  field-tag  ');
  await enter(ph('Add tag...'), 'field-tag');
  let saved = await fresh();
  expect(jsonTypes.includes(type) ? data(saved).tags : saved.tags).toEqual(['field-tag']);
  expect(saved.tags).toEqual(['field-tag']);
  await click(removeByText('field-tag'));
  saved = await fresh();
  expect(jsonTypes.includes(type) ? data(saved).tags : saved.tags || []).toEqual([]);
});
it.each([
  ['characters','Enter an ability or skill...','abilities'],
  ['groups_races','Add sub-group or child race...','subGroups'],
  ['groups_races','Add allied group...','alliances'],
  ['groups_races','Add rival group...','rivalries'],
  ['locations','Add key feature or facility...','keyFeatures'],
  ['locations','Add flora, fauna, technology, resource...','worldElements'],
  ['research','Custom topic...','topics'],
])('%s %s list supports add/remove/reopen', async (type, placeholder, key) => {
  await create(type); await enter(ph(placeholder), '  Synthetic item  '); await enter(ph(placeholder), 'Synthetic item');
  let saved = await fresh(); expect(data(saved)[key]).toEqual(['Synthetic item']);
  await click(removeByText('Synthetic item')); saved = await fresh(); expect(data(saved)[key]).toEqual([]);
});
it.each(['events','world_elements','details','research'])('%s boolean controls persist on and off', async type => {
  await create(type);
  const ids = type === 'events' ? ['isApproximate','includeOnTimeline'] : ['archived'];
  for (const id of ids) {
    const before = field(`#${id}`).getAttribute('aria-checked') === 'true';
    for (const expected of [!before, before]) {
      await click(field(`#${id}`)); const saved = await fresh();
      expect(field(`#${id}`).getAttribute('aria-checked')).toBe(String(expected));
      expect(id === 'isApproximate' ? data(saved).date.isApproximate : data(saved)[id === 'archived' ? 'isArchived' : id]).toBe(expected);
      if (id === 'archived') expect(saved.isArchived).toBe(expected);
    }
  }
});
it.each(Object.keys(editors).filter(type => type !== 'fallback'))('%s image URL, description and removal survive fresh reads', async type => {
  await create(type);
  const placeholder = type === 'world_elements' ? 'Image URL...' : 'Paste image URL...';
  await enter(ph(placeholder), '  https://example.test/synthetic.png  ');
  await change('#imageDescription', 'Exact image description');
  let saved = await fresh();
  expect(data(saved)).toMatchObject({ imageUrl: 'https://example.test/synthetic.png', imageDescription: 'Exact image description' });
  expect(field('#imageDescription').value).toBe('Exact image description');
  await click([...container.querySelectorAll('button')].find(node => node.textContent === 'Remove Image')!);
  saved = await fresh(); expect(data(saved)).toMatchObject({ imageUrl: '', imageDescription: '' });
  await enter(ph(placeholder), 'https://example.test/replacement.png');
  saved = await fresh(); expect(data(saved).imageDescription || '').toBe('');
});
it.each(['groups_races','locations'])('%s parent selector restores and clears its saved relationship', async type => {
  await create(type);
  const label = type === 'groups_races' ? 'Parent Group' : 'Parent Location';
  const key = type === 'groups_races' ? 'parentGroup' : 'parentLocation';
  const peer = peers.find(e => e.entryType === type);
  await select(combo(label), peer.title);
  let saved = await fresh(); expect(data(saved)[key]).toBe(String(peer.id)); expect(combo(label).textContent).toBe(peer.title);
  await select(combo(label), type === 'groups_races' ? 'None' : '-- No Parent Location --');
  saved = await fresh(); expect(data(saved)[key]).toBe('');
});
it.each(['details','research'])('%s every linked-element picker preserves full titles including separators', async type => {
  await create(type);
  const types = type === 'details' ? ['characters','locations','events','world_elements'] : ['characters','locations','world_elements'];
  for (const linkType of types) {
    const peer = peers.find(e => e.entryType === linkType);
    const picker = [...container.querySelectorAll('[role="combobox"]')].find(node => node.textContent?.toLowerCase().includes(linkType === 'world_elements' ? 'world element' : linkType.slice(0,-1)))!;
    await select(picker, peer.title);
  }
  let saved = await fresh();
  for (const linkType of types) { const peer = peers.find(e => e.entryType === linkType); expect(data(saved).linkedElements).toContainEqual({ id: peer.id, name: peer.title, type: linkType }); }
  for (const linkType of types) await click(removeByText(peers.find(e => e.entryType === linkType).title));
  saved = await fresh(); expect(data(saved).linkedElements).toEqual([]);
});
const dynamicCases = Object.values(ENHANCED_TAXONOMY).flatMap(tax => [
  [tax.key, '', tax.fields] as const,
  ...Object.entries(tax.categoryFields || {}).map(([category, extra]) => [tax.key, category, { ...tax.fields, ...extra }] as const),
]);
it.each(dynamicCases)('generic %s / %s: all declared dynamic fields round-trip and clear', async (type, category, fields) => {
  await create('fallback', category ? { category } : {}, {}, type);
  const expected: Record<string, any> = {};
  // Category controls determine the field list; test them after their dependent fields.
  const ordered = Object.entries(fields).sort(([a], [b]) => Number(a === 'category') - Number(b === 'category'));
  for (const [key, spec] of ordered) {
    if (key === 'category' && category) continue;
    const section = container.querySelector(`[data-field="${key}"]`)!;
    expect(section).not.toBeNull();
    if (['text','textarea'].includes(spec.type)) {
      expected[key] = `Value for ${key}`; await change(`[data-field="${key}"] ${spec.type === 'text' ? 'input' : 'textarea'}`, expected[key]);
    } else if (spec.type === 'checkbox') { expected[key] = true; await click(section.querySelector('[role="checkbox"]')); }
    else {
      if (spec.type.includes('linked')) {
        const peer = peers.find(e => spec.linkedTo === 'any' || e.entryType === spec.linkedTo);
        expected[key] = spec.type.startsWith('multi') ? [peer.id] : peer.id;
        await select(section.querySelector('[role="combobox"]')!);
      } else {
        expected[key] = spec.type === 'multi-select' ? [spec.options![0]] : spec.options![0];
        await select(section.querySelector('[role="combobox"]')!, spec.options![0]);
      }
    }
  }
  let saved = await fresh(); expect(saved.metadata).toMatchObject(expected); expect(saved.metadata.legacyUnrendered).toBe('keep');
  for (const [key, spec] of ordered) {
    if (key === 'category' && category) continue;
    const section = container.querySelector(`[data-field="${key}"]`)!;
    if (['text','textarea'].includes(spec.type)) {
      expect(section.querySelector<HTMLInputElement>('input,textarea')!.value).toBe(expected[key]);
      await change(`[data-field="${key}"] ${spec.type === 'text' ? 'input' : 'textarea'}`, ''); expected[key] = '';
    } else if (spec.type === 'checkbox') { await click(section.querySelector('[role="checkbox"]')); expected[key] = false; }
    else if (spec.type === 'single-select') { expect(section.textContent).toContain(expected[key]); await select(section.querySelector('[role="combobox"]')!, 'None'); expected[key] = ''; }
    else {
      expect(section.textContent).toContain(spec.type === 'multi-select' ? expected[key][0] : peers.find(e => e.id === (Array.isArray(expected[key]) ? expected[key][0] : expected[key])).title);
      await click(section.querySelector('button:not([role="combobox"])'));
      expected[key] = spec.type.startsWith('multi') ? [] : null;
    }
  }
  saved = await fresh(); expect(saved.metadata).toMatchObject(expected);
});
it.each(['characters','groups_races','locations','fallback'])('%s header archive/star controls save and undo', async type => {
  await create(type);
  const iconButton = (className: string) => container.querySelector(`svg.${className}`)?.closest('button') || null;
  for (const enabled of [true, false]) {
    await click(iconButton(enabled ? 'lucide-star-off' : 'lucide-star'));
    await click(iconButton(enabled ? 'lucide-archive' : 'lucide-archive-restore'));
    const saved = await fresh(); expect(saved.priority).toBe(enabled ? 1 : 0); expect(saved.isArchived).toBe(enabled);
  }
});
it('generic classification, suggested categories and entry type changes persist', async () => {
  await create('fallback', {}, {}, 'world_elements');
  await change(ph('Enter custom category (e.g., Main Characters, Villains, etc.)'), 'Custom');
  await change(ph('Custom subcategory...'), 'Subtype');
  let saved = await fresh(); expect(saved).toMatchObject({ category: 'Custom', subcategory: 'Subtype' });
  const suggestion = [...container.querySelectorAll('button')].find(n => n.textContent === 'Flora');
  await click(suggestion!); saved = await fresh(); expect(saved.category).toBe('Flora');
  // Type change intentionally clears only classification, never existing metadata/content.
  await select(combo('Entry Type'), 'CharactersPeople, beings, and entities in your story');
  saved = await fresh(); expect(saved).toMatchObject({ entryType: 'characters', category: null, subcategory: null }); expect(saved.metadata.legacyUnrendered).toBe('keep');
});
it('event location picker saves real links, supports removal and fictional-only dates', async () => {
  await create('events');
  const peer = peers.find(e => e.entryType === 'locations');
  await select(field('[aria-label="Add location"]'), peer.title);
  let saved = await fresh(); expect(data(saved).locations).toEqual([{ id: peer.id, name: peer.title, context: '' }]);
  const selected = [...container.querySelectorAll('[role="combobox"]')].find(n => n.textContent === peer.title)!;
  await click(selected.parentElement!.querySelector('button:not([role="combobox"])'));
  await change('#fictionalDate', 'Cycle 12, Sol 82'); saved = await fresh(); expect(data(saved).locations).toEqual([]);
  expect(container.textContent).toContain('Cycle 12, Sol 82'); expect(container.textContent).not.toContain('Date not set');
});
it('location create-parent control uses returned record and persists the link', async () => {
  await create('locations');
  Object.defineProperty(globalThis, 'prompt', { configurable: true, value: jest.fn(() => 'Fresh synthetic parent') });
  await select(combo('Parent Location'), '+ Create New Location');
  // Wait for the create mutation rather than assuming one render completes the API round trip.
  for (let i=0; i<30 && !combo('Parent Location').textContent?.includes('Fresh synthetic parent'); i++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
  const saved = await fresh(); const parent = (await context.agent.get(`/api/story-bible/${data(saved).parentLocation}`).expect(200)).body;
  expect(parent.title).toBe('Fresh synthetic parent'); expect(combo('Parent Location').textContent).toBe(parent.title);
});
it.each(['characters','groups_races','locations','fallback'])('%s existing relationship controls link, reload and unlink', async type => {
  await create(type);
  const peer = peers.find(e => e.entryType === (type === 'groups_races' ? 'locations' : 'characters'));
  if (type === 'locations') {
    const row = [...container.querySelectorAll('span')].find(n => n.textContent === peer.title)!.parentElement!.parentElement!;
    await click(row.querySelector('button'));
    const group = peers.find(e => e.entryType === 'groups_races');
    const groupRow = [...container.querySelectorAll('span')].find(n => n.textContent === group.title)!.parentElement!.parentElement!;
    await click(groupRow.querySelector('button'));
  } else {
    const picker = [...container.querySelectorAll('[role="combobox"]')].find(n => n.textContent?.includes(type === 'groups_races' ? 'Link to location' : 'Link to another entry'))!;
    await select(picker, type === 'groups_races' ? peer.title : peer.title + 'characters • No category');
  }
  let saved = await fresh(); expect(saved.relatedEntryIds).toContain(peer.id);
  await click(removeByText(peer.title)); saved = await fresh(); expect(saved.relatedEntryIds).not.toContain(peer.id);
});
it('location nearby links and research topic choices can be added and removed', async () => {
  await create('locations'); const peer = peers.find(e => e.entryType === 'locations');
  const picker = [...container.querySelectorAll('[role="combobox"]')].find(n => n.textContent?.includes('nearby'))!;
  await select(picker, peer.title); let saved = await fresh(); expect(data(saved).nearbyLocations).toEqual([peer.id]);
  await click(removeByText(peer.title)); saved = await fresh(); expect(data(saved).nearbyLocations).toEqual([]);
  await act(async () => root.render(React.createElement('div')));
  await create('research'); const topic = await select(combo('Topics'));
  saved = await fresh(); expect(data(saved).topics).toEqual([topic]); await click(removeByText(topic)); saved = await fresh(); expect(data(saved).topics).toEqual([]);
});
it('detail title generation and blank-title recovery preserve body edits', async () => {
  await create('details'); await change('#shortSummary', 'A summary for a generated title'); await change('input', '');
  await act(async () => Simulate.blur(field('input')));
  const saved = await fresh(); expect(saved.title).toBe('Note: A summary for a generated titl'); expect(data(saved).shortSummary).toBe('A summary for a generated title');
});
it.each(['characters','groups_races','locations','events','details','research'])('%s uploaded file is associated with its record and survives reopening', async type => {
  await create(type);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=', 'base64');
  await act(async () => {
    const input = field('input[type="file"]');
    Object.defineProperty(input, 'files', { configurable: true, value: [new File([png], 'synthetic.png', { type: 'image/png' })] });
    Simulate.change(input);
  });
  for (let i=0; i<50 && !container.querySelector('img'); i++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
  const saved = await fresh(); const imageUrl = data(saved).imageUrl;
  expect(imageUrl).toMatch(/^\/uploads\/[a-f0-9-]+\.png$/);
  try {
    await context.agent.get(imageUrl).expect(200);
    expect(container.querySelector('img')!.getAttribute('src')).toBe(imageUrl);
  } finally { unlinkSync('/tmp/qq-test-uploads-unused/' + imageUrl.split('/').pop()); }
});
it('dashboard searches metadata, honors type/archive filters and opens category results', async () => {
  await create('characters', { beliefs: 'Unique hidden constellation' });
  const active = (await context.agent.get(url())).body;
  const archived = (await context.agent.post('/api/story-bible').send({ title: 'Archived synthetic detail', projectId, entryType: 'details', content: JSON.stringify({ isArchived: true, content: 'Old research' }) }).expect(201)).body;
  const others = [];
  for (let i=0; i<10; i++) others.push((await context.agent.post('/api/story-bible').send({ title: `Browse character ${i}`, projectId, entryType: 'characters', category: 'Crew' }).expect(201)).body);
  queryClient.setQueryData([listUrl()], [active, archived, ...others, ...peers]);
  const edit = jest.fn(), createEntry = jest.fn();
  await act(async () => root.render(React.createElement(QueryClientProvider, { client: queryClient }, React.createElement(SimplifiedBentoDashboard, { projectId, onEditEntry: edit, onCreateEntry: createEntry }))));
  await change(ph('Search across all categories...'), 'Unique hidden constellation');
  expect(container.textContent).toContain(active.title); expect(container.textContent).toContain('Characters'); expect(container.textContent).not.toContain(archived.title);
  await change(ph('Search across all categories...'), '');
  const filter = [...container.querySelectorAll('[role="combobox"]')].find(n => n.textContent === 'All Categories')!;
  await select(filter, 'Characters'); expect(container.textContent).not.toContain('Recent Activitylocations');
  const category = [...container.querySelectorAll('button')].find(n => n.textContent === 'Crew (10)')!;
  await click(category); expect(container.textContent).toContain('Browse character 9'); expect(container.textContent).toContain('10 entries');
  const title = [...container.querySelectorAll('div')].find(n => n.textContent === 'Browse character 9')!;
  await click(title); expect(edit).toHaveBeenCalledWith(expect.objectContaining({ title: 'Browse character 9' }));
  const currentFilter = [...container.querySelectorAll('[role="combobox"]')].find(n => n.textContent === 'Characters')!;
  await select(currentFilter, 'All Categories');
  await select(field('[aria-label="Archive filter"]'), 'Archived entries');
  expect(container.textContent).toContain(archived.title); expect(container.textContent).not.toContain(active.title);
});
it('group member link control includes and removes the selected character', async () => {
  await create('groups_races'); const peer = peers.find(e => e.entryType === 'characters');
  const row = [...container.querySelectorAll('span')].find(n => n.textContent === peer.title)!.parentElement!.parentElement!;
  await click(row.querySelector('button')); let saved = await fresh(); expect(saved.relatedEntryIds).toContain(peer.id);
  await click(removeByText(peer.title)); saved = await fresh(); expect(saved.relatedEntryIds).not.toContain(peer.id);
});
it('event location replacement keeps context and saves the selected target', async () => {
  const original = peers.find(e => e.entryType === 'locations');
  await create('events', {}, { locations: [{ id: original.id, name: original.title, context: 'Before the battle' }] });
  const second = (await context.agent.post('/api/story-bible').send({ title: 'Replacement location', projectId, entryType: 'locations', content: '' }).expect(201)).body;
  await act(async () => { queryClient.setQueryData([listUrl()], [entry, ...peers, second]); });
  const picker = [...container.querySelectorAll('[role="combobox"]')].find(n => n.textContent === original.title)!;
  await select(picker, second.title); const saved = await fresh();
  expect(data(saved).locations).toEqual([{ id: second.id, name: second.title, context: 'Before the battle' }]);
});

it('search retains legacy narrative when a structured entry also has metadata', () => {
  const legacy = { title: 'Legacy event', entryType: 'events', content: 'Original prose', metadata: { notes: 'Side annotation' }, tags: [] } as any;
  expect(bibleEntrySearchText(legacy)).toContain('original prose');
  expect(bibleEntrySearchText(legacy)).toContain('side annotation');
  expect(bibleEntrySearchText({ ...legacy, content: JSON.stringify({ shortSummary: 'Visible words' }) })).toContain('visible words');
  expect(bibleEntrySearchText({ ...legacy, content: JSON.stringify({ shortSummary: 'Visible words' }) })).not.toContain('shortsummary');
});

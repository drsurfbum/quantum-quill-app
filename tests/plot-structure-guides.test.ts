import './editor-dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { plotTemplates } from '../server/data/plot-templates';
import { getPlotStructureGuide, plotStructureGuides } from '../client/src/lib/plot-structure-guides';
import TemplateSelector from '../client/src/components/plot-structure/template-selector';

const templates = plotTemplates.map((template, index) => ({ ...template, id: index + 101 }));
let root: Root, container: HTMLDivElement, client: QueryClient;
const select = jest.fn(), close = jest.fn();
beforeEach(() => {
  select.mockClear(); close.mockClear();
  client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  client.setQueryData(['/api/plot-templates'], templates);
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); client.clear(); });
async function mount() {
  await act(async () => root.render(React.createElement(QueryClientProvider, { client }, React.createElement(TemplateSelector, { open: true, onOpenChange: close, projectId: 7, onSelectTemplate: select }))));
}
function button(text: string) { return [...document.querySelectorAll('button')].find(button => button.textContent === text)!; }

it('covers every shipped template by stable type, preserving the requested Story Circle reference', () => {
  expect(Object.keys(plotStructureGuides).sort()).toEqual(plotTemplates.map(t => t.templateType).sort());
  expect(plotStructureGuides.story_circle.videoId).toBe('-XGUVkOmPTA');
  for (const template of templates) {
    const guide = getPlotStructureGuide(template.templateType)!;
    expect(guide.bestFit.length).toBeGreaterThan(30);
    expect(guide.videoId).toMatch(/^[A-Za-z0-9_-]{11}$/);
  }
  expect(getPlotStructureGuide('custom')).toBeUndefined();
  expect(getPlotStructureGuide('constructor')).toBeUndefined();
});
it('offers named native radio controls and optional safe links for all eight choices', async () => {
  await mount();
  const radios = [...document.querySelectorAll<HTMLInputElement>('input[type=radio]')];
  const links = [...document.querySelectorAll<HTMLAnchorElement>('a')];
  expect(radios).toHaveLength(templates.length); expect(links).toHaveLength(templates.length);
  templates.forEach((template, index) => {
    expect(radios[index].labels?.[0].textContent).toBe(template.name);
    expect(links[index].href).toBe(`https://www.youtube.com/watch?v=${getPlotStructureGuide(template.templateType)!.videoId}`);
    expect(links[index].target).toBe('_blank'); expect(links[index].rel).toBe('noopener noreferrer');
    expect(links[index].getAttribute('aria-label')).toContain(template.name);
    expect(links[index].getAttribute('aria-label')).toContain('new tab');
  });
  expect(document.querySelector('iframe, video, img')).toBeNull();
  expect(button('Apply Template').disabled).toBe(true);
  // Cancel navigation in jsdom, but allow React's click handler to run.
  links[3].addEventListener('click', event => event.preventDefault());
  await act(async () => links[3].click());
  expect(select).not.toHaveBeenCalled(); expect(close).not.toHaveBeenCalled();
  expect(radios.every(radio => !radio.checked)).toBe(true);
  expect(button('Apply Template').disabled).toBe(true);
});
it('applies only the selected template without requiring video playback', async () => {
  await mount();
  const radios = [...document.querySelectorAll<HTMLInputElement>('input[type=radio]')];
  await act(async () => radios[3].click());
  expect(radios[3].checked).toBe(true);
  const link = document.querySelectorAll<HTMLAnchorElement>('a')[1];
  link.addEventListener('click', event => event.preventDefault());
  await act(async () => link.click());
  expect(radios[3].checked).toBe(true); expect(radios[1].checked).toBe(false);
  await act(async () => button('Apply Template').click());
  expect(select).toHaveBeenCalledTimes(1); expect(select).toHaveBeenCalledWith(templates[3]);
  expect(close).toHaveBeenCalledWith(false);
});
it('retains direct use and cancel flows', async () => {
  await mount();
  const direct = document.querySelector<HTMLButtonElement>(`button[aria-label="Use ${templates[7].name} template"]`)!;
  await act(async () => direct.click());
  expect(select).toHaveBeenCalledWith(templates[7]); expect(close).toHaveBeenCalledWith(false);
  select.mockClear(); close.mockClear();
  await act(async () => button('Cancel').click());
  expect(select).not.toHaveBeenCalled(); expect(close).toHaveBeenCalledWith(false);
});
it('shows a clear gap for unfamiliar templates instead of attaching an unrelated video', async () => {
  client.setQueryData(['/api/plot-templates'], [{ ...templates[0], templateType: 'custom', name: 'My custom structure' }]);
  await mount();
  expect(document.body.textContent).toContain('No verified video guide is available');
  expect(document.querySelector('a')).toBeNull();
  await act(async () => button('Use This Template').click());
  expect(select).toHaveBeenCalledWith(expect.objectContaining({ templateType: 'custom' }));
});

import './editor-dom';
import {TOUR_VERSION, tourStorageKey, readTourPreference, saveTourPreference, shouldOfferTour, tourSteps, placeTourCard} from '../client/src/lib/interface-tour';
beforeEach(()=>window.localStorage.clear());
// Use a different account in each case: the memory fallback deliberately lasts a session.
Object.defineProperty(globalThis,'localStorage',{value:window.localStorage,configurable:true});
test('completion and skipping remain scoped to an account and version; another version never forces a repeat',()=>{
  expect(shouldOfferTour(readTourPreference(10))).toBe(true);
  expect(saveTourPreference(10,'completed')).toBe(true);
  expect(readTourPreference(10).versions[TOUR_VERSION]).toBe('completed');
  expect(shouldOfferTour(readTourPreference(11))).toBe(true);
  saveTourPreference(11,'dismissed');
  expect(shouldOfferTour(readTourPreference(11))).toBe(false);
  localStorage.setItem(tourStorageKey(12),JSON.stringify({versions:{'0':'dismissed'}}));
  expect(shouldOfferTour(readTourPreference(12))).toBe(false);
});
test('deferred first-project continuation is distinct from a dismissal; malformed values cannot activate a tour',()=>{
  saveTourPreference(13,'awaiting-project');
  expect(readTourPreference(13).versions[TOUR_VERSION]).toBe('awaiting-project');
  localStorage.setItem(tourStorageKey(14),'{bad json');
  expect(readTourPreference(14)).toEqual({versions:{}});
  localStorage.setItem(tourStorageKey(15),JSON.stringify({versions:{'1':'<script>'}}));
  expect(readTourPreference(15)).toEqual({versions:{}});
});
test('blocked storage has an account-isolated session fallback',()=>{
  const original=globalThis.localStorage;
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get:()=>{throw new Error('blocked');}});
  try {
    expect(saveTourPreference(16,'dismissed')).toBe(false);
    expect(shouldOfferTour(readTourPreference(16))).toBe(false);
    expect(shouldOfferTour(readTourPreference(17))).toBe(true);
  } finally {Object.defineProperty(globalThis,'localStorage',{value:original,configurable:true});}
});
test('ten short declarative steps only require navigation; no data-changing actions or admin coverage',()=>{
  expect(tourSteps).toHaveLength(10);
  expect(new Set(tourSteps.map(step=>step.id)).size).toBe(10);
  expect(tourSteps.filter(step=>step.action).map(step=>step.destination)).toEqual(['project','storyboard','outline','write','story-bible','write']);
  expect(JSON.stringify(tourSteps)).not.toMatch(/admin|inbox|submit|upload/i);
});
test.each([[390,650],[320,480],[1440,1000]])('instruction card stays within a %i×%i viewport', (width,height)=>{
  for(const rect of [null,{left:0,top:0,width:width-10,height:height-50},{left:width-50,top:height-30,width:50,height:30}]) {
    const card=placeTourCard(rect,width,height,240);
    expect(card.left).toBeGreaterThanOrEqual(12);
    expect(card.top).toBeGreaterThanOrEqual(12);
    expect(card.left+card.width).toBeLessThanOrEqual(width-12);
    expect(card.top+240).toBeLessThanOrEqual(height-12);
  }
});

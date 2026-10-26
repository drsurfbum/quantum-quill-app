/** Interface help only. Never stores project content or resumes an overlay on reload. */
export const TOUR_VERSION = 1;
export type TourOutcome = 'dismissed' | 'completed' | 'awaiting-project';
export interface TourPreference { versions: Record<string, TourOutcome> }
const memory = new Map<number, TourPreference>();
export const tourStorageKey = (account: number) => `quantum-quill:interface-tour:${account}`;
export function readTourPreference(account: number): TourPreference {
  try {
    const value = JSON.parse(localStorage.getItem(tourStorageKey(account)) || 'null');
    if (value?.versions && typeof value.versions === 'object') {
      const versions = Object.fromEntries(Object.entries(value.versions).filter(([, state]) => ['dismissed','completed','awaiting-project'].includes(String(state))));
      return { versions: versions as TourPreference['versions'] };
    }
  } catch { /* Storage may be disabled. Keep a session-only fallback. */ }
  return memory.get(account) || { versions: {} };
}
export function saveTourPreference(account: number, outcome: TourOutcome) {
  const value = readTourPreference(account);
  value.versions[TOUR_VERSION] = outcome;
  memory.set(account, value);
  try { localStorage.setItem(tourStorageKey(account), JSON.stringify(value)); return true; } catch { return false; }
}
export function shouldOfferTour(value: TourPreference) { return Object.keys(value.versions).length === 0; }
export type TourStepId = 'dashboard'|'navigation'|'storyboard'|'outline'|'manuscript'|'writing'|'bible'|'library'|'context'|'help';
export interface TourStep { id: TourStepId; title: string; text: string; target: string; action?: string; destination?: string }
export const tourSteps: TourStep[] = [
  {id:'dashboard',title:'Your projects live here',text:'Open a project to find its writing and planning spaces. New Project starts a separate wizard whenever you’re ready.',target:'projects',action:'Open a project',destination:'project'},
  {id:'navigation',title:'A flexible workspace',text:'You can move from Storyboard → Outline → Write, with Story Bible available throughout. Planning is optional: you can begin directly with prose.',target:'nav-storyboard',action:'Open Storyboard',destination:'storyboard'},
  {id:'storyboard',title:'See the big picture',text:'Storyboard holds major plot points and the shape of your story. Outline brings that plan closer to individual scenes.',target:'nav-outline',action:'Open Outline',destination:'outline'},
  {id:'outline',title:'Scenes and story beats',text:'Outline organizes scenes and the beats within them; those same scenes connect to your manuscript. You don’t need an outline to write.',target:'nav-write',action:'Open Write',destination:'write'},
  {id:'manuscript',title:'Chapters and scenes',text:'The manuscript navigator holds chapters and their scenes. Its + and Add scene controls are there when you need them; chapter prose can stand on its own.',target:'manuscript'},
  {id:'writing',title:'Your writing desk',text:'Write in the main page, with formatting above and save status below. Saved means the server has your changes; any recovery or conflict review takes priority over this tour.',target:'writing-desk'},
  {id:'bible',title:'Worldbuilding, always nearby',text:'Story Bible keeps characters, places and other worldbuilding elements together. You can develop them gradually without leaving planning or writing behind.',target:'nav-story-bible',action:'Open Story Bible',destination:'story-bible'},
  {id:'library',title:'A reference library for your story',text:'Browse your collections or use New entry to start an element with a name. Empty collections are fine; let’s return to Write to see how these references connect.',target:'nav-write',action:'Return to Write',destination:'write'},
  {id:'context',title:'Keep references beside your prose',text:'Context cards show Story Bible facts while you write. Later, type @ or select words and use the @ toolbar button to link an entry; opening a mention shows its card.',target:'context'},
  {id:'help',title:'Export and help when you need them',text:'Export is in the top header; Feedback opens a private report form. Help → Replay tour brings you back here anytime, including from your Dashboard.',target:'help'},
];
export interface TourRect { top:number; left:number; width:number; height:number }
/** Clip spotlights to the viewport. Cards prefer the free side of a large editor. */
export function placeTourCard(rect:TourRect|null, width:number, height:number, cardHeight:number) {
  const cardWidth = Math.min(352, Math.max(0, width-24));
  const maxTop = Math.max(12, height-cardHeight-12);
  if (!rect) return {left:Math.max(12,(width-cardWidth)/2),top:Math.min(maxTop,Math.max(12,(height-cardHeight)/2)),width:cardWidth};
  const right=rect.left+rect.width, bottom=rect.top+rect.height;
  const left = right+cardWidth+24 <= width ? right+12 : rect.left-cardWidth-24 >= 0 ? rect.left-cardWidth-12 : Math.min(width-cardWidth-12,Math.max(12,rect.left));
  const beside = right+cardWidth+24 <= width || rect.left-cardWidth-24 >= 0;
  const top = beside ? rect.top : bottom+cardHeight+24 <= height ? bottom+12 : rect.top-cardHeight-12 >= 12 ? rect.top-cardHeight-12 : maxTop;
  return {left,top:Math.min(maxTop,Math.max(12,top)),width:cardWidth};
}

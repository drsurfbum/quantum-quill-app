import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { pendingSaveCount, usePendingSaves, useRecoverableDrafts } from '@/hooks/use-autosave';
import { prepareManuscriptAction } from '@/lib/manuscript-actions';
import type { Project } from '@shared/schema';
import { Button } from '../ui/button';
import { TOUR_VERSION, placeTourCard, readTourPreference, saveTourPreference, shouldOfferTour, tourSteps, type TourRect, type TourStep } from '@/lib/interface-tour';

const TourContext = createContext({active:false});
export const useInterfaceTour = () => useContext(TourContext);
export const replayTour = () => window.dispatchEvent(new Event('qq:replay-tour'));
const findTarget = (key:string) => [...document.querySelectorAll<HTMLElement>(`[data-tour="${key}"]`)].find(el=>el.getBoundingClientRect().width>0 && el.getBoundingClientRect().height>0 && !el.closest('[hidden]')) || null;
const focusable = (el:HTMLElement) => [el,...el.querySelectorAll<HTMLElement>('button,a[href],input,select,textarea,[tabindex]')].filter(item=>item.matches('button,a[href],input,select,textarea,[tabindex]') && !item.matches(':disabled,[tabindex="-1"]') && item.getBoundingClientRect().width>0);

export function TourProvider({children}:{children:ReactNode}) {
  const {user} = useAuth();
  return user ? <AccountTour key={user.id} account={user.id}>{children}</AccountTour> : <>{children}</>;
}
function AccountTour({account,children}:{account:number;children:ReactNode}) {
  const [location,navigate] = useLocation();
  const projectId = location.match(/^\/project\/(\d+)(?:\/|$)/)?.[1];
  const supported = location==='/' || !!projectId;
  const {data:projects,isSuccess} = useQuery<Project[]>({queryKey:['/api/projects']});
  const saves = usePendingSaves();
  const drafts = useRecoverableDrafts();
  const [preference,setPreference] = useState(()=>readTourPreference(account));
  const [index,setIndex] = useState<number|null>(null);
  const [startIndex,setStartIndex] = useState(0);
  const [armed,setArmed] = useState<string|null>(null);
  const visited = useRef<Record<number,string>>({});
  const [blocked,setBlocked] = useState(false);
  const [offerReady,setOfferReady] = useState(false);
  const returnFocus = useRef<HTMLElement|null>(null);
  const step = index===null ? undefined : tourSteps[index];
  const writeOutcome = (outcome:'dismissed'|'completed'|'awaiting-project') => {saveTourPreference(account,outcome);setPreference(readTourPreference(account));};
  const stop = (outcome:'dismissed'|'completed'|'awaiting-project'='dismissed') => {writeOutcome(outcome);setIndex(null);requestAnimationFrame(()=>{const previous=returnFocus.current;if(previous?.isConnected)previous.focus();else findTarget(projectId?'help':'projects')?.focus();});};
  const begin = () => {
    returnFocus.current=document.activeElement as HTMLElement;
    const first=projectId?1:0;setStartIndex(first);visited.current={[first]:location};setArmed(null);setIndex(first);writeOutcome('dismissed');
  };
  useEffect(()=>{const timer=window.setTimeout(()=>setOfferReady(true),800);return()=>clearTimeout(timer);},[]);
  // Any real blocking dialog owns focus. Suspend without advancing; never dismiss it.
  useEffect(()=>{
    const inspect=()=>setBlocked(!!document.querySelector('[role="dialog"]:not([data-interface-tour]),[role="alertdialog"]'));
    inspect();const observer=new MutationObserver(inspect);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['role','data-state']});return()=>observer.disconnect();
  },[]);
  const paused=blocked || !!saves.pending || !!drafts.length;
  useEffect(()=>{const start=()=>begin();window.addEventListener('qq:replay-tour',start);return()=>window.removeEventListener('qq:replay-tour',start);},[projectId,account]);
  useEffect(()=>{const sync=(event:StorageEvent)=>{if(event.key===`quantum-quill:interface-tour:${account}`){setPreference(readTourPreference(account));setIndex(null);}};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);},[account]);
  // Advancement watches the destination's mounted/loaded workspace marker, not a click.
  useEffect(()=>{
    if (!step?.destination || paused || armed!==step.id) return;
    const check=()=>{
      const match=location.match(/^\/project\/(\d+)(?:\/(storyboard|outline|write|story-bible))?$/);
      if(!match)return;
      const arrived=step.destination==='project' || match[2]===step.destination;
      // Several mutations can arrive before React cleans up this observer. Consume
      // this step once; an old observer must never advance a newer step.
      if(arrived && findTarget('workspace-ready')) setIndex(value=>value!==null && tourSteps[value]?.id===step.id ? value+1 : value);
    };
    check();const observer=new MutationObserver(check);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-tour']});return()=>observer.disconnect();
  },[step?.id,location,paused,armed]);
  useEffect(()=>{if(index!==null && !visited.current[index])visited.current[index]=location;},[index,location]);
  const back=async()=>{
    if(index===null || index<=startIndex)return;
    try {if(projectId)await prepareManuscriptAction(Number(projectId));} catch {return;}
    const previous=index-1;setArmed(null);navigate(visited.current[previous]||location);setIndex(previous);
  };
  const continueOffer = preference.versions[TOUR_VERSION]==='awaiting-project' && !!projectId;
  const offer=offerReady && supported && isSuccess && !paused && index===null && (shouldOfferTour(preference)||continueOffer);
  return <TourContext.Provider value={{active:index!==null}}>{children}
    {offer && createPortal(<section role="region" aria-label="Welcome to Quantum Quill" className="fixed z-[110] bottom-5 right-3 sm:right-5 w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border bg-card p-4 shadow-xl">
      <h2 className="font-serif text-lg font-semibold">{continueOffer?'Ready to explore your workspace?':'Find your way around QQ'}</h2>
      <p className="my-2 text-sm text-muted-foreground">{continueOffer?'Your project is ready. Continue the interface tour whenever you like.':'Take a short, 2–3 minute interface tour. Your story and its guided tools stay yours to explore.'}</p>
      <div className="flex gap-2"><Button size="sm" onClick={begin}>{continueOffer?'Continue tour':'Start tour'}</Button><Button size="sm" variant="ghost" onClick={()=>writeOutcome('dismissed')}>Skip for now</Button></div>
    </section>,document.body)}
    {step && supported && !paused && <TourSpotlight key={step.id} step={step} emptyDashboard={index===0 && !projects?.length} progress={`${(index ?? 0)-startIndex+1} of ${tourSteps.length-startIndex}`} onAction={()=>setArmed(step.id)} onBack={index!>startIndex?()=>void back():undefined} onNext={()=>index===tourSteps.length-1?stop('completed'):setIndex(value=>value!+1)} onExit={()=>stop()} onWait={()=>stop('awaiting-project')}/>}
    {step && (!supported || paused) && !blocked && createPortal(<aside role="status" className="fixed top-4 right-4 z-[110] rounded-lg border bg-card p-3 text-sm shadow-md max-w-xs">Tour paused. {saves.pending||drafts.length?'Save or review your writing to continue.':'Return to a project or replay from Help.'}<Button size="sm" variant="ghost" onClick={()=>stop()}>Skip tour</Button></aside>,document.body)}
  </TourContext.Provider>;
}

function TourSpotlight({step,emptyDashboard,progress,onBack,onNext,onExit,onWait,onAction}:{step:TourStep;emptyDashboard:boolean;progress:string;onBack?:()=>void;onNext:()=>void;onExit:()=>void;onWait:()=>void;onAction:()=>void}) {
  const layer=useRef<HTMLDivElement>(null),card=useRef<HTMLDivElement>(null);
  const [target,setTarget]=useState<HTMLElement|null>(null);
  const [rect,setRect]=useState<TourRect|null>(null);
  const [viewport,setViewport]=useState({width:window.innerWidth,height:window.innerHeight});
  const [cardHeight,setCardHeight]=useState(260);
  const [delayed,setDelayed]=useState(false);
  const [panelReady,setPanelReady]=useState(()=>!!findTarget(step.target));
  const [manuscriptCover,setManuscriptCover]=useState(()=>step.id==='writing' && window.innerWidth<850 && !!findTarget('manuscript'));
  const targetKey=emptyDashboard?'new-project':manuscriptCover?'manuscript-close':step.id==='manuscript' && !panelReady?'manuscript-toggle':step.id==='context' && !panelReady?'context-toggle':step.target;
  const needsPanel=manuscriptCover || (step.id==='context' && targetKey==='context-toggle') || (step.id==='manuscript' && targetKey==='manuscript-toggle');
  const interactive=(!emptyDashboard && !!step.action)||needsPanel;
  useEffect(()=>{const timer=setTimeout(()=>setDelayed(true),1800);return()=>clearTimeout(timer);},[]);
  useEffect(()=>{
    let frame=0,scrolled:HTMLElement|null=null;
    const measure=()=>{
      frame=0;if(step.id==='context'||step.id==='manuscript')setPanelReady(!!findTarget(step.target));
      setManuscriptCover(step.id==='writing' && window.innerWidth<850 && !!findTarget('manuscript'));
      const element=findTarget(targetKey);
      if(element && scrolled!==element){scrolled=element;element.scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'instant'});}
      setTarget(previous=>previous===element?previous:element);
      const box=element?.getBoundingClientRect();
      const width=window.innerWidth,height=window.innerHeight;
      const next=box ? {left:Math.max(0,box.left-5),top:Math.max(0,box.top-5),width:Math.max(0,Math.min(width,box.right+5)-Math.max(0,box.left-5)),height:Math.max(0,Math.min(height,box.bottom+5)-Math.max(0,box.top-5))}:null;
      setRect(previous=>JSON.stringify(previous)===JSON.stringify(next)?previous:next);
      setViewport(previous=>previous.width===width&&previous.height===height?previous:{width,height});
      if(card.current)setCardHeight(card.current.getBoundingClientRect().height);
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(measure);};
    measure();const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden','aria-expanded','data-tour']});
    const resize=typeof ResizeObserver!=='undefined'?new ResizeObserver(schedule):null;
    resize?.observe(document.body);if(card.current)resize?.observe(card.current);const element=findTarget(targetKey);if(element)resize?.observe(element);
    window.addEventListener('resize',schedule);document.addEventListener('scroll',schedule,true);window.visualViewport?.addEventListener('resize',schedule);
    return()=>{observer.disconnect();resize?.disconnect();cancelAnimationFrame(frame);window.removeEventListener('resize',schedule);document.removeEventListener('scroll',schedule,true);window.visualViewport?.removeEventListener('resize',schedule);};
  },[targetKey]);
  // Make unrelated DOM inert, including to screen readers, without moving app nodes.
  useEffect(()=>{
    if(!layer.current)return;
    const changed=new Map<HTMLElement,boolean>();
    const isolate=(node:HTMLElement)=>{
      if(node===layer.current || (interactive && target && (node===target || target.contains(node))))return;
      if(node.contains(layer.current) || (interactive && target && node.contains(target))){[...node.children].forEach(child=>isolate(child as HTMLElement));return;}
      if(!changed.has(node))changed.set(node,node.inert);node.inert=true;
    };
    isolate(document.body);
    const described=target?.getAttribute('aria-describedby');
    if(interactive && target)target.setAttribute('aria-describedby',`${described||''} interface-tour-description`.trim());
    card.current?.focus();
    const allowed=(node:Node)=>!!layer.current?.contains(node)||(interactive && !!target?.contains(node));
    const focus=(event:FocusEvent)=>{if(event.target instanceof Node && !allowed(event.target))card.current?.focus();};
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();onExit();}
      if(event.key==='Tab'){
        const items=[...(card.current?focusable(card.current):[]),...(interactive&&target?focusable(target):[])];
        if(!items.length){event.preventDefault();return;}
        const index=items.indexOf(document.activeElement as HTMLElement);
        event.preventDefault();items[(index+(event.shiftKey?-1:1)+items.length)%items.length].focus();
      }
    };
    // Capturing gate also rejects programmatic/unrelated clicks while an action is highlighted.
    const click=(event:MouseEvent)=>{
      if(!(event.target instanceof Node))return;
      if(!allowed(event.target) || (target?.contains(event.target) && pendingSaveCount()>0)){event.preventDefault();event.stopImmediatePropagation();return;}
      if(interactive && target?.contains(event.target))onAction();
    };
    document.addEventListener('focusin',focus,true);document.addEventListener('keydown',key,true);document.addEventListener('click',click,true);
    return()=>{changed.forEach((value,node)=>{node.inert=value;});if(target){if(described===null||described===undefined)target.removeAttribute('aria-describedby');else target.setAttribute('aria-describedby',described);}document.removeEventListener('focusin',focus,true);document.removeEventListener('keydown',key,true);document.removeEventListener('click',click,true);};
  },[target,interactive]);
  const placement=placeTourCard(rect,viewport.width,viewport.height,cardHeight);
  const missing=!rect;
  const instruction=emptyDashboard?'Create your first project when you’re ready. We’ll offer the workspace tour once it opens.':manuscriptCover?'Close the Manuscript panel to see your prose.':needsPanel?`Open the ${step.id==='context'?'Context':'Manuscript'} panel to continue.`:step.action;
  const shades=rect ? [
    {left:0,top:0,width:viewport.width,height:rect.top},
    {left:0,top:rect.top,width:rect.left,height:rect.height},
    {left:rect.left+rect.width,top:rect.top,width:Math.max(0,viewport.width-rect.left-rect.width),height:rect.height},
    {left:0,top:rect.top+rect.height,width:viewport.width,height:Math.max(0,viewport.height-rect.top-rect.height)},
  ]:[{left:0,top:0,width:viewport.width,height:viewport.height}];
  return createPortal(<div ref={layer} data-tour-layer className="fixed inset-0 z-[200] pointer-events-none">
    {shades.map((style,index)=><div key={index} aria-hidden="true" className="absolute bg-slate-950/70 pointer-events-auto" style={style}/>)}
    {rect && <div aria-hidden="true" className={`absolute rounded-lg border-2 border-violet-300 motion-safe:transition-[top,left,width,height] motion-safe:duration-150 ${interactive?'pointer-events-none':'pointer-events-auto'}`} style={rect}/>}
    <div ref={card} tabIndex={-1} role="dialog" data-interface-tour aria-labelledby="interface-tour-title" aria-describedby="interface-tour-description" className="absolute pointer-events-auto rounded-xl border bg-card text-card-foreground shadow-2xl p-4 outline-none max-h-[calc(100dvh-24px)] overflow-y-auto" style={placement}>
      <div className="flex items-center justify-between gap-2 mb-3"><span className="text-xs font-medium text-muted-foreground">Interface tour · {progress}</span><button className="text-xs underline underline-offset-4 p-1 rounded focus-visible:ring-2 focus-visible:ring-ring" onClick={onExit}>Skip tour</button></div>
      <h2 id="interface-tour-title" className="font-serif text-lg font-semibold">{step.title}</h2>
      <p id="interface-tour-description" className="text-sm leading-relaxed mt-2">{step.text}</p>
      {instruction && <p role="status" className="text-sm font-medium mt-3">{instruction}</p>}
      {missing && <p role="status" className="text-xs text-muted-foreground mt-3">{delayed?'This control isn’t available right now. You can continue without it or skip the tour.':'Waiting for this part of the workspace…'}</p>}
      <div className="flex items-center justify-between gap-2 mt-4"><Button size="sm" variant="ghost" disabled={!onBack} onClick={onBack}>Back</Button>
        {emptyDashboard?<Button size="sm" onClick={onWait}>Continue later</Button>:!interactive || (missing&&delayed)?<Button size="sm" onClick={onNext}>{step.id==='help'?'Finish tour':missing?'Continue without this':'Next'}</Button>:<span className="text-xs text-muted-foreground max-w-40 text-right">Use the highlighted control</span>}
      </div>
    </div>
  </div>,document.body);
}

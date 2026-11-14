import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Compass, Ellipsis, ExternalLink, Feather, Plus, Share, SquarePlus, Tablet } from 'lucide-react';
import { Link } from 'wouter';
import AndroidInstallSteps from '@/components/help/android-install-steps';
import './home-screen-guide.css';

const steps = [
  { title: 'Open Quantum Quill in Safari', text: 'On your iPad, open your usual QQ address in Safari. For the hosted app, use quantquill.io. Open the app itself before continuing, not this instruction page.', caption: 'Start with the QQ app open in Safari.' },
  { title: 'Open the Share menu', text: 'Tap Share — the square with an upward arrow — in Safari’s toolbar. If needed, choose More or View More to see the full list of actions.', caption: 'Look for Safari’s Share button. Its position can vary.' },
  { title: 'Choose Add to Home Screen', text: 'Find Add to Home Screen in the sharing actions. You may need to scroll the list or expand More / View More first.', caption: 'Choose Add to Home Screen from the expanded actions.' },
  { title: 'Enable Open as Web App, then add', text: 'If Open as Web App is shown, turn it on. Check the name is Quantum Quill, then tap Add. Older iPadOS versions may not show this switch.', caption: 'Review the name and web-app option, then tap Add.' },
  { title: 'Open QQ from your Home Screen', text: 'Tap the new Quantum Quill icon. Sign in if prompted, then open your project. Keep an internet connection available and check that your writing has saved.', caption: 'Return to your Home Screen and open Quantum Quill.' },
];

/** Safari controls below are an original, non-interactive teaching illustration. */
function IpadIllustration({ step }: { step: number }) {
  return <div className="ipad-device" aria-hidden="true">
    <div className="ipad-camera" />
    <div className="ipad-screen">
      {step === 4 ? <div className="ipad-home">
        <div className="ipad-home-clock">9:41</div><div className="ipad-home-date">Your writing, one tap away.</div>
        <div className="ipad-home-app"><div className="ipad-qq-icon"><Feather /></div><span>Quantum Quill</span><div className="ipad-callout ipad-callout-home">5 <span>Open QQ</span></div></div>
        <div className="ipad-home-dock"><Compass /><div className="ipad-dock-placeholder"/><div className="ipad-dock-placeholder"/></div>
      </div> : <>
        <div className="ipad-safari-bar"><div className="ipad-safari-history"><ChevronLeft/><ChevronRight/></div><div className="ipad-address"><span>quantquill.io</span></div><div className={`ipad-share-icon ${step===1?'ipad-highlight':''}`}><Share/></div><Plus/></div>
        <img className="ipad-qq-screen" src="/help-assets/ipad-qq-workspace.png" width="1024" height="700" alt="" />
        {step === 0 && <div className="ipad-callout ipad-callout-start">1 <span>Open your writing workspace</span></div>}
        {step === 1 && <><div className="ipad-callout ipad-callout-share">2 <span>Share</span></div><div className="ipad-share-sheet"><div className="ipad-sheet-title"><Feather/>Quantum Quill</div><div className="ipad-share-options"><span>Copy</span><span>Bookmark</span></div><div className="ipad-sheet-row"><Ellipsis/><span>More / View More</span></div></div></>}
        {step === 2 && <div className="ipad-share-sheet ipad-share-expanded"><div className="ipad-sheet-title"><Feather/>Quantum Quill</div><div className="ipad-sheet-row">Copy</div><div className="ipad-sheet-row">Add Bookmark</div><div className="ipad-sheet-row ipad-highlight"><SquarePlus/><strong>Add to Home Screen</strong><span className="ipad-bubble">3</span></div><p>Scroll the actions if needed.</p></div>}
        {step === 3 && <div className="ipad-add-sheet"><div className="ipad-add-header"><span>Cancel</span><strong>Add to Home Screen</strong><span className="ipad-add-action">Add <span className="ipad-bubble">4</span></span></div><div className="ipad-add-identity"><Feather/><div><strong>Quantum Quill</strong><small>quantquill.io</small></div></div><div className="ipad-sheet-row"><strong>Open as Web App</strong><span className="ipad-drawn-switch"><Check/></span></div><p>If this option is shown, leave it on.</p></div>}
      </>}
      <div className="ipad-home-indicator"/>
    </div>
  </div>;
}

export default function HomeScreenGuidePage() {
  const [step, setStep] = useState(0);
  useEffect(() => { const previous=document.title; document.title='Add QQ to your Home Screen · Quantum Quill'; return()=>{document.title=previous;}; }, []);
  return <div className="ipad-guide">
    <a className="ipad-skip" href="#ipad-guide-content">Skip to instructions</a>
    <header className="ipad-guide-header"><Link href="/" className="ipad-brand"><Feather aria-hidden="true"/><span>Quantum Quill</span></Link><Link href="/" className="ipad-back"><ArrowLeft aria-hidden="true"/>Back to QQ</Link></header>
    <main id="ipad-guide-content" tabIndex={-1}>
      <div className="ipad-guide-intro"><p className="ipad-eyebrow"><Tablet aria-hidden="true"/>QUANTUM QUILL ON YOUR DEVICE</p><h1>Your writing.<br/><em>A place on your Home Screen.</em></h1><p>Use Safari on iPad or Chrome on Android to keep Quantum Quill close. Choose your device and follow the steps below.</p></div>
      <nav className="install-platform-nav" aria-label="Choose your device"><a href="#ipad">iPad · Safari</a><a href="#android">Android · Chrome</a></nav>
      <section id="ipad" className="install-platform" aria-labelledby="ipad-title"><h2 id="ipad-title" className="install-platform-title">iPad <span>Safari</span></h2>
      <div className="ipad-guide-layout">
        <figure className="ipad-walkthrough" aria-label="Illustrated iPad walkthrough">
          <IpadIllustration step={step}/>
          <div className="ipad-walkthrough-controls"><button type="button" aria-label="Previous illustration" disabled={step===0} onClick={()=>setStep(step-1)}><ChevronLeft aria-hidden="true"/></button><p role="status" aria-live="polite" aria-atomic="true"><span>STEP {step+1} OF {steps.length}</span>{steps[step].caption}</p><button type="button" aria-label="Next illustration" disabled={step===steps.length-1} onClick={()=>setStep(step+1)}><ChevronRight aria-hidden="true"/></button></div>
          <figcaption>Illustrated Safari controls with an actual QQ screen using fictional writing. Layout and icon appearance vary by iPadOS version. This is a guide, not an iPad installation recording.</figcaption>
        </figure>
        <section className="ipad-instructions" aria-labelledby="ipad-steps-title"><h3 id="ipad-steps-title">Five steps. One familiar workspace.</h3><p className="ipad-steps-hint">Choose a step to see its illustration. The instructions below work on their own.</p>
          <ol role="list">{steps.map((item,index)=><li key={item.title} className={index===step?'ipad-step-active':''}><button type="button" aria-pressed={step===index} aria-label={`Show step ${index+1}: ${item.title}`} onClick={()=>setStep(index)}><span className="ipad-step-number" aria-hidden="true">{index+1}</span><span>{item.title}</span></button><p>{item.text}</p>{index===0&&<a href="/" target="_blank" rel="noopener noreferrer" className="ipad-open-link">Open Quantum Quill <ExternalLink aria-hidden="true"/><span className="sr-only"> in a new tab</span></a>}</li>)}</ol>
        </section>
      </div>
      </section>
      <AndroidInstallSteps/>
      <section className="ipad-guide-notes" aria-label="Before you begin"><div><h2>Same QQ. A quicker way back.</h2><p>These steps add QQ to this device through its browser. No App Store or Google Play download is needed. Adding QQ does not make it available offline, and you may be asked to sign in again.</p></div><div><h2>Need a hand on iPad?</h2><p>Use Safari on the iPad, open Share and expand More or View More. Older versions show the actions differently. If Open as Web App is absent, continue with the options your iPad provides.</p><a href="https://support.apple.com/en-gb/guide/ipad/ipad8f1f7a29/ipados" target="_blank" rel="noopener noreferrer">Read Apple’s iPad instructions <ArrowRight aria-hidden="true"/><span className="sr-only"> in a new tab</span></a></div></section>
    </main>
    <footer className="ipad-guide-footer"><span>Quantum Quill · A world beside your writing.</span><span>iPad & Android setup guide</span></footer>
  </div>;
}

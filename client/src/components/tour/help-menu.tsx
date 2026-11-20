import { HelpCircle, MessageSquare, RotateCcw, Tablet } from 'lucide-react';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { replayTour } from './tour-provider';

/** Shared Help entry point, available even when the dashboard sidebar is collapsed. */
export default function HelpMenu({compact=false}:{compact?:boolean}) {
  return <DropdownMenu><DropdownMenuTrigger asChild><Button data-tour="help" aria-label="Help" variant="ghost" size="sm" className="gap-2 px-2"><HelpCircle className="h-4 w-4"/>{!compact && <span className="hidden sm:inline">Help</span>}</Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end"><DropdownMenuLabel>Help with Quantum Quill</DropdownMenuLabel><DropdownMenuItem onSelect={()=>requestAnimationFrame(replayTour)}><RotateCcw className="mr-2 h-4 w-4"/>Replay tour</DropdownMenuItem><DropdownMenuItem asChild><a href="/help/install" target="_blank" rel="noopener noreferrer"><Tablet className="mr-2 h-4 w-4"/>Add QQ to your Home Screen<span className="sr-only"> (opens in a new tab)</span></a></DropdownMenuItem><DropdownMenuSeparator/><DropdownMenuItem onSelect={()=>window.dispatchEvent(new Event('qq:feedback'))}><MessageSquare className="mr-2 h-4 w-4"/>Private feedback</DropdownMenuItem></DropdownMenuContent>
  </DropdownMenu>;
}

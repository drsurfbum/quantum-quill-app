import { useLayoutEffect, useMemo, useState, type RefObject } from 'react';
import type { StoryBibleEntry } from '@shared/schema';
import { BIBLE_TYPES } from '@shared/bible-catalog';
import { currentAccount } from '@/lib/queryClient';
import { readBibleSelectionCounts, recordBibleSelection } from '@/lib/bible-picker';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { EntryPicker } from './relationships';

function viewportBounds() {
  const viewport = window.visualViewport;
  return { top: viewport?.offsetTop || 0, left: viewport?.offsetLeft || 0, width: viewport?.width || window.innerWidth, height: viewport?.height || window.innerHeight };
}

/** The software keyboard can shrink/pan the visual viewport without resizing the page. */
export function BibleFindDialog({ projectId, entries, open, onOpenChange, onChoose, returnFocus }: {
  projectId: number; entries: StoryBibleEntry[]; open: boolean; onOpenChange: (open: boolean) => void;
  onChoose: (id: number) => void; returnFocus: RefObject<HTMLButtonElement>;
}) {
  const [bounds, setBounds] = useState(viewportBounds);
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => setBounds(viewportBounds());
    update();
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [open]);
  const account = currentAccount();
  const counts = useMemo(() => readBibleSelectionCounts(account, projectId), [account, projectId, open]);
  const width = Math.min(512, bounds.width - 24), height = Math.min(520, bounds.height - 24);
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="flex flex-col gap-3 p-4 overflow-hidden" style={{
      // Avoid transforms on the focused input's ancestors (WebKit caret coordinates).
      transform: 'none', animation: 'none', transition: 'none', width, height, maxWidth: 'none',
      left: bounds.left + (bounds.width - width) / 2, top: bounds.top + (bounds.height - height) / 2,
    }} onCloseAutoFocus={event => {event.preventDefault();returnFocus.current?.focus({preventScroll:true});}}>
      <DialogHeader className="shrink-0 pr-6"><DialogTitle>Find a Story Bible element</DialogTitle><DialogDescription>Open its card without leaving your writing.</DialogDescription></DialogHeader>
      <EntryPicker key={`${account}:${projectId}:${open}`} projectId={projectId} entries={entries} types={BIBLE_TYPES} value={0} includeArchived fillHeight ranked counts={counts} onChange={id => {
        if (account !== currentAccount() || !entries.some(entry => entry.projectId === projectId && entry.id === id)) return;
        recordBibleSelection(account, projectId, id, entries);
        onChoose(id);onOpenChange(false);
      }} />
    </DialogContent>
  </Dialog>;
}

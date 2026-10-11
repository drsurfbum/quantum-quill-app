import { useState } from 'react';
import type { Editor } from '@tiptap/core';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function findMatches(editor: Editor, query: string, matchCase: boolean) {
  const matches: Array<{ from: number; to: number }> = [];
  if (!query) return matches;
  const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase ? 'gu' : 'giu');
  editor.state.doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    // Inline atoms and hard breaks occupy one document position too.
    const text = node.textBetween(0, node.content.size, '', '\ufffc');
    for (const match of text.matchAll(pattern)) matches.push({ from: pos + 1 + match.index!, to: pos + 1 + match.index! + match[0].length });
    return false;
  });
  return matches;
}
export function replaceMatches(editor: Editor, query: string, replacement: string, matchCase: boolean, all: boolean) {
  const matches = findMatches(editor, query, matchCase).filter(match => all || (editor.state.selection.from === match.from && editor.state.selection.to === match.to));
  if (!matches.length) return 0;
  editor.chain().focus().command(({ tr, state }) => {
    for (const match of matches.slice().reverse()) {
      const marks = state.doc.resolve(match.from).nodeAfter?.marks;
      if (replacement) tr.replaceWith(match.from, match.to, state.schema.text(replacement, marks));
      else tr.delete(match.from, match.to);
    }
    return true;
  }).run();
  return matches.length;
}
export function FindReplace({ editor }: { editor: Editor }) {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [notice, setNotice] = useState('');
  const matches = findMatches(editor, query, matchCase);
  const next = () => {
    const match = matches.find(match => match.from >= editor.state.selection.to) || matches[0];
    if (match) editor.chain().focus().setTextSelection(match).scrollIntoView().run();
    setNotice(match ? `Match ${matches.indexOf(match) + 1} of ${matches.length}` : 'No matches');
  };
  const replace = (all: boolean) => { const count = replaceMatches(editor, query, replacement, matchCase, all); setNotice(count ? `Replaced ${count} ${count === 1 ? 'match' : 'matches'}. Undo is available.` : 'Choose Find next to select a match first.'); };
  return <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Find and replace" title="Find and replace"><Search className="h-4 w-4" /></Button></PopoverTrigger>
    <PopoverContent className="w-80 space-y-3" onCloseAutoFocus={event => event.preventDefault()} onFocusOutside={event => event.preventDefault()}>
      <p className="font-medium">Find and replace</p>
      <div className="space-y-2"><Label htmlFor="write-find">Find in this chapter</Label><Input id="write-find" value={query} onChange={event => { setQuery(event.target.value); setNotice(''); }} onKeyDown={event => { if (event.key === 'Enter') next(); }} /></div>
      <div className="space-y-2"><Label htmlFor="write-replace">Replace with</Label><Input id="write-replace" value={replacement} onChange={event => setReplacement(event.target.value)} /></div>
      <Label className="flex items-center gap-2"><input type="checkbox" checked={matchCase} onChange={event => setMatchCase(event.target.checked)} />Match case</Label>
      <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={!matches.length} onClick={next}>Find next</Button><Button size="sm" variant="outline" disabled={!matches.length} onClick={() => replace(false)}>Replace</Button><Button size="sm" variant="outline" disabled={!matches.length} onClick={() => replace(true)}>Replace all</Button></div>
      <p role="status" className="text-xs text-muted-foreground">{notice || (query ? `${matches.length} matches` : 'Search only this chapter.')}</p>
    </PopoverContent>
  </Popover>;
}

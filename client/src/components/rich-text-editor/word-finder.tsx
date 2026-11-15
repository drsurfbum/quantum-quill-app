import { useEffect, useId, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { BookOpen, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { lookupWord, validWordQuery, WORDNET_ROOT, type WordSense } from '@/lib/wordnet';
import { captureWordSelection, replaceWordSelection, selectionIsCurrent, type WordSelection } from './word-selection';

const parts: Record<string, string> = { n: 'noun', v: 'verb', a: 'adjective', s: 'adjective', r: 'adverb' };

export function WordFinder({ editor }: { editor: Editor }) {
  const id = useId(), input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [offset, setOffset] = useState(4);
  const [open, setOpen] = useState(false), [query, setQuery] = useState('');
  const [resultQuery, setResultQuery] = useState(''), [senses, setSenses] = useState<WordSense[]>([]);
  const [loading, setLoading] = useState(false), [error, setError] = useState('');
  const [notice, setNotice] = useState(''), [candidate, setCandidate] = useState('');
  const [limit, setLimit] = useState(10), [target, setTarget] = useState<WordSelection | null>(null);
  const request = useRef<AbortController | null>(null);
  const returnToEditor = useRef(false);
  const original = useRef<{ doc: typeof editor.state.doc; from: number; to: number } | null>(null);
  const results = useRef<HTMLDivElement>(null);

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    const position = () => {
      const viewport = window.visualViewport;
      setOffset((viewport?.height ?? window.innerHeight) < 600
        ? (viewport?.offsetTop ?? 0) + 12 - (trigger.current?.getBoundingClientRect().bottom ?? 0) : 4);
    };
    position(); window.addEventListener('resize', position); window.visualViewport?.addEventListener('resize', position);
    return () => { window.removeEventListener('resize', position); window.visualViewport?.removeEventListener('resize', position); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const changed = () => {
      if (target && !selectionIsCurrent(editor, target)) {
        setTarget(null); setCandidate('');
        setNotice('The writing or selection changed. Select the word and reopen Word Finder to replace it.');
      }
    };
    editor.on('transaction', changed);
    return () => { editor.off('transaction', changed); };
  }, [editor, open, target]);

  async function search(value: string) {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setCandidate(''); setSenses([]); setError(''); setResultQuery(''); setLimit(10);
    if (!validWordQuery(value)) { setLoading(false); setError('Enter an English word or short expression (up to 80 characters).'); return; }
    setLoading(true);
    try {
      const found = await lookupWord(value, controller.signal);
      if (controller.signal.aborted) return;
      setSenses(found); setResultQuery(value.trim());
      results.current?.scrollTo({ top: 0 });
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'The dictionary could not load. Please try again.');
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }
  function changeOpen(value: boolean) {
    if (value) {
      const selection = captureWordSelection(editor);
      const { from, to } = editor.state.selection;
      original.current = { doc: editor.state.doc, from, to }; returnToEditor.current = true;
      const selected = editor.state.doc.textBetween(from, to, '', '\ufffc');
      const initial = validWordQuery(selected) ? selected.trim() : '';
      setTarget(selection); setQuery(initial); setCandidate(''); setError(''); setSenses([]); setResultQuery('');
      setNotice(selection ? '' : 'Look up a word. To replace text, select a word with consistent formatting, outside links, then reopen.');
      if (initial) void search(initial);
    } else { request.current?.abort(); setLoading(false); }
    setOpen(value);
  }
  function replace() {
    if (!replaceWordSelection(editor, target, candidate)) {
      setTarget(null); setCandidate(''); setNotice('Selection changed. Select the word and reopen Word Finder.'); return;
    }
    original.current = { doc: editor.state.doc, from: editor.state.selection.from, to: editor.state.selection.to };
    changeOpen(false);
  }
  const wordButtons = (words: string[], group: string) => <div className="flex flex-wrap gap-1.5" aria-label={group}>
    {words.map(word => <Button key={word} type="button" size="sm" variant={candidate === word ? 'secondary' : 'outline'}
      className="h-auto min-h-8 whitespace-normal break-words px-2 py-1 text-xs" aria-pressed={candidate === word}
      onClick={() => setCandidate(word)}>{word}</Button>)}
  </div>;
  return <Popover open={open} onOpenChange={changeOpen}>
    <PopoverTrigger asChild><Button ref={trigger} type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0"
      aria-label="Word Finder" title="Word Finder: dictionary & thesaurus" onMouseDown={event => event.preventDefault()}><BookOpen className="h-4 w-4" /></Button></PopoverTrigger>
    <PopoverContent align="end" side="bottom" sideOffset={offset} collisionPadding={12} aria-labelledby={`${id}-title`}
      className="flex w-[min(25rem,calc(100vw-1.5rem))] max-h-[min(36rem,var(--radix-popover-content-available-height))] flex-col gap-3 overflow-y-auto p-3"
      onOpenAutoFocus={event => { event.preventDefault(); input.current?.focus({ preventScroll: true }); }}
      onInteractOutside={() => { returnToEditor.current = false; }}
      onCloseAutoFocus={event => {
        event.preventDefault(); const saved = original.current;
        if (returnToEditor.current && saved && !editor.isDestroyed && editor.state.doc === saved.doc
          && editor.state.selection.from === saved.from && editor.state.selection.to === saved.to) editor.view.focus();
      }}>
      <div className="flex shrink-0 items-center justify-between"><h2 id={`${id}-title`} className="font-semibold">Word Finder</h2>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label="Close Word Finder" onClick={() => changeOpen(false)}><X className="h-4 w-4" /></Button></div>
      <form className="shrink-0 space-y-1" onSubmit={event => { event.preventDefault(); void search(query); }}>
        <Label htmlFor={`${id}-query`}>English word or expression</Label>
        <div className="flex gap-2"><Input id={`${id}-query`} ref={input} value={query} maxLength={80} autoComplete="off" spellCheck={false}
          onChange={event => { request.current?.abort(); setLoading(false); setQuery(event.target.value); setCandidate(''); setResultQuery(''); setSenses([]); setError(''); }} />
          <Button type="submit" variant="outline" size="icon" aria-label="Look up word" disabled={!query.trim()}><Search className="h-4 w-4" /></Button></div>
      </form>
      <div role="status" aria-live="polite" className="shrink-0 text-xs text-muted-foreground">
        {loading ? 'Looking up…' : error || (resultQuery ? senses.length ? `${senses.length} meanings for “${resultQuery}”. Choose a word to preview a replacement.` : `No entry for “${resultQuery}”. Try the base form or a different spelling.` : 'Definitions and synonyms, grouped by meaning.')}
      </div>
      <div ref={results} className="min-h-16 flex-1 space-y-3 overflow-y-auto overscroll-contain" aria-label="Word meanings" aria-busy={loading}>
        {senses.slice(0, limit).map((sense, index) => <section key={sense.id} className="space-y-2 rounded-md border p-3">
          <h3 className="text-sm font-medium">{index + 1}. {sense.lemma} <span className="font-normal text-muted-foreground">· {parts[sense.pos] || sense.pos}</span></h3>
          <p className="text-sm">{sense.definition}</p>
          <div className="space-y-1"><p className="text-xs font-medium">Synonyms</p>{sense.synonyms.length ? wordButtons(sense.synonyms, `Synonyms for meaning ${index + 1}`) : <p className="text-xs text-muted-foreground">No synonyms listed.</p>}</div>
          <div className="space-y-1"><p className="text-xs font-medium">Antonyms</p>{sense.antonyms.length ? wordButtons(sense.antonyms, `Antonyms for meaning ${index + 1}`) : <p className="text-xs text-muted-foreground">No antonyms listed.</p>}</div>
          <details className="text-xs"><summary className="cursor-pointer rounded py-1 font-medium focus-visible:ring-2">Examples & related concepts</summary>
            <div className="mt-2 space-y-2">{sense.examples.length ? <ul className="list-disc space-y-1 pl-4">{sense.examples.map((example, i) => <li key={i}>{example}</li>)}</ul> : <p className="text-muted-foreground">No examples listed.</p>}
              {Object.entries(sense.related).map(([label, words]) => <div key={label}><p className="mb-1 font-medium">{label}</p><div className="flex flex-wrap gap-1">{words.map(word => <button type="button" key={word} className="rounded px-1 py-0.5 text-left text-primary underline focus-visible:ring-2" onClick={() => { setQuery(word); void search(word); }}>{word}</button>)}</div></div>)}
              {!Object.keys(sense.related).length && <p className="text-muted-foreground">No related concepts listed.</p>}
            </div>
          </details>
        </section>)}
        {senses.length > limit && <Button type="button" variant="outline" size="sm" onClick={() => setLimit(value => value + 10)}>Show more meanings</Button>}
      </div>
      <div className="shrink-0 space-y-2 border-t pt-2">
        <p className="break-words text-xs">{target ? candidate ? <>Replace “{target.text}” with <strong>“{candidate}”</strong>?</> : <>Selected: “{target.text}”. Choose a synonym or antonym.</> : notice}</p>
        <Button type="button" size="sm" className="w-full" disabled={!target || !candidate || candidate === target.text} onClick={replace}>Replace selection</Button>
        <p className="text-xs text-muted-foreground">Replacement is undoable. Lookups stay in your browser.</p>
        <p className="text-[11px] leading-4 text-muted-foreground">Open English WordNet 2025 / Princeton WordNet. Adapted for lookup.{' '}
          <a href={`${WORDNET_ROOT}/LICENSE.txt`} target="_blank" rel="noreferrer" className="underline">CC BY 4.0 & credits</a>{' · '}
          <a href={`${WORDNET_ROOT}/WNDB_License.txt`} target="_blank" rel="noreferrer" className="underline">Princeton license</a>
        </p>
      </div>
    </PopoverContent>
  </Popover>;
}

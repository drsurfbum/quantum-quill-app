import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Feather, BookmarkPlus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';
import type { SavedWritingStyle } from '@shared/schema';
import { QUILL_STYLES, WRITING_FONTS, type SaveWritingStyle } from '@shared/writing-styles';
import { applyWritingStyle, currentWritingStyle } from './formatting';

export function StyleGallery({ editor, compact = false }: { editor: Editor; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const client = useQueryClient();
  const { data: user } = useQuery<{ id: number }>({ queryKey: ['/api/user'], enabled: false });
  const queryKey = ['/api/writing-styles', user?.id];
  const styles = useQuery<SavedWritingStyle[]>({ queryKey, enabled: open && !!user, staleTime: 0 });
  const save = useMutation({
    mutationFn: async (style: SaveWritingStyle) => (await apiRequest('POST', '/api/writing-styles', style)).json(),
    onSuccess: async (_data, variables) => { await client.invalidateQueries({ queryKey }); setNotice(`“${variables.name}” saved to your account.`); setName(''); setError(''); },
    onError: (error: Error) => { setError(error.message); setNotice(''); },
  });
  const remove = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/writing-styles/${id}`),
    onSuccess: async () => { await client.invalidateQueries({ queryKey }); setNotice('Style removed. Formatting already applied to your writing is kept.'); setError(''); },
    onError: (error: Error) => { setError(error.message); setNotice(''); },
  });
  const apply = (definition: SavedWritingStyle['definition']) => { applyWritingStyle(editor, definition); setOpen(false); };
  return <Dialog open={open} onOpenChange={value => { setOpen(value); setNotice(''); setError(''); }}>
    <DialogTrigger asChild><Button variant="outline" size="sm" className={`quill-styles-trigger shrink-0 gap-2 ${compact ? "h-8 w-8 p-0" : ""}`} title="Quill styles"><Feather className="h-4 w-4" /><span className={compact ? "sr-only" : ""}>Quill styles</span></Button></DialogTrigger>
    <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto" onCloseAutoFocus={event => { event.preventDefault(); editor.commands.focus(); }}>
      <DialogHeader>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">The Quantum Quill collection</p>
        <DialogTitle className="text-2xl font-serif">Give your words a setting.</DialogTitle>
        <DialogDescription>Apply a style to selected text, or to the current paragraph. Literary homages and genre moods, expressed through typography.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {QUILL_STYLES.map(style => <button key={style.id} type="button" onClick={() => apply(style.definition)} className="quill-style-card flex flex-col items-start rounded-lg border p-3 text-left transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Apply ${style.name}`}>
          <span className="text-sm font-semibold">{style.name}</span>
          <span className="block mt-1 text-xs text-muted-foreground">{style.mood}</span>
          <span className="block mt-3 text-base leading-relaxed" style={{ fontFamily: WRITING_FONTS.find(font => font.id === style.definition.font)!.family, fontStyle: style.definition.italic ? 'italic' : 'normal' }}>{style.sample}</span>
        </button>)}
      </div>
      <section className="border-t pt-4 space-y-3" aria-labelledby="your-quill-styles">
        <h3 id="your-quill-styles" className="font-semibold">Your saved styles</h3>
        <p className="text-sm text-muted-foreground">Capture the formatting at your cursor. Styles are saved to your account for all your projects. Saving the same name updates that style.</p>
        <form className="flex flex-wrap items-end gap-2" onSubmit={event => { event.preventDefault(); if (name.trim() && user) save.mutate({ name: name.trim(), definition: currentWritingStyle(editor) }); }}>
          <div className="flex-1 min-w-40 space-y-2"><Label htmlFor="quill-style-name">Style name</Label><Input id="quill-style-name" placeholder="e.g. My chapter opening" maxLength={80} value={name} onChange={event => setName(event.target.value)} /></div>
          <Button type="submit" disabled={!name.trim() || save.isPending || !user}><BookmarkPlus className="h-4 w-4 mr-2" />{save.isPending ? 'Saving…' : 'Save current style'}</Button>
        </form>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {notice && <p role="status" className="text-sm">{notice}</p>}
        {styles.isLoading && <p className="text-sm text-muted-foreground">Loading your styles…</p>}
        {styles.isError && <div role="alert" className="text-sm text-destructive">Your saved styles could not be loaded. <Button variant="link" onClick={() => styles.refetch()}>Retry</Button></div>}
        {styles.data?.length === 0 && <p className="text-sm text-muted-foreground">Your first saved style will appear here.</p>}
        <div className="grid gap-2 sm:grid-cols-2">{styles.data?.map(style => <div key={style.id} className="flex items-center gap-1 rounded-md border p-1">
          <Button variant="ghost" className="flex-1 min-w-0 justify-start truncate" onClick={() => apply(style.definition)} aria-label={`Apply saved style ${style.name}`} style={{ fontFamily: WRITING_FONTS.find(font => font.id === style.definition.font)?.family }}>{style.name}</Button>
          <Button variant="ghost" size="icon" aria-label={`Remove saved style ${style.name}`} title="Remove saved style" disabled={remove.isPending} onClick={() => remove.mutate(style.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>)}</div>
      </section>
    </DialogContent>
  </Dialog>;
}

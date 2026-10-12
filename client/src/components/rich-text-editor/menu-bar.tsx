import { useState, type ReactNode } from 'react';
import { SaveStatus } from '@/components/save-status';
import { type Editor } from '@tiptap/react';
import { Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, Quote, Link, Image as ImageIcon, Table, Maximize, Minimize, Undo2, Redo2, Superscript, Subscript, Eraser, IndentIncrease, IndentDecrease, Palette, Highlighter, ChevronDown, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { WRITING_FONTS } from '@shared/writing-styles';
import { currentWritingStyle, setParagraphAppearance, clearWritingFormatting } from './formatting';
import { StyleGallery } from './style-gallery';
import { FindReplace } from './search';

interface EditorMenuBarProps {
  editor: Editor;
  wordCount: number;
  saveStatus: import('@/lib/save-queue').SaveStatus;
  onRetry: () => Promise<boolean>;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}
function Tool({ label, children, active, disabled, onClick }: { label: string; children: ReactNode; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return <Button type="button" variant="ghost" size="icon" className={`h-8 w-8 shrink-0 ${active ? 'bg-muted' : ''}`} title={label} aria-label={label} aria-pressed={active} disabled={disabled} onMouseDown={event => event.preventDefault()} onClick={onClick}>{children}</Button>;
}
const selectClass = 'h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
function Colors({ editor, highlight = false }: { editor: Editor; highlight?: boolean }) {
  const attribute = highlight ? 'backgroundColor' : 'color';
  const label = highlight ? 'Highlight color' : 'Text color';
  const value = currentWritingStyle(editor)[highlight ? 'highlight' : 'color'];
  const colors = highlight ? ['#fef08a', '#bbf7d0', '#bfdbfe', '#e9d5ff', '#fecdd3', '#fed7aa'] : ['#111827', '#475569', '#b91c1c', '#c2410c', '#166534', '#1d4ed8', '#7e22ce', '#ffffff'];
  const set = (color: string | null) => editor.chain().focus().setMark('textAppearance', { [attribute]: color }).run();
  return <Popover><PopoverTrigger asChild><Button variant="ghost" size="sm" className="h-8 gap-1 px-2" aria-label={label} title={label}>{highlight ? <Highlighter className="h-4 w-4" /> : <Palette className="h-4 w-4" />}<span className="h-3 w-3 rounded-sm border" style={{ background: value || (highlight ? '#fef08a' : 'currentColor') }} /><ChevronDown className="h-3 w-3" /></Button></PopoverTrigger>
    <PopoverContent className="w-64 space-y-3" onCloseAutoFocus={event => event.preventDefault()} onFocusOutside={event => event.preventDefault()}>
      <p className="font-medium text-sm">{label}</p>
      <div className="flex flex-wrap gap-2">{colors.map(color => <button type="button" key={color} title={color} aria-label={`${label} ${color}`} aria-pressed={value === color} className="h-7 w-7 rounded border border-muted-foreground/40 focus-visible:ring-2 focus-visible:ring-ring" style={{ background: color }} onClick={() => set(color)} />)}</div>
      <Label className="flex items-center justify-between gap-2">Custom color<input type="color" aria-label={`Custom ${label.toLowerCase()}`} value={value || colors[0]} onChange={event => set(event.target.value)} className="h-8 w-12 cursor-pointer rounded border p-1" /></Label>
      <Button variant="outline" size="sm" onClick={() => set(null)}>{highlight ? 'Remove highlight' : 'Automatic text color'}</Button>
    </PopoverContent></Popover>;
}
export default function EditorMenuBar({ editor, wordCount, saveStatus, onRetry, isFullscreen = false, onToggleFullscreen }: EditorMenuBarProps) {
  const style = currentWritingStyle(editor);
  const [insertOpen, setInsertOpen] = useState(false);
  const [dialog, setDialog] = useState<'link' | 'image' | null>(null);
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [urlError, setUrlError] = useState('');
  const heading = [1, 2, 3].find(level => editor.isActive('heading', { level })) || 0;
  const block = editor.getAttributes(heading ? 'heading' : 'paragraph');
  const editLink = () => { setInsertOpen(false); setUrl(editor.getAttributes('link').href || ''); setUrlError(''); setDialog('link'); };
  const insert = () => {
    const value = url.trim();
    try {
      const parsed = new URL(value, window.location.origin);
      if (!value || !(dialog === 'image' ? ['http:', 'https:'] : ['http:', 'https:', 'mailto:']).includes(parsed.protocol)) throw new Error();
      if (dialog === 'image') editor.chain().focus().setImage({ src: parsed.href, alt }).run();
      else editor.chain().focus().extendMarkRange('link').setLink({ href: parsed.href }).run();
      setDialog(null);
    } catch { setUrlError(dialog === 'image' ? 'Enter an HTTP or HTTPS image URL.' : 'Enter a web address or a mailto: email link.'); }
  };
  return <div className="shrink-0 border-b bg-background" aria-label="Write formatting tools">
    <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
      <StyleGallery editor={editor} />
      <span className="h-5 w-px bg-border mx-1" aria-hidden="true" />
      <select aria-label="Paragraph style" title="Paragraph style" className={`${selectClass} w-32`} value={heading} onChange={event => { const level = Number(event.target.value); if (level) editor.chain().focus().setHeading({ level: level as 1 | 2 | 3 }).run(); else editor.chain().focus().setParagraph().run(); }}>
        <option value="0">Paragraph</option>{[1, 2, 3].map(level => <option key={level} value={level}>Heading {level}</option>)}
      </select>
      <select aria-label="Font family" title="Font family" className={`${selectClass} w-36`} value={style.font} onChange={event => editor.chain().focus().setMark('textAppearance', { fontFamily: WRITING_FONTS.find(font => font.id === event.target.value)!.family }).run()}>
        {WRITING_FONTS.map(font => <option key={font.id} value={font.id}>{font.name}</option>)}
      </select>
      <select aria-label="Font size" title="Font size (points)" className={`${selectClass} w-[72px]`} value={style.size} onChange={event => editor.chain().focus().setMark('textAppearance', { fontSize: `${event.target.value}pt` }).run()}>
        {[...new Set([8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72, style.size])].sort((a, b) => a - b).map(size => <option key={size} value={size}>{size} pt</option>)}
      </select>
    </div>
    <div className="flex flex-wrap items-center gap-x-1 gap-y-2 px-2 py-2">
      <div className="flex items-center" role="group" aria-label="History">
        <Tool label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 className="h-4 w-4" /></Tool>
        <Tool label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 className="h-4 w-4" /></Tool>
      </div>
      <span className="h-5 w-px bg-border mx-1" aria-hidden="true" />
      <div className="flex items-center" role="group" aria-label="Text emphasis">
        <Tool label="Bold" active={style.bold} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></Tool>
        <Tool label="Italic" active={style.italic} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></Tool>
        <Tool label="Underline" active={style.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}><Underline className="h-4 w-4" /></Tool>
        <Tool label="Strikethrough" active={style.strike} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></Tool>
        <Tool label="Superscript" active={editor.isActive('scriptPosition', { kind: 'sup' })} onClick={() => editor.chain().focus().toggleMark('scriptPosition', { kind: 'sup' }).run()}><Superscript className="h-4 w-4" /></Tool>
        <Tool label="Subscript" active={editor.isActive('scriptPosition', { kind: 'sub' })} onClick={() => editor.chain().focus().toggleMark('scriptPosition', { kind: 'sub' }).run()}><Subscript className="h-4 w-4" /></Tool>
      </div>
      <Colors editor={editor} /><Colors editor={editor} highlight />
      <Tool label="Clear formatting" onClick={() => clearWritingFormatting(editor)}><Eraser className="h-4 w-4" /></Tool>
      <span className="h-5 w-px bg-border mx-1" aria-hidden="true" />
      <Popover><PopoverTrigger asChild><Button variant="ghost" size="sm" className="h-8 gap-1 px-2">Paragraph<ChevronDown className="h-3 w-3" /></Button></PopoverTrigger>
        <PopoverContent className="w-72 space-y-4" onCloseAutoFocus={event => event.preventDefault()} onFocusOutside={event => event.preventDefault()}>
          <p className="font-medium text-sm">Paragraph formatting</p>
          <div className="flex gap-1" role="group" aria-label="Text alignment">{([{ value: 'left', label: 'Align left', icon: AlignLeft }, { value: 'center', label: 'Align center', icon: AlignCenter }, { value: 'right', label: 'Align right', icon: AlignRight }, { value: 'justify', label: 'Justify', icon: AlignJustify }] as const).map(({ value, label, icon: Icon }) => <Tool key={value} label={label} active={style.alignment === value} onClick={() => editor.chain().focus().setTextAlign(value).run()}><Icon className="h-4 w-4" /></Tool>)}</div>
          <Label className="flex items-center justify-between gap-3">Line spacing<select aria-label="Line spacing" className={selectClass} value={style.lineHeight} onChange={event => setParagraphAppearance(editor, { lineHeight: event.target.value })}>{['1', '1.15', '1.5', '1.7', '2'].map(value => <option key={value}>{value}</option>)}</select></Label>
          <Label className="flex items-center justify-between gap-3">Space after<select aria-label="Space after paragraph" className={selectClass} value={style.spaceAfter} onChange={event => setParagraphAppearance(editor, { spaceAfter: `${event.target.value}px` })}>{['0', '8', '16', '24'].map(value => <option value={value} key={value}>{value} px</option>)}</select></Label>
          <Button variant={style.firstLine ? 'secondary' : 'outline'} size="sm" aria-pressed={style.firstLine} onClick={() => setParagraphAppearance(editor, { firstLine: !style.firstLine })}>Indent first line</Button>
          <div className="flex gap-1"><Tool label="Decrease indent" onClick={() => editor.isActive('listItem') ? editor.chain().focus().liftListItem('listItem').run() : setParagraphAppearance(editor, { indent: Math.max(0, (block.indent || 0) - 1) })}><IndentDecrease className="h-4 w-4" /></Tool><Tool label="Increase indent" onClick={() => editor.isActive('listItem') ? editor.chain().focus().sinkListItem('listItem').run() : setParagraphAppearance(editor, { indent: Math.min(8, (block.indent || 0) + 1) })}><IndentIncrease className="h-4 w-4" /></Tool></div>
        </PopoverContent>
      </Popover>
      <Tool label="Bulleted list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></Tool>
      <Tool label="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></Tool>
      <Tool label="Block quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4" /></Tool>
      <Popover open={insertOpen} onOpenChange={setInsertOpen}><PopoverTrigger asChild><Button variant="ghost" size="sm" className="h-8 gap-1 px-2"><Plus className="h-4 w-4" />Insert<ChevronDown className="h-3 w-3" /></Button></PopoverTrigger>
        <PopoverContent className="w-56 grid gap-1" onCloseAutoFocus={event => event.preventDefault()} onFocusOutside={event => event.preventDefault()}>
          <Button variant="ghost" className="justify-start" onClick={editLink}><Link className="mr-2 h-4 w-4" />{editor.isActive('link') ? 'Edit link' : 'Link'}</Button>
          {editor.isActive('link') && <Button variant="ghost" className="justify-start" onClick={() => { editor.chain().focus().extendMarkRange('link').unsetLink().run(); setInsertOpen(false); }}>Remove link</Button>}
          <Button variant="ghost" className="justify-start" onClick={() => { setInsertOpen(false); setDialog('image'); setUrl(''); setAlt(''); setUrlError(''); }}><ImageIcon className="mr-2 h-4 w-4" />Image from URL</Button>
          <Button variant="ghost" className="justify-start" onClick={() => { editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); setInsertOpen(false); }}><Table className="mr-2 h-4 w-4" />Table (3 × 3)</Button>
          <Button variant="ghost" className="justify-start" onClick={() => { editor.chain().focus().setHorizontalRule().run(); setInsertOpen(false); }}><Minus className="mr-2 h-4 w-4" />Scene divider</Button>
        </PopoverContent>
      </Popover>
      <FindReplace editor={editor} />
      </div>
    <div data-writing-status-bar className="flex h-12 shrink-0 items-center justify-end gap-3 border-t px-3 text-xs text-muted-foreground">
        <span className="whitespace-nowrap tabular-nums" title={`${editor.getText().length} characters`}>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
        <SaveStatus status={saveStatus} retry={onRetry} stable />
        <Tool label={isFullscreen ? 'Exit focus mode' : 'Focus mode'} onClick={() => onToggleFullscreen?.()}>{isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}</Tool>
    </div>
    {editor.isActive('table') && <div className="flex flex-wrap gap-1 border-t bg-muted/40 px-3 py-2" role="group" aria-label="Table tools">
      {([
        ['Add row above', () => editor.chain().focus().addRowBefore().run()], ['Add row below', () => editor.chain().focus().addRowAfter().run()],
        ['Add column left', () => editor.chain().focus().addColumnBefore().run()], ['Add column right', () => editor.chain().focus().addColumnAfter().run()],
        ['Remove row', () => editor.chain().focus().deleteRow().run()], ['Remove column', () => editor.chain().focus().deleteColumn().run()],
        ['Header row', () => editor.chain().focus().toggleHeaderRow().run()], ['Merge cells', () => editor.chain().focus().mergeCells().run()],
        ['Split cell', () => editor.chain().focus().splitCell().run()], ['Remove table', () => editor.chain().focus().deleteTable().run()],
      ] as const).map(([label, action]) => <Button key={label} size="sm" variant="outline" className="h-7 text-xs" onMouseDown={event => event.preventDefault()} onClick={action}>{label}</Button>)}
    </div>}
    <Dialog open={dialog !== null} onOpenChange={open => { if (!open) setDialog(null); }}>
      <DialogContent onCloseAutoFocus={event => { event.preventDefault(); editor.commands.focus(); }}>
        <DialogHeader><DialogTitle>{dialog === 'image' ? 'Insert image' : 'Add or edit link'}</DialogTitle><DialogDescription>{dialog === 'image' ? 'Use a direct image URL and a short description.' : 'The link applies to your selected text or the text you type next.'}</DialogDescription></DialogHeader>
        <form className="space-y-4" onSubmit={event => { event.preventDefault(); insert(); }}>
          <div className="space-y-2"><Label htmlFor="write-insert-url">{dialog === 'image' ? 'Image URL' : 'Link URL'}</Label><Input id="write-insert-url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://…" /></div>
          {dialog === 'image' && <div className="space-y-2"><Label htmlFor="write-image-alt">Image description</Label><Input id="write-image-alt" value={alt} onChange={event => setAlt(event.target.value)} placeholder="Describe the image" /></div>}
          {urlError && <p role="alert" className="text-sm text-destructive">{urlError}</p>}
          <Button type="submit" disabled={!url.trim()}>{dialog === 'image' ? 'Insert image' : 'Apply link'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  </div>;
}

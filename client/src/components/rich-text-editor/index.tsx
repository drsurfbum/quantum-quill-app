import { TextSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/core";
import { BibleReference } from "./bible-reference";
import InlineLinker from "./inline-linker";
import { bibleLinkId, BIBLE_LINK_ATTRIBUTE } from "@shared/writing-links";
import { SaveStatus } from "@/components/save-status";
import { Button } from "@/components/ui/button";
import { Maximize, Minimize } from "lucide-react";
import { editorContent } from "@/lib/editor-content";
import { useAutosave, withPendingEdits } from "@/hooks/use-autosave";
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import Image from '@tiptap/extension-image';
import { useEffect, useState, useRef, useId } from 'react';
import EditorMenuBar from './menu-bar';
import WritingSurface from './editor-content';
import { writingExtensions } from './formatting';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  resource?: "chapters" | "scenes";
  content: string | null;
  chapterId: number | string;
  revision: number;
  title?: string;
  projectId: number;
  onChange?: (content: string) => void;
  onOpenEntry?: (id:number) => void;
  onEditorReady?: (editor:Editor|null) => void;
}

export default function RichTextEditor({
  resource = "chapters",
  content = "",
  chapterId,
  revision,
  title = "Chapter",
  projectId,
  onOpenEntry, onEditorReady, onChange
}: RichTextEditorProps) {
  const labelId = useId();
  const [linkRequest,setLinkRequest] = useState(0);
  const openEntry = useRef(onOpenEntry); openEntry.current = onOpenEntry;
  const [wordCount, setWordCount] = useState(0);
  const autosave = useAutosave(`/api/${resource}/${chapterId}`, `/api/projects/${projectId}/${resource}`);
  const saveStatus = autosave.status;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    parseOptions: { preserveWhitespace: "full" },
    editorProps: {
      handleClick(view, pos, event) {
        const target = (event.target as HTMLElement)?.closest?.(`span[${BIBLE_LINK_ATTRIBUTE}]`);
        const id = bibleLinkId(target?.getAttribute(BIBLE_LINK_ATTRIBUTE));
        if (!id || !openEntry.current) return false;
        view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc,pos)));
        setIsFullscreen(false);openEntry.current(id); return true;
      },
      handleKeyDown(view,event) {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          const mark = view.state.selection.$from.marks().find(m=>m.type.name === "bibleReference");
          const id = bibleLinkId(mark?.attrs.entryId);
          if(id && openEntry.current) {event.preventDefault();setIsFullscreen(false);openEntry.current(id);return true;}
        }
        return false;
      },
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": labelId,
        "data-placeholder": resource === "scenes" ? "Start writing your scene here…" : "Start writing your chapter here…",
      },
    },
    extensions: [
      ...writingExtensions,
      BibleReference,
      StarterKit.configure({ heading: false }),
      Heading.configure({
        levels: [1, 2, 3],
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image,
    ],
    content: editorContent(withPendingEdits(`/api/${resource}/${chapterId}`, { content, projectId, revision, title }).content),
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      calculateWordCount(editor.getText());
      handleContentChange(html);
      if (onChange) {
        onChange(html);
      }
    },
  });

  useEffect(()=>{if(editor) onEditorReady?.(editor);return ()=>onEditorReady?.(null);},[editor,onEditorReady]);

  // Calculate word count
  const calculateWordCount = (text: string) => {
    const words = text.trim().split(/\s+/);
    setWordCount(text ? words.length : 0);
  };

  const handleContentChange = (html: string) => { autosave.save({ content: html }); };
  useEffect(() => {
    if (!editor) return;
    const initial = withPendingEdits(`/api/${resource}/${chapterId}`, { content, projectId, revision, title }).content || "";
    editor.commands.setContent(editorContent(initial), false, { preserveWhitespace: "full" });
    calculateWordCount(editor.getText());
  }, [editor, chapterId, resource]);

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
    // Focus the editor after toggling fullscreen
    setTimeout(() => {
      if (editor) {
        editor.commands.focus();
      }
    }, 0);
  };

  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleEscapeKey);
    return () => window.removeEventListener('keydown', handleEscapeKey);
  }, [isFullscreen]);

  if (!editor) {
    return null;
  }

  return (
    <div
      ref={editorContainerRef}
      className={cn(
        "flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden bg-muted/20 writing-editor",
        isFullscreen ? "fixed inset-0 z-50 bg-white dark:bg-neutral-900" : ""
      )}
    >
      <EditorMenuBar editor={editor} onLinkEntry={()=>setLinkRequest(n=>n+1)} />
      <InlineLinker editor={editor} projectId={projectId} request={linkRequest} onOpenEntry={id=>{setIsFullscreen(false);onOpenEntry?.(id);}} />
      <div data-writing-scroll className="flex-1 min-h-0 min-w-0 overflow-y-auto [scrollbar-gutter:stable] p-3 md:p-4">
        <WritingSurface editor={editor} label={resource === "scenes" ? "Scene text" : "Chapter text"} labelId={labelId} />
      </div>
      <div data-writing-status-bar className="flex h-10 shrink-0 items-center justify-end gap-2 border-t bg-background px-2 text-xs text-muted-foreground">
        <span className="mr-auto whitespace-nowrap tabular-nums" title={`${editor.getText().length} characters`}>{wordCount} {wordCount === 1 ? "word" : "words"}</span>
        <SaveStatus status={saveStatus} retry={autosave.flush} stable />
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={isFullscreen ? "Exit focus mode" : "Focus mode"} title={isFullscreen ? "Exit focus mode" : "Focus mode"} onClick={toggleFullscreen}>{isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}</Button>
      </div>
    </div>
  );
}

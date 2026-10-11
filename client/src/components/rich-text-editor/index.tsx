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
  content: string | null;
  chapterId: number | string;
  projectId: number;
  onChange?: (content: string) => void;
}

export default function RichTextEditor({ 
  content = "",
  chapterId,
  projectId,
  onChange 
}: RichTextEditorProps) {
  const labelId = useId();
  const [wordCount, setWordCount] = useState(0);
  const autosave = useAutosave(`/api/chapters/${chapterId}`, `/api/projects/${projectId}/chapters`);
  const saveStatus = autosave.status;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    parseOptions: { preserveWhitespace: "full" },
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": labelId,
        "data-placeholder": "Start writing your chapter here…",
      },
    },
    extensions: [
      ...writingExtensions,
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
    content: withPendingEdits(`/api/chapters/${chapterId}`, { content }).content || "",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      calculateWordCount(editor.getText());
      handleContentChange(html);
      if (onChange) {
        onChange(html);
      }
    },
  });

  // Calculate word count
  const calculateWordCount = (text: string) => {
    const words = text.trim().split(/\s+/);
    setWordCount(text ? words.length : 0);
  };

  const handleContentChange = (html: string) => { autosave.save({ content: html }); };
  useEffect(() => {
    if (!editor) return;
    const initial = withPendingEdits(`/api/chapters/${chapterId}`, { content }).content || "";
    editor.commands.setContent(initial, false, { preserveWhitespace: "full" });
    calculateWordCount(editor.getText());
  }, [editor, chapterId]);

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
        "flex-grow flex flex-col overflow-hidden",
        isFullscreen ? "fixed inset-0 z-50 bg-white dark:bg-neutral-900" : ""
      )}
    >
      <EditorMenuBar 
        editor={editor} 
        wordCount={wordCount} 
        saveStatus={saveStatus}
        onRetry={autosave.flush}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
      <div className={cn(
        "flex-grow overflow-y-auto p-4 md:p-6 lg:p-8 bg-muted/40",
        isFullscreen ? "max-h-[calc(100vh-48px)]" : ""
      )}>
        <WritingSurface editor={editor} label="Chapter text" labelId={labelId} />
      </div>
    </div>
  );
}

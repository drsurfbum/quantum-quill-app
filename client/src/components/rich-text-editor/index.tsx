import { useEditor, EditorContent } from '@tiptap/react';
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
import { useCallback, useEffect, useState, useRef } from 'react';
import EditorMenuBar from './menu-bar';
import './editor-content';
import { useUpdateChapter } from '@/hooks/use-project';
import { useToast } from '@/hooks/use-toast';
import { debounce, cn } from '@/lib/utils';

interface RichTextEditorProps {
  content: string | null;
  chapterId: number | string;
  onChange?: (content: string) => void;
}

export default function RichTextEditor({ 
  content = '<p>Start writing here...</p>', 
  chapterId,
  onChange 
}: RichTextEditorProps) {
  const { toast } = useToast();
  const [wordCount, setWordCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'typing' | 'saving'>('saved');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const { mutate: updateChapter } = useUpdateChapter();

  const editor = useEditor({
    extensions: [
      StarterKit,
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
    content: content,
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

  // Set up debounced save
  const debouncedSave = useCallback(
    debounce((html: string) => {
      if (!chapterId) return;
      
      setSaveStatus('saving');
      updateChapter(
        { id: Number(chapterId), content: html },
        {
          onSuccess: () => {
            setSaveStatus('saved');
          },
          onError: () => {
            toast({
              title: "Failed to save",
              description: "There was an error saving your changes. Please try again.",
              variant: "destructive",
            });
            setSaveStatus('saved');
          }
        }
      );
    }, 3000), // Increased from 1500ms to 3000ms (3 seconds)
    [chapterId, updateChapter, toast]
  );

  const handleContentChange = (html: string) => {
    setSaveStatus('typing'); // Show 'typing' instead of immediately 'saving'
    debouncedSave(html);
  };

  // Set initial content when it changes externally
  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
      editor.commands.setContent(content);
      calculateWordCount(editor.getText());
    }
  }, [editor, content]);

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
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
      <div className={cn(
        "flex-grow overflow-y-auto p-4 md:p-8 lg:p-12 bg-white dark:bg-neutral-900",
        isFullscreen ? "max-h-[calc(100vh-48px)]" : ""
      )}>
        <div className={cn(
          "mx-auto focus:outline-none",
          isFullscreen ? "max-w-3xl" : "max-w-prose"
        )}>
          <EditorContent editor={editor} className="editor-content" />
        </div>
      </div>
    </div>
  );
}

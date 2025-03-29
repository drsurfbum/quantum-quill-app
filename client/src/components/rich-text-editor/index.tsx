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
import { useCallback, useEffect, useState } from 'react';
import EditorMenuBar from './menu-bar';
import './editor-content';
import { useUpdateChapter } from '@/hooks/use-project';
import { useToast } from '@/hooks/use-toast';
import { debounce } from '@/lib/utils';

interface RichTextEditorProps {
  content: string;
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
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
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
        { id: chapterId, content: html },
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
    }, 1500),
    [chapterId, updateChapter, toast]
  );

  const handleContentChange = (html: string) => {
    setSaveStatus('saving');
    debouncedSave(html);
  };

  // Set initial content when it changes externally
  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
      editor.commands.setContent(content);
      calculateWordCount(editor.getText());
    }
  }, [editor, content]);

  if (!editor) {
    return null;
  }

  return (
    <div className="flex-grow flex flex-col overflow-hidden">
      <EditorMenuBar 
        editor={editor} 
        wordCount={wordCount} 
        saveStatus={saveStatus} 
      />
      <div className="flex-grow overflow-y-auto p-4 md:p-8 lg:p-12 bg-white dark:bg-neutral-900">
        <div className="max-w-prose mx-auto focus:outline-none">
          <EditorContent editor={editor} className="editor-content" />
        </div>
      </div>
    </div>
  );
}

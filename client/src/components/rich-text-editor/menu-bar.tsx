import { type Editor } from '@tiptap/react';
import { 
  Bold, Italic, Underline, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, List, ListOrdered, 
  Link, Image as ImageIcon, Table, Maximize, Minimize 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EditorMenuBarProps {
  editor: Editor;
  wordCount: number;
  saveStatus: 'saved' | 'typing' | 'saving';
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export default function EditorMenuBar({ 
  editor, 
  wordCount, 
  saveStatus, 
  isFullscreen = false,
  onToggleFullscreen 
}: EditorMenuBarProps) {
  const setHeading = (level: string) => {
    const levelNum = parseInt(level, 10);
    if (levelNum === 0) {
      editor.chain().focus().setParagraph().run();
    } else {
      editor.chain().focus().toggleHeading({ level: levelNum as 1 | 2 | 3 }).run();
    }
  };

  return (
    <div className="p-2 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap justify-start items-center gap-1 bg-white dark:bg-neutral-900">
      <Select onValueChange={(value) => setHeading(value)}>
        <SelectTrigger className="w-[130px] h-8">
          <SelectValue placeholder="Paragraph" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="0">Paragraph</SelectItem>
          <SelectItem value="1">Heading 1</SelectItem>
          <SelectItem value="2">Heading 2</SelectItem>
          <SelectItem value="3">Heading 3</SelectItem>
        </SelectContent>
      </Select>
      
      <Separator orientation="vertical" className="mx-1 h-6" />
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'bg-neutral-100 dark:bg-neutral-800' : ''}
      >
        <Bold className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'bg-neutral-100 dark:bg-neutral-800' : ''}
      >
        <Italic className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={editor.isActive('underline') ? 'bg-neutral-100 dark:bg-neutral-800' : ''}
      >
        <Underline className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={editor.isActive('strike') ? 'bg-neutral-100 dark:bg-neutral-800' : ''}
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      
      <Separator orientation="vertical" className="mx-1 h-6" />
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? 'bg-neutral-100 dark:bg-neutral-800' : ''}
      >
        <List className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive('orderedList') ? 'bg-neutral-100 dark:bg-neutral-800' : ''}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={editor.isActive('blockquote') ? 'bg-neutral-100 dark:bg-neutral-800' : ''}
      >
        <svg width="15" height="15" viewBox="0 0 15 15" className="h-4 w-4">
          <path
            d="M3.5 4.5L4.5 3.5H7.5V7.5H3.5V4.5ZM3.5 8.5H7.5V12.5H3.5V8.5ZM11.5 4.5L12.5 3.5H15.5V7.5H11.5V4.5ZM11.5 8.5H15.5V12.5H11.5V8.5Z"
            fill="currentColor"
          />
        </svg>
      </Button>
      
      <Separator orientation="vertical" className="mx-1 h-6" />
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          const url = window.prompt('URL:');
          if (url) {
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
          }
        }}
        className={editor.isActive('link') ? 'bg-neutral-100 dark:bg-neutral-800' : ''}
      >
        <Link className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          const url = window.prompt('Image URL:');
          if (url) {
            editor.chain().focus().setImage({ src: url }).run();
          }
        }}
      >
        <ImageIcon className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run()}
      >
        <Table className="h-4 w-4" />
      </Button>
      
      <div className="ml-auto flex items-center space-x-2">
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </span>
        
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          saveStatus === 'saved' 
            ? 'bg-success bg-opacity-10 text-success' 
            : saveStatus === 'typing'
            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
            : 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'
        }`}>
          {saveStatus === 'saved' 
            ? 'Saved' 
            : saveStatus === 'typing' 
            ? 'Typing...' 
            : 'Saving...'}
        </span>
        
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onToggleFullscreen}
        >
          {isFullscreen ? (
            <Minimize className="h-4 w-4" />
          ) : (
            <Maximize className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

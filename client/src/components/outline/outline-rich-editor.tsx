import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { useCallback, useEffect, useState } from 'react';
import { useUpdateOutlineItem } from '@/hooks/use-outline';
import { useToast } from '@/hooks/use-toast';
import { debounce, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  List, 
  ListOrdered,
  Save,
  Check,
  CheckCircle2
} from 'lucide-react';
import { OutlineItem } from '@shared/schema';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface OutlineRichEditorProps {
  item: OutlineItem;
  projectId: number;
}

export default function OutlineRichEditor({ item, projectId }: OutlineRichEditorProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState(item.title);
  const [isCompleted, setIsCompleted] = useState(item.isCompleted || false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  
  const { mutate: updateItem } = useUpdateOutlineItem();
  
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
      Image,
    ],
    content: item.content || '<p>Start writing here...</p>',
    onUpdate: ({ editor }) => {
      // Store current cursor position
      const selection = editor.view.state.selection;
      
      // Get HTML content
      const html = editor.getHTML();
      
      // Trigger save without losing focus
      handleContentChange(html);
    },
  });

  // Reset state when item changes
  useEffect(() => {
    setTitle(item.title);
    setIsCompleted(item.isCompleted || false);
    
    // Only update content if it has changed to avoid cursor jumping
    if (editor && editor.isEditable) {
      const currentContent = editor.getHTML();
      if (item.content && currentContent !== item.content) {
        // Store current selection and cursor position
        const selection = editor.view.state.selection;
        const isFocused = editor.isFocused;
        const scrollPosition = window.scrollY;
        
        // Set new content
        editor.commands.setContent(item.content);
        
        // If editor was focused, restore focus
        if (isFocused) {
          // Delay to ensure the DOM has been updated
          setTimeout(() => {
            editor.commands.focus('end');
            // Try to maintain scroll position
            window.scrollTo(0, scrollPosition);
          }, 10);
        }
      }
    }
  }, [item, editor]);
  
  // Set up debounced save with longer delay to prevent cursor jumping
  const debouncedSave = useCallback(
    debounce((newTitle: string, newContent: string, newIsCompleted: boolean) => {
      updateItem(
        { 
          id: item.id, 
          title: newTitle, 
          content: newContent,
          isCompleted: newIsCompleted 
        },
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
    }, 2000), // Increased from 1000ms to 2000ms to reduce save frequency
    [updateItem, toast]
  );
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setSaveStatus('saving');
    if (editor) {
      debouncedSave(newTitle, editor.getHTML(), isCompleted);
    }
  };
  
  const handleContentChange = (html: string) => {
    setSaveStatus('saving');
    debouncedSave(title, html, isCompleted);
  };

  const handleCompletedChange = (checked: boolean) => {
    setIsCompleted(checked);
    setSaveStatus('saving');
    if (editor) {
      debouncedSave(title, editor.getHTML(), checked);
    }
  };
  
  const handleSave = () => {
    setSaveStatus('saving');
    if (editor) {
      updateItem(
        { 
          id: item.id, 
          title, 
          content: editor.getHTML(),
          isCompleted
        },
        {
          onSuccess: () => {
            setSaveStatus('saved');
            toast({
              title: "Changes saved",
              description: "Your outline has been updated."
            });
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
    }
  };

  if (!editor) {
    return null;
  }
  
  return (
    <div className="flex-grow flex flex-col overflow-hidden">
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-white dark:bg-neutral-900">
        <Input 
          value={title}
          onChange={handleTitleChange}
          className="font-medium text-lg border-0 px-0 max-w-md focus-visible:ring-0"
          placeholder="Section title"
        />
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 mr-2">
            <Switch 
              id="completed" 
              checked={isCompleted}
              onCheckedChange={handleCompletedChange}
            />
            <Label htmlFor="completed" className="flex items-center space-x-1 text-sm cursor-pointer">
              <CheckCircle2 className={cn("h-4 w-4", isCompleted ? "text-green-500" : "text-muted-foreground")} />
              <span>{isCompleted ? "Completed" : "Mark as complete"}</span>
            </Label>
          </div>
          <span className="text-xs px-2 py-0.5 bg-success bg-opacity-10 text-success rounded-full">
            {saveStatus === 'saved' ? 'Saved' : 'Saving...'}
          </span>
          <Button
            onClick={handleSave}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
      
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-1 flex flex-wrap items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn("text-xs h-8 px-2", editor.isActive('bold') && "bg-muted")}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn("text-xs h-8 px-2", editor.isActive('italic') && "bg-muted")}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn("text-xs h-8 px-2", editor.isActive('underline') && "bg-muted")}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        
        <Separator orientation="vertical" className="mx-1 h-6" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={cn("text-xs h-8 px-2", editor.isActive({ textAlign: 'left' }) && "bg-muted")}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={cn("text-xs h-8 px-2", editor.isActive({ textAlign: 'center' }) && "bg-muted")}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={cn("text-xs h-8 px-2", editor.isActive({ textAlign: 'right' }) && "bg-muted")}
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        
        <Separator orientation="vertical" className="mx-1 h-6" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn("text-xs h-8 px-2", editor.isActive('bulletList') && "bg-muted")}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn("text-xs h-8 px-2", editor.isActive('orderedList') && "bg-muted")}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        
        <Separator orientation="vertical" className="mx-1 h-6" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={cn("text-xs h-8 px-2", editor.isActive('heading', { level: 1 }) && "bg-muted")}
        >
          H1
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={cn("text-xs h-8 px-2", editor.isActive('heading', { level: 2 }) && "bg-muted")}
        >
          H2
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={cn("text-xs h-8 px-2", editor.isActive('heading', { level: 3 }) && "bg-muted")}
        >
          H3
        </Button>
      </div>
      
      <div className="flex-grow overflow-y-auto p-4 md:p-6 bg-white dark:bg-neutral-900">
        <div className="max-w-3xl mx-auto">
          <EditorContent editor={editor} className="prose prose-sm dark:prose-invert max-w-none min-h-[calc(100vh-180px)]" />
        </div>
      </div>
    </div>
  );
}
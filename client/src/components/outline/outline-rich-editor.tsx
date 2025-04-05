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
  
  // Track if this is initial load to prevent auto-save on first click
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
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
      // Skip autosave on initial focus/click
      if (isInitialLoad) {
        setIsInitialLoad(false);
        return;
      }
      
      // Get HTML content
      const html = editor.getHTML();
      
      // Only trigger save if content has actually changed
      if (html !== item.content) {
        // Trigger save without losing focus
        handleContentChange(html);
      }
    },
    // Only auto-focus on desktop devices
    autofocus: false,
  });

  // Reset state when item changes
  useEffect(() => {
    // When item changes, we need to completely reset all state to prevent content bleed
    setTitle(item.title);
    setIsCompleted(item.isCompleted || false);
    
    // Reset initial load state when item changes to prevent auto-save on first interaction
    setIsInitialLoad(true);
    
    // Always update the content when item changes to ensure consistency
    if (editor && editor.isEditable) {
      // Store editor state before update
      const isFocused = editor.isFocused; 
      const scrollPosition = window.scrollY;
      
      // Completely destroy and rebuild editor state to prevent content bleeding
      // First, we'll update the content after a small delay to ensure clean transition
      setTimeout(() => {
        // Force update editor content to match the current item
        if (item.content) {
          editor.commands.setContent(item.content);
        } else {
          editor.commands.setContent('<p>Start writing here...</p>');
        }
          
        // If editor was focused, restore focus after a short delay
        // to ensure the DOM has been fully updated
        if (isFocused) {
          setTimeout(() => {
            editor.commands.focus();
            window.scrollTo(0, scrollPosition);
          }, 100);
        }
      }, 50);
    }
  }, [item.id, editor]); // Only depend on item.id not the entire item to prevent unnecessary re-renders
  
  // When item changes, immediately reapply the expanded state to keep the item visible
  useEffect(() => {
    // Ensure the outline item remains expanded in the sidebar
    if (item && item.id) {
      const parentId = item.parentId;
      
      // Immediately set this item as expanded
      setTimeout(() => {
        // This needs to happen outside the current render cycle
        const event = new CustomEvent('ensure-outline-expanded', { 
          detail: { itemId: item.id }
        });
        window.dispatchEvent(event);
      }, 10);
    }
  }, [item.id]);
  
  // Add a listener for the custom event to ensure sections stay expanded
  useEffect(() => {
    // Listen for events to keep items expanded
    const handleKeepExpanded = (e: CustomEvent) => {
      if (e.detail && e.detail.itemId === item.id) {
        // Force focus on the editor
        if (editor) {
          setTimeout(() => {
            editor.commands.focus();
          }, 10);
        }
      }
    };
    
    window.addEventListener('ensure-outline-expanded', handleKeepExpanded as EventListener);
    
    return () => {
      window.removeEventListener('ensure-outline-expanded', handleKeepExpanded as EventListener);
    };
  }, [editor, item.id]);
  
  // Set up debounced save with longer delay to prevent cursor jumping
  const debouncedSave = useCallback(
    debounce((newTitle: string, newContent: string, newIsCompleted: boolean) => {
      // During initial load, don't trigger a save
      if (isInitialLoad) {
        setSaveStatus('saved');
        return;
      }
      
      // Skip save if content is empty/default or no real changes were made
      const isDefaultContent = !newContent || 
                             newContent === '<p>Start writing here...</p>' || 
                             newContent === '<p></p>';
      
      const contentUnchanged = item.content === newContent ||
                             (isDefaultContent && (!item.content || item.content === '<p>Start writing here...</p>'));
                            
      if (item.title === newTitle && contentUnchanged && item.isCompleted === newIsCompleted) {
        setSaveStatus('saved');
        return;
      }

      // Avoid saving empty/default content
      if (isDefaultContent && item.title === newTitle && item.isCompleted === newIsCompleted) {
        setSaveStatus('saved');
        return;
      }

      // Keep track of editor focus state before saving
      const wasFocused = editor?.isFocused;
      const scrollPosition = window.scrollY;
      
      // Get the item ID at the time of save to prevent race conditions
      const currentItemId = item.id;

      updateItem(
        { 
          id: currentItemId, 
          title: newTitle, 
          content: newContent,
          isCompleted: newIsCompleted 
        },
        {
          onSuccess: (result) => {
            if (!result.success) {
              toast({
                title: "Failed to save",
                description: "There was an error saving your changes. Please try again.",
                variant: "destructive",
              });
              setSaveStatus('saved');
              return;
            }
            
            // Only update if we're still on the same item
            if (currentItemId === item.id) {
              setSaveStatus('saved');
              
              // Restore focus and scroll position if it was focused before
              if (wasFocused && editor) {
                setTimeout(() => {
                  editor.commands.focus();
                  window.scrollTo(0, scrollPosition);
                }, 10);
              }
            }
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
    }, 3000), // Increased to 3000ms to further reduce save frequency and prevent UI issues
    [updateItem, toast, item.id, item.title, item.content, item.isCompleted, editor, isInitialLoad]
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
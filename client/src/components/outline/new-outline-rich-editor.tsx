import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { debounce } from 'lodash';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useUpdateOutlineItem } from '@/hooks/use-outline-api';
import { OutlineItem, useOutline } from '@/contexts/outline-context';

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CheckCircle2,
  Italic,
  List,
  ListOrdered,
  Save,
} from 'lucide-react';
import { UnderlineIcon } from '@radix-ui/react-icons';

interface OutlineRichEditorProps {
  projectId: number;
}

export function NewOutlineRichEditor({ projectId }: OutlineRichEditorProps) {
  const { toast } = useToast();
  const { selectedItemId, invalidateOutline, getItemById } = useOutline();
  
  const selectedItem = getItemById(selectedItemId);
  
  // State for the editor
  const [title, setTitle] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved'>('saved');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const { mutate: updateItem } = useUpdateOutlineItem();
  
  // Configure the rich text editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Image,
      Link,
    ],
    content: selectedItem?.content || '<p>Start writing here...</p>',
  });
  
  // Initialize editor when the selected item changes
  useEffect(() => {
    if (!selectedItem || !editor) return;
    
    // Only update the content if it's different
    const currentContent = editor.getHTML();
    if (currentContent !== selectedItem.content) {
      // Reset the editor content
      editor.commands.setContent(selectedItem.content || '<p>Start writing here...</p>');
    }
    
    // Update the other form fields
    setTitle(selectedItem.title);
    setIsCompleted(selectedItem.isCompleted);
    
    // Focus the editor
    setTimeout(() => {
      // Reset the initial load flag to enable autosave for the new item
      setIsInitialLoad(true);
      
      // Mark as no longer initial load after a short delay to prevent
      // immediate autosave on focus
      setTimeout(() => {
        setIsInitialLoad(false);
      }, 300);
      
      // Scroll to top and focus editor
      if (editor) {
        window.scrollTo(0, 0);
        editor.commands.focus();
      }
    }, 150);
  }, [selectedItem?.id, editor]);
  
  // Set up debounced save with longer delay to prevent cursor jumping
  const debouncedSave = useCallback(
    debounce((itemId: number, newTitle: string, newContent: string, newIsCompleted: boolean) => {
      // During initial load, don't trigger a save
      if (isInitialLoad) {
        setSaveStatus('saved');
        return;
      }
      
      // Skip save if content is empty/default or no real changes were made
      const isDefaultContent = !newContent || 
                             newContent === '<p>Start writing here...</p>' || 
                             newContent === '<p></p>';
      
      const item = getItemById(itemId);
      if (!item) {
        setSaveStatus('saved');
        return;
      }
      
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
      
      updateItem(
        { 
          id: itemId, 
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
            
            // Mark as saved
            setSaveStatus('saved');
            
            // Refresh outline data
            invalidateOutline(projectId);
            
            // Restore focus and scroll position if it was focused before
            if (wasFocused && editor) {
              setTimeout(() => {
                editor.commands.focus();
                window.scrollTo(0, scrollPosition);
              }, 10);
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
    }, 1000), // Reduced debounce time for more responsive saves
    [updateItem, toast, getItemById, editor, isInitialLoad, invalidateOutline, projectId]
  );
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedItemId) return;
    
    const newTitle = e.target.value;
    setTitle(newTitle);
    setSaveStatus('saving');
    if (editor) {
      debouncedSave(selectedItemId, newTitle, editor.getHTML(), isCompleted);
    }
  };
  
  const handleContentChange = useCallback(() => {
    if (!selectedItemId || !editor) return;
    
    setSaveStatus('saving');
    debouncedSave(selectedItemId, title, editor.getHTML(), isCompleted);
  }, [selectedItemId, editor, title, isCompleted, debouncedSave]);
  
  const handleCompletedChange = (checked: boolean) => {
    if (!selectedItemId) return;
    
    setIsCompleted(checked);
    setSaveStatus('saving');
    if (editor) {
      debouncedSave(selectedItemId, title, editor.getHTML(), checked);
    }
  };
  
  const handleSave = () => {
    if (!selectedItemId || !editor) return;
    
    setSaveStatus('saving');
    updateItem(
      { 
        id: selectedItemId, 
        title, 
        content: editor.getHTML(),
        isCompleted
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
          
          setSaveStatus('saved');
          
          // Refresh outline data
          invalidateOutline(projectId);
          
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
  };
  
  // Set up the editor content change handler
  useEffect(() => {
    if (!editor) return;
    
    editor.on('update', handleContentChange);
    
    return () => {
      editor.off('update', handleContentChange);
    };
  }, [editor, handleContentChange]);
  
  if (!editor || !selectedItem) {
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
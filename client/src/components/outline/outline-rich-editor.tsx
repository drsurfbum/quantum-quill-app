import { editorContent } from "@/lib/editor-content";
import { useAutosave, withPendingEdits } from "@/hooks/use-autosave";
import { SaveStatus } from "@/components/save-status";
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { useEffect, useState, useId } from 'react';
import { cn } from '@/lib/utils';
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
import WritingSurface from '@/components/rich-text-editor/editor-content';

interface OutlineRichEditorProps {
  item: OutlineItem;
  projectId: number;
}

export default function OutlineRichEditor({ item, projectId }: OutlineRichEditorProps) {
  item = withPendingEdits(`/api/outline/${item.id}`, item);
  const autosave = useAutosave(`/api/outline/${item.id}`, `/api/projects/${projectId}/outline`);
  const labelId = useId();
  const titleId = useId();
  const [title, setTitle] = useState(item.title);
  const [isCompleted, setIsCompleted] = useState(item.isCompleted || false);
  const saveButtonClicked = autosave.status === "saved";

  
  
  
  const editor = useEditor({
    parseOptions: { preserveWhitespace: "full" },
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": labelId,
        "data-placeholder": "Add notes for this outline section…",
      },
    },
    extensions: [
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
      Image,
    ],
    content: editorContent(item.content),
    onUpdate: ({ editor }) => { autosave.save({ content: editor.getHTML() }); },
    // Only auto-focus on desktop devices
    autofocus: false,
  });

  useEffect(() => {
    setTitle(item.title);
    setIsCompleted(item.isCompleted || false);
    editor?.commands.setContent(editorContent(item.content), false, { preserveWhitespace: "full" });
  }, [item.id, editor]);
  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
    autosave.save({ title: event.target.value });
  };
  const handleCompletedChange = (checked: boolean) => {
    setIsCompleted(checked);
    autosave.save({ isCompleted: checked });
  };
  const handleSave = () => { void autosave.flush(); };

  if (!editor) {
    return null;
  }
  
  return (
    <div className="flex-grow flex flex-col overflow-hidden">
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap gap-4 justify-between items-center bg-white dark:bg-neutral-900">
        <div className="min-w-0 flex-1 basis-60 max-w-md space-y-2">
          <Label htmlFor={titleId}>Section title</Label>
          <Input
            id={titleId}
            value={title}
            onChange={handleTitleChange}
            className="font-medium text-lg"
            placeholder="Section title"
          />
        </div>
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
          <SaveStatus status={autosave.status} retry={autosave.flush} />
          <Button
            onClick={handleSave}
            size="sm"
            className={cn(
              "transition-colors duration-200",
              saveButtonClicked && "bg-green-500 hover:bg-green-600 text-white"
            )}
          >
            {saveButtonClicked ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saveButtonClicked ? "Saved!" : "Save"}
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
      
      <div className="flex-grow overflow-y-auto p-4 md:p-6 bg-muted/40">
        <WritingSurface editor={editor} label="Outline notes" labelId={labelId} />
      </div>
    </div>
  );
}
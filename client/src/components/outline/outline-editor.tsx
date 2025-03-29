import { useEffect, useState } from "react";
import { OutlineItem } from "@shared/schema";
import { useUpdateOutlineItem } from "@/hooks/use-outline";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import { debounce } from "@/lib/utils";

interface OutlineEditorProps {
  item: OutlineItem;
  projectId: number;
}

export default function OutlineEditor({ item, projectId }: OutlineEditorProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState(item.title);
  const [content, setContent] = useState(item.content || "");
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  
  const { mutate: updateItem } = useUpdateOutlineItem();
  
  // Reset state when item changes
  useEffect(() => {
    setTitle(item.title);
    setContent(item.content || "");
  }, [item]);
  
  // Set up debounced save
  const debouncedSave = debounce((newTitle: string, newContent: string) => {
    updateItem(
      { 
        id: item.id, 
        title: newTitle, 
        content: newContent 
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
  }, 1000);
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setSaveStatus('saving');
    debouncedSave(newTitle, content);
  };
  
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setSaveStatus('saving');
    debouncedSave(title, newContent);
  };
  
  const handleSave = () => {
    setSaveStatus('saving');
    updateItem(
      { 
        id: item.id, 
        title, 
        content 
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
  };
  
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
      
      <div className="flex-grow overflow-y-auto p-4 md:p-6 bg-white dark:bg-neutral-900">
        <div className="max-w-prose mx-auto">
          <Textarea
            value={content}
            onChange={handleContentChange}
            className="min-h-[calc(100vh-180px)] resize-none border-0 focus-visible:ring-0 text-base leading-relaxed p-0"
            placeholder="Write your outline content here..."
          />
        </div>
      </div>
    </div>
  );
}

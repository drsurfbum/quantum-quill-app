import { useEffect, useState } from "react";
import { StoryBibleEntry } from "@shared/schema";
import { useUpdateStoryBibleEntry, useDeleteStoryBibleEntry } from "@/hooks/use-story-bible";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Trash2, Users, MapPin, ShoppingBag, Calendar } from "lucide-react";
import { debounce } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BibleEditorProps {
  entry: StoryBibleEntry;
  projectId: number;
}

export default function BibleEditor({ entry, projectId }: BibleEditorProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content || "");
  const [entryType, setEntryType] = useState(entry.entryType);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("edit");
  
  const { mutate: updateEntry } = useUpdateStoryBibleEntry();
  const { mutate: deleteEntry } = useDeleteStoryBibleEntry();
  
  // Reset state when entry changes
  useEffect(() => {
    setTitle(entry.title);
    setContent(entry.content || "");
    setEntryType(entry.entryType);
  }, [entry]);
  
  // Set up debounced save with increased delay for better typing experience
  const debouncedSave = debounce((newTitle: string, newContent: string, newType: string) => {
    updateEntry(
      { 
        id: entry.id, 
        title: newTitle, 
        content: newContent,
        entryType: newType
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
  }, 3000); // Increased to 3 seconds for a much better typing experience
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setSaveStatus('saving');
    debouncedSave(newTitle, content, entryType);
  };
  
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setSaveStatus('saving');
    debouncedSave(title, newContent, entryType);
  };
  
  const handleTypeChange = (newType: string) => {
    setEntryType(newType);
    setSaveStatus('saving');
    debouncedSave(title, content, newType);
  };
  
  const handleSave = () => {
    setSaveStatus('saving');
    updateEntry(
      { 
        id: entry.id, 
        title, 
        content,
        entryType
      },
      {
        onSuccess: () => {
          setSaveStatus('saved');
          toast({
            title: "Changes saved",
            description: `Your ${entryType} entry has been updated.`
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
  
  const handleDelete = () => {
    deleteEntry(
      { id: entry.id, projectId },
      {
        onSuccess: () => {
          toast({
            title: "Entry deleted",
            description: `The ${entryType} entry has been deleted.`
          });
          setIsDeleteDialogOpen(false);
        },
        onError: () => {
          toast({
            title: "Error deleting entry",
            description: "There was an error deleting the entry. Please try again.",
            variant: "destructive",
          });
          setIsDeleteDialogOpen(false);
        }
      }
    );
  };
  
  // Get icon based on entry type
  const getTypeIcon = () => {
    switch (entryType) {
      case "character":
        return <Users className="h-5 w-5" />;
      case "location":
        return <MapPin className="h-5 w-5" />;
      case "item":
        return <ShoppingBag className="h-5 w-5" />;
      case "event":
        return <Calendar className="h-5 w-5" />;
      default:
        return null;
    }
  };
  
  return (
    <div className="flex-grow flex flex-col overflow-hidden">
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-white dark:bg-neutral-900">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {getTypeIcon()}
          </div>
          <Input 
            value={title}
            onChange={handleTitleChange}
            className="font-medium text-lg border-0 px-0 max-w-md focus-visible:ring-0"
            placeholder={`${entryType.charAt(0).toUpperCase() + entryType.slice(1)} name`}
          />
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-xs px-2 py-0.5 bg-success bg-opacity-10 text-success rounded-full">
            {saveStatus === 'saved' ? 'Saved' : 'Saving...'}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="text-red-500"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
          <Button
            onClick={handleSave}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col overflow-hidden">
        <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <TabsList className="mx-4 h-10">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="type">Entry Type</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="edit" className="flex-grow overflow-y-auto p-0 m-0">
          <div className="p-4 md:p-6 bg-white dark:bg-neutral-900 h-full">
            <div className="max-w-prose mx-auto">
              <Textarea
                value={content}
                onChange={handleContentChange}
                className="min-h-[calc(100vh-220px)] resize-none focus-visible:ring-0 text-base leading-relaxed"
                placeholder={`Write details about this ${entryType} here...`}
              />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="type" className="flex-grow overflow-y-auto p-0 m-0">
          <div className="p-4 md:p-6 bg-white dark:bg-neutral-900">
            <div className="max-w-prose mx-auto">
              <Label className="text-sm font-medium mb-4 block">
                Entry type
              </Label>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                <Button
                  variant={entryType === "character" ? "default" : "outline"}
                  className="h-24 flex flex-col justify-center"
                  onClick={() => handleTypeChange("character")}
                >
                  <Users className="h-8 w-8 mb-2" />
                  Character
                </Button>
                
                <Button
                  variant={entryType === "location" ? "default" : "outline"}
                  className="h-24 flex flex-col justify-center"
                  onClick={() => handleTypeChange("location")}
                >
                  <MapPin className="h-8 w-8 mb-2" />
                  Location
                </Button>
                
                <Button
                  variant={entryType === "item" ? "default" : "outline"}
                  className="h-24 flex flex-col justify-center"
                  onClick={() => handleTypeChange("item")}
                >
                  <ShoppingBag className="h-8 w-8 mb-2" />
                  Item
                </Button>
                
                <Button
                  variant={entryType === "event" ? "default" : "outline"}
                  className="h-24 flex flex-col justify-center"
                  onClick={() => handleTypeChange("event")}
                >
                  <Calendar className="h-8 w-8 mb-2" />
                  Event
                </Button>
              </div>
              
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                The entry type helps categorize your story bible entries and makes them easier to find.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

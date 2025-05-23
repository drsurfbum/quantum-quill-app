import { useEffect, useState, useCallback, useMemo, memo } from "react";
import { StoryBibleEntry } from "@shared/schema";
import { useUpdateStoryBibleEntry, useDeleteStoryBibleEntry } from "@/hooks/use-story-bible";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Trash2, Users, MapPin, ShoppingBag, Calendar } from "lucide-react";
import { debounce } from "lodash"; // Using lodash's more efficient debounce
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

// Use memo to prevent unnecessary re-renders
const BibleEditor = memo(function MemoizedBibleEditor({ entry, projectId }: BibleEditorProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content || "");
  const [entryType, setEntryType] = useState(entry.entryType);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'typing'>('saved');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("edit");
  
  const { mutate: updateEntry } = useUpdateStoryBibleEntry();
  const { mutate: deleteEntry } = useDeleteStoryBibleEntry();
  
  // Reset state when entry changes, but with a slight delay to improve tab switching performance
  useEffect(() => {
    // Use a small timeout to defer state updates during tab switching
    const timer = setTimeout(() => {
      setTitle(entry.title);
      setContent(entry.content || "");
      setEntryType(entry.entryType);
    }, 50);
    
    return () => clearTimeout(timer);
  }, [entry]);
  
  // Create a stable debounced save function with useCallback to prevent recreation on every render
  const debouncedSave = useCallback(
    debounce((newTitle: string, newContent: string, newType: string) => {
      // Only set saving state right before the actual API call
      setSaveStatus('saving');
      
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
    }, 5000), // Increased to 5 seconds for a much better typing experience
    [entry.id, updateEntry, toast]
  );
  
  // Memoize handler functions so they don't change on every render
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setSaveStatus('typing'); // Show typing status immediately
    debouncedSave(newTitle, content, entryType);
  }, [content, entryType, debouncedSave]);
  
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setSaveStatus('typing'); // Show typing status immediately
    debouncedSave(title, newContent, entryType);
  }, [title, entryType, debouncedSave]);
  
  const handleTypeChange = useCallback((newType: string) => {
    setEntryType(newType);
    setSaveStatus('typing'); // Show typing status immediately
    debouncedSave(title, content, newType);
  }, [title, content, debouncedSave]);
  
  // Manual save button handler - optimize with useCallback
  const handleSave = useCallback(() => {
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
  }, [entry.id, title, content, entryType, updateEntry, toast]);
  
  // Delete handler - optimize with useCallback
  const handleDelete = useCallback(() => {
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
  }, [entry.id, projectId, entryType, deleteEntry, toast, setIsDeleteDialogOpen]);
  
  // Memoize icon to prevent unnecessary re-renders
  const typeIcon = useMemo(() => {
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
  }, [entryType]);
  
  return (
    <div className="flex-grow flex flex-col overflow-hidden">
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-white dark:bg-neutral-900">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {typeIcon}
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
            {saveStatus === 'saved' ? 'Saved' : saveStatus === 'typing' ? 'Typing...' : 'Saving...'}
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

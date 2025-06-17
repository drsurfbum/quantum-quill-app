import { useEffect, useState, useCallback, useMemo, memo } from "react";
import { StoryBibleEntry } from "@shared/schema";
import { useUpdateStoryBibleEntry, useDeleteStoryBibleEntry } from "@/hooks/use-story-bible";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Trash2, Users, MapPin, ShoppingBag, Calendar, Check } from "lucide-react";
import { debounce } from "lodash";
import { cn } from "@/lib/utils";
import CharacterSheet from "./character-sheet";
import { LocationSheet } from "./location-sheet";
import { EventSheet } from "./event-sheet";
import { WorldElementSheet } from "./world-element-sheet";
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

// Optimized Bible Editor with memoization to prevent unnecessary re-renders
const BibleEditor = memo(({ entry, projectId }: BibleEditorProps) => {
  // If this is a character entry, use the specialized character sheet
  if (entry.entryType === 'character') {
    return <CharacterSheet entry={entry} projectId={projectId} />;
  }
  
  // If this is a location entry, use the specialized location sheet
  if (entry.entryType === 'location') {
    return <LocationSheet entry={entry} projectId={projectId} />;
  }
  
  // If this is an event entry, use the specialized event sheet
  if (entry.entryType === 'event') {
    return <EventSheet entry={entry} projectId={projectId} />;
  }
  
  // If this is a world element entry, use the specialized world element sheet
  if (entry.entryType === 'world-element') {
    return <WorldElementSheet entry={entry} projectId={projectId} />;
  }
  const { toast } = useToast();
  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content || "");
  const [entryType, setEntryType] = useState(entry.entryType);
  const [saveButtonClicked, setSaveButtonClicked] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("edit");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const { mutate: updateEntry, isError: isUpdateError } = useUpdateStoryBibleEntry();
  const { mutate: deleteEntry, isError: isDeleteError } = useDeleteStoryBibleEntry();
  
  // Reset state when entry changes with a delay for better tab switching performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setTitle(entry.title);
      setContent(entry.content || "");
      setEntryType(entry.entryType);
      setIsInitialLoad(false);
    }, 50);
    
    return () => clearTimeout(timer);
  }, [entry]);

  // Handle update errors
  useEffect(() => {
    if (isUpdateError) {
      toast({
        title: "Failed to save",
        description: "There was an error saving your changes. Please try again.",
        variant: "destructive",
      });
    }
  }, [isUpdateError, toast]);

  // Handle delete errors
  useEffect(() => {
    if (isDeleteError) {
      toast({
        title: "Error deleting entry",
        description: "There was an error deleting the entry. Please try again.",
        variant: "destructive",
      });
    }
  }, [isDeleteError, toast]);
  
  // Create a stable debounced save function with silent auto-save
  const debouncedSave = useCallback(
    debounce((newTitle: string, newContent: string, newType: string) => {
      // During initial load, don't trigger a save
      if (isInitialLoad) {
        return;
      }
      
      // Skip save if no real changes were made
      const titleUnchanged = entry.title === newTitle;
      const contentUnchanged = (entry.content || "") === newContent;
      const typeUnchanged = entry.entryType === newType;
      
      if (titleUnchanged && contentUnchanged && typeUnchanged) {
        return;
      }

      updateEntry({ 
        id: entry.id, 
        title: newTitle, 
        content: newContent,
        entryType: newType
      });
    }, 3000), // 3 seconds for good typing performance
    [entry.id, entry.title, entry.content, entry.entryType, updateEntry, isInitialLoad]
  );
  
  // Memoized handler functions
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    debouncedSave(newTitle, content, entryType);
  }, [content, entryType, debouncedSave]);
  
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    debouncedSave(title, newContent, entryType);
  }, [title, entryType, debouncedSave]);
  
  const handleTypeChange = useCallback((newType: string) => {
    setEntryType(newType);
    debouncedSave(title, content, newType);
  }, [title, content, debouncedSave]);
  
  const handleSave = useCallback(() => {
    setSaveButtonClicked(true);
    updateEntry({ 
      id: entry.id, 
      title, 
      content,
      entryType
    });
    
    // Reset the visual feedback after a short delay
    setTimeout(() => {
      setSaveButtonClicked(false);
    }, 1000);
  }, [entry.id, title, content, entryType, updateEntry]);
  
  const handleDelete = useCallback(() => {
    deleteEntry({ id: entry.id, projectId });
    setIsDeleteDialogOpen(false);
  }, [entry.id, projectId, deleteEntry]);
  
  // Memoized type icon
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
  
  // Remove save status indicator as we're using silent auto-save
  
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
});

export default BibleEditor;

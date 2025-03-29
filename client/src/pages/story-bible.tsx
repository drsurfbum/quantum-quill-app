import { useParams, useLocation, Link } from "wouter";
import SidebarNavigation from "@/components/sidebar-navigation";
import ThemeToggle from "@/components/ui/theme-toggle";
import ExportModal from "@/components/export-modal";
import { useProject } from "@/hooks/use-project";
import { Button } from "@/components/ui/button";
import { Share2, ExternalLink, Plus, Users, MapPin, ShoppingBag, Calendar, FileText } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Edit3, Grid, ListTree, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useStoryBibleEntries, useCreateStoryBibleEntry } from "@/hooks/use-story-bible";
import { useState } from "react";
import BibleEntry from "@/components/story-bible/bible-entry";
import BibleEditor from "@/components/story-bible/bible-editor";
import { useToast } from "@/hooks/use-toast";

// Entry types with their icons
const entryTypes = [
  { id: "all", label: "All", icon: FileText },
  { id: "character", label: "Characters", icon: Users },
  { id: "location", label: "Locations", icon: MapPin },
  { id: "item", label: "Items", icon: ShoppingBag },
  { id: "event", label: "Events", icon: Calendar },
];

export default function StoryBible() {
  const { id } = useParams();
  const [location] = useLocation();
  const { toast } = useToast();
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: project, isLoading: isLoadingProject } = useProject(id);
  const { data: entries = [], isLoading: isLoadingEntries } = useStoryBibleEntries(id);
  const { mutate: createEntry, isPending: isCreating } = useCreateStoryBibleEntry();
  
  // Filter entries by type and search term
  const filteredEntries = entries.filter(entry => {
    const matchesType = selectedType === "all" || entry.entryType === selectedType;
    const matchesSearch = entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  }).sort((a, b) => a.title.localeCompare(b.title));
  
  // Find selected entry
  const selectedEntry = entries.find(entry => entry.id === selectedEntryId);
  
  // Handle entry creation
  const handleCreateEntry = (entryType: string) => {
    createEntry(
      {
        title: `New ${entryType}`,
        content: "",
        projectId: Number(id),
        entryType
      },
      {
        onSuccess: (data) => {
          setSelectedEntryId(data.id);
          setSelectedType(data.entryType);
          toast({
            title: "Entry created",
            description: `New ${data.entryType} has been created.`
          });
        },
        onError: () => {
          toast({
            title: "Error creating entry",
            description: "There was an error creating your entry. Please try again.",
            variant: "destructive"
          });
        }
      }
    );
  };
  
  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden">
      <SidebarNavigation />
      
      <main className="flex-grow overflow-hidden flex flex-col">
        <header className="h-16 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center">
            {isLoadingProject ? (
              <Skeleton className="h-6 w-48" />
            ) : (
              <h1 className="text-xl font-semibold">{project?.title}</h1>
            )}
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <ThemeToggle />
            
            <Button variant="ghost" className="flex items-center gap-1">
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            
            {project && <ExportModal projectId={project.id} projectTitle={project.title} />}
            
            <Button className="flex items-center gap-1">
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">Preview</span>
            </Button>
          </div>
        </header>

        <div className="border-b border-neutral-200 dark:border-neutral-800">
          <Tabs defaultValue="story-bible">
            <TabsList className="mx-4 h-10 w-auto">
              <Link href={`/project/${id}/write`}>
                <TabsTrigger value="write" className={cn(
                  "data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none",
                  location === `/project/${id}/write` ? "border-b-2 border-primary" : ""
                )}>
                  <Edit3 className="mr-1 h-4 w-4" /> Write
                </TabsTrigger>
              </Link>
              
              <Link href={`/project/${id}/storyboard`}>
                <TabsTrigger value="storyboard" className={cn(
                  "data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none",
                  location === `/project/${id}/storyboard` ? "border-b-2 border-primary" : ""
                )}>
                  <Grid className="mr-1 h-4 w-4" /> Storyboard
                </TabsTrigger>
              </Link>
              
              <Link href={`/project/${id}/outline`}>
                <TabsTrigger value="outline" className={cn(
                  "data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none",
                  location === `/project/${id}/outline` ? "border-b-2 border-primary" : ""
                )}>
                  <ListTree className="mr-1 h-4 w-4" /> Outline
                </TabsTrigger>
              </Link>
              
              <Link href={`/project/${id}/story-bible`}>
                <TabsTrigger value="story-bible" className={cn(
                  "data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none",
                  location === `/project/${id}/story-bible` ? "border-b-2 border-primary" : ""
                )}>
                  <BookOpen className="mr-1 h-4 w-4" /> Story Bible
                </TabsTrigger>
              </Link>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-grow flex overflow-hidden">
          {/* Story Bible Sidebar */}
          <div className="w-64 border-r border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden bg-neutral-50 dark:bg-neutral-900">
            <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">Story Bible</h3>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    const menu = document.getElementById('entry-type-menu');
                    if (menu) {
                      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                
                {/* Dropdown menu for entry types */}
                <div 
                  id="entry-type-menu" 
                  className="absolute right-3 mt-8 bg-white dark:bg-neutral-800 shadow-md rounded-md py-1 z-10 border border-neutral-200 dark:border-neutral-700"
                  style={{ display: 'none' }}
                >
                  <div className="py-1 px-2 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                    Create new:
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start px-3 py-1 h-8"
                    onClick={() => {
                      handleCreateEntry('character');
                      document.getElementById('entry-type-menu')!.style.display = 'none';
                    }}
                  >
                    <Users className="h-4 w-4 mr-2" /> Character
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start px-3 py-1 h-8"
                    onClick={() => {
                      handleCreateEntry('location');
                      document.getElementById('entry-type-menu')!.style.display = 'none';
                    }}
                  >
                    <MapPin className="h-4 w-4 mr-2" /> Location
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start px-3 py-1 h-8"
                    onClick={() => {
                      handleCreateEntry('item');
                      document.getElementById('entry-type-menu')!.style.display = 'none';
                    }}
                  >
                    <ShoppingBag className="h-4 w-4 mr-2" /> Item
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start px-3 py-1 h-8"
                    onClick={() => {
                      handleCreateEntry('event');
                      document.getElementById('entry-type-menu')!.style.display = 'none';
                    }}
                  >
                    <Calendar className="h-4 w-4 mr-2" /> Event
                  </Button>
                </div>
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search entries..."
                  className="w-full pl-3 pr-8 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="border-b border-neutral-200 dark:border-neutral-800 p-1 flex overflow-x-auto">
              {entryTypes.map(type => (
                <Button
                  key={type.id}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "flex items-center px-2 py-1 text-xs whitespace-nowrap",
                    selectedType === type.id && "bg-neutral-100 dark:bg-neutral-800"
                  )}
                  onClick={() => setSelectedType(type.id)}
                >
                  <type.icon className="h-3 w-3 mr-1" />
                  {type.label}
                </Button>
              ))}
            </div>
            
            <div className="flex-grow overflow-y-auto p-2">
              {isLoadingEntries ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="text-center p-4 text-sm text-neutral-500 dark:text-neutral-400">
                  {searchTerm ? "No entries match your search." : "No entries yet."}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredEntries.map(entry => (
                    <BibleEntry
                      key={entry.id}
                      entry={entry}
                      isSelected={entry.id === selectedEntryId}
                      onClick={() => setSelectedEntryId(entry.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Story Bible Entry Editor */}
          <div className="flex-grow flex flex-col overflow-hidden">
            {isLoadingEntries ? (
              <div className="flex-grow flex items-center justify-center p-6">
                <Skeleton className="h-40 w-full max-w-2xl" />
              </div>
            ) : !selectedEntry ? (
              <div className="flex-grow flex items-center justify-center text-center p-6">
                <div>
                  <BookOpen className="h-12 w-12 mx-auto text-neutral-300 dark:text-neutral-600 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select an entry</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 mb-4 max-w-md">
                    Select an entry from your story bible or create a new one to start documenting your story elements.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => handleCreateEntry('character')}
                      disabled={isCreating}
                    >
                      <Users className="mr-2 h-4 w-4" /> New Character
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleCreateEntry('location')}
                      disabled={isCreating}
                    >
                      <MapPin className="mr-2 h-4 w-4" /> New Location
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleCreateEntry('item')}
                      disabled={isCreating}
                    >
                      <ShoppingBag className="mr-2 h-4 w-4" /> New Item
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <BibleEditor 
                entry={selectedEntry}
                projectId={Number(id)}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

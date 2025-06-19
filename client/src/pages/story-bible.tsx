import { useParams, useLocation, Link } from "wouter";
import SidebarNavigation from "@/components/sidebar-navigation";
import ThemeToggle from "@/components/ui/theme-toggle";
import ExportModal from "@/components/export-modal";
import { useProject } from "@/hooks/use-project";
import { Button } from "@/components/ui/button";
import { 
  Share2, ExternalLink, Plus, Users, MapPin, ShoppingBag, Calendar, FileText,
  Edit3, Grid, ListTree, BookOpen, Languages, Wand2, Train, 
  Building, FolderTree, GitBranch, Scroll, Globe, Mountain, Workflow 
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useStoryBibleEntries, useCreateStoryBibleEntry } from "@/hooks/use-story-bible";
import { StoryBibleEntry } from "@shared/schema";
import { useState, useEffect, useRef, useMemo } from "react";
import BibleEntry from "@/components/story-bible/bible-entry";
import BibleEditor from "@/components/story-bible/bible-editor";
import BentoDashboard from "@/components/story-bible/bento-dashboard";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

// Entry types with their icons
const entryTypes = [
  { id: "all", label: "All", icon: FileText },
  { id: "character", label: "Characters", icon: Users },
  { id: "race", label: "Races/Species", icon: Globe },
  { id: "location", label: "Locations", icon: MapPin },
  { id: "world-element", label: "World Elements", icon: Workflow },
  { id: "event", label: "Events", icon: Calendar },
  { id: "item", label: "Items", icon: ShoppingBag },
  { id: "language", label: "Languages", icon: Languages },
  { id: "magicSystem", label: "Magic Systems", icon: Wand2 },
  { id: "transportation", label: "Transportation", icon: Train },
  { id: "government", label: "Governments", icon: Building },
  { id: "group", label: "Groups", icon: FolderTree },
  { id: "timeline", label: "Timeline Events", icon: GitBranch },
  { id: "lore", label: "Lore/Myths", icon: Scroll },
  { id: "geography", label: "Geography", icon: Mountain },
];

export default function StoryBible() {
  const { id } = useParams();
  const [location] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(isMobile);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "bento">("bento");
  
  // Auto-collapse on mobile
  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true);
    }
  }, [isMobile]);
  
  const { data: project, isLoading: isLoadingProject } = useProject(id ? Number(id) : 0);
  const { data: entries = [], isLoading: isLoadingEntries } = useStoryBibleEntries(id ? Number(id) : 0);
  const { mutate: createEntry, isPending: isCreating, isSuccess: isCreateSuccess, data: createResult, isError: isCreateError } = useCreateStoryBibleEntry();
  
  // Filter entries by type and search term
  const filteredEntries = entries.filter(entry => {
    const matchesType = selectedType === "all" || entry.entryType === selectedType;
    const matchesSearch = entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (entry.content ? entry.content.toLowerCase().includes(searchTerm.toLowerCase()) : false);
    return matchesType && matchesSearch;
  }).sort((a, b) => a.title.localeCompare(b.title));
  
  // Simple entry state tracking
  const pendingEntryIdRef = useRef<number | null>(null);
  const userManuallySelectedRef = useRef<boolean>(false);
  
  // Only get entry from ID when needed (with stable reference)
  const selectedEntry = useMemo(() => {
    // First priority: find the selected entry if it exists
    if (selectedEntryId !== null) {
      const foundEntry = entries.find(entry => entry.id === selectedEntryId);
      if (foundEntry) return foundEntry;
    }
    
    // Second priority: if this is a newly created entry, use that
    if (pendingEntryIdRef.current !== null) {
      const newEntry = entries.find(entry => entry.id === pendingEntryIdRef.current);
      if (newEntry) return newEntry;
    }
    
    // If the user has manually selected something before, don't auto-select
    if (userManuallySelectedRef.current) {
      return null;
    }
    
    // Fallback for initial load: use first entry
    return entries.length > 0 ? entries[0] : null;
  }, [entries, selectedEntryId]);
  
  // One-time initialization effect (runs only on first load)
  useEffect(() => {
    // Only run once when entries are first loaded
    if (entries.length > 0 && selectedEntryId === null && !userManuallySelectedRef.current) {
      setSelectedEntryId(entries[0].id);
    }
  }, [entries.length, selectedEntryId]);
  
  // Handle successful entry creation - always select new entry
  useEffect(() => {
    if (isCreateSuccess && createResult) {
      try {
        const entryData = createResult as any;
        const newEntryId = entryData?.id;
        
        if (newEntryId) {
          // Store the pending entry ID for selection
          pendingEntryIdRef.current = newEntryId;
          
          // Auto-select the new entry
          setSelectedEntryId(newEntryId);
          
          // Switch to list view to show the editor
          setViewMode("list");
          
          // On mobile, collapse the sidebar to show the editor
          if (isMobile) {
            setIsCollapsed(true);
          }
          
          toast({
            title: "Entry created",
            description: "Your new entry has been created and is ready to edit.",
          });
        } else {
          toast({
            title: "Error creating entry",
            description: "There was an error creating your entry. Please try again.",
            variant: "destructive"
          });
        }
      } catch (error) {
        toast({
          title: "Error creating entry",
          description: "There was an error creating your entry. Please try again.",
          variant: "destructive"
        });
      }
    }
  }, [isCreateSuccess, createResult, isMobile, toast]);

  // Handle create operation errors
  useEffect(() => {
    if (isCreateError) {
      console.error("Entry creation error:", isCreateError);
      toast({
        title: "Error creating entry",
        description: "There was an error creating your entry. Please try again.",
        variant: "destructive"
      });
    }
  }, [isCreateError, toast]);
  
  // Handle entry creation with simple, reliable selection
  const handleCreateEntry = (entryType: string) => {
    createEntry({
      title: `New ${entryType}`,
      content: "",
      projectId: Number(id),
      entryType
    });
  };
  
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <div className="flex flex-row flex-1 w-full h-full overflow-hidden">
        <SidebarNavigation onCollapsedChange={setIsCollapsed} />
        
        <main className="flex-grow overflow-hidden flex flex-col w-full pl-0 md:pl-0" style={{marginLeft: isCollapsed ? '56px' : '0'}}>
          <header className="h-16 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-4 sm:px-6">
            <div className="flex items-center">
              {isLoadingProject ? (
                <Skeleton className="h-6 w-48" />
              ) : (
                <h1 className="text-xl font-semibold">{project?.title}</h1>
              )}
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* View Toggle */}
              <div className="flex items-center bg-muted rounded-md p-1">
                <Button
                  variant={viewMode === "bento" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("bento")}
                  className="h-7 px-2"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="h-7 px-2"
                >
                  <ListTree className="h-4 w-4" />
                </Button>
              </div>
              
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

          {/* Conditional rendering based on view mode */}
          {viewMode === "bento" ? (
            <div className="flex-grow overflow-auto">
              <BentoDashboard
                entries={entries}
                onCreateEntry={handleCreateEntry}
                onSelectEntry={(entry) => {
                  setSelectedEntryId(entry.id);
                  setViewMode("list");
                }}
                selectedEntryId={selectedEntryId}
              />
            </div>
          ) : (
            <div className="flex-grow flex overflow-hidden">
              <div className="w-64 border-r border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden bg-neutral-50 dark:bg-neutral-900">
                <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium">Story Bible</h3>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      id="entry-type-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const menu = document.getElementById('entry-type-menu');
                        const button = document.getElementById('entry-type-button');
                        
                        if (menu && button) {
                          const isVisible = menu.style.display !== 'none';
                          
                          if (!isVisible) {
                            const buttonRect = button.getBoundingClientRect();
                            const rightSpace = window.innerWidth - buttonRect.right;
                            const menuWidth = 250;
                            
                            if (rightSpace < menuWidth) {
                              menu.style.right = (window.innerWidth - buttonRect.left) + 'px';
                              menu.style.left = 'auto';
                            } else {
                              menu.style.left = buttonRect.left + 'px';
                              menu.style.right = 'auto';
                            }
                            
                            menu.style.top = (buttonRect.bottom + 4) + 'px';
                            menu.style.display = 'block';
                            
                            const handleClickOutside = (event: MouseEvent) => {
                              const target = event.target as Node;
                              if (menu && !menu.contains(target) && !button.contains(target)) {
                                menu.style.display = 'none';
                                document.removeEventListener('click', handleClickOutside);
                              }
                            };
                            
                            setTimeout(() => {
                              document.addEventListener('click', handleClickOutside);
                            }, 100);
                          } else {
                            menu.style.display = 'none';
                          }
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Filter Tabs */}
                  <div className="mb-3">
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {entryTypes.slice(0, 8).map(type => (
                        <Button
                          key={type.id}
                          variant={selectedType === type.id ? "default" : "ghost"}
                          size="sm"
                          className="h-7 px-2 justify-start"
                          onClick={() => setSelectedType(type.id)}
                        >
                          <type.icon className="h-3 w-3 mr-1" />
                          <span className="truncate">{type.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Search */}
                  <input
                    type="text"
                    placeholder="Search entries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                
                {/* Entry List */}
                <div className="flex-grow overflow-y-auto">
                  {isLoadingEntries ? (
                    <div className="p-3 space-y-2">
                      {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : filteredEntries.length === 0 ? (
                    <div className="p-3 text-center text-neutral-500 dark:text-neutral-400">
                      {entries.length === 0 ? "No entries yet" : "No entries match your search"}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredEntries.map(entry => (
                        <BibleEntry
                          key={entry.id}
                          entry={entry}
                          isSelected={entry.id === selectedEntryId}
                          onClick={() => {
                            userManuallySelectedRef.current = true;
                            pendingEntryIdRef.current = null;
                            setSelectedEntryId(entry.id);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Story Bible Entry Editor */}
              <div className="flex-grow flex flex-col overflow-hidden">
                {/* Back to Bento View Button */}
                <div className="px-4 py-2 border-b border-neutral-200 dark:border-neutral-800">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode("bento")}
                    className="flex items-center gap-2"
                  >
                    <Grid className="h-4 w-4" />
                    Back to Dashboard
                  </Button>
                </div>

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
          )}
        </main>
      </div>
      
      {/* Dropdown menu for entry types */}
      <div 
        id="entry-type-menu" 
        className="fixed max-w-[250px] bg-white dark:bg-neutral-800 shadow-md rounded-md py-1 z-50 border border-neutral-200 dark:border-neutral-700 overflow-y-auto max-h-[80vh]"
        style={{ display: 'none', position: 'fixed' }}
      >
        <div className="py-1 px-2 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
          Create new:
        </div>
        
        {/* Characters & People */}
        <div className="py-1 px-2 text-xs text-neutral-500 dark:text-neutral-400 font-medium border-t border-neutral-200 dark:border-neutral-700 mt-1">
          Characters & People
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
        
        {/* World Elements */}
        <div className="py-1 px-2 text-xs text-neutral-500 dark:text-neutral-400 font-medium border-t border-neutral-200 dark:border-neutral-700 mt-1">
          World Elements
        </div>
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
            handleCreateEntry('world-element');
            document.getElementById('entry-type-menu')!.style.display = 'none';
          }}
        >
          <Workflow className="h-4 w-4 mr-2" /> World Element
        </Button>
        
        {/* History & Lore */}
        <div className="py-1 px-2 text-xs text-neutral-500 dark:text-neutral-400 font-medium border-t border-neutral-200 dark:border-neutral-700 mt-1">
          History & Lore
        </div>
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
  );
}
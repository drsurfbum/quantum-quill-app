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
import { useState, useEffect, useMemo } from "react";
import BibleEntry from "@/components/story-bible/bible-entry";
import BibleEditor from "@/components/story-bible/bible-editor";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

// Entry types with their icons
const entryTypes = [
  { id: "all", label: "All", icon: FileText },
  { id: "character", label: "Characters", icon: Users },
  { id: "race", label: "Races/Species", icon: Globe },
  { id: "location", label: "Locations", icon: MapPin },
  { id: "item", label: "Items", icon: ShoppingBag },
  { id: "event", label: "Events", icon: Calendar },
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
  const [autoSelectDisabled, setAutoSelectDisabled] = useState(false);

  // Auto-collapse on mobile
  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true);
    }
  }, [isMobile]);

  const { data: project, isLoading: isLoadingProject } = useProject(id ? Number(id) : 0);
  const { data: entries = [], isLoading: isLoadingEntries } = useStoryBibleEntries(id ? Number(id) : 0);
  const { mutate: createEntry, isPending: isCreating } = useCreateStoryBibleEntry();

  // Filter entries by type and search term
  const filteredEntries = entries.filter(entry => {
    const matchesType = selectedType === "all" || entry.entryType === selectedType;
    const matchesSearch = entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (entry.content ? entry.content.toLowerCase().includes(searchTerm.toLowerCase()) : false);
    return matchesType && matchesSearch;
  }).sort((a, b) => a.title.localeCompare(b.title));

  // Simple, clean entry selection logic
  const selectedEntry = useMemo(() => {
    if (selectedEntryId !== null) {
      return entries.find(entry => entry.id === selectedEntryId) || null;
    }
    return null;
  }, [entries, selectedEntryId]);
  
  // State debugging logs
  useEffect(() => {
    console.log('🔍 State Debug:', {
      selectedEntryId,
      autoSelectDisabled,
      entriesLength: entries.length,
      selectedEntryExists: selectedEntry ? 'YES' : 'NO',
      selectedEntryTitle: selectedEntry?.title
    });
  }, [selectedEntryId, autoSelectDisabled, entries.length, selectedEntry]);

  // Auto-select first entry only once, and only if no manual selection has been made
  useEffect(() => {
    if (!autoSelectDisabled && entries.length > 0 && selectedEntryId === null) {
      console.log('🤖 Auto-selecting first entry:', entries[0].title, entries[0].id);
      setSelectedEntryId(entries[0].id);
    }
  }, [entries.length, selectedEntryId, autoSelectDisabled]);

  // Handle manual entry selection - simple and reliable
  const handleSelectEntry = (entryId: number) => {
    console.log('👆 Manual selection:', entryId);
    // Mark that user manually selected an entry - disable auto-selection
    setAutoSelectDisabled(true);
    setSelectedEntryId(entryId);
  };

  // Handle entry creation with guaranteed selection
  const handleCreateEntry = (entryType: string) => {
    console.log('➕ Creating entry:', entryType);
    // Disable auto-selection since we're making a manual choice
    setAutoSelectDisabled(true);
    
    createEntry(
      {
        title: `New ${entryType}`,
        content: "",
        projectId: Number(id),
        entryType
      },
      {
        onSuccess: (data) => {
          console.log('✅ Entry created successfully:', data);
          console.log('📝 Setting type filter to:', data.entryType);
          console.log('🎯 Setting selected entry to:', data.id);
          
          // Set the filter to show the new entry type
          setSelectedType(data.entryType);
          
          // Select the new entry
          setSelectedEntryId(data.id);
          
          toast({
            title: "Entry created",
            description: `New ${data.entryType} has been created.`
          });
        },
        onError: (error) => {
          console.error('❌ Entry creation failed:', error);
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
                  id="entry-type-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const menu = document.getElementById('entry-type-menu');
                    const button = document.getElementById('entry-type-button');

                    if (menu && button) {
                      // Toggle menu visibility
                      const isVisible = menu.style.display !== 'none';

                      if (!isVisible) {
                        // Position the menu relative to the button
                        const buttonRect = button.getBoundingClientRect();

                        // Check if there's enough space on the right
                        const rightSpace = window.innerWidth - buttonRect.right;
                        const menuWidth = 250; // Max width of the menu

                        if (rightSpace < menuWidth) {
                          // Not enough space on right, position to the left of the button
                          menu.style.right = (window.innerWidth - buttonRect.left) + 'px';
                          menu.style.left = 'auto';
                        } else {
                          // Enough space on right, position from the left
                          menu.style.left = buttonRect.left + 'px';
                          menu.style.right = 'auto';
                        }

                        // Position vertically below the button
                        menu.style.top = (buttonRect.bottom + 4) + 'px';
                        menu.style.display = 'block';

                        // Add click listener to document to close on outside clicks
                        const handleClickOutside = (event: MouseEvent) => {
                          const target = event.target as Node;
                          if (menu && !menu.contains(target) && !button.contains(target)) {
                            menu.style.display = 'none';
                            document.removeEventListener('click', handleClickOutside);
                          }
                        };

                        // Add with slight delay to prevent immediate closing
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
                
                {/* Dropdown menu for entry types */}
                <div 
                  id="entry-type-menu" 
                  className="fixed max-w-[250px] bg-white dark:bg-neutral-800 shadow-md rounded-md py-1 z-50 border border-neutral-200 dark:border-neutral-700 overflow-y-auto max-h-[80vh]"
                  style={{ display: 'none', position: 'fixed' }}
                >
                  <div className="py-1 px-2 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                    Create new:
                  </div>
                  
                  {/* Characters & Races */}
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
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start px-3 py-1 h-8"
                    onClick={() => {
                      handleCreateEntry('race');
                      document.getElementById('entry-type-menu')!.style.display = 'none';
                    }}
                  >
                    <Globe className="h-4 w-4 mr-2" /> Race/Species
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start px-3 py-1 h-8"
                    onClick={() => {
                      handleCreateEntry('group');
                      document.getElementById('entry-type-menu')!.style.display = 'none';
                    }}
                  >
                    <FolderTree className="h-4 w-4 mr-2" /> Group
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start px-3 py-1 h-8"
                    onClick={() => {
                      handleCreateEntry('government');
                      document.getElementById('entry-type-menu')!.style.display = 'none';
                    }}
                  >
                    <Building className="h-4 w-4 mr-2" /> Government
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
                      handleCreateEntry('geography');
                      document.getElementById('entry-type-menu')!.style.display = 'none';
                    }}
                  >
                    <Mountain className="h-4 w-4 mr-2" /> Geography
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start px-3 py-1 h-8"
                    onClick={() => {
                      handleCreateEntry('language');
                      document.getElementById('entry-type-menu')!.style.display = 'none';
                    }}
                  >
                    <Languages className="h-4 w-4 mr-2" /> Language
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start px-3 py-1 h-8"
                    onClick={() => {
                      handleCreateEntry('magicSystem');
                      document.getElementById('entry-type-menu')!.style.display = 'none';
                    }}
                  >
                    <Wand2 className="h-4 w-4 mr-2" /> Magic System
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start px-3 py-1 h-8"
                    onClick={() => {
                      handleCreateEntry('transportation');
                      document.getElementById('entry-type-menu')!.style.display = 'none';
                    }}
                  >
                    <Train className="h-4 w-4 mr-2" /> Transportation
                  </Button>
                  
                  {/* Story Elements */}
                  <div className="py-1 px-2 text-xs text-neutral-500 dark:text-neutral-400 font-medium border-t border-neutral-200 dark:border-neutral-700 mt-1">
                    Story Elements
                  </div>
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
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start px-3 py-1 h-8"
                    onClick={() => {
                      handleCreateEntry('timeline');
                      document.getElementById('entry-type-menu')!.style.display = 'none';
                    }}
                  >
                    <GitBranch className="h-4 w-4 mr-2" /> Timeline Event
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start px-3 py-1 h-8"
                    onClick={() => {
                      handleCreateEntry('lore');
                      document.getElementById('entry-type-menu')!.style.display = 'none';
                    }}
                  >
                    <Scroll className="h-4 w-4 mr-2" /> Lore/Myth
                  </Button>
                </div>
              </div>
              
              {/* Search Input */}
              <div className="relative mb-2">
                <input
                  type="text"
                  placeholder="Search entries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-1 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md"
                />
              </div>
              
              {/* Entry Type Filter */}
              <div className="flex flex-wrap gap-1 mb-2">
                {entryTypes.map(type => (
                  <Button
                    key={type.id}
                    variant={selectedType === type.id ? "default" : "outline"}
                    size="sm"
                    className="px-2 py-0 h-7 text-xs"
                    onClick={() => setSelectedType(type.id)}
                  >
                    <type.icon className="h-3 w-3 mr-1" />
                    {type.label}
                  </Button>
                ))}
              </div>
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
                      onClick={() => handleSelectEntry(entry.id)}
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
                  <h2 className="text-xl font-medium mb-2">Your Story Bible</h2>
                  <p className="text-neutral-500 dark:text-neutral-400 mb-8 max-w-md">
                    Keep track of all your characters, locations, events, and world-building elements in one place.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:gap-4 justify-center">
                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                      <Button 
                        variant="outline"
                        onClick={() => handleCreateEntry('character')}
                        disabled={isCreating}
                        className="flex-grow sm:flex-grow-0"
                      >
                        <Users className="mr-2 h-4 w-4" /> Character
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => handleCreateEntry('location')}
                        disabled={isCreating}
                        className="flex-grow sm:flex-grow-0"
                      >
                        <MapPin className="mr-2 h-4 w-4" /> Location
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => handleCreateEntry('item')}
                        disabled={isCreating}
                        className="flex-grow sm:flex-grow-0"
                      >
                        <ShoppingBag className="mr-2 h-4 w-4" /> Item
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => handleCreateEntry('lore')}
                        disabled={isCreating}
                        className="flex-grow sm:flex-grow-0"
                      >
                        <Scroll className="mr-2 h-4 w-4" /> Lore/Myth
                      </Button>
                    </div>
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
    </div>
  );
}
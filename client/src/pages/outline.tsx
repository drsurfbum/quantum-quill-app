import { useParams, useLocation, Link } from "wouter";
import SidebarNavigation from "@/components/sidebar-navigation";
import ThemeToggle from "@/components/ui/theme-toggle";
import ExportModal from "@/components/export-modal";
import { useProject } from "@/hooks/use-project";
import { Button } from "@/components/ui/button";
import { Share2, ExternalLink, Plus, PanelLeft, PanelRightClose } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Edit3, Grid, ListTree, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useOutlineItems, useCreateOutlineItem } from "@/hooks/use-outline";
import { useState, useEffect, useCallback } from "react";
import OutlineItem from "@/components/outline/outline-item";
import OutlineEditor from "@/components/outline/outline-editor";
import OutlineRichEditor from "@/components/outline/outline-rich-editor";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAppState } from "@/contexts/app-state-context";

export default function Outline() {
  const { id } = useParams();
  const [location] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(isMobile);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [isOutlineSidebarVisible, setIsOutlineSidebarVisible] = useState(!isMobile);
  
  // Auto-collapse on mobile
  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true);
      setIsOutlineSidebarVisible(false);
    } else {
      setIsOutlineSidebarVisible(true);
    }
  }, [isMobile]);
  
  const { data: project, isLoading: isLoadingProject } = useProject(id || '');
  const { data: outlineItems = [], isLoading: isLoadingOutline } = useOutlineItems(id || '');
  const { mutate: createOutlineItem, isPending: isCreating } = useCreateOutlineItem();
  
  // Find root-level items (parentId is null)
  const rootItems = outlineItems.filter(item => item.parentId === null)
    .sort((a, b) => a.order - b.order);
  
  // Find selected item
  const selectedItem = outlineItems.find(item => item.id === selectedItemId);
  
  // Access app state context directly
  const { setOutlineItemExpanded } = useAppState();
  
  // Ensure parent items of selected item remain expanded
  const ensureParentsExpanded = useCallback((item: { id: number, parentId: number | null }) => {
    if (!item || !item.parentId) return;
    
    // Find the parent item
    const parentItem = outlineItems.find(i => i.id === item.parentId);
    if (parentItem) {
      // Expand the parent
      setOutlineItemExpanded(parentItem.id, true);
      
      // Recursively ensure grandparents are expanded too
      if (parentItem.parentId) {
        ensureParentsExpanded(parentItem);
      }
    }
  }, [outlineItems, setOutlineItemExpanded]);
  
  // When selected item changes, ensure its parents are expanded
  useEffect(() => {
    if (selectedItem && outlineItems.length > 0) {
      ensureParentsExpanded(selectedItem);
    }
  }, [selectedItemId, outlineItems, ensureParentsExpanded, selectedItem]);
  
  const handleCreateItem = (parentId: number | null = null) => {
    const maxOrder = parentId 
      ? Math.max(0, ...outlineItems.filter(item => item.parentId === parentId).map(item => item.order))
      : Math.max(0, ...rootItems.map(item => item.order));
    
    // If creating under a parent, make sure parent is expanded
    if (parentId) {
      setOutlineItemExpanded(parentId, true);
    }
    
    createOutlineItem(
      {
        title: "New Section",
        content: "",
        projectId: Number(id),
        parentId,
        order: maxOrder + 1
      },
      {
        onSuccess: (result) => {
          if (!result.success) {
            toast({
              title: "Error creating section",
              description: "There was an error creating your outline section. Please try again.",
              variant: "destructive"
            });
            return;
          }
          
          const newItem = result.data;
          
          // Select the new item
          setSelectedItemId(newItem.id);
          
          // If the item has a parent, ensure the parent stays expanded
          if (newItem.parentId) {
            setOutlineItemExpanded(newItem.parentId, true);
          }
          
          toast({
            title: "Section created",
            description: "New outline section has been created."
          });
        },
        onError: (error) => {
          console.error("Create error:", error);
          toast({
            title: "Error creating section",
            description: "There was an error creating your outline section. Please try again.",
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
            <Button 
              variant="ghost" 
              size="sm" 
              className="mr-2"
              onClick={() => setIsOutlineSidebarVisible(!isOutlineSidebarVisible)}
              aria-label={isOutlineSidebarVisible ? "Hide outline list" : "Show outline list"}
            >
              {isOutlineSidebarVisible ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelLeft className="h-4 w-4" />
              )}
            </Button>
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
          <Tabs defaultValue="outline">
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
          {/* Outline Structure Sidebar */}
          <div className={cn(
            "border-r border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden bg-neutral-50 dark:bg-neutral-900",
            "absolute md:static transition-all duration-300 z-10",
            isOutlineSidebarVisible ? "w-64 translate-x-0" : "w-0 -translate-x-full md:hidden"
          )}>
            <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
              <h3 className="font-medium">Outline</h3>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => handleCreateItem()}
                disabled={isCreating}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex-grow overflow-y-auto p-2">
              {isLoadingOutline ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : rootItems.length === 0 ? (
                <div className="text-center p-4 text-sm text-neutral-500 dark:text-neutral-400">
                  No outline sections yet. 
                  <Button 
                    variant="link" 
                    onClick={() => handleCreateItem()}
                    disabled={isCreating}
                    className="p-0 h-auto font-normal text-sm"
                  >
                    Create one
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {rootItems.map(item => (
                    <OutlineItem 
                      key={item.id}
                      item={item}
                      items={outlineItems}
                      selectedItemId={selectedItemId}
                      onSelectItem={setSelectedItemId}
                      onCreateItem={handleCreateItem}
                      projectId={Number(id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Outline Content Editor */}
          <div className={cn(
            "flex-grow flex flex-col overflow-hidden transition-all duration-300",
            isOutlineSidebarVisible ? "md:ml-0" : "ml-0"
          )}>
            {isLoadingOutline ? (
              <div className="flex-grow flex items-center justify-center p-6">
                <Skeleton className="h-40 w-full max-w-2xl" />
              </div>
            ) : !selectedItem ? (
              <div className="flex-grow flex items-center justify-center text-center p-6">
                <div>
                  <ListTree className="h-12 w-12 mx-auto text-neutral-300 dark:text-neutral-600 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select a section</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 mb-4 max-w-md">
                    Select a section from the outline to edit its content, or create a new section to get started.
                  </p>
                  <Button 
                    onClick={() => handleCreateItem()}
                    disabled={isCreating}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Create a section
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full w-full">
                {/* Section header */}
                <div className="bg-muted/30 border-b py-2 px-4">
                  <h2 className="text-lg font-medium">
                    {selectedItem.title}
                  </h2>
                </div>
                <OutlineRichEditor 
                  item={selectedItem}
                  projectId={Number(id)}
                />
              </div>
            )}
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}

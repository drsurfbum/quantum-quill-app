import { useParams, useLocation, Link } from "wouter";
import SidebarNavigation from "@/components/sidebar-navigation";
import ThemeToggle from "@/components/ui/theme-toggle";
import ExportModal from "@/components/export-modal";
import { useProject } from "@/hooks/use-project";
import { Button } from "@/components/ui/button";
import { Share2, ExternalLink } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Edit3, Grid, ListTree, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Whiteboard from "@/components/whiteboard";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type Whiteboard as WhiteboardType } from "@shared/schema";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Storyboard() {
  const { id } = useParams();
  const [location] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(isMobile);
  const [currentWhiteboardId, setCurrentWhiteboardId] = useState<number | null>(null);
  
  // Auto-collapse on mobile
  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true);
    }
  }, [isMobile]);
  
  const { data: project, isLoading: isLoadingProject } = useProject(id);
  
  // Get available whiteboards for this project
  const { data: whiteboards = [], isLoading: isLoadingWhiteboards } = useQuery<WhiteboardType[]>({
    queryKey: [`/api/projects/${id}/whiteboards`],
  });

  // Create whiteboard mutation
  const { mutate: createWhiteboard } = useMutation({
    mutationFn: async (data: { name: string, projectId: number, canvasData: any }) => {
      const res = await apiRequest('POST', '/api/whiteboards', data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}/whiteboards`] });
      setCurrentWhiteboardId(data.id);
      toast({
        title: "Whiteboard created",
        description: "New whiteboard has been created successfully."
      });
    }
  });

  // Update whiteboard mutation
  const { mutate: updateWhiteboard } = useMutation({
    mutationFn: async ({ id, canvasData }: { id: number, canvasData: any }) => {
      const res = await apiRequest('PUT', `/api/whiteboards/${id}`, { canvasData });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Whiteboard saved",
        description: "Your whiteboard has been saved successfully."
      });
    }
  });

  // If no whiteboards exist, create one
  useEffect(() => {
    if (whiteboards.length === 0 && !isLoadingWhiteboards) {
      createWhiteboard({
        name: "Main Storyboard",
        projectId: Number(id),
        canvasData: {}
      });
    } else if (whiteboards.length > 0 && !currentWhiteboardId) {
      setCurrentWhiteboardId(whiteboards[0].id);
    }
  }, [whiteboards, isLoadingWhiteboards, id, createWhiteboard, currentWhiteboardId]);

  // Get current whiteboard data
  const { data: currentWhiteboard, isLoading: isLoadingCurrentWhiteboard } = useQuery<WhiteboardType>({
    queryKey: [currentWhiteboardId ? `/api/whiteboards/${currentWhiteboardId}` : null],
    enabled: !!currentWhiteboardId
  });

  // Save whiteboard data
  const handleSave = (data: any) => {
    if (currentWhiteboardId) {
      updateWhiteboard({
        id: currentWhiteboardId,
        canvasData: data
      });
    }
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
          <Tabs defaultValue="storyboard">
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
          {isLoadingWhiteboards || isLoadingCurrentWhiteboard ? (
            <div className="flex-grow flex items-center justify-center">
              <div className="text-center">
                <Skeleton className="h-8 w-36 mx-auto mb-4" />
                <Skeleton className="h-4 w-48 mx-auto" />
              </div>
            </div>
          ) : (
            <Whiteboard 
              projectId={id} 
              whiteboardId={currentWhiteboardId || undefined}
              initialData={currentWhiteboard?.canvasData}
              onSave={handleSave}
            />
          )}
        </div>
      </main>
      </div>
    </div>
  );
}

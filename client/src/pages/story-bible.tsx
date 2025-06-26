import { useParams, useLocation, Link } from "wouter";
import SidebarNavigation from "@/components/sidebar-navigation";
import ThemeToggle from "@/components/ui/theme-toggle";
import ExportModal from "@/components/export-modal";
import { useProject } from "@/hooks/use-project";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus, ArrowLeft, Edit3, Grid, ListTree } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateStoryBibleEntry } from "@/hooks/use-story-bible";
import { StoryBibleEntry } from "@shared/schema";
import { useState, useRef, useCallback } from "react";
import { SimplifiedBentoDashboard } from "@/components/story-bible/simplified-bento-dashboard";
import { EnhancedBibleEditor } from "@/components/story-bible/enhanced-bible-editor";
import { CharacterEditor } from "@/components/story-bible/character-editor";
import { GroupsRacesEditor } from "@/components/story-bible/groups-races-editor";
import { LocationsEditor } from "@/components/story-bible/locations-editor";
import { EventsEditor } from "@/components/story-bible/events-editor";
import { WorldElementsEditor } from "@/components/story-bible/world-elements-editor";
import { DetailsEditor } from "@/components/story-bible/details-editor";
import { ResearchEditor } from "@/components/story-bible/research-editor";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

export default function StoryBible() {
  const { id } = useParams();
  const [location] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Stable editor renderer component to prevent re-mounting
  const EditorRenderer = useCallback(({ entry, projectId, onClose }: {
    entry: StoryBibleEntry;
    projectId: number;
    onClose: () => void;
  }) => {
    switch (entry.entryType) {
      case "characters":
        return <CharacterEditor entry={entry} projectId={projectId} onClose={onClose} />;
      case "groups_races":
        return <GroupsRacesEditor entry={entry} projectId={projectId} onClose={onClose} />;
      case "locations":
        return <LocationsEditor entry={entry} projectId={projectId} onClose={onClose} />;
      case "events":
        return <EventsEditor entry={entry} projectId={projectId} onClose={onClose} />;
      case "world_elements":
        return <WorldElementsEditor entry={entry} projectId={projectId} onClose={onClose} />;
      case "details":
        return <DetailsEditor entry={entry} projectId={projectId} onClose={onClose} />;
      case "research":
        return <ResearchEditor entry={entry} projectId={projectId} onClose={onClose} />;
      default:
        return <EnhancedBibleEditor entry={entry} projectId={projectId} onClose={onClose} />;
    }
  }, []);
  // Use a more robust state machine approach
  const [editorState, setEditorState] = useState<{
    mode: "dashboard" | "editor";
    entryId: number | null;
    entryData: StoryBibleEntry | null;
    mountKey: string;
  }>({
    mode: "dashboard",
    entryId: null,
    entryData: null,
    mountKey: ""
  });

  const projectId = parseInt(id!);
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const createMutation = useCreateStoryBibleEntry();

  const handleCreateEntry = async (entryType: string) => {
    try {
      const result = await createMutation.mutateAsync({
        title: `New ${entryType.charAt(0).toUpperCase() + entryType.slice(1)}`,
        content: "",
        projectId,
        entryType
      });

      if (result.success) {
        const mountKey = `${entryType}-${result.data.id}-${Date.now()}`;
        setEditorState({
          mode: "editor",
          entryId: result.data.id,
          entryData: result.data,
          mountKey
        });
        toast({
          title: "Entry Created",
          description: `New ${entryType} entry created successfully`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create entry",
        variant: "destructive",
      });
    }
  };

  const handleEditEntry = useCallback((entry: StoryBibleEntry) => {
    const mountKey = `${entry.entryType}-${entry.id}-${Date.now()}`;
    setEditorState({
      mode: "editor",
      entryId: entry.id,
      entryData: entry,
      mountKey
    });
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setEditorState({
      mode: "dashboard",
      entryId: null,
      entryData: null,
      mountKey: ""
    });
  }, []);

  if (projectLoading) {
    return (
      <div className="flex min-h-screen">
        <SidebarNavigation onCollapsedChange={setIsCollapsed} />
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen">
        <SidebarNavigation onCollapsedChange={setIsCollapsed} />
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Project not found</h2>
              <p className="text-muted-foreground">The requested project could not be found.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <div className="flex flex-row flex-1 w-full h-full overflow-hidden">
        <SidebarNavigation onCollapsedChange={setIsCollapsed} />
        
        <main className="flex-grow overflow-auto flex flex-col w-full" style={{ marginLeft: isMobile && isCollapsed ? '56px' : '0' }}>
          <header className="min-h-16 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between px-4 sm:px-6 py-3 sticky top-0 bg-background z-10">
            <div className="flex items-center mr-4">
              <h1 className="text-lg sm:text-xl font-semibold truncate max-w-[200px] sm:max-w-xs">{project?.title}</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <ExportModal projectId={projectId} projectTitle={project?.title || "Project"} />
              <ThemeToggle />
            </div>
          </header>

          {/* Navigation tabs matching other pages */}
          <div className="border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto">
            <div className="flex min-w-max mx-2 md:mx-4 h-10 w-auto">
              <Link href={`/project/${id}/write`}>
                <div className={cn(
                  "flex items-center gap-1 px-2 sm:px-3 py-2 rounded-none cursor-pointer whitespace-nowrap",
                  location === `/project/${id}/write` ? "border-b-2 border-primary" : ""
                )}>
                  <span className="hidden xs:inline">Write</span>
                </div>
              </Link>
              
              <Link href={`/project/${id}/storyboard`}>
                <div className={cn(
                  "flex items-center gap-1 px-2 sm:px-3 py-2 rounded-none cursor-pointer whitespace-nowrap",
                  location === `/project/${id}/storyboard` ? "border-b-2 border-primary" : ""
                )}>
                  <span className="hidden xs:inline">Storyboard</span>
                </div>
              </Link>
              
              <Link href={`/project/${id}/outline`}>
                <div className={cn(
                  "flex items-center gap-1 px-2 sm:px-3 py-2 rounded-none cursor-pointer whitespace-nowrap",
                  location === `/project/${id}/outline` ? "border-b-2 border-primary" : ""
                )}>
                  <span className="hidden xs:inline">Outline</span>
                </div>
              </Link>
              
              <Link href={`/project/${id}/story-bible`}>
                <div className={cn(
                  "flex items-center gap-1 px-2 sm:px-3 py-2 rounded-none cursor-pointer whitespace-nowrap",
                  location === `/project/${id}/story-bible` ? "border-b-2 border-primary" : ""
                )}>
                  <BookOpen className="h-4 w-4 sm:mr-1" /> <span className="hidden xs:inline">Story Bible</span>
                </div>
              </Link>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            {editorState.mode === "dashboard" ? (
              <div className="h-full p-6">
                <SimplifiedBentoDashboard
                  projectId={projectId}
                  onCreateEntry={handleCreateEntry}
                  onEditEntry={handleEditEntry}
                />
              </div>
            ) : editorState.mode === "editor" && editorState.entryData ? (
              <div className="h-full overflow-auto" key={editorState.mountKey}>
                <div className="p-6">
                  <div className="mb-4">
                    <Button
                      variant="ghost"
                      onClick={handleBackToDashboard}
                      className="mb-4"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Dashboard
                    </Button>
                  </div>
                  <EditorRenderer 
                    entry={editorState.entryData}
                    projectId={projectId}
                    onClose={handleBackToDashboard}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
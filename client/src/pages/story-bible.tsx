import WorkspaceHeader from "@/components/workspace-header";
import { EntryEditor } from "@/components/story-bible/entry-editor";
import { SceneBacklinks, SceneReturn } from "@/components/story-bible/scene-backlinks";
import { useQuery } from "@tanstack/react-query";
import { prepareManuscriptAction } from "@/lib/manuscript-actions";
import { RelationshipNavigation } from "@/components/story-bible/relationships";
import { ConversionPreview } from "@/components/story-bible/conversion-preview";
import { EntryLinks } from "@/components/story-bible/entry-links";
import { useParams, useLocation, useSearch, Link } from "wouter";
import SidebarNavigation from "@/components/sidebar-navigation";
import ThemeToggle from "@/components/ui/theme-toggle";
import ExportModal from "@/components/export-modal";
import { useProject } from "@/hooks/use-project";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus, ArrowLeft, Edit3, Grid, ListTree } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateStoryBibleEntry } from "@/hooks/use-story-bible";
import { StoryBibleEntry } from "@shared/schema";
import { useState, useCallback } from "react";
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
  const [location, navigate] = useLocation();
  const search = new URLSearchParams(useSearch());
  const requestedEntry = Number(search.get("entry"));
  const fromScene = Number(search.get("fromScene"));
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const projectId = parseInt(id!);
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const createMutation = useCreateStoryBibleEntry();
  const entryQuery = useQuery<StoryBibleEntry>({queryKey:[`/api/story-bible/${requestedEntry}`],enabled:Number.isSafeInteger(requestedEntry) && requestedEntry > 0,staleTime:0});
  const entry = entryQuery.data?.projectId === projectId ? entryQuery.data : null;
  const editorState = {mode: requestedEntry ? "editor" : "dashboard", entryData:entry, mountKey:requestedEntry ? `${projectId}:${requestedEntry}` : "dashboard"};
  const [navigationError,setNavigationError] = useState("");
  const entryUrl = (entryId?:number) => `/project/${projectId}/story-bible${entryId ? `?entry=${entryId}${fromScene ? `&fromScene=${fromScene}` : ""}` : fromScene ? `?fromScene=${fromScene}` : ""}`;


  const handleCreateEntry = async (entryType: string) => {
    try {
      const result = await createMutation.mutateAsync({
        title: `New ${entryType.charAt(0).toUpperCase() + entryType.slice(1)}`,
        content: "",
        projectId,
        entryType
      });

      if (result.success) {
        navigate(entryUrl(result.data.id));
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

  const handleEditEntry = async (entry: StoryBibleEntry) => {
    setNavigationError("");
    try { await prepareManuscriptAction(projectId); navigate(entryUrl(entry.id)); }
    catch(error) { setNavigationError(error instanceof Error ? error.message : "Could not open entry."); }
  };
  const handleBackToDashboard = async () => {
    setNavigationError("");
    try { await prepareManuscriptAction(projectId); navigate(entryUrl()); }
    catch(error) { setNavigationError(error instanceof Error ? error.message : "Could not leave entry."); }
  };

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
    <div className="h-dvh flex flex-col overflow-hidden bg-background">
      <div className="flex flex-row flex-1 min-h-0 w-full overflow-hidden">


        <main className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
          {project && <WorkspaceHeader project={project} />}

          {/* One bounded scroll surface for the dashboard and every entry editor.
              Reset position only when opening/closing an entry, never on autosave. */}
          <div
            key={editorState.mountKey || "dashboard"}
            role="region"
            aria-label="Story Bible content"
            tabIndex={0}
            className="flex-1 min-h-0 overflow-y-auto [scrollbar-gutter:stable]"
          >
            {fromScene > 0 && <SceneReturn sceneId={fromScene} projectId={projectId} />}
            {navigationError && <p role="alert" className="p-4 text-destructive">{navigationError}</p>}
            {requestedEntry > 0 && !entry && <p role="status" className="p-4">{entryQuery.isLoading ? "Opening Story Bible entry…" : "This entry is unavailable in this project."} <button className="underline" onClick={()=>void handleBackToDashboard()}>Back to Dashboard</button></p>}
            {editorState.mode === "dashboard" ? (
              <div className="p-4 sm:p-6">
                <SimplifiedBentoDashboard
                  projectId={projectId}
                  onCreateEntry={handleCreateEntry}
                  onEditEntry={handleEditEntry}
                />
              </div>
            ) : editorState.mode === "editor" && editorState.entryData ? (
              <div className="p-4 sm:p-6">
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
                <ConversionPreview entry={editorState.entryData} />
                <RelationshipNavigation.Provider value={handleEditEntry}>
                  <EntryEditor
                    entry={editorState.entryData}
                    projectId={projectId}
                    onClose={handleBackToDashboard}
                  />
                  <SceneBacklinks entry={editorState.entryData} />
                  <EntryLinks entry={editorState.entryData} onOpen={handleEditEntry} />
                </RelationshipNavigation.Provider>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}

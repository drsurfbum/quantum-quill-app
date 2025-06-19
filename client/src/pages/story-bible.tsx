import { useParams, useLocation, Link } from "wouter";
import SidebarNavigation from "@/components/sidebar-navigation";
import ThemeToggle from "@/components/ui/theme-toggle";
import ExportModal from "@/components/export-modal";
import { useProject } from "@/hooks/use-project";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus, ArrowLeft } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateStoryBibleEntry } from "@/hooks/use-story-bible";
import { StoryBibleEntry } from "@shared/schema";
import { useState } from "react";
import { EnhancedBentoDashboard } from "@/components/story-bible/enhanced-bento-dashboard";
import { EnhancedBibleEditor } from "@/components/story-bible/enhanced-bible-editor";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

export default function StoryBible() {
  const { id } = useParams();
  const [location] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(isMobile);
  const [selectedEntry, setSelectedEntry] = useState<StoryBibleEntry | null>(null);
  const [view, setView] = useState<"dashboard" | "editor">("dashboard");

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
        setSelectedEntry(result.data);
        setView("editor");
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

  const handleEditEntry = (entry: StoryBibleEntry) => {
    setSelectedEntry(entry);
    setView("editor");
  };

  const handleBackToDashboard = () => {
    setSelectedEntry(null);
    setView("dashboard");
  };

  if (projectLoading) {
    return (
      <div className="flex min-h-screen">
        <SidebarNavigation isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
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
        <SidebarNavigation isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
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
    <div className="flex min-h-screen">
      <SidebarNavigation isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="flex h-14 items-center px-6 gap-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              <h1 className="font-semibold">{project.title}</h1>
            </div>

            <Tabs value={location} className="flex-1">
              <TabsList className="grid w-fit grid-cols-6 bg-transparent p-0 h-auto">
                <Link href={`/project/${id}`}>
                  <TabsTrigger value={`/project/${id}`} className={cn(
                    "data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none",
                    location === `/project/${id}` ? "border-b-2 border-primary" : ""
                  )}>
                    Project
                  </TabsTrigger>
                </Link>
                <Link href={`/project/${id}/chapters`}>
                  <TabsTrigger value={`/project/${id}/chapters`} className={cn(
                    "data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none",
                    location === `/project/${id}/chapters` ? "border-b-2 border-primary" : ""
                  )}>
                    Chapters
                  </TabsTrigger>
                </Link>
                <Link href={`/project/${id}/outline`}>
                  <TabsTrigger value={`/project/${id}/outline`} className={cn(
                    "data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none",
                    location === `/project/${id}/outline` ? "border-b-2 border-primary" : ""
                  )}>
                    Outline
                  </TabsTrigger>
                </Link>
                <Link href={`/project/${id}/story-bible`}>
                  <TabsTrigger value={`/project/${id}/story-bible`} className={cn(
                    "data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none",
                    location === `/project/${id}/story-bible` ? "border-b-2 border-primary" : ""
                  )}>
                    <BookOpen className="mr-1 h-4 w-4" /> Story Bible
                  </TabsTrigger>
                </Link>
                <Link href={`/project/${id}/whiteboards`}>
                  <TabsTrigger value={`/project/${id}/whiteboards`} className={cn(
                    "data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none",
                    location === `/project/${id}/whiteboards` ? "border-b-2 border-primary" : ""
                  )}>
                    Whiteboards
                  </TabsTrigger>
                </Link>
                <Link href={`/project/${id}/plot-structure`}>
                  <TabsTrigger value={`/project/${id}/plot-structure`} className={cn(
                    "data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none",
                    location === `/project/${id}/plot-structure` ? "border-b-2 border-primary" : ""
                  )}>
                    Plot Structure
                  </TabsTrigger>
                </Link>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <ExportModal projectId={projectId} />
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {view === "dashboard" ? (
            <div className="h-full p-6">
              <EnhancedBentoDashboard
                projectId={projectId}
                onCreateEntry={handleCreateEntry}
                onEditEntry={handleEditEntry}
              />
            </div>
          ) : selectedEntry ? (
            <div className="h-full overflow-auto">
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
                <EnhancedBibleEditor
                  entry={selectedEntry}
                  projectId={projectId}
                  onClose={handleBackToDashboard}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
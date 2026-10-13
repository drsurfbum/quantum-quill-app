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
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import PlotStructureContainer from "@/components/plot-structure/plot-structure-container";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Storyboard() {
  const { id } = useParams();
  const [location] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(isMobile);

  // Auto-collapse on mobile
  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true);
    }
  }, [isMobile]);

  const { data: project, isLoading: isLoadingProject } = useProject(id ? id : '0');

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <div className="flex flex-row flex-1 w-full h-full overflow-hidden">
        <SidebarNavigation onCollapsedChange={setIsCollapsed} />

        <main className="flex-grow overflow-hidden flex flex-col w-full pl-0 md:pl-0" style={{marginLeft: isCollapsed ? '56px' : '0'}}>
        <header className="min-h-16 shrink-0 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2 px-3 sm:px-6 py-2">
          <div className="flex items-center">
            {isLoadingProject ? (
              <Skeleton className="h-6 w-48" />
            ) : (
              <h1 className="text-xl font-semibold truncate max-w-[min(45vw,24rem)]">{project?.title}</h1>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <ThemeToggle />

            <Button variant="ghost" className="hidden md:inline-flex" disabled title="Sharing is not available yet">Share · planned</Button>

            {project && <ExportModal projectId={project.id} projectTitle={project.title} />}

            {project && <ExportModal projectId={project.id} projectTitle={project.title} preview />}
          </div>
        </header>

        <div className="border-b border-neutral-200 dark:border-neutral-800">
          <Tabs defaultValue="storyboard">
            <TabsList className="mx-4 h-10 w-auto">
              <Link href={`/project/${id}/write`}>
                <TabsTrigger value="write" className={cn(
                  "data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none",
                  location === `/project/${id}/write` ? "border-b-2 border-primary" : ""
                )} style={{marginRight: '1rem'}}>
                  <Edit3 className="mr-1 h-4 w-4" /> Write
                </TabsTrigger>
              </Link>

              <Link href={`/project/${id}/storyboard`}>
                <TabsTrigger value="storyboard" className={cn(
                  "data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none",
                  location === `/project/${id}/storyboard` ? "border-b-2 border-primary" : ""
                )} style={{marginRight: '1rem'}}>
                  <Grid className="mr-1 h-4 w-4" /> Storyboard
                </TabsTrigger>
              </Link>

              <Link href={`/project/${id}/outline`}>
                <TabsTrigger value="outline" className={cn(
                  "data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none",
                  location === `/project/${id}/outline` ? "border-b-2 border-primary" : ""
                )} style={{marginRight: '1rem'}}>
                  <ListTree className="mr-1 h-4 w-4" /> Outline
                </TabsTrigger>
              </Link>

              <Link href={`/project/${id}/story-bible`}>
                <TabsTrigger value="story-bible" className={cn(
                  "data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none",
                  location === `/project/${id}/story-bible` ? "border-b-2 border-primary" : ""
                )} style={{marginRight: '1rem'}}>
                  <BookOpen className="mr-1 h-4 w-4" /> Story Bible
                </TabsTrigger>
              </Link>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-grow flex overflow-hidden">
          {isLoadingProject ? (
            <div className="flex-grow flex items-center justify-center">
              <div className="text-center">
                <Skeleton className="h-8 w-36 mx-auto mb-4" />
                <Skeleton className="h-4 w-48 mx-auto" />
              </div>
            </div>
          ) : (
            <PlotStructureContainer projectId={id || 0} />
          )}
        </div>
      </main>
      </div>
    </div>
  );
}
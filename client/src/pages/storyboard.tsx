import WorkspaceHeader from "@/components/workspace-header";
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


        <main className="flex-grow overflow-hidden flex flex-col w-full pl-0 md:pl-0">
        {project && <WorkspaceHeader project={project} />}

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

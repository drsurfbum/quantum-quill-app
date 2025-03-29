import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import SidebarNavigation from "@/components/sidebar-navigation";
import { 
  Edit3, Grid, ListTree, BookOpen, 
  ExternalLink, Share2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProject } from "@/hooks/use-project";
import ThemeToggle from "@/components/ui/theme-toggle";
import ExportModal from "@/components/export-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function Project() {
  const { id } = useParams();
  const [location, setLocation] = useLocation();
  const { data: project, isLoading, error } = useProject(id);

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Project not found</h1>
          <p className="text-gray-500 mb-4">The project you're looking for doesn't exist or has been deleted.</p>
          <Link href="/">
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Set default active tab
  // Check if we're in the project base route with no specific tab
  if (location === `/project/${id}`) {
    setLocation(`/project/${id}/write`);
    return null;
  }

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden">
      <SidebarNavigation />
      
      <main className="flex-grow overflow-hidden flex flex-col">
        <header className="h-16 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center">
            {isLoading ? (
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
        </div>
      </main>
    </div>
  );
}

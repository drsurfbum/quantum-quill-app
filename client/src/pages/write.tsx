import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import SidebarNavigation from "@/components/sidebar-navigation";
import ChapterSidebar from "@/components/chapter-sidebar";
import RichTextEditor from "@/components/rich-text-editor";
import ThemeToggle from "@/components/ui/theme-toggle";
import ExportModal from "@/components/export-modal";
import { useProject, useProjectChapters, useCreateChapter } from "@/hooks/use-project";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Share2, ExternalLink } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { Edit3, Grid, ListTree, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Write() {
  const { id } = useParams();
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split("?")[1] || "");
  const chapterId = searchParams.get("chapter");
  const { toast } = useToast();
  
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(chapterId);
  
  const { data: project, isLoading: isLoadingProject } = useProject(id);
  const { data: chapters = [], isLoading: isLoadingChapters } = useProjectChapters(id);
  const { mutate: createChapter, isPending: isCreatingChapter } = useCreateChapter();
  
  // If no chapter is selected, select the first one
  useEffect(() => {
    if (!selectedChapterId && chapters.length > 0 && !isLoadingChapters) {
      setSelectedChapterId(String(chapters[0].id));
    }
  }, [chapters, selectedChapterId, isLoadingChapters]);
  
  // If no chapters exist, create one
  useEffect(() => {
    if (chapters.length === 0 && !isLoadingChapters && !isCreatingChapter) {
      createChapter(
        {
          title: "Chapter 1",
          projectId: Number(id),
          order: 0,
          isDraft: true
        },
        {
          onSuccess: (data) => {
            setSelectedChapterId(String(data.id));
            toast({
              title: "Chapter created",
              description: "Your first chapter has been created."
            });
          },
          onError: () => {
            toast({
              title: "Error creating chapter",
              description: "There was an error creating your chapter. Please try again.",
              variant: "destructive"
            });
          }
        }
      );
    }
  }, [chapters, isLoadingChapters, id, createChapter, isCreatingChapter, toast]);
  
  // Find selected chapter
  const selectedChapter = chapters.find(c => c.id === Number(selectedChapterId));

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden">
      <SidebarNavigation />
      
      <main className="flex-grow overflow-hidden flex flex-col">
        <header className="h-16 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center">
            {isLoadingProject ? (
              <Skeleton className="h-6 w-48" />
            ) : (
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-semibold">{project?.title}</h1>
              </div>
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
                location.startsWith(`/project/${id}/write`) ? "border-b-2 border-primary" : ""
              )}>
                <Edit3 className="mr-1 h-4 w-4" /> Write
              </TabsTrigger>
            </Link>
            
            <Link href={`/project/${id}/storyboard`}>
              <TabsTrigger value="storyboard" className={cn(
                "data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none",
                location.startsWith(`/project/${id}/storyboard`) ? "border-b-2 border-primary" : ""
              )}>
                <Grid className="mr-1 h-4 w-4" /> Storyboard
              </TabsTrigger>
            </Link>
            
            <Link href={`/project/${id}/outline`}>
              <TabsTrigger value="outline" className={cn(
                "data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none",
                location.startsWith(`/project/${id}/outline`) ? "border-b-2 border-primary" : ""
              )}>
                <ListTree className="mr-1 h-4 w-4" /> Outline
              </TabsTrigger>
            </Link>
            
            <Link href={`/project/${id}/story-bible`}>
              <TabsTrigger value="story-bible" className={cn(
                "data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none",
                location.startsWith(`/project/${id}/story-bible`) ? "border-b-2 border-primary" : ""
              )}>
                <BookOpen className="mr-1 h-4 w-4" /> Story Bible
              </TabsTrigger>
            </Link>
          </TabsList>
        </div>

        <div className="flex-grow flex overflow-hidden">
          <ChapterSidebar projectId={id} selectedChapterId={selectedChapterId || undefined} />
          
          {isLoadingChapters || !selectedChapter ? (
            <div className="flex-grow flex items-center justify-center bg-white dark:bg-neutral-900">
              <div className="text-center p-6">
                <Skeleton className="h-8 w-52 mx-auto mb-4" />
                <Skeleton className="h-4 w-64 mx-auto mb-2" />
                <Skeleton className="h-4 w-48 mx-auto" />
              </div>
            </div>
          ) : (
            <RichTextEditor 
              content={selectedChapter.content}
              chapterId={selectedChapter.id}
            />
          )}
        </div>
      </main>
    </div>
  );
}

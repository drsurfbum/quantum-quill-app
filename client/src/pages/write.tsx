import { useEffect, useState, useRef } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import SidebarNavigation from "@/components/sidebar-navigation";
import ChapterSidebar from "@/components/chapter-sidebar";
import SceneWorkspace from "@/components/scene-workspace";
import RichTextEditor from "@/components/rich-text-editor";
import ThemeToggle from "@/components/ui/theme-toggle";
import ExportModal from "@/components/export-modal";
import { useProject, useProjectChapters, useCreateChapter } from "@/hooks/use-project";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Share2, ExternalLink, PanelLeft, PanelRightClose } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { Edit3, Grid, ListTree, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Write() {
  const { id } = useParams();
  const [location, navigate] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const chapterId = searchParams.get("chapter");
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(isMobile);
  const [isChapterSidebarVisible, setIsChapterSidebarVisible] = useState(!isMobile);
  
  // Auto-collapse navigation sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      setIsSidebarCollapsed(true);
      setIsChapterSidebarVisible(false);
    } else {
      setIsChapterSidebarVisible(true);
    }
  }, [isMobile]);
  
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(chapterId);
  
  const { data: project, isLoading: isLoadingProject } = useProject(id || '');
  const { data: chapters = [], isLoading: isLoadingChapters, isSuccess: chaptersLoaded } = useProjectChapters(id || '');
  const initializedProject = useRef<string | null>(null);
  useEffect(() => { setSelectedChapterId(chapterId); }, [id, chapterId]);
  const { mutate: createChapter, isPending: isCreatingChapter } = useCreateChapter();
  
  // If no chapter is selected, select the first one
  useEffect(() => {
    if (!selectedChapterId && chapters.length > 0 && !isLoadingChapters) {
      setSelectedChapterId(String(chapters[0].id));
    }
  }, [chapters, selectedChapterId, isLoadingChapters]);
  
  // If no chapters exist, create one
  useEffect(() => {
    if (chapters.length === 0 && chaptersLoaded && !isCreatingChapter && id && initializedProject.current !== id) {
      initializedProject.current = id;
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
  }, [chapters, chaptersLoaded, id, createChapter, isCreatingChapter, toast]);
  
  // Handle chapter selection
  const handleChapterSelect = (chapterId: string) => {
    setSelectedChapterId(chapterId);
    // Update URL with the new chapter ID
    const newUrl = `/project/${id}/write?chapter=${chapterId}`;
    navigate(newUrl);
  };
  
  // Find selected chapter
  const selectedChapter = chapters.find(c => c.id === Number(selectedChapterId || '0'));

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <div className="flex flex-row flex-1 w-full h-full overflow-hidden">
        <SidebarNavigation onCollapsedChange={setIsSidebarCollapsed} />
        
        <main className="flex-grow overflow-hidden flex flex-col w-full pl-0 md:pl-0" style={{marginLeft: isSidebarCollapsed ? '56px' : '0'}}>
        <header className="h-16 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              className="mr-2"
              onClick={() => setIsChapterSidebarVisible(!isChapterSidebarVisible)}
              aria-label={isChapterSidebarVisible ? "Hide chapter list" : "Show chapter list"}
            >
              {isChapterSidebarVisible ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelLeft className="h-4 w-4" />
              )}
            </Button>
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
          <Tabs defaultValue="write">
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
          </Tabs>
        </div>

        <div className="flex-grow flex overflow-hidden">
          <ChapterSidebar 
            projectId={id || ''} 
            selectedChapterId={selectedChapterId ? Number(selectedChapterId) : undefined} 
            isVisible={isChapterSidebarVisible}
            onChapterSelect={handleChapterSelect}
          />
          
          <div className={cn(
            "flex-grow min-w-0 min-h-0 flex flex-col",
            isChapterSidebarVisible ? "md:ml-0" : "ml-0"
          )}>
            {isLoadingChapters || !selectedChapter ? (
              <div className="flex-grow flex items-center justify-center bg-white dark:bg-neutral-900 h-full">
                <div className="text-center p-6">
                  <Skeleton className="h-8 w-52 mx-auto mb-4" />
                  <Skeleton className="h-4 w-64 mx-auto mb-2" />
                  <Skeleton className="h-4 w-48 mx-auto" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full w-full">
                {/* Chapter header */}
                <div className="bg-muted/30 border-b py-2 px-4">
                  <h2 className="text-lg font-medium">
                    {selectedChapter.title} {selectedChapter.isDraft ? "(Draft)" : "(Completed)"}
                  </h2>
                </div>
                {selectedChapter.writingMode === "scenes" ? <SceneWorkspace key={selectedChapter.id} chapter={selectedChapter} /> : <RichTextEditor
                  key={selectedChapter.id}
                  projectId={selectedChapter.projectId}
                  content={selectedChapter.content}
                  chapterId={selectedChapter.id}
                  revision={selectedChapter.revision}
                  title={selectedChapter.title}
                />}
              </div>
            )}
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}

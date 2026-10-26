import { useInterfaceTour } from "@/components/tour/tour-provider";
import WorkspaceHeader from "@/components/workspace-header";
import WritingDocument from "@/components/writing-document";
import { useEffect, useState, useRef } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import ChapterSidebar from "@/components/chapter-sidebar";
import SceneWorkspace from "@/components/scene-workspace";
import { useProject, useProjectChapters, useCreateChapter } from "@/hooks/use-project";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { PanelLeft } from "lucide-react";

export default function Write() {
  const { id } = useParams();
  const { active: touring } = useInterfaceTour();
  // A tour visit is read-only, including when it exits on an empty manuscript.
  const tourVisit = useRef(touring);
  if (touring) tourVisit.current = true;
  const [, navigate] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const chapterId = searchParams.get("chapter");
  const { toast } = useToast();
  const [isChapterSidebarVisible, setIsChapterSidebarVisible] = useState(()=>window.innerWidth >= 850);
  useEffect(()=>{
    const media=window.matchMedia("(min-width:850px)");
    const resize=()=>setIsChapterSidebarVisible(media.matches);
    media.addEventListener("change",resize);return ()=>media.removeEventListener("change",resize);
  },[]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(chapterId);

  const { data: project, error: projectError } = useProject(id || '');
  const { data: chapters = [], isLoading: isLoadingChapters, isSuccess: chaptersLoaded, error: chaptersError } = useProjectChapters(id || '');
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
    if (!tourVisit.current && chapters.length === 0 && chaptersLoaded && !isCreatingChapter && id && initializedProject.current !== id) {
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
    if (window.innerWidth < 850) setIsChapterSidebarVisible(false);
  };

  // Find selected chapter
  const selectedChapter = chapters.find(c => c.id === Number(selectedChapterId || '0'));

  const controls = <Button variant="ghost" size="sm" className="shrink-0 px-2" data-tour="manuscript-toggle" aria-label={isChapterSidebarVisible ? "Hide manuscript" : "Show manuscript"} aria-expanded={isChapterSidebarVisible} onClick={()=>setIsChapterSidebarVisible(open=>!open)}><PanelLeft className="h-4 w-4"/><span className="hidden lg:inline ml-2">Manuscript</span></Button>;
  return <div className="h-dvh flex flex-col overflow-hidden bg-background [color-scheme:light] dark:[color-scheme:dark]">
    {project ? <WorkspaceHeader project={project} /> : <div className="h-16 border-b p-4">{projectError ? "Could not load this project. Return to Projects or reload to retry." : "Loading project…"}</div>}
    <main className="relative flex flex-1 min-h-0 min-w-0 overflow-hidden">
      <ChapterSidebar projectId={id || ''} selectedChapterId={selectedChapter?.id} isVisible={isChapterSidebarVisible} onChapterSelect={handleChapterSelect} onClose={()=>setIsChapterSidebarVisible(false)} />
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        {chaptersError ? <p role="alert" className="p-6">Could not load your manuscript. Reload to retry; saved drafts are kept.</p> : isLoadingChapters ? <div className="p-6">Loading manuscript…</div> : !selectedChapter ? <div className="p-6 space-y-3">{controls}<p>{chapterId ? "This chapter is unavailable. Choose a chapter from the manuscript list." : tourVisit.current ? "No chapters yet. Use the Manuscript panel’s + control to add a chapter when you’re ready." : "Creating your first chapter…"}</p></div> : selectedChapter.writingMode === "scenes" ? <SceneWorkspace key={selectedChapter.id} chapter={selectedChapter} controls={controls} /> : <WritingDocument key={selectedChapter.id} chapter={selectedChapter} controls={controls} />}
      </div>
    </main>
  </div>;
}

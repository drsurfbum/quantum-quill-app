import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import type { Scene } from "@shared/schema";
import { ChevronDown, ChevronRight, Plus, X } from "lucide-react";
import AddScene from "./add-scene";
import { prepareManuscriptAction } from "@/lib/manuscript-actions";
import { queryClient } from "@/lib/queryClient";
import ManuscriptOrganizer from "@/components/manuscript-organizer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  useProjectChapters,
  useCreateChapter,
  useUpdateChapter,
  useDeleteChapter
} from "@/hooks/use-project";
import { PlusCircle, FileText, MoreVertical, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useLocation } from "wouter";
import { type Chapter } from "@shared/schema";

interface ChapterSidebarProps {
  projectId: string | number | undefined;
  selectedChapterId?: number;
  isVisible?: boolean;
  onClose?:()=>void;
  onChapterSelect?: (chapterId: string) => void;
}

export default function ChapterSidebar({ projectId, selectedChapterId, isVisible = true, onChapterSelect, onClose }: ChapterSidebarProps) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const {data:scenes=[],error:scenesError} = useQuery<Scene[]>({queryKey:[`/api/projects/${projectId}/scenes`],enabled:!!projectId});
  const selectedSceneId=Number(new URLSearchParams(useSearch()).get("scene"));
  const [collapsed,setCollapsed]=useState<Set<number>>(new Set());
  const [adding,setAdding]=useState(false);
  const toggle=(id:number)=>setCollapsed(previous=>{const next=new Set(previous);if(next.has(id))next.delete(id);else next.add(id);return next;});
  const { data: chapters = [], isLoading } = useProjectChapters(projectId);
  const { mutate: createChapter, isPending: isCreating } = useCreateChapter();
  const { mutate: updateChapter, isPending: isUpdating } = useUpdateChapter();
  const { mutate: deleteChapter, isPending: isDeleting } = useDeleteChapter();

  // State for rename dialog
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [chapterToRename, setChapterToRename] = useState<Chapter | null>(null);
  const [newChapterTitle, setNewChapterTitle] = useState("");

  // State for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteRevision,setDeleteRevision] = useState(0);
  const [chapterIdToDelete, setChapterIdToDelete] = useState<number | null>(null);

  const handleCreateChapter = (writingMode: "chapter" | "scenes" = "chapter") => {
    const nextOrder = chapters.length ? Math.max(...chapters.map(c => c.order)) + 1 : 0;

    createChapter(
      {
        title: `Chapter ${chapters.length + 1}`,
        projectId: Number(projectId),
        order: nextOrder,
        writingMode,
        isDraft: true
      },
      {
        onSuccess: (data) => {
          onChapterSelect?.(String(data.id));
          toast({
            title: "Chapter created",
            description: "Your new chapter has been created."
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
  };

  // Handler for opening rename dialog
  const handleRenameChapter = (chapter: Chapter) => {
    setChapterToRename(chapter);
    setNewChapterTitle(chapter.title);
    setRenameDialogOpen(true);
  };

  // Handler for saving renamed chapter
  const handleSaveRename = () => {
    if (!chapterToRename) return;

    updateChapter(
      {
        id: chapterToRename.id, revision: chapterToRename.revision,
        title: newChapterTitle
      },
      {
        onSuccess: () => {
          toast({
            title: "Chapter renamed",
            description: "Your chapter has been renamed successfully."
          });
          setRenameDialogOpen(false);
        },
        onError: () => {
          toast({
            title: "Error renaming chapter",
            description: "There was an error renaming your chapter. Please try again.",
            variant: "destructive"
          });
        }
      }
    );
  };

  // Handler for toggling chapter status (Draft/Complete)
  const handleToggleChapterStatus = (chapter: Chapter) => {
    updateChapter(
      {
        id: chapter.id, revision: chapter.revision,
        isDraft: !chapter.isDraft
      },
      {
        onSuccess: () => {
          toast({
            title: `Chapter marked as ${chapter.isDraft ? 'Complete' : 'Draft'}`,
            description: `Your chapter has been marked as ${chapter.isDraft ? 'Complete' : 'Draft'}.`
          });
        },
        onError: () => {
          toast({
            title: "Error updating chapter",
            description: "There was an error updating your chapter status. Please try again.",
            variant: "destructive"
          });
        }
      }
    );
  };

  // Handler for opening delete confirmation
  const handleDeleteChapter = async (chapterId: number) => {
    try {
      await prepareManuscriptAction(Number(projectId));
      const current = queryClient.getQueryData<Chapter[]>([`/api/projects/${projectId}/chapters`])?.find(c=>c.id===chapterId);
      if (!current) throw new Error("Reload the chapter before deleting it.");
      setChapterIdToDelete(chapterId);setDeleteRevision(current.revision);setDeleteDialogOpen(true);
    } catch(error) { toast({title:"Chapter kept",description:(error as Error).message,variant:"destructive"}); }
  };

  // Handler for confirming chapter deletion
  const handleConfirmDelete = () => {
    if (!chapterIdToDelete || !projectId) return;

    deleteChapter(
      {
        id: chapterIdToDelete,
        projectId: projectId, revision: deleteRevision
      },
      {
        onSuccess: () => {
          toast({
            title: "Chapter deleted",
            description: "Your chapter has been deleted successfully."
          });
          setDeleteDialogOpen(false);

          // If the deleted chapter was selected, redirect to the project page
          if (chapterIdToDelete === selectedChapterId) {
            setLocation(`/project/${projectId}/write`);
          }
        },
        onError: (error) => {
          toast({
            title: "Chapter kept",
            description: error.message,
            variant: "destructive"
          });
        }
      }
    );
  };

  if (!isVisible) return null;
  return (
    <>
      <aside aria-label="Manuscript" className="manuscript-binder shrink-0 flex flex-col min-h-0 border-r bg-muted/20">
        <div className="h-16 px-3 flex items-center gap-1 shrink-0 border-b"><h3 className="font-semibold text-sm mr-auto">Manuscript</h3>
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Add chapter" disabled={isCreating}><Plus className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onSelect={()=>handleCreateChapter("chapter")}>New chapter · write directly</DropdownMenuItem><DropdownMenuItem onSelect={()=>handleCreateChapter("scenes")}>New scene chapter</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Close manuscript" onClick={onClose}><X className="h-4 w-4"/></Button>
        </div>
        <div className="p-2 border-b">{projectId && <ManuscriptOrganizer projectId={Number(projectId)} />}</div>
        <div className="flex-1 min-h-0 overflow-y-auto px-2 py-3 space-y-1">
          {isLoading && <p className="p-2 text-sm">Loading chapters…</p>}
          {scenesError && <p role="alert" className="p-2 text-sm text-destructive">Scenes could not load. Reload to retry.</p>}
          {chapters.map((chapter,index)=>{const children=scenes.filter(scene=>scene.chapterId===chapter.id).sort((a,b)=>a.order-b.order || a.id-b.id);const selected=chapter.id===selectedChapterId;return <section key={chapter.id} className="pb-2">
            <div className={`flex items-center gap-1 rounded-md group ${selected && chapter.writingMode!=="scenes" ? "bg-accent text-accent-foreground" : ""}`}>
              {chapter.writingMode === "scenes" ? <button className="p-1 shrink-0" aria-label={`${collapsed.has(chapter.id) ? "Expand" : "Collapse"} ${chapter.title}`} aria-expanded={!collapsed.has(chapter.id)} onClick={()=>toggle(chapter.id)}>{collapsed.has(chapter.id) ? <ChevronRight className="h-3 w-3"/> : <ChevronDown className="h-3 w-3"/>}</button> : <span className="w-5 shrink-0"/>}
              <button title={`${chapter.title} · ${chapter.isDraft ? "Draft" : "Completed"}`} className="flex-1 min-w-0 text-left py-2 text-xs font-semibold leading-5" onClick={()=>onChapterSelect?.(String(chapter.id))}><span className="text-muted-foreground mr-1 tabular-nums">{String(index+1).padStart(2,"0")}</span>{chapter.title}</button>
              <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-6 shrink-0" aria-label={`Options for ${chapter.title}`}><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={()=>handleRenameChapter(chapter)}>Rename</DropdownMenuItem><DropdownMenuItem onSelect={()=>handleToggleChapterStatus(chapter)}>Mark as {chapter.isDraft ? "Complete" : "Draft"}</DropdownMenuItem><DropdownMenuItem onSelect={()=>handleDeleteChapter(chapter.id)}>Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
            </div>
            {chapter.writingMode === "scenes" && !collapsed.has(chapter.id) && <ul className="ml-3 border-l pl-2 space-y-1">{children.map((scene,i)=>{const active=selected && (selectedSceneId===scene.id || (!selectedSceneId && i===0));const hasProse=!!scene.content?.replace(/<[^>]*>/g,"").trim();return <li key={scene.id}><Link aria-current={active ? "page" : undefined} title={`${scene.title} · ${hasProse ? "Draft" : "Planned"}`} href={`/project/${projectId}/write?chapter=${chapter.id}&scene=${scene.id}`} className={`flex items-start gap-2 rounded-md px-2 py-2 text-sm leading-5 ${active ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`} onClick={()=>{if(window.innerWidth<850)onClose?.();}}><span className={`mt-1.5 w-1.5 h-1.5 rounded-full border shrink-0 ${hasProse ? "bg-current" : ""}`} aria-label={hasProse ? "Draft" : "Planned"}/><span className="line-clamp-2 break-words">{scene.title}</span></Link></li>;})}{!children.length && <li className="px-2 py-1 text-xs text-muted-foreground">No scenes yet</li>}</ul>}
          </section>;})}
        </div>
        <div className="p-2 border-t shrink-0"><Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={()=>setAdding(true)}><Plus className="h-4 w-4 shrink-0"/>Add scene</Button></div>
      </aside>
      <Dialog open={adding} onOpenChange={setAdding}><DialogContent><DialogHeader><DialogTitle>Add a scene</DialogTitle><DialogDescription>Choose a scene chapter or create a new one. Chapter prose stays intact.</DialogDescription></DialogHeader><AddScene projectId={Number(projectId)} onClose={()=>setAdding(false)} onCreated={scene=>{setAdding(false);setLocation(`/project/${projectId}/write?chapter=${scene.chapterId}&scene=${scene.id}`);if(window.innerWidth<850)onClose?.();}}/></DialogContent></Dialog>

      {/* Rename Chapter Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Chapter</DialogTitle>
            <DialogDescription>
              Enter a new title for this chapter.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="chapterTitle">Chapter Title</Label>
              <Input
                id="chapterTitle"
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                placeholder="Enter chapter title"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveRename}
              disabled={!newChapterTitle.trim() || isUpdating}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Chapter Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the chapter and all of its content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={e => {e.preventDefault();handleConfirmDelete();}}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

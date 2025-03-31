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
  onChapterSelect?: (chapterId: string) => void;
}

export default function ChapterSidebar({ projectId, selectedChapterId, isVisible = true, onChapterSelect }: ChapterSidebarProps) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
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
  const [chapterIdToDelete, setChapterIdToDelete] = useState<number | null>(null);

  const handleCreateChapter = () => {
    const nextOrder = chapters.length ? Math.max(...chapters.map(c => c.order)) + 1 : 0;
    
    createChapter(
      {
        title: `Chapter ${chapters.length + 1}`,
        projectId: Number(projectId),
        order: nextOrder,
        isDraft: true
      },
      {
        onSuccess: (data) => {
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
        id: chapterToRename.id,
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
        id: chapter.id,
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
  const handleDeleteChapter = (chapterId: number) => {
    setChapterIdToDelete(chapterId);
    setDeleteDialogOpen(true);
  };

  // Handler for confirming chapter deletion
  const handleConfirmDelete = () => {
    if (!chapterIdToDelete || !projectId) return;
    
    deleteChapter(
      {
        id: chapterIdToDelete,
        projectId: projectId
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
        onError: () => {
          toast({
            title: "Error deleting chapter",
            description: "There was an error deleting your chapter. Please try again.",
            variant: "destructive"
          });
        }
      }
    );
  };

  return (
    <>
      <div className={cn(
        "border-r border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden bg-neutral-50 dark:bg-neutral-900",
        "absolute md:static transition-all duration-300 z-10",
        isVisible ? "w-64 translate-x-0" : "w-0 -translate-x-full md:hidden"
      )}>
        <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
          <h3 className="font-medium">Chapters</h3>
          <Button variant="ghost" size="icon" onClick={handleCreateChapter} disabled={isCreating}>
            <PlusCircle className="h-4 w-4" />
          </Button>
        </div>
        
        <ScrollArea className="flex-grow">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
              Loading chapters...
            </div>
          ) : chapters.length === 0 ? (
            <div className="p-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
              No chapters yet. Create one to get started.
            </div>
          ) : (
            <ul className="p-2">
              {chapters.map((chapter) => (
                <li key={chapter.id} className="mb-1">
                  <div className="flex flex-col">
                    <Link 
                      href={`/project/${projectId}/write?chapter=${chapter.id}`} 
                      onClick={(e) => {
                        // If onChapterSelect is provided, call it with the chapter id
                        if (onChapterSelect) {
                          e.preventDefault();
                          onChapterSelect(String(chapter.id));
                        }
                      }}
                      className={cn(
                        "p-2 rounded-md flex items-center group relative",
                        Number(selectedChapterId) === chapter.id 
                          ? "bg-primary/10 border border-primary/30 dark:bg-primary/20" 
                          : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      )}>
                      {/* Left indicator for selected chapter */}
                      {Number(selectedChapterId) === chapter.id && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-md"></div>
                      )}
                      
                      {chapter.isDraft ? (
                        <File className={cn(
                          "h-4 w-4 mr-2",
                          Number(selectedChapterId) === chapter.id 
                            ? "text-primary" 
                            : "text-neutral-500 dark:text-neutral-400"
                        )} />
                      ) : (
                        <FileText className={cn(
                          "h-4 w-4 mr-2",
                          Number(selectedChapterId) === chapter.id 
                            ? "text-primary" 
                            : "text-neutral-500 dark:text-neutral-400"
                        )} />
                      )}
                      <span className={cn(
                        "text-sm font-medium",
                        Number(selectedChapterId) === chapter.id 
                          ? "text-primary" 
                          : "",
                        chapter.isDraft && "italic"
                      )}>
                        {chapter.title}
                        {chapter.isDraft && " (Draft)"}
                      </span>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="ml-auto opacity-0 group-hover:opacity-100 h-6 w-6"
                            onClick={(e) => e.preventDefault()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => handleRenameChapter(chapter)}>Rename</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleToggleChapterStatus(chapter)}>
                            Mark as {chapter.isDraft ? 'Complete' : 'Draft'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-500" 
                            onSelect={() => handleDeleteChapter(chapter.id)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </div>

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
              onClick={handleConfirmDelete}
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

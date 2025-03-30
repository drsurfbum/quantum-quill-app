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
}

export default function ChapterSidebar({ projectId, selectedChapterId, isVisible = true }: ChapterSidebarProps) {
  const [location] = useLocation();
  const { toast } = useToast();
  const { data: chapters = [], isLoading } = useProjectChapters(projectId);
  const { mutate: createChapter, isPending: isCreating } = useCreateChapter();
  const { mutate: deleteChapter } = useDeleteChapter();
  const [chapterToDelete, setChapterToDelete] = useState<number | null>(null);

  const handleDeleteChapter = (id: number) => {
    setChapterToDelete(id);
  };

  const confirmDelete = () => {
    if (chapterToDelete) {
      deleteChapter(chapterToDelete, {
        onSuccess: () => {
          toast({
            title: "Chapter deleted",
            description: "Your chapter has been deleted."
          });
          setChapterToDelete(null);
        },
        onError: () => {
          toast({
            title: "Error deleting chapter",
            description: "There was an error deleting your chapter. Please try again.",
            variant: "destructive"
          });
        }
      });
    }
  };

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

  return (
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
                  <Link href={`/project/${projectId}/write?chapter=${chapter.id}`}>
                    <a className={cn(
                      "p-2 rounded-md flex items-center group",
                      Number(selectedChapterId) === chapter.id 
                        ? "bg-neutral-100 dark:bg-neutral-800" 
                        : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    )}>
                      {chapter.isDraft ? (
                        <File className="h-4 w-4 mr-2 text-neutral-500 dark:text-neutral-400" />
                      ) : (
                        <FileText className={cn(
                          "h-4 w-4 mr-2",
                          Number(selectedChapterId) === chapter.id 
                            ? "text-primary" 
                            : "text-neutral-500 dark:text-neutral-400"
                        )} />

      <AlertDialog open={!!chapterToDelete} onOpenChange={() => setChapterToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the chapter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

                      )}
                      <span className={cn(
                        "text-sm font-medium",
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
                    </a>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}

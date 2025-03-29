import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useProjectChapters, useCreateChapter } from "@/hooks/use-project";
import { PlusCircle, FileText, MoreVertical, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Link, useLocation } from "wouter";

interface ChapterSidebarProps {
  projectId: string | number;
  selectedChapterId?: string | number;
}

export default function ChapterSidebar({ projectId, selectedChapterId }: ChapterSidebarProps) {
  const [location] = useLocation();
  const { toast } = useToast();
  const { data: chapters = [], isLoading } = useProjectChapters(projectId);
  const { mutate: createChapter, isPending: isCreating } = useCreateChapter();

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
    <div className="w-64 border-r border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden bg-neutral-50 dark:bg-neutral-900">
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
                          <DropdownMenuItem>Rename</DropdownMenuItem>
                          <DropdownMenuItem>Mark as {chapter.isDraft ? 'Complete' : 'Draft'}</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-500">Delete</DropdownMenuItem>
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

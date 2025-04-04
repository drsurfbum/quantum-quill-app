import { OutlineItem as OutlineItemType } from "@shared/schema";
import { ChevronRight, ChevronDown, PlusCircle, MoreVertical, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useDeleteOutlineItem, useUpdateOutlineItem } from "@/hooks/use-outline";
import { useToast } from "@/hooks/use-toast";
import { useAppState } from "@/contexts/app-state-context";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OutlineItemProps {
  item: OutlineItemType;
  items: OutlineItemType[];
  selectedItemId: number | null;
  onSelectItem: (id: number) => void;
  onCreateItem: (parentId: number | null) => void;
  projectId: number;
  level?: number;
}

export default function OutlineItem({ 
  item, 
  items, 
  selectedItemId, 
  onSelectItem, 
  onCreateItem,
  projectId,
  level = 0 
}: OutlineItemProps) {
  const { toast } = useToast();
  const { setOutlineItemExpanded, isOutlineItemExpanded } = useAppState();
  const isExpanded = isOutlineItemExpanded(item.id);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(item.title);
  
  const { mutate: deleteItem } = useDeleteOutlineItem();
  const { mutate: updateItem } = useUpdateOutlineItem();
  
  // Get child items of this item
  const childItems = items
    .filter(i => i.parentId === item.id)
    .sort((a, b) => a.order - b.order);
  
  const hasChildren = childItems.length > 0;
  
  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this outline item and all its children?")) {
      deleteItem(
        { id: item.id, projectId },
        {
          onSuccess: () => {
            toast({
              title: "Item deleted",
              description: "The outline item has been deleted."
            });
            // If this was the selected item, deselect it
            if (selectedItemId === item.id) {
              onSelectItem(0);
            }
          },
          onError: () => {
            toast({
              title: "Error deleting item",
              description: "There was an error deleting the outline item.",
              variant: "destructive"
            });
          }
        }
      );
    }
  };
  
  const handleRename = () => {
    updateItem(
      { id: item.id, title: newTitle },
      {
        onSuccess: () => {
          toast({
            title: "Item renamed",
            description: "The outline item has been renamed."
          });
          setIsEditDialogOpen(false);
        },
        onError: () => {
          toast({
            title: "Error renaming item",
            description: "There was an error renaming the outline item.",
            variant: "destructive"
          });
        }
      }
    );
  };
  
  return (
    <>
      <div className="outline-item">
        <div 
          className={cn(
            "flex items-center rounded-md p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 group",
            selectedItemId === item.id && "bg-neutral-100 dark:bg-neutral-800"
          )}
        >
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-5 w-5"
            onClick={() => setOutlineItemExpanded(item.id, !isExpanded)}
            style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
          >
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </Button>
          
          <div 
            className="flex-grow cursor-pointer truncate px-1 py-0.5 text-sm flex items-center"
            style={{ paddingLeft: hasChildren ? '0' : '20px' }}
            onClick={() => onSelectItem(item.id)}
          >
            {item.isCompleted && (
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1.5" />
            )}
            <span className={item.isCompleted ? "line-through text-muted-foreground" : ""}>
              {item.title}
            </span>
          </div>
          
          <div className="opacity-0 group-hover:opacity-100 flex">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => onCreateItem(item.id)}
            >
              <PlusCircle className="h-3 w-3" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-red-500">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {isExpanded && hasChildren && (
          <div className="pl-4 mt-1 space-y-1 border-l border-neutral-200 dark:border-neutral-700 ml-2.5">
            {childItems.map(child => (
              <OutlineItem
                key={child.id}
                item={child}
                items={items}
                selectedItemId={selectedItemId}
                onSelectItem={onSelectItem}
                onCreateItem={onCreateItem}
                projectId={projectId}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Edit dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Outline Item</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

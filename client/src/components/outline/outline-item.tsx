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
import { queryClient } from "@/lib/queryClient";
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
  onSelectItem: (id: number | null) => void;  // Allow null for deselection
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
  
  // By default, expand the first level items
  useEffect(() => {
    if (level === 0 && !isOutlineItemExpanded(item.id)) {
      setOutlineItemExpanded(item.id, true);
    }
    
    // Ensure expanded state persists for selected items
    if (selectedItemId === item.id && !isOutlineItemExpanded(item.id)) {
      setOutlineItemExpanded(item.id, true);
    }
  }, [item.id, level, selectedItemId, setOutlineItemExpanded, isOutlineItemExpanded]);
  
  // Use a more robust approach to handle expansion
  useEffect(() => {
    // If this is the selected item, always keep it expanded
    if (selectedItemId === item.id) {
      setOutlineItemExpanded(item.id, true);
      
      // If this item has a parent, expand up the chain for visibility
      if (item.parentId !== null) {
        // Find parent items to expand
        let currentParentId = item.parentId;
        const toExpand = new Set<number>();
        
        // Add the parent ID to expand
        while (currentParentId !== null) {
          toExpand.add(currentParentId);
          
          // Find the parent item
          const parentItem = items.find(i => i.id === currentParentId);
          if (parentItem && parentItem.parentId !== null) {
            currentParentId = parentItem.parentId;
          } else {
            // Break the loop
            break;
          }
        }
        
        // Expand all parents in the chain
        toExpand.forEach(id => {
          setOutlineItemExpanded(id, true);
        });
      }
    }
  }, [selectedItemId, item.id, item.parentId, items, setOutlineItemExpanded]);
  
  const { mutate: deleteItem } = useDeleteOutlineItem();
  const { mutate: updateItem } = useUpdateOutlineItem();
  
  // Get child items of this item
  const childItems = items
    .filter(i => i.parentId === item.id)
    .sort((a, b) => a.order - b.order);
  
  const hasChildren = childItems.length > 0;
  
  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this outline item and all its children?")) {
      // If this was the selected item, deselect it before deleting to prevent UI issues
      if (selectedItemId === item.id) {
        onSelectItem(null);
      }
      
      // First, attempt to make the item disappear from the UI immediately
      // This gives a more responsive feel even if there's a server delay
      // Directly update the UI and let the API call handle the actual deletion
      // Don't try to manipulate the cache manually which can lead to errors
      
      deleteItem(
        { id: item.id, projectId },
        {
          onSuccess: () => {
            // Silently refresh the data 
            queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/outline`] });
          },
          onError: (error) => {
            console.error("Delete error:", error);
            toast({
              title: "Error deleting item",
              description: "There was an error deleting the outline item.",
              variant: "destructive"
            });
            
            // If deletion failed, refresh the data to restore any incorrectly removed items
            queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/outline`] });
          }
        }
      );
    }
  };
  
  const handleRename = () => {
    updateItem(
      { id: item.id, title: newTitle },
      {
        onSuccess: (result) => {
          if (!result.success) {
            toast({
              title: "Error renaming item",
              description: "There was an error renaming the outline item.",
              variant: "destructive"
            });
            return;
          }
          
          toast({
            title: "Item renamed",
            description: "The outline item has been renamed."
          });
          setIsEditDialogOpen(false);
        },
        onError: (error) => {
          console.error("Rename error:", error);
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
      <div className="outline-item" data-item-id={item.id}>
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
            onClick={() => {
              // Always force expand the item when it's clicked
              setOutlineItemExpanded(item.id, true);
              
              // Clear current selection first to prevent content bleeding
              if (selectedItemId && selectedItemId !== item.id) {
                onSelectItem(null);
                // Then select this item after a short delay to ensure clean transition
                setTimeout(() => {
                  onSelectItem(item.id);
                  // Double-ensure expanded state
                  setOutlineItemExpanded(item.id, true);
                }, 50);
              } else {
                onSelectItem(item.id);
                // Double-ensure expanded state
                setOutlineItemExpanded(item.id, true);
              }
            }}
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

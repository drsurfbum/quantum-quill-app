import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Edit, MoreVertical, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDeleteOutlineItem, useUpdateOutlineItem } from '@/hooks/use-outline-api';
import { OutlineItem as OutlineItemType, useOutline } from '@/contexts/outline-context';

interface OutlineItemProps {
  item: OutlineItemType;
  projectId: number;
  level?: number;
  onCreateItem: (parentId: number | null) => void;
}

export function NewOutlineItem({ 
  item, 
  projectId, 
  level = 0, 
  onCreateItem 
}: OutlineItemProps) {
  const { toast } = useToast();
  const { selectedItemId, selectItem, isExpanded, toggleExpanded, getChildItems, invalidateOutline } = useOutline();
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(item.title);
  
  const { mutate: deleteItem } = useDeleteOutlineItem();
  const { mutate: updateItem } = useUpdateOutlineItem();
  
  // Get child items of this item
  const childItems = getChildItems(item.id);
  const hasChildren = childItems.length > 0;
  
  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this outline item and all its children?")) {
      // If this was the selected item, deselect it before deleting to prevent UI issues
      if (selectedItemId === item.id) {
        selectItem(null);
      }
      
      deleteItem(
        { id: item.id, projectId },
        {
          onSuccess: (result) => {
            if (!result.success) {
              toast({
                title: "Error deleting item",
                description: "There was an error deleting the outline item.",
                variant: "destructive"
              });
              return;
            }
            
            // Refresh the outline to get updated state
            invalidateOutline(projectId);
            
            toast({
              title: "Item deleted",
              description: "The outline item has been deleted."
            });
          },
          onError: (error) => {
            console.error("Delete error:", error);
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
        onSuccess: (result) => {
          if (!result.success) {
            toast({
              title: "Error renaming item",
              description: "There was an error renaming the outline item.",
              variant: "destructive"
            });
            return;
          }
          
          // Refresh the outline to get updated state
          invalidateOutline(projectId);
          
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
  
  // Handler for selecting this outline item
  const handleSelect = () => {
    selectItem(item.id);
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
            onClick={() => toggleExpanded(item.id)}
            style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
          >
            {isExpanded(item.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </Button>
          
          <div 
            className="flex-grow cursor-pointer truncate px-1 py-0.5 text-sm flex items-center"
            style={{ paddingLeft: hasChildren ? '0' : '20px' }}
            onClick={handleSelect}
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
        
        {isExpanded(item.id) && hasChildren && (
          <div className="pl-4 mt-1 space-y-1 border-l border-neutral-200 dark:border-neutral-700 ml-2.5">
            {childItems.map(child => (
              <NewOutlineItem
                key={child.id}
                item={child}
                projectId={projectId}
                level={level + 1}
                onCreateItem={onCreateItem}
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
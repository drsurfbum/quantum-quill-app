import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  useProjectPlotStructures, 
  usePlotStructureActions,
  usePlotTemplates 
} from '@/hooks/use-plot-structure';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, PenSquare, Trash2, FolderTree } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { usePlotStructureEditor } from '@/hooks/use-plot-structure-editor';
import TemplateSelector from './template-selector';
import PlotEditorView from './plot-editor-view';

// Standalone component for individual plot structure card
function PlotCard({ 
  structure, 
  onEdit, 
  onDelete 
}: { 
  structure: any; 
  onEdit: (id: number) => void; 
  onDelete: (id: number) => void;
}) {
  return (
    <Card className="border border-border h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg">{structure.name}</CardTitle>
        <CardDescription>{structure.description}</CardDescription>
      </CardHeader>
      <CardFooter className="flex justify-between mt-auto pt-4">
        <Button variant="outline" size="sm" onClick={() => onEdit(structure.id)}>
          <PenSquare className="h-4 w-4 mr-1" /> Edit
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-destructive hover:text-destructive" 
          onClick={() => onDelete(structure.id)}
        >
          <Trash2 className="h-4 w-4 mr-1" /> Delete
        </Button>
      </CardFooter>
    </Card>
  );
}

// Empty state component
function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <div className="text-center py-12">
      <FolderTree className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-lg font-medium mb-2">No Plot Structures Yet</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Plot structures help you organize your story's narrative arc. 
        Choose from our pre-built templates or create your own.
      </p>
      <Button onClick={onCreateNew}>
        <Plus className="h-4 w-4 mr-1" /> Create Your First Structure
      </Button>
    </div>
  );
}

// Loading state component
function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map(i => (
        <Card key={i} className="border border-border">
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-12 w-full" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-8 w-24" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

/**
 * RobustPlotManager - A completely rebuilt plot structure manager
 * Uses state isolation patterns to prevent infinite render loops
 */
export default function RobustPlotManager({ projectId }: { projectId: number | string }) {
  // Ensure we have a numeric ID
  const numericProjectId = typeof projectId === 'string' ? parseInt(projectId) : projectId;
  
  // Component state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [structureToDelete, setStructureToDelete] = useState<number | null>(null);
  
  // External state
  const { toast } = useToast();
  const { 
    isEditing, 
    editingStructureId, 
    startEditing, 
    stopEditing 
  } = usePlotStructureEditor();
  
  // Data fetching with stable key references
  const structuresQuery = useProjectPlotStructures(numericProjectId);
  const templatesQuery = usePlotTemplates();
  const { createFromTemplate, deletePlotStructure } = usePlotStructureActions();
  
  // Derived state
  const plotStructures = structuresQuery.data || [];
  const isLoading = structuresQuery.isLoading;
  
  // Handle template selection and creation
  const handleCreateFromTemplate = useCallback(async (template: any) => {
    try {
      const newStructure = await createFromTemplate(numericProjectId, template);
      startEditing(newStructure.id);
      toast({
        title: 'Plot structure created',
        description: `${template.name} structure has been created successfully.`
      });
    } catch (error) {
      toast({
        title: 'Failed to create plot structure',
        description: 'An error occurred while creating the plot structure.',
        variant: 'destructive'
      });
    } finally {
      setTemplateDialogOpen(false);
    }
  }, [numericProjectId, createFromTemplate, startEditing, toast]);
  
  // Handle structure edit request
  const handleEditStructure = useCallback((structureId: number) => {
    startEditing(structureId);
  }, [startEditing]);
  
  // Handle structure delete request
  const handleRequestDelete = useCallback((structureId: number) => {
    setStructureToDelete(structureId);
    setDeleteDialogOpen(true);
  }, []);
  
  // Handle confirming structure deletion
  const handleConfirmDelete = useCallback(async () => {
    if (!structureToDelete) return;
    
    try {
      await deletePlotStructure(structureToDelete);
      
      // If we were editing this structure, stop editing
      if (editingStructureId === structureToDelete) {
        stopEditing();
      }
      
      toast({
        title: 'Plot structure deleted',
        description: 'Your plot structure has been deleted successfully.'
      });
    } catch (error) {
      toast({
        title: 'Error deleting plot structure',
        description: 'There was a problem deleting your plot structure.',
        variant: 'destructive'
      });
    } finally {
      setStructureToDelete(null);
      setDeleteDialogOpen(false);
    }
  }, [structureToDelete, deletePlotStructure, editingStructureId, stopEditing, toast]);
  
  // If we're editing, show the editor view
  if (isEditing && editingStructureId) {
    return (
      <PlotEditorView 
        structureId={editingStructureId} 
        onClose={stopEditing}
      />
    );
  }
  
  // Otherwise show the list of structures
  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Plot Structures</h2>
          <p className="text-sm text-muted-foreground">
            Organize and plan your story with structured templates
          </p>
        </div>
        <Button onClick={() => setTemplateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Structure
        </Button>
      </div>

      <div className="flex-1 p-4 overflow-auto">
        <ScrollArea className="h-full pr-4">
          {isLoading ? (
            <LoadingState />
          ) : plotStructures.length === 0 ? (
            <EmptyState onCreateNew={() => setTemplateDialogOpen(true)} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plotStructures.map((structure) => (
                <PlotCard 
                  key={structure.id}
                  structure={structure}
                  onEdit={handleEditStructure}
                  onDelete={handleRequestDelete}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Template selector dialog */}
      <TemplateSelector 
        open={templateDialogOpen} 
        onOpenChange={setTemplateDialogOpen}
        projectId={numericProjectId}
        onSelectTemplate={handleCreateFromTemplate}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this plot structure and all its contents. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
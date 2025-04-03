import React from 'react';
import { useAppState } from '@/contexts/app-state-context';
import { useToast } from '@/hooks/use-toast';
import { 
  useProjectPlotStructures, 
  usePlotStructureActions,
  usePlotTemplates
} from '@/hooks/use-plot-structure';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, FolderTree } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import StablePlotStructureEditor from './stable-plot-structure-editor';
import PlotStructureCard from './plot-structure-card';
import TemplateSelector from './template-selector';

interface PlotStructureContainerProps {
  projectId: string | number;
}

/**
 * PlotStructureContainer - Simplified version to avoid render loops
 */
export default function PlotStructureContainer({ projectId }: PlotStructureContainerProps) {
  // Convert string ID to number
  const numericProjectId = typeof projectId === 'string' ? parseInt(projectId) : projectId;
  
  // Essential hooks
  const { toast } = useToast();
  const { state, setPlotStructureId } = useAppState();
  
  // Dialog state with simple useState
  const [templateSelectorOpen, setTemplateSelectorOpen] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [plotToDelete, setPlotToDelete] = React.useState<number | null>(null);

  // Data fetching with stable dependencies
  const { data: plotStructures = [], isLoading: isLoadingStructures } = useProjectPlotStructures(numericProjectId);
  const { data: templates = [] } = usePlotTemplates();
  const { createFromTemplate, deletePlotStructure } = usePlotStructureActions();

  // Handle structure creation 
  const handleCreateFromTemplate = async (template: any) => {
    try {
      const newStructure = await createFromTemplate(numericProjectId, template);
      setPlotStructureId(newStructure.id);
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
    }
  };

  // Handle structure deletion
  const handleDeletePlotStructure = async () => {
    if (plotToDelete) {
      try {
        await deletePlotStructure(plotToDelete);
        
        // Update local state
        const updatedStructures = plotStructures.filter(s => s.id !== plotToDelete);
        queryClient.setQueryData(
          [`/api/projects/${numericProjectId}/plot-structures`], 
          updatedStructures
        );
        
        // Clear selection if needed
        if (state.plotStructureId === plotToDelete) {
          setPlotStructureId(null);
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
      }
      
      setPlotToDelete(null);
    }
    setDeleteConfirmOpen(false);
  };
  
  // If an editor is active, show it
  if (state.plotStructureId) {
    return <StablePlotStructureEditor />;
  }
  
  // Otherwise show the list of plot structures
  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Plot Structures</h2>
          <p className="text-sm text-muted-foreground">
            Organize and plan your story with structured templates
          </p>
        </div>
        <Button onClick={() => setTemplateSelectorOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Structure
        </Button>
      </div>

      <div className="flex-1 p-4 overflow-auto">
        <ScrollArea className="h-full pr-4">
          {isLoadingStructures ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
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
          ) : plotStructures.length === 0 ? (
            <div className="text-center py-12">
              <FolderTree className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Plot Structures Yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Plot structures help you organize your story's narrative arc. 
                Choose from our pre-built templates or create your own.
              </p>
              <Button onClick={() => setTemplateSelectorOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Create Your First Structure
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plotStructures.map((structure) => (
                <PlotStructureCard 
                  key={structure.id}
                  structure={structure}
                  onSelectStructure={setPlotStructureId}
                  onDeleteStructure={(id) => {
                    setPlotToDelete(id);
                    setDeleteConfirmOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Template selector dialog */}
      <TemplateSelector 
        open={templateSelectorOpen} 
        onOpenChange={setTemplateSelectorOpen}
        projectId={numericProjectId}
        onSelectTemplate={handleCreateFromTemplate}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
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
              onClick={handleDeletePlotStructure}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
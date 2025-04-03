import { useState } from 'react';
import { 
  useProjectPlotStructures, 
  usePlotStructureActions,
  usePlotTemplates
} from '@/hooks/use-plot-structure';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
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
import { 
  Plus, 
  MoreVertical, 
  Trash2, 
  FolderTree
} from 'lucide-react';
import { type PlotStructureTemplate } from '@shared/schema';
import TemplateSelector from './template-selector';
import StablePlotStructureEditor from './stable-plot-structure-editor';
import PlotStructureCard from './plot-structure-card';
import { useAppState } from '@/contexts/app-state-context';

interface PlotStructureManagerProps {
  projectId: number | string;
}

export default function PlotStructureManager({ projectId }: PlotStructureManagerProps) {
  const numericProjectId = typeof projectId === 'string' ? parseInt(projectId) : projectId;
  const { toast } = useToast();
  const { state, setPlotStructureId } = useAppState();
  
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [plotToDelete, setPlotToDelete] = useState<number | null>(null);

  const { data: plotStructures = [], isLoading: isLoadingStructures } = useProjectPlotStructures(numericProjectId);
  const { data: templates = [], isLoading: isLoadingTemplates } = usePlotTemplates();
  const { createFromTemplate, deletePlotStructure } = usePlotStructureActions();

  const handleCreateFromTemplate = async (template: PlotStructureTemplate) => {
    try {
      const newStructure = await createFromTemplate(numericProjectId, template);
      setPlotStructureId(newStructure.id);
      toast({
        title: 'Plot structure created',
        description: `${template.name} structure has been created successfully.`
      });
    } catch (error) {
      console.error('Error creating plot structure:', error);
      toast({
        title: 'Failed to create plot structure',
        description: 'An error occurred while creating the plot structure.',
        variant: 'destructive'
      });
    }
  };

  const handleDeletePlotStructure = async () => {
    if (plotToDelete) {
      try {
        await deletePlotStructure(plotToDelete);
        
        // Filter out the deleted structure from our local state
        const updatedStructures = plotStructures.filter(s => s.id !== plotToDelete);
        queryClient.setQueryData(
          [`/api/projects/${numericProjectId}/plot-structures`], 
          updatedStructures
        );
        
        // If we're deleting the currently selected structure, clear the selection
        if (state.plotStructureId === plotToDelete) {
          setPlotStructureId(null);
        }
        
        toast({
          title: 'Plot structure deleted',
          description: 'Your plot structure has been deleted successfully.'
        });
      } catch (error) {
        console.error('Error deleting plot structure:', error);
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

      {state.plotStructureId ? (
        <StablePlotStructureEditor />
      ) : (
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
      )}

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
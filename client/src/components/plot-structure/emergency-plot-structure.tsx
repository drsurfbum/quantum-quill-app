import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectPlotStructures, usePlotTemplates } from '@/hooks/use-plot-structure';
import { Plus, FolderTree } from 'lucide-react';

/**
 * Emergency fallback component for the plot structure view
 * Designed to be extremely simple to avoid render loops
 */
export default function EmergencyPlotStructure({ projectId }: { projectId: number }) {
  const { toast } = useToast();
  const { data: plotStructures = [], isLoading } = useProjectPlotStructures(projectId);
  
  // Simple handler for viewing a structure
  const handleViewStructure = (id: number) => {
    toast({
      title: "Structure Selected",
      description: "Plot structure editing is temporarily unavailable while we fix a technical issue."
    });
  };
  
  // Create placeholder action
  const handleCreateNew = () => {
    toast({
      title: "Feature Temporarily Unavailable",
      description: "We're working on fixing the plot structure editor. Please try again later.",
      variant: "destructive"
    });
  };
  
  if (isLoading) {
    return (
      <div className="h-full p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
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
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Plot Structures</h2>
          <p className="text-sm text-muted-foreground">
            View your story frameworks and outlines
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-1" /> New Structure
        </Button>
      </div>

      <div className="flex-1 p-4 overflow-auto">
        <ScrollArea className="h-full pr-4">
          {plotStructures.length === 0 ? (
            <div className="text-center py-12">
              <FolderTree className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Plot Structures Yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Plot structures help you organize your story's narrative arc.
                Create one to get started.
              </p>
              <Button onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-1" /> Create Your First Structure
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plotStructures.map((structure) => (
                <Card key={structure.id} className="border border-border">
                  <CardHeader>
                    <CardTitle>{structure.name}</CardTitle>
                    <CardDescription>{structure.description}</CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => handleViewStructure(structure.id)}
                    >
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
      
      <div className="p-4 border-t mt-auto bg-muted/30">
        <p className="text-sm text-muted-foreground text-center">
          ⚠️ The plot structure editor is currently undergoing maintenance to fix a technical issue.
          View-only mode is available.
        </p>
      </div>
    </div>
  );
}
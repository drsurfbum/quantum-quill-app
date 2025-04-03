import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { type PlotStructureTemplate } from '@shared/schema';

interface TemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  onSelectTemplate: (template: PlotStructureTemplate) => void;
}

export default function TemplateSelector({ 
  open, 
  onOpenChange, 
  projectId, 
  onSelectTemplate 
}: TemplateSelectorProps) {
  const { toast } = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  // Fetch plot structure templates
  const { data: templates = [], isLoading, error } = useQuery<PlotStructureTemplate[]>({
    queryKey: ['/api/plot-templates']
  });
  
  // Handle errors
  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load plot structure templates',
        variant: 'destructive'
      });
      console.error('Failed to load templates:', error);
    }
  }, [error, toast]);

  // Handle template selection
  const handleSelectTemplate = () => {
    if (!selectedTemplateId) {
      toast({
        title: 'No template selected',
        description: 'Please select a template to continue',
        variant: 'destructive'
      });
      return;
    }

    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate);
      onOpenChange(false);
    }
  };

  const parseTemplateSections = (template: PlotStructureTemplate) => {
    try {
      if (typeof template.sections === 'string') {
        return JSON.parse(template.sections);
      }
      return template.sections;
    } catch (error) {
      console.error('Error parsing template sections:', error);
      return [];
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Plot Structure Template</DialogTitle>
          <DialogDescription>
            Choose a template to structure your story. Each template offers a different approach to storytelling.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow pr-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="border border-border">
                  <CardHeader>
                    <Skeleton className="h-6 w-48 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No templates available. Please try again later.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {templates.map((template) => {
                const isSelected = selectedTemplateId === template.id;
                return (
                  <Card 
                    key={template.id}
                    className={`border cursor-pointer hover:border-primary transition-colors ${
                      isSelected ? 'border-primary border-2' : 'border-border'
                    }`}
                    onClick={() => setSelectedTemplateId(template.id)}
                  >
                    <CardHeader>
                      <CardTitle>{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <p className="mb-2 font-medium">Structure sections:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        {parseTemplateSections(template)
                          .slice(0, 3)
                          .map((section: any) => (
                            <li key={section.key}>{section.title}</li>
                          ))}
                        {parseTemplateSections(template).length > 3 && (
                          <li className="text-muted-foreground">
                            +{parseTemplateSections(template).length - 3} more sections
                          </li>
                        )}
                      </ul>
                    </CardContent>
                    <CardFooter className="pt-0 justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTemplateId(template.id);
                          onSelectTemplate(template);
                          onOpenChange(false);
                        }}
                      >
                        Use This Template
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
        
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            disabled={!selectedTemplateId} 
            onClick={handleSelectTemplate}
          >
            Apply Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
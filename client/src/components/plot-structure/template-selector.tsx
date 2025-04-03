import React, { useState } from 'react';
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
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlotTemplates } from '@/hooks/use-plot-structure';
import { Check, FilePlus2 } from 'lucide-react';

interface TemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  onSelectTemplate: (template: any) => void;
}

export default function TemplateSelector({
  open,
  onOpenChange,
  projectId,
  onSelectTemplate
}: TemplateSelectorProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const { data: templates, isLoading } = usePlotTemplates();
  
  const handleSelect = (template: any) => {
    onSelectTemplate(template);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose a Plot Structure Template</DialogTitle>
          <DialogDescription>
            Select a template to help organize and structure your story's narrative arc.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden my-4">
          <ScrollArea className="h-[50vh]">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i} className="border border-border">
                    <CardHeader>
                      <Skeleton className="h-6 w-48 mb-2" />
                      <Skeleton className="h-4 w-full" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-24 w-full" />
                    </CardContent>
                    <CardFooter>
                      <Skeleton className="h-9 w-24" />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates && templates.map(template => (
                  <Card 
                    key={template.id} 
                    className={`border cursor-pointer transition-colors ${
                      selectedTemplateId === template.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedTemplateId(template.id)}
                  >
                    <CardHeader>
                      <CardTitle>{template.name}</CardTitle>
                      <CardDescription>
                        {template.description 
                          ? (template.description.length > 120 
                              ? template.description.substring(0, 120) + '...' 
                              : template.description)
                          : 'No description available'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        A structure template that helps you organize your story.
                      </p>
                    </CardContent>
                    <CardFooter className="justify-between">
                      <Button 
                        variant={selectedTemplateId === template.id ? "default" : "outline"} 
                        onClick={() => handleSelect(template)}
                      >
                        {selectedTemplateId === template.id ? (
                          <>
                            <Check className="h-4 w-4 mr-1" /> Selected
                          </>
                        ) : (
                          <>
                            <FilePlus2 className="h-4 w-4 mr-1" /> Use Template
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
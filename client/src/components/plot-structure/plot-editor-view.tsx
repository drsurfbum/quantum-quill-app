import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Check, ChevronLeft, Save, X } from 'lucide-react';
import { debounce } from 'lodash';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { usePlotStructure, usePlotStructureSections, usePlotStructureActions } from '@/hooks/use-plot-structure';

interface PlotEditorViewProps {
  structureId: number;
  onClose: () => void;
}

type SaveStatus = 'saved' | 'saving' | 'unsaved';

/**
 * PlotEditorView - A dedicated view component for editing a plot structure
 * Keeps all state local and focused only on the active structure
 */
export default function PlotEditorView({ structureId, onClose }: PlotEditorViewProps) {
  // Local component state
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [editedTitle, setEditedTitle] = useState<string>('');
  const [editedDescription, setEditedDescription] = useState<string>('');
  const unmountedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sectionContent, setSectionContent] = useState<Record<number, string>>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set());
  
  // Fetch dependencies
  const { toast } = useToast();
  const { data: structure, isLoading: isLoadingStructure } = usePlotStructure(structureId);
  const { data: sections = [], isLoading: isLoadingSections } = usePlotStructureSections(structureId);
  const { updatePlotStructure, updateSection } = usePlotStructureActions();
  
  // Set up initial state from fetched data
  useEffect(() => {
    if (structure) {
      setEditedTitle(structure.name);
      setEditedDescription(structure.description || '');
    }
  }, [structure]);
  
  // Initialize section content from fetched sections
  useEffect(() => {
    if (sections && sections.length > 0) {
      const initialContent: Record<number, string> = {};
      sections.forEach(section => {
        initialContent[section.id] = section.content || '';
      });
      setSectionContent(initialContent);
    }
  }, [sections]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);
  
  // Save the plot structure (title, description)
  const saveStructure = useCallback(async () => {
    if (!structure) return;
    
    const hasStructureChanges = dirtyFields.has('structure');
    if (!hasStructureChanges) return;
    
    try {
      setSaveStatus('saving');
      await updatePlotStructure({
        id: structureId,
        data: {
          name: editedTitle,
          description: editedDescription
        }
      });
      
      // Only update UI if component is still mounted
      if (!unmountedRef.current) {
        const newDirty = new Set(dirtyFields);
        newDirty.delete('structure');
        setDirtyFields(newDirty);
        setSaveStatus('saved');
      }
    } catch (error) {
      if (!unmountedRef.current) {
        setSaveStatus('unsaved');
        toast({
          title: 'Failed to save changes',
          description: 'There was an error saving your changes.',
          variant: 'destructive'
        });
      }
    }
  }, [structure, structureId, editedTitle, editedDescription, updatePlotStructure, dirtyFields, toast]);
  
  // Save a specific section
  const saveSection = useCallback(async (sectionId: number) => {
    if (!sections || !sectionContent[sectionId]) return;
    
    const sectionKey = `section-${sectionId}`;
    const hasSectionChanges = dirtyFields.has(sectionKey);
    if (!hasSectionChanges) return;
    
    try {
      setSaveStatus('saving');
      await updateSection({
        id: sectionId,
        data: {
          content: sectionContent[sectionId]
        }
      });
      
      // Only update UI if component is still mounted
      if (!unmountedRef.current) {
        const newDirty = new Set(dirtyFields);
        newDirty.delete(sectionKey);
        setDirtyFields(newDirty);
        setSaveStatus('saved');
      }
    } catch (error) {
      if (!unmountedRef.current) {
        setSaveStatus('unsaved');
        toast({
          title: 'Failed to save section',
          description: 'There was an error saving your changes.',
          variant: 'destructive'
        });
      }
    }
  }, [sections, sectionContent, updateSection, dirtyFields, toast]);
  
  // Save all changes
  const saveAllChanges = useCallback(async () => {
    await saveStructure();
    
    // Save all dirty sections
    // Convert Set to Array before iterating
    const dirtyKeysArray = Array.from(dirtyFields);
    for (const dirtyKey of dirtyKeysArray) {
      if (dirtyKey.startsWith('section-')) {
        const sectionId = parseInt(dirtyKey.replace('section-', ''));
        if (!isNaN(sectionId)) {
          await saveSection(sectionId);
        }
      }
    }
    
    toast({
      title: 'All changes saved',
      description: 'Your plot structure has been updated successfully.'
    });
  }, [saveStructure, saveSection, dirtyFields, toast]);
  
  // Debounced save function
  const debouncedSave = useCallback(
    debounce(() => {
      saveAllChanges();
    }, 2000),
    [saveAllChanges]
  );
  
  // Update structure title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedTitle(e.target.value);
    setSaveStatus('unsaved');
    
    // Mark structure as dirty
    const newDirty = new Set(dirtyFields);
    newDirty.add('structure');
    setDirtyFields(newDirty);
    
    // Schedule a save
    debouncedSave();
  };
  
  // Update structure description
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedDescription(e.target.value);
    setSaveStatus('unsaved');
    
    // Mark structure as dirty
    const newDirty = new Set(dirtyFields);
    newDirty.add('structure');
    setDirtyFields(newDirty);
    
    // Schedule a save
    debouncedSave();
  };
  
  // Update section content
  const handleSectionContentChange = (sectionId: number, content: string) => {
    setSectionContent(prev => ({
      ...prev,
      [sectionId]: content
    }));
    setSaveStatus('unsaved');
    
    // Mark section as dirty
    const newDirty = new Set(dirtyFields);
    newDirty.add(`section-${sectionId}`);
    setDirtyFields(newDirty);
    
    // Schedule a save
    debouncedSave();
  };
  
  // Handle safe navigation away
  const handleClose = () => {
    // If we have unsaved changes, save them first
    if (dirtyFields.size > 0) {
      saveAllChanges().then(() => {
        onClose();
      });
    } else {
      onClose();
    }
  };
  
  // Render a loading state while data is being fetched
  if (isLoadingStructure || isLoadingSections) {
    return (
      <div className="h-full p-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" className="mr-4" disabled>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Skeleton className="h-8 w-60" />
        </div>
        
        <div className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full" />
          
          <div className="border-t pt-6">
            <Skeleton className="h-8 w-40 mb-4" />
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-48" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Main editor UI
  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4 flex justify-between items-center">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" onClick={handleClose} className="mr-4">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h2 className="text-xl font-bold">{editedTitle || 'Plot Structure'}</h2>
        </div>
        
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <span className="text-sm text-muted-foreground">Saving...</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-sm text-green-600 dark:text-green-400 flex items-center">
              <Check className="h-3 w-3 mr-1" /> Saved
            </span>
          )}
          
          <Button variant="outline" size="sm" onClick={saveAllChanges}>
            <Save className="h-4 w-4 mr-1" /> Save
          </Button>
          
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-4 w-4 mr-1" /> Close
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="border-b">
            <TabsList className="mx-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sections">Structure Sections</TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex-1 overflow-auto">
            <TabsContent value="overview" className="p-6 h-full">
              <div className="max-w-3xl mx-auto space-y-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Title</label>
                  <Input 
                    value={editedTitle} 
                    onChange={handleTitleChange}
                    className="text-lg"
                    placeholder="Enter structure title"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Description</label>
                  <Textarea 
                    value={editedDescription} 
                    onChange={handleDescriptionChange}
                    className="min-h-32"
                    placeholder="Describe your plot structure"
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="sections" className="p-6 h-full">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-6">
                  {sections.map((section) => (
                    <Card key={section.id} className="border border-border">
                      <CardHeader>
                        <CardTitle className="text-lg">{section.title}</CardTitle>
                        {section.sectionKey && (
                          <CardDescription>{section.sectionKey.replace(/_/g, ' ')}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <Textarea 
                          value={sectionContent[section.id] || ''}
                          onChange={(e) => handleSectionContentChange(section.id, e.target.value)}
                          className="min-h-32"
                          placeholder={`Enter content for ${section.title}`}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
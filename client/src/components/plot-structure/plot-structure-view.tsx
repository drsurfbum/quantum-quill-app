import { useState, useRef, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';
import { 
  usePlotStructure, 
  usePlotStructureSections, 
  usePlotStructureActions 
} from '@/hooks/use-plot-structure';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  X, 
  AlertCircle, 
  ChevronRightSquare
} from 'lucide-react';
import { PlotStructureSection } from '@shared/schema';
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from "@/components/ui/resizable";

// Define section examples for different story structures
const SECTION_EXAMPLES: Record<string, string> = {
  // Dan Harmon's Story Circle
  "you": "Luke Skywalker lives a simple life on Tatooine with his aunt and uncle.",
  "need": "Princess Leia's message asks for help, and Obi-Wan invites Luke to learn the ways of the Force.",
  "go": "Luke leaves his home planet on the Millennium Falcon after stormtroopers kill his family.",
  "search": "Luke rescues the princess from the Death Star and learns more about his abilities.",
  "find": "Luke discovers he can use the Force and decides to join the Rebellion.",
  "take": "Luke loses Obi-Wan but gains new allies and responsibilities in the fight against the Empire.",
  "return": "Luke returns to the Rebel base with the Death Star plans and his new understanding of the Force.",
  "change": "Luke is no longer a farm boy but a hero of the Rebellion with a new purpose.",
  
  // Freytag's Pyramid
  "exposition": "Harry Potter lives under the stairs at his aunt and uncle's house, unaware of his magical heritage.",
  "incitingIncident": "Harry receives a letter from Hogwarts, revealing his true identity as a wizard.",
  "risingAction": "Harry attends Hogwarts, makes friends, and faces increasingly dangerous situations.",
  "climax": "Harry confronts Voldemort in the Chamber of Secrets, destroying the diary and saving Ginny.",
  "fallingAction": "The truth about Tom Riddle is revealed, and Harry returns to normal school life.",
  "resolution": "Harry returns to the Dursleys, but with the knowledge that he belongs in the wizarding world.",
  
  // Three Act Structure
  "act1Setup": "We meet John McClane, a New York cop heading to LA to reconcile with his estranged wife at her company's Christmas party.",
  "act1Inciting": "Terrorists take over the building, and John is the only one who escapes, finding himself alone and outgunned.",
  "act1ToPart2": "John decides to fight back and alert the authorities, beginning his one-man war against the terrorists.",
  "act2Rising": "John faces increasingly difficult obstacles, kills some terrorists, and makes contact with a police officer outside.",
  "act2Midpoint": "John discovers the terrorists are actually sophisticated thieves planning to steal $640 million in bearer bonds.",
  "act2ToAct3": "The terrorists discover John's identity and take his wife hostage, raising the personal stakes.",
  "act3Climax": "John confronts Hans Gruber in a final showdown, saving his wife and stopping the heist.",
  "act3Resolution": "John and his wife reconcile as the authorities take control of the situation.",
};

interface PlotStructureViewProps {
  structureId: number;
  onClose?: () => void;
}

export default function PlotStructureView({ structureId, onClose }: PlotStructureViewProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, 'saved' | 'typing' | 'saving'>>({});
  
  const { toast } = useToast();
  const { data: structure, isLoading: isLoadingStructure } = usePlotStructure(structureId);
  const { data: sections = [], isLoading: isLoadingSections } = usePlotStructureSections(structureId);
  const { updateSection, isLoading: isSaving } = usePlotStructureActions();
  
  // Sort sections by order
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  // Set active section to first section by default when loading
  useEffect(() => {
    if (sortedSections.length > 0 && !activeSection) {
      setActiveSection(sortedSections[0].sectionKey);
    }
  }, [sortedSections, activeSection]);

  // Navigate between sections
  const navigateToSection = (direction: 'next' | 'prev') => {
    if (sortedSections.length === 0 || !activeSection) return;
    
    const currentIndex = sortedSections.findIndex(section => section.sectionKey === activeSection);
    if (currentIndex === -1) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % sortedSections.length;
    } else {
      newIndex = (currentIndex - 1 + sortedSections.length) % sortedSections.length;
    }
    
    const newSectionKey = sortedSections[newIndex].sectionKey;
    if (newSectionKey) {
      setActiveSection(newSectionKey);
    }
  };

  // Initialize debounced save
  const debouncedSave = useCallback(
    debounce((sectionId: number, sectionKey: string, content: string) => {
      setSaveStatus(prev => ({ ...prev, [sectionKey]: 'saving' }));
      updateSection(
        { id: sectionId, data: { content } },
        {
          onSuccess: () => {
            setSaveStatus(prev => ({ ...prev, [sectionKey]: 'saved' }));
            // Show a toast that auto-dismisses after 5 seconds
            toast({
              title: "Section updated",
              description: "Your changes have been automatically saved.",
              duration: 5000 // 5 seconds auto-dismiss
            });
            
            // Important: keep the activeSection as is, so we stay in the editor
            // without navigation and allow continuing to edit
            setActiveSection(sectionKey); // Ensure we stay on the same section
          },
          onError: () => {
            setSaveStatus(prev => ({ ...prev, [sectionKey]: 'saved' }));
          }
        }
      );
    }, 2000),
    [updateSection, toast, setActiveSection]
  );

  // Initialize content for editing
  const initializeContent = useCallback((sectionKey: string, content: string | null) => {
    if (!editedContent[sectionKey]) {
      setEditedContent(prev => ({ ...prev, [sectionKey]: content || '' }));
      setSaveStatus(prev => ({ ...prev, [sectionKey]: 'saved' }));
    }
  }, [editedContent]);

  // Handle content change with autosave
  const handleContentChange = (sectionKey: string, content: string, sectionId: number) => {
    setEditedContent(prev => ({ ...prev, [sectionKey]: content }));
    setSaveStatus(prev => ({ ...prev, [sectionKey]: 'typing' }));
    debouncedSave(sectionId, sectionKey, content);
  };

  // Manual save section content (continuing edit)
  const saveSection = (section: PlotStructureSection) => {
    const content = editedContent[section.sectionKey];
    if (content !== undefined) {
      setSaveStatus(prev => ({ ...prev, [section.sectionKey]: 'saving' }));
      updateSection(
        { id: section.id, data: { content } },
        {
          onSuccess: () => {
            setSaveStatus(prev => ({ ...prev, [section.sectionKey]: 'saved' }));
            // Show a toast that auto-dismisses after 5 seconds
            toast({
              title: "Section saved",
              description: "Your changes have been saved successfully.",
              duration: 5000 // 5 seconds auto-dismiss
            });
            
            // Important: keep the activeSection as is, so we stay in the editor
            if (onClose) {
              // Only call onClose if explicitly requested, not after saving
              // This prevents navigation back to the structure list
            }
          }
        }
      );
    }
  };

  // Save with specific message
  const saveWithMessage = (section: PlotStructureSection, title: string) => {
    const content = editedContent[section.sectionKey];
    if (content !== undefined) {
      setSaveStatus(prev => ({ ...prev, [section.sectionKey]: 'saving' }));
      updateSection(
        { id: section.id, data: { content } },
        {
          onSuccess: () => {
            setSaveStatus(prev => ({ ...prev, [section.sectionKey]: 'saved' }));
            // Show a toast that auto-dismisses after 5 seconds
            toast({
              title,
              description: "Your changes have been saved successfully.",
              duration: 5000 // 5 seconds auto-dismiss
            });
            
            // Important: keep the activeSection as is, so we stay in the editor
            // and don't navigate away after saving
          }
        }
      );
    }
  };

  // Loading state
  if (isLoadingStructure || isLoadingSections) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
        <div className="space-y-4 mt-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }
  
  // Not found state
  if (!structure) {
    return (
      <Alert className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          The selected plot structure could not be found.
        </AlertDescription>
      </Alert>
    );
  }

  const activeSectionData = activeSection ? sortedSections.find(s => s.sectionKey === activeSection) : null;

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b p-4 flex justify-between items-center bg-card">
        <div>
          <h2 className="text-xl font-bold">{structure.name}</h2>
          {structure.description && (
            <p className="text-sm text-muted-foreground">{structure.description}</p>
          )}
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Tabs defaultValue="editor" className="flex-1 flex flex-col">
        <div className="border-b px-4 bg-card">
          <TabsList>
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="editor" className="flex-1 flex flex-col p-0">
          {sortedSections.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-muted-foreground">No sections found for this plot structure.</p>
            </div>
          ) : (
            <ResizablePanelGroup direction="horizontal" className="flex-1">
              <ResizablePanel defaultSize={30} minSize={20} maxSize={40} className="h-full">
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between border-b p-2 bg-muted/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateToSection('prev')}
                      disabled={!activeSection}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateToSection('next')}
                      disabled={!activeSection}
                    >
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                
                  <ScrollArea className="flex-1">
                    <div className="p-2">
                      {sortedSections.map((section) => (
                        <Button
                          key={section.id}
                          variant={activeSection === section.sectionKey ? "default" : "ghost"}
                          className="w-full justify-start mb-1 text-left"
                          onClick={() => setActiveSection(section.sectionKey)}
                        >
                          {section.title}
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </ResizablePanel>
              
              <ResizableHandle withHandle />
            
              <ResizablePanel defaultSize={70} className="h-full focus-visible:outline-none">
                <div className="h-full flex flex-col">
                  {activeSectionData ? (
                    <div className="h-full flex flex-col p-4">
                      <div className="pb-4">
                        <h3 className="text-lg font-semibold mb-3">
                          {activeSectionData.title}
                        </h3>
                        
                        <div className="mb-4 text-sm bg-muted/20 p-3 rounded-md border">
                          <p className="text-muted-foreground">
                            <strong>Example:</strong> {' '}
                            {SECTION_EXAMPLES[activeSectionData.sectionKey] || 
                             "Create your story content for this section."}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex-1 flex flex-col">
                        <div className="flex flex-col h-full">
                          {/* Initialize content if needed */}
                          {!editedContent[activeSectionData.sectionKey] && (
                            initializeContent(activeSectionData.sectionKey, activeSectionData.content),
                            null
                          )}
                          <Textarea
                            value={editedContent[activeSectionData.sectionKey] || ''}
                            onChange={(e) => handleContentChange(
                              activeSectionData.sectionKey,
                              e.target.value,
                              activeSectionData.id
                            )}
                            className="flex-1 min-h-[200px] resize-none"
                            placeholder={`Write your content for ${activeSectionData.title} here...`}
                          />
                          
                          <div className="flex items-center justify-between mt-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              saveStatus[activeSectionData.sectionKey] === 'saved' 
                                ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' 
                                : saveStatus[activeSectionData.sectionKey] === 'typing'
                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                                : 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'
                            }`}>
                              {saveStatus[activeSectionData.sectionKey] === 'saved' 
                                ? 'Saved' 
                                : saveStatus[activeSectionData.sectionKey] === 'typing' 
                                ? 'Typing...' 
                                : 'Saving...'}
                            </span>
                            
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => saveWithMessage(activeSectionData, "Section saved")}
                                disabled={isSaving}
                              >
                                <Save className="h-4 w-4 mr-1" /> Save
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-muted-foreground">
                        Select a section from the sidebar to begin editing.
                      </p>
                    </div>
                  )}
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </TabsContent>

        <TabsContent value="overview" className="flex-1 p-0">
          <ScrollArea className="h-full p-4">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{structure.name}</CardTitle>
                {structure.description && (
                  <CardDescription>{structure.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <p className="mb-2">
                  This plot structure contains {sortedSections.length} sections.
                </p>
              </CardContent>
            </Card>

            <Accordion type="multiple" defaultValue={sortedSections.map(s => s.id.toString())}>
              {sortedSections.map((section) => (
                <AccordionItem key={section.id} value={section.id.toString()}>
                  <AccordionTrigger>{section.title}</AccordionTrigger>
                  <AccordionContent>
                    {section.content ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <div style={{ whiteSpace: 'pre-wrap' }}>{section.content}</div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic">
                        No content yet.
                      </p>
                    )}
                    <div className="mt-2 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActiveSection(section.sectionKey);
                          document.querySelector('[data-value="editor"]')?.dispatchEvent(
                            new MouseEvent('click', { bubbles: true })
                          );
                        }}
                      >
                        Edit Section
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
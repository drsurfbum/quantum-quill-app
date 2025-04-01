import { useState, useRef, useEffect } from 'react';
import { 
  usePlotStructure, 
  usePlotStructureSections, 
  usePlotStructureActions 
} from '@/hooks/use-plot-structure';
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
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Edit, 
  Save, 
  X, 
  AlertCircle 
} from 'lucide-react';
import { PlotStructureSection } from '@shared/schema';

interface PlotStructureViewProps {
  structureId: number;
  onClose?: () => void;
}

export default function PlotStructureView({ structureId, onClose }: PlotStructureViewProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [editMode, setEditMode] = useState<Record<string, boolean>>({});
  const [sidebarWidth, setSidebarWidth] = useState<number>(300);
  
  const sidebarRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef<boolean>(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

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

  // Handle sidebar resize
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (resizeHandleRef.current && resizeHandleRef.current.contains(e.target as Node)) {
        resizingRef.current = true;
        startXRef.current = e.clientX;
        startWidthRef.current = sidebarWidth;
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      
      const dx = e.clientX - startXRef.current;
      const newWidth = Math.max(240, Math.min(600, startWidthRef.current + dx));
      
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (resizingRef.current) {
        resizingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [sidebarWidth]);

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

  // Start editing a section
  const startEditing = (sectionKey: string, content: string | null) => {
    setEditedContent(prev => ({ ...prev, [sectionKey]: content || '' }));
    setEditMode(prev => ({ ...prev, [sectionKey]: true }));
  };

  // Cancel editing a section
  const cancelEditing = (sectionKey: string) => {
    setEditMode(prev => ({ ...prev, [sectionKey]: false }));
  };

  // Save section content
  const saveSection = (section: PlotStructureSection) => {
    const content = editedContent[section.sectionKey];
    if (content !== undefined) {
      updateSection({ 
        id: section.id, 
        data: { content } 
      });
      setEditMode(prev => ({ ...prev, [section.sectionKey]: false }));
    }
  };

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

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4 flex justify-between items-center">
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
        <div className="border-b px-4">
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
            <>
              <div className="flex h-full">
                <div className="flex flex-col border-r" style={{ width: `${sidebarWidth}px`, minWidth: '240px' }}>
                  {activeSection && (
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
                  )}
                
                  <div className="flex flex-1 overflow-hidden" ref={sidebarRef}>
                    <ScrollArea className="h-full w-full">
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
                    <div 
                      ref={resizeHandleRef}
                      className="w-1 cursor-ew-resize h-full hover:bg-primary/20 active:bg-primary/40"
                    ></div>
                  </div>
                </div>

                <div className="flex-1 overflow-auto">
                  {activeSection ? (
                    <div className="h-full flex flex-col">
                      <div className="p-4 pb-2">
                        <h3 className="text-lg font-semibold mb-2">
                          {sortedSections.find(s => s.sectionKey === activeSection)?.title}
                        </h3>
                        
                        <div className="mb-4 text-sm bg-muted/20 p-3 rounded-md border">
                          <p className="text-muted-foreground">
                            <strong>Example:</strong> {' '}
                            {(() => {
                              const section = sortedSections.find(s => s.sectionKey === activeSection);
                              if (!section) return null;
                              
                              // Examples for each section key
                              const examples: Record<string, string> = {
                                "you": "Luke Skywalker lives a simple life on Tatooine with his aunt and uncle.",
                                "need": "Princess Leia's message asks for help, and Obi-Wan invites Luke to learn the ways of the Force.",
                                "go": "Luke leaves his home planet on the Millennium Falcon after stormtroopers kill his family.",
                                "search": "Luke rescues the princess from the Death Star and learns more about his abilities.",
                                "find": "Luke discovers he can use the Force and decides to join the Rebellion.",
                                "take": "Luke loses Obi-Wan but gains new allies and responsibilities in the fight against the Empire.",
                                "return": "Luke returns to the Rebel base with the Death Star plans and his new understanding of the Force.",
                                "change": "Luke is no longer a farm boy but a hero of the Rebellion with a new purpose.",
                                // Add examples for other section types
                                "exposition": "Harry Potter lives under the stairs at his aunt and uncle's house, unaware of his magical heritage.",
                                "incitingIncident": "Harry receives a letter from Hogwarts, revealing his true identity as a wizard.",
                                "risingAction": "Harry attends Hogwarts, makes friends, and faces increasingly dangerous situations.",
                                "climax": "Harry confronts Voldemort in the Chamber of Secrets, destroying the diary and saving Ginny.",
                                "fallingAction": "The truth about Tom Riddle is revealed, and Harry returns to normal school life.",
                                "resolution": "Harry returns to the Dursleys, but with the knowledge that he belongs in the wizarding world.",
                              };
                              
                              return examples[section.sectionKey] || "Create your story content for this section.";
                            })()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex-grow p-4 pt-0">
                        {(() => {
                          const section = sortedSections.find(s => s.sectionKey === activeSection);
                          if (!section) return null;
                          
                          const isEditing = editMode[section.sectionKey] || false;
                          
                          return (
                            <div className="h-full flex flex-col">
                              {isEditing ? (
                                <>
                                  <Textarea
                                    value={editedContent[section.sectionKey] || ''}
                                    onChange={(e) => setEditedContent({
                                      ...editedContent,
                                      [section.sectionKey]: e.target.value
                                    })}
                                    className="min-h-[200px] flex-grow"
                                    placeholder={`Write your content for ${section.title} here...`}
                                  />
                                  
                                  <div className="flex justify-end space-x-2 mt-4">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => cancelEditing(section.sectionKey)}
                                      disabled={isSaving}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => saveSection(section)}
                                      disabled={isSaving}
                                    >
                                      <Save className="h-4 w-4 mr-1" /> Save
                                    </Button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="prose prose-sm dark:prose-invert max-w-none flex-grow">
                                    {section.content ? (
                                      <div style={{ whiteSpace: 'pre-wrap' }}>{section.content}</div>
                                    ) : (
                                      <p className="text-muted-foreground italic">
                                        No content yet. Click edit to add content for this section.
                                      </p>
                                    )}
                                  </div>
                                  
                                  <div className="flex justify-end mt-4">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => startEditing(section.sectionKey, section.content || '')}
                                    >
                                      <Edit className="h-4 w-4 mr-1" /> Edit
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })()}
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
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="overview" className="flex-1 p-4 overflow-auto">
          <ScrollArea className="h-full pr-4">
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
                          startEditing(section.sectionKey, section.content || '');
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
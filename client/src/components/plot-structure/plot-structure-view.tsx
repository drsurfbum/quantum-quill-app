import { useState, useCallback, useEffect } from 'react';
import { debounce } from 'lodash';
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
import { 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  X, 
  AlertCircle
} from 'lucide-react';
import { PlotStructureSection } from '@shared/schema';

// Define section examples for different story structures
const SECTION_EXAMPLES: Record<string, string> = {
  // Hero's Journey
  "ordinary_world": "Frodo lives a peaceful life in the Shire, unaware of the wider conflicts in Middle-earth.",
  "call_to_adventure": "Gandalf reveals the truth about the One Ring and the threat of Sauron to Frodo.",
  "refusal_of_the_call": "Frodo initially hesitates, wishing the Ring had never come to him.",
  "meeting_the_mentor": "Gandalf guides Frodo, explaining the history of the Ring and the necessity of its destruction.",
  "crossing_the_threshold": "Frodo leaves the Shire with Sam, crossing into the wider world beyond his familiar boundaries.",
  "tests_allies_enemies": "The hobbits meet Aragorn, face the Nazgûl at Weathertop, and form the Fellowship in Rivendell.",
  "approach_to_the_inmost_cave": "The Fellowship journeys through Moria, facing darkness and danger.",
  "the_ordeal": "The Fellowship battles in Moria, loses Gandalf, and breaks apart as Boromir tries to take the Ring.",
  "reward_seizing_the_sword": "Frodo gains clarity about his mission and decides to continue alone (with Sam).",
  "the_road_back": "Frodo and Sam navigate toward Mordor, guided by Gollum.",
  "resurrection": "In the Tower of Cirith Ungol, Frodo nearly loses everything but is rescued by Sam.",
  "return_with_the_elixir": "After destroying the Ring, Frodo returns to the Shire, but is forever changed by his journey.",

  // Dan Harmon's Story Circle
  "you": "Luke Skywalker lives a simple life on Tatooine with his aunt and uncle.",
  "need": "Luke discovers a message from Princess Leia in R2-D2 and realizes there's a bigger world out there.",
  "go": "Luke leaves Tatooine with Obi-Wan to deliver the Death Star plans to the Rebellion.",
  "search": "Luke meets Han Solo, rescues Princess Leia, and discovers more about the Force.",
  "find": "Luke witnesses Obi-Wan's death and commits to learning the ways of the Force.",
  "take": "Luke joins the Rebellion and volunteers to attack the Death Star.",
  "return": "Luke leads the attack on the Death Star, using his new skills and insights.",
  "change": "Luke destroys the Death Star, becomes a hero of the Rebellion, and begins his journey as a Jedi.",
};

interface PlotStructureViewProps {
  structureId: number;
  onClose?: () => void;
}

export default function PlotStructureView({ structureId, onClose }: PlotStructureViewProps) {
  const { data: structure, isLoading: structureLoading, error: structureError } = usePlotStructure(structureId);
  const { data: sections, isLoading: sectionsLoading, error: sectionsError } = usePlotStructureSections(structureId);
  const { updateSection } = usePlotStructureActions();

  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, 'saved' | 'saving' | 'typing'>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Sort sections by order and get the first one
  const sortedSections = sections ? [...sections].sort((a, b) => a.order - b.order) : [];

  // Set initial active section when data loads
  useEffect(() => {
    if (sortedSections.length > 0 && !activeSection) {
      setActiveSection(sortedSections[0].sectionKey);
    }
  }, [sortedSections, activeSection]);

  // Initialize edited content from sections
  useEffect(() => {
    if (sections) {
      const initialContent: Record<string, string> = {};
      const initialStatus: Record<string, 'saved' | 'saving' | 'typing'> = {};

      sections.forEach(section => {
        initialContent[section.sectionKey] = section.content || '';
        initialStatus[section.sectionKey] = 'saved';
      });

      setEditedContent(initialContent);
      setSaveStatus(initialStatus);
    }
  }, [sections]);

  // Find the active section data
  const activeSectionData = activeSection
    ? sortedSections.find(s => s.sectionKey === activeSection)
    : null;

  // Save section content with increased debounce delay for better typing experience
  const debouncedSave = useCallback(
    debounce((sectionKey: string, content: string, sectionId: number) => {
      updateSection(
        { id: sectionId, data: { content } },
        {
          onSuccess: () => {
            setSaveStatus(prev => ({ ...prev, [sectionKey]: 'saved' }));
          },
          onError: () => {
            // If error, revert to 'typing' so user knows to try again
            setSaveStatus(prev => ({ ...prev, [sectionKey]: 'typing' }));
          }
        }
      );
    }, 3000), // Increased to 3 seconds for a much better typing experience
    [updateSection]
  );

  // Handle content changes
  const handleContentChange = (sectionKey: string, content: string, sectionId: number) => {
    setEditedContent(prev => ({ ...prev, [sectionKey]: content }));
    setSaveStatus(prev => ({ ...prev, [sectionKey]: 'typing' }));

    // Set status to 'saving' after a short delay
    setTimeout(() => {
      setSaveStatus(prev => {
        // Only change to saving if still typing (user hasn't made more changes)
        if (prev[sectionKey] === 'typing') {
          return { ...prev, [sectionKey]: 'saving' };
        }
        return prev;
      });
    }, 500);

    debouncedSave(sectionKey, content, sectionId);
  };

  // Manual save function
  const saveSection = (section: PlotStructureSection) => {
    setIsSaving(true);
    setSaveStatus(prev => ({ ...prev, [section.sectionKey]: 'saving' }));

    updateSection(
      { 
        id: section.id, 
        data: { content: editedContent[section.sectionKey] || '' }
      },
      {
        onSuccess: () => {
          setSaveStatus(prev => ({ ...prev, [section.sectionKey]: 'saved' }));
          setIsSaving(false);
        },
        onError: () => {
          setSaveStatus(prev => ({ ...prev, [section.sectionKey]: 'typing' }));
          setIsSaving(false);
        }
      }
    );
  };

  // Navigate between sections
  const navigateToSection = (direction: 'next' | 'prev') => {
    if (!activeSection || sortedSections.length === 0) return;

    const currentIndex = sortedSections.findIndex(s => s.sectionKey === activeSection);
    if (currentIndex === -1) return;

    if (direction === 'next' && currentIndex < sortedSections.length - 1) {
      setActiveSection(sortedSections[currentIndex + 1].sectionKey);
    } else if (direction === 'prev' && currentIndex > 0) {
      setActiveSection(sortedSections[currentIndex - 1].sectionKey);
    }
  };

  // Loading state
  if (structureLoading || sectionsLoading) {
    return (
      <div className="p-4">
        <Skeleton className="h-8 w-3/4 mb-4" />
        <Skeleton className="h-4 w-1/2 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (structureError || sectionsError || !structure) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load plot structure data. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold">{structure.name}</h2>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Tabs defaultValue="editor" className="flex-1 flex flex-col min-h-0">
        <div className="border-b px-4 flex-shrink-0">
          <TabsList>
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="editor" className="flex-1 overflow-y-auto p-0">
          {sortedSections.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-muted-foreground">No sections found for this plot structure.</p>
            </div>
          ) : (
            <div className="flex h-full">
              {/* Left Panel with fixed height and navigation at bottom */} 
              <div className="w-1/3 border-r flex flex-col flex-shrink-0">
                {/* Fixed height scrollable section list with clear bottom edge */}
                <div className="h-[400px] overflow-y-auto border-b">
                  <div className="p-2">
                    {sortedSections.map((section) => (
                      <Button
                        key={section.id}
                        variant={activeSection === section.sectionKey ? "default" : "ghost"}
                        className="w-full justify-start mb-1 text-left px-2"
                        onClick={() => setActiveSection(section.sectionKey)}
                      >
                        <span className="truncate">{section.title}</span>
                      </Button>
                    ))}
                  </div>
                </div>
                
                {/* Navigation buttons below the section list */}
                <div className="flex items-center justify-between p-2 bg-muted/30">
                  <Button variant="ghost" size="sm" onClick={() => navigateToSection('prev')} disabled={!activeSection}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => navigateToSection('next')} disabled={!activeSection}>
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>

              {/* Right Panel */} 
              <div className="w-2/3 flex flex-col p-4 overflow-y-auto">
                {activeSectionData ? (
                  <>
                    <div className="pb-4">
                      <h3 className="text-lg font-semibold mb-3">{activeSectionData.title}</h3>
                      <div className="mb-4 text-sm bg-muted/20 p-3 rounded-md border">
                        <p className="text-muted-foreground">
                          <strong>Example:</strong> {' '}
                          {SECTION_EXAMPLES[activeSectionData.sectionKey] || "Create your story content for this section."}
                        </p>
                      </div>
                    </div>
                    <Textarea
                      value={editedContent[activeSectionData.sectionKey] || ''}
                      onChange={(e) => handleContentChange(activeSectionData.sectionKey, e.target.value, activeSectionData.id)}
                      className="min-h-[300px] w-full resize-none mb-4"
                      placeholder={`Write your content for ${activeSectionData.title} here...`}
                    />
                    <div className="flex items-center justify-between flex-shrink-0">
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
                        <Button size="sm" onClick={() => saveSection(activeSectionData)} disabled={isSaving}>
                          <Save className="h-4 w-4 mr-1" /> Save
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Select a section to begin editing</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="overview" className="flex-1 p-0 overflow-hidden">
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

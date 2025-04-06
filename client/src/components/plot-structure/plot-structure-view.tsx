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
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from "@/components/ui/resizable";

// Define section examples for different story structures
const SECTION_EXAMPLES: Record<string, string> = {
  // Dan Harmon's Story Circle
  "you": "Luke Skywalker lives a simple life on Tatooine with his aunt and uncle.",
  "need": "Luke discovers a message from Princess Leia in R2-D2 and realizes there's a bigger world out there.",
  "go": "Luke leaves Tatooine with Obi-Wan to deliver the Death Star plans to the Rebellion.",
  "search": "Luke meets Han Solo, rescues Princess Leia, and discovers more about the Force.",
  "find": "Luke witnesses Obi-Wan's death and commits to learning the ways of the Force.",
  "take": "Luke joins the Rebellion and volunteers to attack the Death Star.",
  "return": "Luke leads the attack on the Death Star, using his new skills and insights.",
  "change": "Luke destroys the Death Star, becomes a hero of the Rebellion, and begins his journey as a Jedi.",
  
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
  
  // Freytag's Pyramid
  "exposition": "Gatsby's lavish parties and mysterious background are introduced through Nick Carraway's perspective.",
  "rising_action": "Nick meets Gatsby, learns of his love for Daisy, and helps arrange their reunion.",
  "climax": "The confrontation at the Plaza Hotel where Gatsby's past is revealed and Tom exposes him.",
  "falling_action": "Daisy kills Myrtle in a car accident while driving Gatsby's car, leading to misunderstandings.",
  "resolution": "Gatsby is murdered by Wilson, and only Nick attends his funeral, reflecting on the emptiness of the American Dream.",
  
  // Save the Cat
  "opening_image": "Andy Dufresne, a successful banker, sits expressionless in his car outside his wife's lover's house.",
  "theme_stated": "Red states 'Hope is a good thing, maybe the best of things, and no good thing ever dies.'",
  "setup": "Andy is wrongfully convicted of murdering his wife and her lover and sentenced to life in Shawshank Prison.",
  "catalyst": "Andy asks Red to procure a rock hammer, supposedly for his hobby of collecting rocks.",
  "debate": "Andy struggles to adapt to prison life, is beaten by guards and abused by the 'Sisters.'",
  "break_into_two": "Andy befriends Red and begins to use his banking skills to help the guards and the warden.",
  "b_story": "Andy's friendship with Red deepens, and he starts building a library for the prisoners.",
  "fun_and_games": "Andy becomes valuable to the prison staff for his financial expertise, gaining privileges and respect.",
  "midpoint": "Andy plays Mozart over the prison PA system, giving inmates a moment of beauty and freedom.",
  "bad_guys_close_in": "Tommy Williams arrives and reveals information that could prove Andy's innocence.",
  "all_is_lost": "Warden Norton has Tommy killed to prevent Andy's exoneration and puts Andy in solitary confinement.",
  "dark_night_of_the_soul": "Andy appears to be broken after his time in solitary and asks Red for a length of rope.",
  "break_into_three": "The next morning, Andy is missing from his cell.",
  "finale": "It's revealed that Andy spent 19 years tunneling to freedom and escaped through the prison sewage system.",
  "final_image": "Red finds Andy on a beach in Zihuatanejo, fulfilling their shared dream of freedom and reunion.",
  
  // Three-Act Structure
  "act_one_setup": "Clarice Starling, an FBI trainee, is assigned to interview Dr. Hannibal Lecter, hoping he can provide insight into an active serial killer case.",
  "act_one_inciting_incident": "Lecter offers cryptic clues about the serial killer 'Buffalo Bill' in exchange for personal information about Clarice.",
  "act_one_plot_point_one": "A new victim is kidnapped (Catherine Martin, a senator's daughter), raising the stakes and creating urgency.",
  "act_two_rising_action": "Clarice builds a complex relationship with Lecter while trying to decode his clues to find Buffalo Bill.",
  "act_two_midpoint": "Lecter escapes custody in a brutally violent fashion, eliminating Clarice's direct access to him.",
  "act_two_plot_point_two": "Clarice decodes Lecter's final messages and realizes Buffalo Bill knew his first victim personally.",
  "act_three_crisis": "Following her insights, Clarice tracks down Buffalo Bill's house and confronts him alone, without backup.",
  "act_three_climax": "In a tense confrontation in the dark, Clarice manages to kill Buffalo Bill and rescue his captive.",
  "act_three_resolution": "Clarice graduates from the FBI Academy with honors, and receives a disturbing congratulatory call from Lecter.",
  
  // Seven-Point Story Structure
  "hook": "Katniss Everdeen lives in a dystopian future where she hunts to provide for her family in the impoverished District 12.",
  "plot_turn_1": "Katniss volunteers for the Hunger Games to save her sister Prim from certain death.",
  "pinch_point_1": "Katniss realizes the full brutality of the Games when the tributes begin killing each other in the arena.",
  "midpoint": "Katniss allies with Rue, showing compassion and humanity in contrast to the Capitol's cruelty.",
  "pinch_point_2": "The Gamemakers announce two tributes from the same district can win, giving Katniss hope she and Peeta might both survive.",
  "plot_turn_2": "Katniss and Peeta decide to commit suicide together rather than kill each other when the rule is revoked.",
  "resolution": "The Gamemakers relent to avoid having no victor, allowing both to live, but Katniss has unknowingly sparked rebellion.",
  
  // Kishōtenketsu
  "ki": "Chihiro and her parents stumble upon what seems to be an abandoned theme park while moving to their new home.",
  "shō": "The parents are transformed into pigs after eating food meant for spirits, and Chihiro discovers she's trapped in a spirit world.",
  "ten": "Chihiro must work in a bathhouse for spirits, facing numerous supernatural challenges while trying to save her parents and remember her true name.",
  "ketsu": "Chihiro successfully frees herself and her parents by remembering who she is and showing compassion to others, returning to the human world changed by her experience.",
  
  // Story Circle
  "comfort_zone": "Neo lives a double life as a programmer by day and hacker by night, feeling something is wrong with the world.",
  "desire": "Neo wants to know what the Matrix is and follows the white rabbit to find answers.",
  "unfamiliar_situation": "Neo meets Trinity and Morpheus, who offers him the truth via the red pill.",
  "adaptation": "Neo learns about the real world, trains in combat, and begins to understand his potential as 'The One.'",
  "getting_what_they_wanted": "Neo rescues Morpheus from the Agents, demonstrating extraordinary abilities within the Matrix.",
  "paying_the_price": "Neo faces Agent Smith alone and is seemingly killed in the confrontation.",
  "returning_to_familiar_situation": "Neo resurrects within the Matrix, now fully believing in his powers as The One.",
  "changed": "Neo defeats Agent Smith, establishes himself as The One, and promises to show people the truth about their world."
};

interface PlotStructureViewProps {
  structureId: number;
  onClose?: () => void;
}

export default function PlotStructureView({ structureId, onClose }: PlotStructureViewProps) {
  const { data: structure, isLoading: structureLoading, error: structureError } = usePlotStructure(structureId);
  const { data: sections, isLoading: sectionsLoading, error: sectionsError } = usePlotStructureSections(structureId);
  const { updatePlotStructureSectionMutation } = usePlotStructureActions();
  
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
    
  // Save section content with debounce
  const debouncedSave = useCallback(
    debounce((sectionKey: string, content: string, sectionId: number) => {
      updatePlotStructureSectionMutation.mutate(
        { id: sectionId, content },
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
    }, 1500),
    [updatePlotStructureSectionMutation]
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
    
    updatePlotStructureSectionMutation.mutate(
      { 
        id: section.id, 
        content: editedContent[section.sectionKey] || ''
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
            <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
              <ResizablePanel defaultSize={30} minSize={20} maxSize={40} className="min-h-0 overflow-hidden">
                <div className="flex flex-col h-full">
                  <div className="flex-shrink-0 flex items-center justify-between border-b p-2 bg-muted/30">
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

                  <div className="overflow-y-auto flex-1">
                    <div className="p-2">
                      {sortedSections.map((section) => (
                        <Button
                          key={section.id}
                          variant={activeSection === section.sectionKey ? "default" : "ghost"}
                          className="w-full justify-start mb-1 text-left"
                          onClick={() => setActiveSection(section.sectionKey)}
                        >
                          <span className="truncate">{section.title}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={70} className="min-h-0 overflow-hidden focus-visible:outline-none">
                <div className="h-full overflow-y-auto">
                  <div className="flex flex-col p-4">
                    {activeSectionData ? (
                      <div className="flex flex-col">
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
                                  onClick={() => saveSection(activeSectionData)}
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
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">Select a section to begin editing</p>
                      </div>
                    )}
                  </div>
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
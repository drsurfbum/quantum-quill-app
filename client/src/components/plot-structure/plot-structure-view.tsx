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
  "need": "Princess Leia's message asks for help, and Obi-Wan invites Luke to learn the ways of the Force.",
  "go": "Luke leaves his home planet on the Millennium Falcon after stormtroopers kill his family.",
  "search": "Luke rescues the princess from the Death Star and learns more about his abilities.",
  "find": "Luke discovers he can use the Force and decides to join the Rebellion.",
  "take": "Luke loses Obi-Wan but gains new allies and responsibilities in the fight against the Empire.",
  "return": "Luke returns to the Rebel base with the Death Star plans and his new understanding of the Force.",
  "change": "Luke is no longer a farm boy but a hero of the Rebellion with a new purpose.",

  // Freytag's Pyramid
  "exposition": "Harry Potter lives under the stairs at his aunt and uncle's house, unaware of his magical heritage.",
  "rising_action": "Harry attends Hogwarts, makes friends, and faces increasingly dangerous situations.",
  "climax": "Harry confronts Voldemort in the Chamber of Secrets, destroying the diary and saving Ginny.",
  "falling_action": "The truth about Tom Riddle is revealed, and Harry returns to normal school life.",
  "resolution": "Harry returns to the Dursleys, but with the knowledge that he belongs in the wizarding world.",

  // Three Act Structure
  "act1_setup": "We meet John McClane, a New York cop heading to LA to reconcile with his estranged wife at her company's Christmas party.",
  "act1_inciting_incident": "Terrorists take over the building, and John is the only one who escapes, finding himself alone and outgunned.",
  "act1_turning_point": "John decides to fight back and alert the authorities, beginning his one-man war against the terrorists.",
  "act2_confrontation": "John faces increasingly difficult obstacles, kills some terrorists, and makes contact with a police officer outside.",
  "act2_midpoint": "John discovers the terrorists are actually sophisticated thieves planning to steal $640 million in bearer bonds.",
  "act2_turning_point": "The terrorists discover John's identity and take his wife hostage, raising the personal stakes.",
  "act3_resolution": "John confronts Hans Gruber in a final showdown, saving his wife and stopping the heist.",
  "act3_climax": "John and his wife reconcile as the authorities take control of the situation.",
  "act3_denouement": "John and his wife leave together as the situation is resolved.",

  // Hero's Journey (The Fellowship of the Ring)
  "ordinary_world": "Frodo Baggins lives a peaceful life in the Shire, enjoying the comforts of Bag End.",
  "call_to_adventure": "Gandalf reveals the truth about the One Ring and the danger it poses to Middle-earth.",
  "refusal_of_call": "Frodo is reluctant to leave the Shire but accepts that he must protect his home and friends.",
  "meeting_the_mentor": "Gandalf guides Frodo on his journey and explains the history of the Ring.",
  "crossing_threshold": "Frodo leaves the Shire with Sam, crossing into the wider world beyond their home.",
  "tests_allies_enemies": "Frodo meets allies at the Council of Elrond and forms the Fellowship, while being pursued by Ringwraiths.",
  "approach_inmost_cave": "The Fellowship journeys through the Mines of Moria, facing increasing danger and darkness.",
  "ordeal": "The Fellowship fights the Balrog, resulting in Gandalf's apparent death and fracturing of the group.",
  "reward": "Frodo continues his journey with renewed purpose and deeper understanding of the Ring's power.",
  "road_back": "Frodo and Sam separate from the others, taking their own path toward Mordor.",
  "resurrection": "Frodo resists the temptation to use the Ring despite growing danger and its increasing hold over him.",
  "return_with_elixir": "Frodo has changed from a carefree hobbit to a determined Ring-bearer, carrying hope for all of Middle-earth.",

  // Fichtean Curve (The Hunger Games)
  "introduction": "Katniss Everdeen hunts to provide for her family in the impoverished District 12.",
  "crisis_1": "Katniss's sister Prim is selected for the Hunger Games, prompting Katniss to volunteer in her place.",
  "crisis_2": "Katniss must navigate the Capitol's politics and public appearances before entering the arena.",
  "crisis_3": "In the arena, Katniss faces immediate threats from other tributes and environmental dangers.",
  "crisis_4": "The Gamemakers change rules midway, allowing district partners to win together, complicating Katniss's relationship with Peeta.",
  "final_crisis": "The Gamemakers revert to the original rules, forcing Katniss to make an impossible choice.",
  "fichtean_climax": "Katniss and Peeta threaten double suicide with poisonous berries, forcing the Gamemakers to declare them both winners.",
  "brief_resolution": "Katniss and Peeta return to District 12 as victors, but have unknowingly sparked rebellion.",

  // Save the Cat Beat Sheet (Spider-Man: Into the Spider-Verse)
  "opening_image": "Miles Morales is an ordinary teenager trying to find his place between his home life in Brooklyn and his new elite school.",
  "theme_stated": "Miles's father tells him to always do his best and live up to his potential.",
  "setup": "Miles struggles with fitting in at school while maintaining a relationship with his Uncle Aaron, who his father disapproves of.",
  "catalyst": "Miles is bitten by a radioactive spider and witnesses Spider-Man's death at the hands of Kingpin.",
  "debate": "Miles discovers his new powers but doesn't know how to control them or if he should take up the Spider-Man mantle.",
  "break_into_two": "Miles meets Peter B. Parker and other Spider-People from different dimensions, thrust into a larger multiverse conflict.",
  "b_story": "Miles develops a friendship with Gwen Stacy and the other Spider-People, learning what it means to be a hero.",
  "fun_and_games": "Miles trains with Peter while trying to hide his powers from his family and adjust to his new abilities.",
  "midpoint": "Miles discovers his unique power of invisibility and bio-electric blasts, giving him an advantage.",
  "bad_guys_close_in": "Kingpin's scientists activate the collider again, and Miles's uncle is revealed to be the Prowler, hunting the Spider-People.",
  "all_is_lost": "Miles is overwhelmed by responsibility and failure when his Uncle Aaron dies, and the other Spider-People don't believe he's ready.",
  "dark_night_of_soul": "Miles returns home dejected, where his father unknowingly gives him encouragement through the door.",
  "break_into_three": "Miles fully embraces his powers, creates his own suit, and breaks free to help the others.",
  "finale": "Miles masters his abilities, defeats Kingpin, and sends the other Spider-People home while taking up the mantle of his world's Spider-Man.",
  "final_image": "Miles swings confidently through New York as its new protector, having found his place and purpose.",

  // Seven-Point Story Structure (The Lion, the Witch and the Wardrobe)
  "hook": "The Pevensie children are sent to the English countryside during World War II and discover a wardrobe in Professor Kirke's house.",
  "plot_turn_1": "Lucy enters the wardrobe and discovers Narnia, meeting Mr. Tumnus, though her siblings don't believe her at first.",
  "pinch_1": "Edmund follows Lucy into Narnia and meets the White Witch, who tempts him with Turkish Delight and manipulates him.",
  "narnia_midpoint": "All four children enter Narnia together and learn from the Beavers about Aslan and the prophecy that they will become kings and queens.",
  "pinch_2": "Edmund betrays his siblings to the White Witch, and Aslan offers himself in Edmund's place to satisfy the Deep Magic.",
  "plot_turn_2": "Aslan is resurrected due to the Deeper Magic, giving the children hope and the key to defeating the Witch.",
  "narnia_resolution": "The children lead Aslan's army to victory over the White Witch, and they are crowned kings and queens of Narnia."
};

interface PlotStructureViewProps {
  structureId: number;
  onClose?: () => void;
}

export default function PlotStructureView({ structureId, onClose }: PlotStructureViewProps) {
  // Simple state management
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, 'saved' | 'typing' | 'saving'>>({});

  // Fetch data without toast
  const { data: structure, isLoading: isLoadingStructure } = usePlotStructure(structureId);
  const { data: sections = [], isLoading: isLoadingSections } = usePlotStructureSections(structureId);
  const { updateSection, isLoading: isSaving } = usePlotStructureActions();

  // Sort sections by order - recalculate only when sections change
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  // Initialize content for editing
  const initializeContent = useCallback((sectionKey: string, content: string | null) => {
    setEditedContent(prev => {
      // Only update if the key doesn't exist to prevent unnecessary re-renders
      if (!prev[sectionKey]) {
        return { ...prev, [sectionKey]: content || '' };
      }
      return prev;
    });
    setSaveStatus(prev => {
      // Only update if the key doesn't exist
      if (!prev[sectionKey]) {
        return { ...prev, [sectionKey]: 'saved' };
      }
      return prev;
    });
  }, []);

  // Set active section to first section when data is loaded
  useEffect(() => {
    if (sortedSections.length > 0 && !activeSection) {
      setActiveSection(sortedSections[0].sectionKey);
    }
  }, [sortedSections, activeSection]);

  // Get current active section data
  const activeSectionData = activeSection ? 
    sortedSections.find(s => s.sectionKey === activeSection) : null;

  // Initialize content for active section when it changes
  useEffect(() => {
    if (activeSectionData && !editedContent[activeSectionData.sectionKey]) {
      initializeContent(activeSectionData.sectionKey, activeSectionData.content);
    }
  }, [activeSectionData, initializeContent, editedContent]);

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

    setActiveSection(sortedSections[newIndex].sectionKey);
  };

  // Handle content change with debounced autosave
  const debouncedSave = useCallback(
    debounce((sectionId: number, sectionKey: string, content: string) => {
      setSaveStatus(prev => ({ ...prev, [sectionKey]: 'saving' }));

      updateSection(
        { id: sectionId, data: { content } },
        {
          onSuccess: () => {
            setSaveStatus(prev => ({ ...prev, [sectionKey]: 'saved' }));
          },
          onError: () => {
            setSaveStatus(prev => ({ ...prev, [sectionKey]: 'saved' }));
          }
        }
      );
    }, 2000),
    [updateSection]
  );

  // Handle content change
  const handleContentChange = (sectionKey: string, content: string, sectionId: number) => {
    setEditedContent(prev => ({ ...prev, [sectionKey]: content }));
    setSaveStatus(prev => ({ ...prev, [sectionKey]: 'typing' }));
    debouncedSave(sectionId, sectionKey, content);
  };

  // Manual save function
  const saveSection = (section: PlotStructureSection) => {
    const currentSection = section.sectionKey;
    const content = editedContent[currentSection];

    if (content !== undefined) {
      setSaveStatus(prev => ({ ...prev, [currentSection]: 'saving' }));

      updateSection(
        { id: section.id, data: { content } },
        {
          onSuccess: () => {
            setSaveStatus(prev => ({ ...prev, [currentSection]: 'saved' }));
          },
          onError: () => {
            setSaveStatus(prev => ({ ...prev, [currentSection]: 'saved' }));
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
            <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
              <ResizablePanel defaultSize={30} minSize={20} maxSize={40} className="h-full overflow-hidden">
                <div className="h-full flex flex-col">
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

                  <div className="flex-1 h-[calc(100%-40px)] overflow-y-auto">
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

              <ResizablePanel defaultSize={70} className="h-full focus-visible:outline-none">
                <ScrollArea className="h-full">
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
                </ScrollArea>
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
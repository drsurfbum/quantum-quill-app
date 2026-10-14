import { RelationshipSection } from "./relationships";
import { fieldOptions } from "@shared/bible-catalog";
import { readBibleFields } from "@shared/story-bible";
import { useEditorDraft } from "@/hooks/use-editor-draft";
import { useAutosave, withPendingEdits } from "@/hooks/use-autosave";
import { SaveStatus } from "@/components/save-status";
import { useState, useCallback, useMemo, memo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Save, Trash2, Plus, X, ChevronDown, ChevronRight, Zap, Tag, ArrowLeft, Clock, Users, MapPin, Calendar, Archive, Book, ImageIcon, Upload } from 'lucide-react';
import { useDeleteStoryBibleEntry, useStoryBibleEntries } from '@/hooks/use-story-bible';
import { useToast } from '@/hooks/use-toast';
import { StoryBibleEntry } from '@shared/schema';

// World Element data structure based on specification
interface WorldElementData {
  // Image
  imageUrl?: string;
  imageDescription?: string;
  
  // Core Overview (expanded initially)
  category?: string;
  shortNotes?: string;
  status?: string;
  
  // Category-Specific Details (dynamic based on category)
  categoryDetails?: {
    // Flora
    habitat?: string;
    growthBehavior?: string;
    uses?: string;
    threats?: string;
    
    // Fauna
    diet?: string;
    behavior?: string;
    lifecycle?: string;
    domestication?: string;
    
    // Technology
    inventor?: string;
    powerSource?: string;
    function?: string;
    limitations?: string;
    
    // Religion/Ritual/Mythology
    beliefs?: string;
    ceremonies?: string;
    originStories?: string;
    
    // General fields for other categories
    properties?: string;
    appearance?: string;
    rarity?: string;
    significance?: string;
  };
  
  // Origins & History (collapsible)
  discoveryOrigin?: string;
  majorEvents?: Array<{
    id: number;
    name: string;
    relationship?: string;
  }>;
  
  // Usage & Impact (collapsible)
  users?: Array<{
    id: number;
    name: string;
    type: 'character' | 'group';
    relationship?: string;
  }>;
  affectedLocations?: Array<{
    id: number;
    name: string;
    impact?: string;
  }>;
  
  // Relational Links (collapsible)
  linkedCharacters?: Array<{
    id: number;
    name: string;
    relationship?: string; // discoverer, user, worshipper
  }>;
  linkedLocations?: Array<{
    id: number;
    name: string;
    relationship?: string; // found, used, worshipped
  }>;
  linkedEvents?: Array<{
    id: number;
    name: string;
    relationship?: string; // discovery, first use, etc.
  }>;
  
  // Details / Lore Hooks (collapsed by default)
  loreHooks?: string;
  idioms?: string;
  rumors?: string;
  nicheFacts?: string;
  
  // Research References (collapsed by default)
  researchReferences?: Array<{
    id: number;
    name: string;
    notes?: string;
  }>;
  
  // Classification
  parentElement?: {
    id: number;
    name: string;
  };
  childElements?: Array<{
    id: number;
    name: string;
  }>;
  tags?: string[];
  
  // Metadata
  isArchived?: boolean;
}

interface WorldElementsEditorProps {
  entry: StoryBibleEntry;
  projectId: number;
  onClose?: () => void;
}

// Constants
const WORLD_ELEMENT_CATEGORIES = fieldOptions("world_elements", "category");

const WORLD_ELEMENT_STATUS = fieldOptions("world_elements", "status");

const WorldElementsEditor = memo(({ entry, projectId, onClose }: WorldElementsEditorProps) => {
  entry = withPendingEdits(`/api/story-bible/${entry.id}`, entry);
  const autosave = useAutosave(`/api/story-bible/${entry.id}`, `/api/projects/${projectId}/story-bible`);

  const { toast } = useToast();
  const deleteStoryBibleEntry = useDeleteStoryBibleEntry();
  const { data: allEntries } = useStoryBibleEntries(projectId);

  const [title, setTitle] = useState(entry.title);



  // Collapsible states - Core Overview expanded initially
  const [coreOverviewExpanded, setCoreOverviewExpanded] = useState(true);
  const [categoryDetailsExpanded, setCategoryDetailsExpanded] = useState(false);
  const [originsHistoryExpanded, setOriginsHistoryExpanded] = useState(false);
  const [usageImpactExpanded, setUsageImpactExpanded] = useState(false);
  const [relationalLinksExpanded, setRelationalLinksExpanded] = useState(false);
  const [loreHooksExpanded, setLoreHooksExpanded] = useState(false);
  const [researchReferencesExpanded, setResearchReferencesExpanded] = useState(false);

  // Parse world element data from content
  const initialWorldElementData = useMemo(() => {
    const defaultData: WorldElementData = {
      categoryDetails: {},
      majorEvents: [],
      users: [],
      affectedLocations: [],
      linkedCharacters: [],
      linkedLocations: [],
      linkedEvents: [],
      researchReferences: [],
      childElements: [],
      tags: entry.tags || [],
      isArchived: entry.isArchived || false
    };

    return { ...defaultData, ...readBibleFields(entry) } as WorldElementData;
  }, [entry.content]);

  const [worldElementDataState, setWorldElementData] = useEditorDraft<WorldElementData>(initialWorldElementData);

  // Available entries for linking
  const characterEntries = (allEntries || []).filter(e => e.entryType === 'characters');
  const groupEntries = (allEntries || []).filter(e => e.entryType === 'groups_races');
  const locationEntries = (allEntries || []).filter(e => e.entryType === 'locations');
  const eventEntries = (allEntries || []).filter(e => e.entryType === 'events');
  const worldElementEntries = (allEntries || []).filter(e => e.entryType === 'world_elements' && e.id !== entry.id);
  const researchEntries = (allEntries || []).filter(e => e.entryType === 'research');

  const updateWorldElementData = useCallback((updates: Partial<WorldElementData>) => {
    const next = setWorldElementData(previous => ({ ...previous, ...updates }));
    autosave.save({ content: JSON.stringify(next),
      ...(Object.hasOwn(updates, 'tags') ? { tags: next.tags || [] } : {}),
      ...(Object.hasOwn(updates, 'isArchived') ? { isArchived: next.isArchived || false } : {}),
    });
  }, [setWorldElementData, autosave.save]);

  const updateNestedData = useCallback((key: keyof WorldElementData, nestedUpdates: Record<string, unknown>) => {
    const next = setWorldElementData(previous => ({
      ...previous,
      [key]: { ...(typeof previous[key] === "object" && previous[key] !== null ? previous[key] : {}), ...nestedUpdates }
    }));
    autosave.save({ content: JSON.stringify(next) });
  }, [setWorldElementData, autosave.save]);

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    autosave.save({ title: newTitle });
  }, [autosave.save]);

  // Reset state when entry changes
  useEffect(() => {
    setTitle(entry.title);
    setWorldElementData(initialWorldElementData);

  }, [entry.id]);

  const handleDelete = async () => {
    if (!await autosave.flush()) return;
    try {
      await deleteStoryBibleEntry.mutateAsync(entry.id);
      toast({
        title: "Success",
        description: "World element deleted successfully",
      });
      onClose?.();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete entry",
        variant: "destructive",
      });
    }
  };

  // Helper functions for array management
  const addTag = (tag: string) => {
    if (tag.trim() && !(worldElementDataState.tags || []).includes(tag.trim())) {
      updateWorldElementData({ tags: [...(worldElementDataState.tags || []), tag.trim()] });
    }
  };

  const removeTag = (tagToRemove: string) => {
    updateWorldElementData({ tags: (worldElementDataState.tags || []).filter(tag => tag !== tagToRemove) });
  };

  // Get category-specific fields
  const getCategorySpecificFields = () => {
    const category = worldElementDataState.category;
    const details = worldElementDataState.categoryDetails || {};

    switch (category) {
      case 'Flora':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="habitat">Habitat</Label>
                <Input
                  id="habitat"
                  value={details.habitat || ''}
                  onChange={(e) => updateNestedData('categoryDetails', { habitat: e.target.value })}
                  placeholder="Where it grows..."
                />
              </div>
              <div>
                <Label htmlFor="growthBehavior">Growth Behavior</Label>
                <Input
                  id="growthBehavior"
                  value={details.growthBehavior || ''}
                  onChange={(e) => updateNestedData('categoryDetails', { growthBehavior: e.target.value })}
                  placeholder="How it spreads/grows..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="uses">Uses</Label>
                <Textarea
                  id="uses"
                  value={details.uses || ''}
                  onChange={(e) => updateNestedData('categoryDetails', { uses: e.target.value })}
                  placeholder="Practical applications..."
                  className="min-h-20"
                />
              </div>
              <div>
                <Label htmlFor="threats">Threats</Label>
                <Textarea
                  id="threats"
                  value={details.threats || ''}
                  onChange={(e) => updateNestedData('categoryDetails', { threats: e.target.value })}
                  placeholder="What threatens it..."
                  className="min-h-20"
                />
              </div>
            </div>
          </div>
        );

      case 'Fauna':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="diet">Diet</Label>
                <Input
                  id="diet"
                  value={details.diet || ''}
                  onChange={(e) => updateNestedData('categoryDetails', { diet: e.target.value })}
                  placeholder="What it eats..."
                />
              </div>
              <div>
                <Label htmlFor="behavior">Behavior</Label>
                <Input
                  id="behavior"
                  value={details.behavior || ''}
                  onChange={(e) => updateNestedData('categoryDetails', { behavior: e.target.value })}
                  placeholder="How it acts..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lifecycle">Lifecycle</Label>
                <Textarea
                  id="lifecycle"
                  value={details.lifecycle || ''}
                  onChange={(e) => updateNestedData('categoryDetails', { lifecycle: e.target.value })}
                  placeholder="Life stages..."
                  className="min-h-20"
                />
              </div>
              <div>
                <Label htmlFor="domestication">Domestication</Label>
                <Textarea
                  id="domestication"
                  value={details.domestication || ''}
                  onChange={(e) => updateNestedData('categoryDetails', { domestication: e.target.value })}
                  placeholder="Relationship with civilizations..."
                  className="min-h-20"
                />
              </div>
            </div>
          </div>
        );

      case 'Technology':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="inventor">Inventor</Label>
                <Input
                  id="inventor"
                  value={details.inventor || ''}
                  onChange={(e) => updateNestedData('categoryDetails', { inventor: e.target.value })}
                  placeholder="Who created it..."
                />
              </div>
              <div>
                <Label htmlFor="powerSource">Power Source</Label>
                <Input
                  id="powerSource"
                  value={details.powerSource || ''}
                  onChange={(e) => updateNestedData('categoryDetails', { powerSource: e.target.value })}
                  placeholder="How it's powered..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="function">Function</Label>
                <Textarea
                  id="function"
                  value={details.function || ''}
                  onChange={(e) => updateNestedData('categoryDetails', { function: e.target.value })}
                  placeholder="What it does..."
                  className="min-h-20"
                />
              </div>
              <div>
                <Label htmlFor="limitations">Limitations</Label>
                <Textarea
                  id="limitations"
                  value={details.limitations || ''}
                  onChange={(e) => updateNestedData('categoryDetails', { limitations: e.target.value })}
                  placeholder="What it can't do..."
                  className="min-h-20"
                />
              </div>
            </div>
          </div>
        );

      case 'Religion/Ritual':
      case 'Mythology':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="beliefs">Beliefs</Label>
              <Textarea
                id="beliefs"
                value={details.beliefs || ''}
                onChange={(e) => updateNestedData('categoryDetails', { beliefs: e.target.value })}
                placeholder="Core beliefs and teachings..."
                className="min-h-24"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ceremonies">Ceremonies</Label>
                <Textarea
                  id="ceremonies"
                  value={details.ceremonies || ''}
                  onChange={(e) => updateNestedData('categoryDetails', { ceremonies: e.target.value })}
                  placeholder="Rituals and practices..."
                  className="min-h-20"
                />
              </div>
              <div>
                <Label htmlFor="originStories">Origin Stories</Label>
                <Textarea
                  id="originStories"
                  value={details.originStories || ''}
                  onChange={(e) => updateNestedData('categoryDetails', { originStories: e.target.value })}
                  placeholder="How it began..."
                  className="min-h-20"
                />
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="properties">Properties</Label>
                <Textarea
                  id="properties"
                  value={details.properties || ''}
                  onChange={(e) => updateNestedData('categoryDetails', { properties: e.target.value })}
                  placeholder="Key characteristics..."
                  className="min-h-20"
                />
              </div>
              <div>
                <Label htmlFor="appearance">Appearance</Label>
                <Textarea
                  id="appearance"
                  value={details.appearance || ''}
                  onChange={(e) => updateNestedData('categoryDetails', { appearance: e.target.value })}
                  placeholder="How it looks..."
                  className="min-h-20"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rarity">Rarity</Label>
                <Input
                  id="rarity"
                  value={details.rarity || ''}
                  onChange={(e) => updateNestedData('categoryDetails', { rarity: e.target.value })}
                  placeholder="How common/rare..."
                />
              </div>
              <div>
                <Label htmlFor="significance">Significance</Label>
                <Input
                  id="significance"
                  value={details.significance || ''}
                  onChange={(e) => updateNestedData('categoryDetails', { significance: e.target.value })}
                  placeholder="Why it matters..."
                />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div data-bible-form className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div data-bible-form-header className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onClose && (
              <Button aria-label="Back to library" variant="ghost" size="sm" onClick={onClose}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor={`world-elements-title-${entry.id}`}>World element name</Label>
                <Input
                  id={`world-elements-title-${entry.id}`}
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="text-2xl font-bold h-12"
                  placeholder="Element Name (e.g., Drifting Bloom)"
                />
              </div>
              <div className="flex gap-2">
                {worldElementDataState.category && (
                  <Badge variant="secondary">{worldElementDataState.category}</Badge>
                )}
                {worldElementDataState.status && (
                  <Badge variant={worldElementDataState.status === 'Common' ? 'default' : 'outline'}>
                    {worldElementDataState.status}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SaveStatus status={autosave.status} retry={autosave.flush} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button aria-label="Delete entry" variant="outline" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete World Element</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this world element? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <div data-bible-form-body className="flex gap-6 p-6">
        {/* Main Column */}
        <div className="flex-1 space-y-6">
          {/* Core Overview - Expanded initially */}
          <Collapsible open={coreOverviewExpanded} onOpenChange={setCoreOverviewExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Core Overview
                    </span>
                    {coreOverviewExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={worldElementDataState.category || ''}
                        onValueChange={(value) => updateWorldElementData({ category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {WORLD_ELEMENT_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={worldElementDataState.status || ''}
                        onValueChange={(value) => updateWorldElementData({ status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {WORLD_ELEMENT_STATUS.map((status) => (
                            <SelectItem key={status} value={status}>{status}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="shortNotes">Short Notes / One-line Significance</Label>
                    <Textarea
                      id="shortNotes"
                      value={worldElementDataState.shortNotes || ''}
                      onChange={(e) => updateWorldElementData({ shortNotes: e.target.value })}
                      placeholder="Brief description of its importance or uniqueness..."
                      className="min-h-20"
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Category-Specific Details - Dynamic based on category */}
          {worldElementDataState.category && (
            <Collapsible open={categoryDetailsExpanded} onOpenChange={setCategoryDetailsExpanded}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="text-lg flex items-center justify-between">
                      {worldElementDataState.category} Details
                      {categoryDetailsExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    {getCategorySpecificFields()}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Origins & History - Collapsible */}
          <Collapsible open={originsHistoryExpanded} onOpenChange={setOriginsHistoryExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Origins & History
                    </span>
                    {originsHistoryExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="discoveryOrigin">How/When Discovered or Invented</Label>
                    <Textarea
                      id="discoveryOrigin"
                      value={worldElementDataState.discoveryOrigin || ''}
                      onChange={(e) => updateWorldElementData({ discoveryOrigin: e.target.value })}
                      placeholder="Origin story, discovery circumstances..."
                      className="min-h-24"
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <RelationshipSection entry={entry} title="Origins & historical events" kinds={["history"]} />
          <RelationshipSection entry={entry} title="Usage & impact" kinds={["used_by","affects"]} />
          <RelationshipSection entry={entry} title="References & connections" kinds={["reference","associated","related"]} />
          <RelationshipSection entry={entry} title="World element hierarchy" kinds={["parent"]} />
          {/* Details / Lore Hooks - Collapsed by default */}
          <Collapsible open={loreHooksExpanded} onOpenChange={setLoreHooksExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Book className="h-5 w-5" />
                      Details / Lore Hooks
                    </span>
                    {loreHooksExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="loreHooks">General Lore Hooks</Label>
                    <Textarea
                      id="loreHooks"
                      value={worldElementDataState.loreHooks || ''}
                      onChange={(e) => updateWorldElementData({ loreHooks: e.target.value })}
                      placeholder="Story hooks and interesting details..."
                      className="min-h-24"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="idioms">Idioms</Label>
                      <Textarea
                        id="idioms"
                        value={worldElementDataState.idioms || ''}
                        onChange={(e) => updateWorldElementData({ idioms: e.target.value })}
                        placeholder="Sayings and expressions..."
                        className="min-h-20"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rumors">Rumors</Label>
                      <Textarea
                        id="rumors"
                        value={worldElementDataState.rumors || ''}
                        onChange={(e) => updateWorldElementData({ rumors: e.target.value })}
                        placeholder="What people whisper about it..."
                        className="min-h-20"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="nicheFacts">Niche Facts</Label>
                    <Textarea
                      id="nicheFacts"
                      value={worldElementDataState.nicheFacts || ''}
                      onChange={(e) => updateWorldElementData({ nicheFacts: e.target.value })}
                      placeholder="Obscure but interesting details..."
                      className="min-h-20"
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        {/* Sidebar */}
        <div className="w-80 space-y-4">
          {/* World Element Image */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Element Image
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {worldElementDataState.imageUrl ? (
                <div className="space-y-2">
                  <img 
                    src={worldElementDataState.imageUrl} 
                    alt={worldElementDataState.imageDescription || title}
                    className="w-full h-48 object-cover rounded-md"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => updateWorldElementData({ imageUrl: '', imageDescription: '' })}
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove Image
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-md p-6 text-center">
                    <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">Add element image</p>
                  </div>
                  <Input
                    placeholder="Image URL..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const url = e.currentTarget.value.trim();
                        if (url) updateWorldElementData({ imageUrl: url });
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>
              )}
              {worldElementDataState.imageUrl && (
                <div>
                  <Label htmlFor="imageDescription">Image Description</Label>
                  <Input
                    id="imageDescription"
                    value={worldElementDataState.imageDescription || ''}
                    onChange={(e) => updateWorldElementData({ imageDescription: e.target.value })}
                    placeholder="Describe the image..."
                  />
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Classification */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Classification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {worldElementDataState.category && (
                  <Badge variant="secondary">{worldElementDataState.category}</Badge>
                )}
                {worldElementDataState.status && (
                  <Badge variant="outline">{worldElementDataState.status}</Badge>
                )}
              </div>
              

            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-2">
                {(worldElementDataState.tags || []).map((tag, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:bg-red-500 hover:text-white rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add tag..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addTag(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Archive Toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Archive className="h-5 w-5" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="archived"
                  checked={worldElementDataState.isArchived || false}
                  onCheckedChange={(checked) => updateWorldElementData({ isArchived: checked === true })}
                />
                <Label htmlFor="archived">Archived</Label>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
});

WorldElementsEditor.displayName = 'WorldElementsEditor';

export { WorldElementsEditor };
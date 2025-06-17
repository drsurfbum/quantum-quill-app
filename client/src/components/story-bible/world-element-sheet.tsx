import { useState, useCallback, useMemo, memo } from 'react';
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
import { Save, Trash2, Plus, X, ChevronDown, ChevronRight, Cpu, Users, MapPin, Calendar, FileText, BookOpen } from 'lucide-react';
import { useUpdateStoryBibleEntry, useDeleteStoryBibleEntry } from '@/hooks/use-story-bible';
import { useToast } from '@/hooks/use-toast';
import { StoryBibleEntry } from '@shared/schema';
import { debounce } from 'lodash';

// World element data structure
interface WorldElementData {
  // Header
  category?: string;
  parentElement?: string;
  shortNotes?: string;
  
  // Description
  overview?: string;
  
  // Dynamic subfields based on category
  categorySpecific?: {
    // Flora
    habitat?: string;
    growthBehavior?: string;
    uses?: string;
    threats?: string;
    
    // Fauna
    diet?: string;
    behavior?: string;
    lifecycle?: string;
    interactionWithSpecies?: string;
    
    // Religion/Ritual
    beliefs?: string;
    deities?: string;
    ceremonies?: string;
    followers?: string;
    taboos?: string;
    
    // Mythology
    storySummary?: string;
    characters?: string;
    mythSymbolism?: string;
    culturalInfluence?: string;
    
    // Item/Artifact
    creator?: string;
    use?: string;
    materials?: string;
    power?: string;
    ownershipHistory?: string;
    
    // Language
    spokenWritten?: string;
    uniqueWords?: string;
    grammarNotes?: string;
    origin?: string;
    
    // System
    structure?: string;
    function?: string;
    reach?: string;
    participants?: string;
    
    // Entertainment
    type?: string;
    culturalRole?: string;
    
    // Clothing
    region?: string;
    clothingSymbolism?: string;
    occasion?: string;
    
    // Food
    ingredients?: string;
    preparation?: string;
    culturalSignificance?: string;
    
    // Disease/Medicine
    symptoms?: string;
    spread?: string;
    cure?: string;
    relatedSpecies?: string;
    
    // Law/Politics
    leaders?: string;
    enforcement?: string;
    punishment?: string;
    
    // Professions
    tools?: string;
    roleInSociety?: string;
    training?: string;
    specialties?: string;
    
    // Technology
    powerSource?: string;
    inventor?: string;
    commonUses?: string;
    limitations?: string;
    
    // Astronomy
    bodyType?: string;
    notableEvents?: string;
    associatedBeliefs?: string;
    
    // Weather
    frequency?: string;
    effects?: string;
    localReactions?: string;
  };
  
  // Relational data
  linkedCharacters?: Array<{
    name: string;
    relationship?: string;
    notes?: string;
  }>;
  
  groupsRaces?: Array<{
    name: string;
    connection?: string;
    notes?: string;
  }>;
  
  locations?: Array<{
    name: string;
    relevance?: string;
    notes?: string;
  }>;
  
  events?: Array<{
    title: string;
    connection?: string;
    notes?: string;
  }>;
  
  details?: string[];
  
  research?: Array<{
    title: string;
    type: string;
    url?: string;
    notesTaken?: boolean;
  }>;
  
  // Metadata
  isSubElement?: boolean;
  
  // Notes
  writerNotes?: string;
}

interface WorldElementSheetProps {
  entry: StoryBibleEntry;
  projectId: number;
}

// World element categories with color coding
const WORLD_ELEMENT_CATEGORIES = [
  { value: 'flora', label: 'Flora', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'fauna', label: 'Fauna', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'religion', label: 'Religion/Ritual', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'mythology', label: 'Mythology', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { value: 'item', label: 'Item/Artifact', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'language', label: 'Language', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'system', label: 'System', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  { value: 'entertainment', label: 'Entertainment', color: 'bg-pink-100 text-pink-800 border-pink-200' },
  { value: 'clothing', label: 'Clothing', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  { value: 'food', label: 'Food', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'disease', label: 'Disease/Medicine', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'law', label: 'Law/Politics', color: 'bg-slate-100 text-slate-800 border-slate-200' },
  { value: 'professions', label: 'Professions', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  { value: 'technology', label: 'Technology', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { value: 'astronomy', label: 'Astronomy', color: 'bg-violet-100 text-violet-800 border-violet-200' },
  { value: 'weather', label: 'Weather', color: 'bg-sky-100 text-sky-800 border-sky-200' },
  { value: 'geography', label: 'Geography', color: 'bg-stone-100 text-stone-800 border-stone-200' },
  { value: 'other', label: 'Other', color: 'bg-neutral-100 text-neutral-800 border-neutral-200' }
];

// Research types
const RESEARCH_TYPES = [
  'Article', 'Book', 'Video', 'Image', 'Concept Art', 'Documentary', 'Interview', 'Website', 'Other'
];

const WorldElementSheet = memo(({ entry, projectId }: WorldElementSheetProps) => {
  const { toast } = useToast();
  const updateStoryBibleEntry = useUpdateStoryBibleEntry();
  const deleteStoryBibleEntry = useDeleteStoryBibleEntry();
  
  const [title, setTitle] = useState(entry.title);
  const [isSaving, setIsSaving] = useState(false);
  const [categoryFieldsExpanded, setCategoryFieldsExpanded] = useState(true);
  const [notesExpanded, setNotesExpanded] = useState(false);

  // Parse world element data from content
  const worldElementData = useMemo(() => {
    if (!entry.content) return {} as WorldElementData;
    
    try {
      const parsed = JSON.parse(entry.content);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as WorldElementData;
      }
    } catch {
      // If JSON parsing fails, treat as legacy description content
      return {
        overview: entry.content,
        categorySpecific: {},
        linkedCharacters: [],
        groupsRaces: [],
        locations: [],
        events: [],
        details: [],
        research: []
      } as WorldElementData;
    }
    
    return {} as WorldElementData;
  }, [entry.content]);

  const [worldElementDataState, setWorldElementData] = useState<WorldElementData>({
    categorySpecific: {},
    linkedCharacters: [],
    groupsRaces: [],
    locations: [],
    events: [],
    details: [],
    research: [],
    ...worldElementData
  });

  // Get category info
  const categoryInfo = useMemo(() => {
    return WORLD_ELEMENT_CATEGORIES.find(cat => cat.value === worldElementDataState.category);
  }, [worldElementDataState.category]);

  // Debounced save function
  const debouncedSave = useMemo(
    () => debounce(async (newTitle: string, newData: WorldElementData) => {
      try {
        await updateStoryBibleEntry.mutateAsync({
          id: entry.id,
          title: newTitle,
          content: JSON.stringify(newData, null, 2),
          entryType: 'world-element'
        });
      } catch (error) {
        console.error('Failed to save world element:', error);
        toast({
          title: "Save failed",
          description: "Could not save changes. Please try again.",
          variant: "destructive",
        });
      }
    }, 3000),
    [entry.id, updateStoryBibleEntry, toast]
  );

  // Update world element data
  const updateWorldElementData = useCallback((updates: Partial<WorldElementData>) => {
    const newData = { ...worldElementDataState, ...updates };
    setWorldElementData(newData);
    debouncedSave(title, newData);
  }, [worldElementDataState, title, debouncedSave]);

  // Update nested data
  const updateNestedData = useCallback((path: keyof WorldElementData, updates: any) => {
    const currentValue = worldElementDataState[path] as any;
    const newData = { 
      ...worldElementDataState, 
      [path]: { ...(currentValue || {}), ...updates } 
    };
    setWorldElementData(newData);
    debouncedSave(title, newData);
  }, [worldElementDataState, title, debouncedSave]);

  // Handle title changes
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    debouncedSave(newTitle, worldElementDataState);
  }, [worldElementDataState, debouncedSave]);

  // Manual save function
  const handleManualSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await updateStoryBibleEntry.mutateAsync({
        id: entry.id,
        title,
        content: JSON.stringify(worldElementDataState, null, 2),
        entryType: 'world-element'
      });
      
      toast({
        title: "World element saved",
        description: "All changes have been saved successfully.",
      });
    } catch (error) {
      console.error('Failed to save world element:', error);
      toast({
        title: "Save failed",
        description: "Could not save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [entry.id, title, worldElementDataState, updateStoryBibleEntry, toast]);

  // Delete function
  const handleDelete = useCallback(async () => {
    try {
      await deleteStoryBibleEntry.mutateAsync({ id: entry.id, projectId });
      toast({
        title: "World element deleted",
        description: "The world element has been removed from your story bible.",
      });
    } catch (error) {
      console.error('Failed to delete world element:', error);
      toast({
        title: "Delete failed",
        description: "Could not delete the world element. Please try again.",
        variant: "destructive",
      });
    }
  }, [entry.id, projectId, deleteStoryBibleEntry, toast]);

  // Array management functions
  const addToArray = useCallback((key: keyof WorldElementData, newItem: any) => {
    const currentArray = (worldElementDataState[key] as any[]) || [];
    updateWorldElementData({ [key]: [...currentArray, newItem] });
  }, [worldElementDataState, updateWorldElementData]);

  const removeFromArray = useCallback((key: keyof WorldElementData, index: number) => {
    const currentArray = (worldElementDataState[key] as any[]) || [];
    const newArray = [...currentArray];
    newArray.splice(index, 1);
    updateWorldElementData({ [key]: newArray });
  }, [worldElementDataState, updateWorldElementData]);

  const updateArrayItem = useCallback((key: keyof WorldElementData, index: number, updates: any) => {
    const currentArray = (worldElementDataState[key] as any[]) || [];
    const newArray = [...currentArray];
    newArray[index] = { ...newArray[index], ...updates };
    updateWorldElementData({ [key]: newArray });
  }, [worldElementDataState, updateWorldElementData]);

  // Render category-specific fields
  const renderCategoryFields = () => {
    const category = worldElementDataState.category;
    const categoryData = worldElementDataState.categorySpecific || {};

    switch (category) {
      case 'flora':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="habitat">Habitat</Label>
              <Input
                id="habitat"
                value={categoryData.habitat || ''}
                onChange={(e) => updateNestedData('categorySpecific', { habitat: e.target.value })}
                placeholder="Where it grows..."
              />
            </div>
            <div>
              <Label htmlFor="growthBehavior">Growth Behavior</Label>
              <Input
                id="growthBehavior"
                value={categoryData.growthBehavior || ''}
                onChange={(e) => updateNestedData('categorySpecific', { growthBehavior: e.target.value })}
                placeholder="How it spreads, seasons..."
              />
            </div>
            <div>
              <Label htmlFor="uses">Uses</Label>
              <Input
                id="uses"
                value={categoryData.uses || ''}
                onChange={(e) => updateNestedData('categorySpecific', { uses: e.target.value })}
                placeholder="Medicine, food, materials..."
              />
            </div>
            <div>
              <Label htmlFor="threats">Threats</Label>
              <Input
                id="threats"
                value={categoryData.threats || ''}
                onChange={(e) => updateNestedData('categorySpecific', { threats: e.target.value })}
                placeholder="Natural predators, diseases..."
              />
            </div>
          </div>
        );

      case 'fauna':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="habitat">Habitat</Label>
              <Input
                id="habitat"
                value={categoryData.habitat || ''}
                onChange={(e) => updateNestedData('categorySpecific', { habitat: e.target.value })}
                placeholder="Where it lives..."
              />
            </div>
            <div>
              <Label htmlFor="diet">Diet</Label>
              <Input
                id="diet"
                value={categoryData.diet || ''}
                onChange={(e) => updateNestedData('categorySpecific', { diet: e.target.value })}
                placeholder="What it eats..."
              />
            </div>
            <div>
              <Label htmlFor="behavior">Behavior</Label>
              <Input
                id="behavior"
                value={categoryData.behavior || ''}
                onChange={(e) => updateNestedData('categorySpecific', { behavior: e.target.value })}
                placeholder="Social patterns, temperament..."
              />
            </div>
            <div>
              <Label htmlFor="lifecycle">Lifecycle</Label>
              <Input
                id="lifecycle"
                value={categoryData.lifecycle || ''}
                onChange={(e) => updateNestedData('categorySpecific', { lifecycle: e.target.value })}
                placeholder="Reproduction, lifespan..."
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="interactionWithSpecies">Interaction with Species</Label>
              <Input
                id="interactionWithSpecies"
                value={categoryData.interactionWithSpecies || ''}
                onChange={(e) => updateNestedData('categorySpecific', { interactionWithSpecies: e.target.value })}
                placeholder="Relationship with other creatures..."
              />
            </div>
          </div>
        );

      case 'religion':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="beliefs">Beliefs</Label>
                <Textarea
                  id="beliefs"
                  value={categoryData.beliefs || ''}
                  onChange={(e) => updateNestedData('categorySpecific', { beliefs: e.target.value })}
                  placeholder="Core tenets, doctrines..."
                  className="min-h-20"
                />
              </div>
              <div>
                <Label htmlFor="deities">Deities</Label>
                <Textarea
                  id="deities"
                  value={categoryData.deities || ''}
                  onChange={(e) => updateNestedData('categorySpecific', { deities: e.target.value })}
                  placeholder="Gods, spirits, entities..."
                  className="min-h-20"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ceremonies">Ceremonies</Label>
                <Input
                  id="ceremonies"
                  value={categoryData.ceremonies || ''}
                  onChange={(e) => updateNestedData('categorySpecific', { ceremonies: e.target.value })}
                  placeholder="Rituals, festivals..."
                />
              </div>
              <div>
                <Label htmlFor="followers">Followers</Label>
                <Input
                  id="followers"
                  value={categoryData.followers || ''}
                  onChange={(e) => updateNestedData('categorySpecific', { followers: e.target.value })}
                  placeholder="Who practices this..."
                />
              </div>
            </div>
            <div>
              <Label htmlFor="taboos">Taboos</Label>
              <Input
                id="taboos"
                value={categoryData.taboos || ''}
                onChange={(e) => updateNestedData('categorySpecific', { taboos: e.target.value })}
                placeholder="Forbidden practices, restrictions..."
              />
            </div>
          </div>
        );

      case 'technology':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="powerSource">Power Source</Label>
              <Input
                id="powerSource"
                value={categoryData.powerSource || ''}
                onChange={(e) => updateNestedData('categorySpecific', { powerSource: e.target.value })}
                placeholder="Energy type, fuel..."
              />
            </div>
            <div>
              <Label htmlFor="inventor">Inventor</Label>
              <Input
                id="inventor"
                value={categoryData.inventor || ''}
                onChange={(e) => updateNestedData('categorySpecific', { inventor: e.target.value })}
                placeholder="Creator, developer..."
              />
            </div>
            <div>
              <Label htmlFor="commonUses">Common Uses</Label>
              <Input
                id="commonUses"
                value={categoryData.commonUses || ''}
                onChange={(e) => updateNestedData('categorySpecific', { commonUses: e.target.value })}
                placeholder="Applications, purposes..."
              />
            </div>
            <div>
              <Label htmlFor="limitations">Limitations</Label>
              <Input
                id="limitations"
                value={categoryData.limitations || ''}
                onChange={(e) => updateNestedData('categorySpecific', { limitations: e.target.value })}
                placeholder="Drawbacks, restrictions..."
              />
            </div>
          </div>
        );

      case 'item':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="creator">Creator</Label>
                <Input
                  id="creator"
                  value={categoryData.creator || ''}
                  onChange={(e) => updateNestedData('categorySpecific', { creator: e.target.value })}
                  placeholder="Who made it..."
                />
              </div>
              <div>
                <Label htmlFor="use">Use</Label>
                <Input
                  id="use"
                  value={categoryData.use || ''}
                  onChange={(e) => updateNestedData('categorySpecific', { use: e.target.value })}
                  placeholder="Primary purpose..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="materials">Materials</Label>
                <Input
                  id="materials"
                  value={categoryData.materials || ''}
                  onChange={(e) => updateNestedData('categorySpecific', { materials: e.target.value })}
                  placeholder="What it's made of..."
                />
              </div>
              <div>
                <Label htmlFor="power">Power</Label>
                <Input
                  id="power"
                  value={categoryData.power || ''}
                  onChange={(e) => updateNestedData('categorySpecific', { power: e.target.value })}
                  placeholder="Magical/special abilities..."
                />
              </div>
            </div>
            <div>
              <Label htmlFor="ownershipHistory">Ownership History</Label>
              <Textarea
                id="ownershipHistory"
                value={categoryData.ownershipHistory || ''}
                onChange={(e) => updateNestedData('categorySpecific', { ownershipHistory: e.target.value })}
                placeholder="Previous owners, how it changed hands..."
                className="min-h-20"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-none border-b bg-card p-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex-1 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-muted-foreground" />
              <Input
                value={title}
                onChange={handleTitleChange}
                className="text-xl font-bold border-none p-0 h-auto bg-transparent focus-visible:ring-0"
                placeholder="Element name..."
              />
            </div>
            {categoryInfo && (
              <Badge className={`${categoryInfo.color} border`}>
                {categoryInfo.label}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Select
              value={worldElementDataState.category || ''}
              onValueChange={(value) => updateWorldElementData({ category: value })}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {WORLD_ELEMENT_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${category.color.split(' ')[0]}`} />
                      {category.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              onClick={handleManualSave} 
              disabled={isSaving || updateStoryBibleEntry.isPending}
              size="sm"
            >
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete World Element</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{title}"? This action cannot be undone.
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

        {/* Parent Element and Short Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="parentElement">Parent Element</Label>
            <Input
              id="parentElement"
              value={worldElementDataState.parentElement || ''}
              onChange={(e) => updateWorldElementData({ parentElement: e.target.value })}
              placeholder="Part of a larger system or hierarchy..."
            />
          </div>
          <div>
            <Label htmlFor="shortNotes">Short Notes</Label>
            <Input
              id="shortNotes"
              value={worldElementDataState.shortNotes || ''}
              onChange={(e) => updateWorldElementData({ shortNotes: e.target.value })}
              placeholder="One-line description or significance..."
            />
          </div>
        </div>

        {/* Sub-element toggle */}
        <div className="flex items-center space-x-2 mt-4">
          <Checkbox
            id="isSubElement"
            checked={worldElementDataState.isSubElement || false}
            onCheckedChange={(checked) => updateWorldElementData({ isSubElement: checked === true })}
          />
          <Label htmlFor="isSubElement">This is a sub-element</Label>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={worldElementDataState.overview || ''}
              onChange={(e) => updateWorldElementData({ overview: e.target.value })}
              placeholder="Main narrative explanation or definition of this element..."
              className="min-h-32"
            />
          </CardContent>
        </Card>

        {/* Category-Specific Fields */}
        {worldElementDataState.category && (
          <Collapsible open={categoryFieldsExpanded} onOpenChange={setCategoryFieldsExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {categoryInfo && (
                        <div className={`w-4 h-4 rounded ${categoryInfo.color.split(' ')[0]}`} />
                      )}
                      {categoryInfo?.label} Details
                    </span>
                    {categoryFieldsExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  {renderCategoryFields()}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Characters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Characters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(worldElementDataState.linkedCharacters || []).map((character, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={character.name}
                      onChange={(e) => updateArrayItem('linkedCharacters', index, { name: e.target.value })}
                      placeholder="Character name"
                      className="font-medium"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={character.relationship || ''}
                        onChange={(e) => updateArrayItem('linkedCharacters', index, { relationship: e.target.value })}
                        placeholder="Relationship (creator, user, believer...)"
                        className="text-sm"
                      />
                      <Input
                        value={character.notes || ''}
                        onChange={(e) => updateArrayItem('linkedCharacters', index, { notes: e.target.value })}
                        placeholder="Notes"
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromArray('linkedCharacters', index)}
                    className="hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => addToArray('linkedCharacters', { name: '', relationship: '', notes: '' })}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Character
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Groups/Races */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Groups / Races</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(worldElementDataState.groupsRaces || []).map((group, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={group.name}
                      onChange={(e) => updateArrayItem('groupsRaces', index, { name: e.target.value })}
                      placeholder="Group or race name"
                      className="font-medium"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={group.connection || ''}
                        onChange={(e) => updateArrayItem('groupsRaces', index, { connection: e.target.value })}
                        placeholder="Connection (origin, dominant users...)"
                        className="text-sm"
                      />
                      <Input
                        value={group.notes || ''}
                        onChange={(e) => updateArrayItem('groupsRaces', index, { notes: e.target.value })}
                        placeholder="Notes"
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromArray('groupsRaces', index)}
                    className="hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => addToArray('groupsRaces', { name: '', connection: '', notes: '' })}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Group/Race
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Locations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(worldElementDataState.locations || []).map((location, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={location.name}
                      onChange={(e) => updateArrayItem('locations', index, { name: e.target.value })}
                      placeholder="Location name"
                      className="font-medium"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={location.relevance || ''}
                        onChange={(e) => updateArrayItem('locations', index, { relevance: e.target.value })}
                        placeholder="Relevance (found, created, observed...)"
                        className="text-sm"
                      />
                      <Input
                        value={location.notes || ''}
                        onChange={(e) => updateArrayItem('locations', index, { notes: e.target.value })}
                        placeholder="Notes"
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromArray('locations', index)}
                    className="hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => addToArray('locations', { name: '', relevance: '', notes: '' })}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Location
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(worldElementDataState.events || []).map((event, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={event.title}
                      onChange={(e) => updateArrayItem('events', index, { title: e.target.value })}
                      placeholder="Event title"
                      className="font-medium"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={event.connection || ''}
                        onChange={(e) => updateArrayItem('events', index, { connection: e.target.value })}
                        placeholder="Connection (introduction, destruction...)"
                        className="text-sm"
                      />
                      <Input
                        value={event.notes || ''}
                        onChange={(e) => updateArrayItem('events', index, { notes: e.target.value })}
                        placeholder="Notes"
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromArray('events', index)}
                    className="hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => addToArray('events', { title: '', connection: '', notes: '' })}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(worldElementDataState.details || []).map((detail, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Input
                    value={detail}
                    onChange={(e) => {
                      const newDetails = [...(worldElementDataState.details || [])];
                      newDetails[index] = e.target.value;
                      updateWorldElementData({ details: newDetails });
                    }}
                    placeholder="Lore hooks, idioms, sayings, rumors..."
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromArray('details', index)}
                    className="hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => addToArray('details', '')}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Detail
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Research */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Research
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(worldElementDataState.research || []).map((item, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={item.title}
                      onChange={(e) => updateArrayItem('research', index, { title: e.target.value })}
                      placeholder="Research title"
                      className="font-medium"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <Select
                        value={item.type || ''}
                        onValueChange={(value) => updateArrayItem('research', index, { type: value })}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {RESEARCH_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={item.url || ''}
                        onChange={(e) => updateArrayItem('research', index, { url: e.target.value })}
                        placeholder="URL (optional)"
                        className="text-sm col-span-2"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={item.notesTaken || false}
                        onCheckedChange={(checked) => updateArrayItem('research', index, { notesTaken: checked === true })}
                      />
                      <Label className="text-sm">Notes taken</Label>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromArray('research', index)}
                    className="hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => addToArray('research', { title: '', type: '', url: '', notesTaken: false })}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Research
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Writer's Notes - Collapsible */}
        <Collapsible open={notesExpanded} onOpenChange={setNotesExpanded}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardTitle className="text-lg flex items-center justify-between">
                  Writer's Notes
                  {notesExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <Textarea
                  value={worldElementDataState.writerNotes || ''}
                  onChange={(e) => updateWorldElementData({ writerNotes: e.target.value })}
                  placeholder="Behind-the-scenes notes, development ideas, inspiration sources..."
                  className="min-h-24"
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </div>
  );
});

WorldElementSheet.displayName = 'WorldElementSheet';

export { WorldElementSheet };
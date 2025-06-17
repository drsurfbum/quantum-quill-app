import { useState, useCallback, useMemo, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Save, Trash2, Plus, X, ChevronDown, ChevronRight, MapPin, Users, Calendar, Cpu, FileText, BookOpen } from 'lucide-react';
import { useUpdateStoryBibleEntry, useDeleteStoryBibleEntry } from '@/hooks/use-story-bible';
import { useToast } from '@/hooks/use-toast';
import { StoryBibleEntry } from '@shared/schema';
import { debounce } from 'lodash';

// Location data structure
interface LocationData {
  // Header
  locationType?: string;
  parentLocation?: string;
  shortNotes?: string;
  
  // Description
  description?: string;
  
  // Relational data
  linkedCharacters?: Array<{
    name: string;
    role?: string;
    notes?: string;
  }>;
  
  groupsRaces?: Array<{
    name: string;
    relationship?: string;
    notes?: string;
  }>;
  
  events?: Array<{
    date: string;
    title: string;
    notes?: string;
  }>;
  
  worldElements?: Array<{
    name: string;
    category?: string;
    notes?: string;
  }>;
  
  details?: string[];
  
  research?: Array<{
    title: string;
    type: string;
    url?: string;
    notesTaken?: boolean;
  }>;
  
  // Notes
  writerNotes?: string;
}

interface LocationSheetProps {
  entry: StoryBibleEntry;
  projectId: number;
}

// Location types for the dropdown
const LOCATION_TYPES = [
  'City', 'Town', 'Village', 'Building', 'Room', 'House', 'Castle', 'Temple',
  'Forest', 'Mountain', 'Desert', 'Ocean', 'Lake', 'River', 'Cave',
  'Planet', 'Moon', 'Station', 'Ship', 'Dimension', 'Realm',
  'Country', 'Region', 'District', 'Neighborhood', 'Street',
  'Other'
];

// Research types
const RESEARCH_TYPES = [
  'Article', 'Book', 'Video', 'Image', 'Map', 'Interview', 'Document', 'Website', 'Other'
];

// World element categories
const WORLD_ELEMENT_CATEGORIES = [
  'Technology', 'Magic', 'Natural Phenomenon', 'Artifact', 'Resource', 
  'Hazard', 'Culture', 'Language', 'Currency', 'Other'
];

const LocationSheet = memo(({ entry, projectId }: LocationSheetProps) => {
  const { toast } = useToast();
  const updateStoryBibleEntry = useUpdateStoryBibleEntry();
  const deleteStoryBibleEntry = useDeleteStoryBibleEntry();
  
  const [title, setTitle] = useState(entry.title);
  const [isSaving, setIsSaving] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);

  // Parse location data from content
  const locationData = useMemo(() => {
    if (!entry.content) return {} as LocationData;
    
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(entry.content);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as LocationData;
      }
    } catch {
      // If JSON parsing fails, treat as legacy description content
      return {
        description: entry.content,
        linkedCharacters: [],
        groupsRaces: [],
        events: [],
        worldElements: [],
        details: [],
        research: []
      } as LocationData;
    }
    
    return {} as LocationData;
  }, [entry.content]);

  const [locationDataState, setLocationData] = useState<LocationData>(locationData);

  // Debounced save function
  const debouncedSave = useMemo(
    () => debounce(async (newTitle: string, newData: LocationData) => {
      try {
        await updateStoryBibleEntry.mutateAsync({
          id: entry.id,
          title: newTitle,
          content: JSON.stringify(newData, null, 2),
          entryType: 'location'
        });
      } catch (error) {
        console.error('Failed to save location:', error);
        toast({
          title: "Save failed",
          description: "Could not save changes. Please try again.",
          variant: "destructive",
        });
      }
    }, 3000),
    [entry.id, updateStoryBibleEntry, toast]
  );

  // Update location data
  const updateLocationData = useCallback((updates: Partial<LocationData>) => {
    const newData = { ...locationDataState, ...updates };
    setLocationData(newData);
    debouncedSave(title, newData);
  }, [locationDataState, title, debouncedSave]);

  // Handle title changes
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    debouncedSave(newTitle, locationDataState);
  }, [locationDataState, debouncedSave]);

  // Manual save function
  const handleManualSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await updateStoryBibleEntry.mutateAsync({
        id: entry.id,
        title,
        content: JSON.stringify(locationDataState, null, 2),
        entryType: 'location'
      });
      
      toast({
        title: "Location saved",
        description: "All changes have been saved successfully.",
      });
    } catch (error) {
      console.error('Failed to save location:', error);
      toast({
        title: "Save failed",
        description: "Could not save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [entry.id, title, locationDataState, updateStoryBibleEntry, toast]);

  // Delete function
  const handleDelete = useCallback(async () => {
    try {
      await deleteStoryBibleEntry.mutateAsync({ id: entry.id, projectId });
      toast({
        title: "Location deleted",
        description: "The location has been removed from your story bible.",
      });
    } catch (error) {
      console.error('Failed to delete location:', error);
      toast({
        title: "Delete failed",
        description: "Could not delete the location. Please try again.",
        variant: "destructive",
      });
    }
  }, [entry.id, projectId, deleteStoryBibleEntry, toast]);

  // Array management functions
  const addToArray = useCallback((key: keyof LocationData, newItem: any) => {
    const currentArray = (locationDataState[key] as any[]) || [];
    updateLocationData({ [key]: [...currentArray, newItem] });
  }, [locationDataState, updateLocationData]);

  const removeFromArray = useCallback((key: keyof LocationData, index: number) => {
    const currentArray = (locationDataState[key] as any[]) || [];
    const newArray = [...currentArray];
    newArray.splice(index, 1);
    updateLocationData({ [key]: newArray });
  }, [locationDataState, updateLocationData]);

  const updateArrayItem = useCallback((key: keyof LocationData, index: number, updates: any) => {
    const currentArray = (locationDataState[key] as any[]) || [];
    const newArray = [...currentArray];
    newArray[index] = { ...newArray[index], ...updates };
    updateLocationData({ [key]: newArray });
  }, [locationDataState, updateLocationData]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-none border-b bg-card p-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex-1 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <Input
                value={title}
                onChange={handleTitleChange}
                className="text-xl font-bold border-none p-0 h-auto bg-transparent focus-visible:ring-0"
                placeholder="Location name..."
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Select
              value={locationDataState.locationType || ''}
              onValueChange={(value) => updateLocationData({ locationType: value })}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
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
                  <AlertDialogTitle>Delete Location</AlertDialogTitle>
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

        {/* Parent Location and Short Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="parentLocation">Parent Location</Label>
            <Input
              id="parentLocation"
              value={locationDataState.parentLocation || ''}
              onChange={(e) => updateLocationData({ parentLocation: e.target.value })}
              placeholder="e.g., Mars, Middle-earth..."
            />
          </div>
          <div>
            <Label htmlFor="shortNotes">Quick Descriptor</Label>
            <Input
              id="shortNotes"
              value={locationDataState.shortNotes || ''}
              onChange={(e) => updateLocationData({ shortNotes: e.target.value })}
              placeholder="Brief description or key feature..."
            />
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Description Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={locationDataState.description || ''}
              onChange={(e) => updateLocationData({ description: e.target.value })}
              placeholder="Purpose, layout, key features, atmosphere..."
              className="min-h-32"
            />
          </CardContent>
        </Card>

        {/* Characters Linked */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Characters Linked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(locationDataState.linkedCharacters || []).map((character, index) => (
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
                        value={character.role || ''}
                        onChange={(e) => updateArrayItem('linkedCharacters', index, { role: e.target.value })}
                        placeholder="Role (resident, founder...)"
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
                onClick={() => addToArray('linkedCharacters', { name: '', role: '', notes: '' })}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Character
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Groups / Races */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Groups / Races</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(locationDataState.groupsRaces || []).map((group, index) => (
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
                        value={group.relationship || ''}
                        onChange={(e) => updateArrayItem('groupsRaces', index, { relationship: e.target.value })}
                        placeholder="Relationship (owned by, origin of...)"
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
                onClick={() => addToArray('groupsRaces', { name: '', relationship: '', notes: '' })}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Group or Race
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
              {(locationDataState.events || []).map((event, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="flex-1 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        value={event.date}
                        onChange={(e) => updateArrayItem('events', index, { date: e.target.value })}
                        placeholder="Date/Time"
                        className="text-sm"
                      />
                      <Input
                        value={event.title}
                        onChange={(e) => updateArrayItem('events', index, { title: e.target.value })}
                        placeholder="Event title"
                        className="font-medium col-span-2"
                      />
                    </div>
                    <Input
                      value={event.notes || ''}
                      onChange={(e) => updateArrayItem('events', index, { notes: e.target.value })}
                      placeholder="Additional notes"
                      className="text-sm"
                    />
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
                onClick={() => addToArray('events', { date: '', title: '', notes: '' })}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* World Elements */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              World Elements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(locationDataState.worldElements || []).map((element, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={element.name}
                      onChange={(e) => updateArrayItem('worldElements', index, { name: e.target.value })}
                      placeholder="Element name"
                      className="font-medium"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={element.category || ''}
                        onValueChange={(value) => updateArrayItem('worldElements', index, { category: value })}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {WORLD_ELEMENT_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={element.notes || ''}
                        onChange={(e) => updateArrayItem('worldElements', index, { notes: e.target.value })}
                        placeholder="Notes"
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromArray('worldElements', index)}
                    className="hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => addToArray('worldElements', { name: '', category: '', notes: '' })}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add World Element
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
              {(locationDataState.details || []).map((detail, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Input
                    value={detail}
                    onChange={(e) => {
                      const newDetails = [...(locationDataState.details || [])];
                      newDetails[index] = e.target.value;
                      updateLocationData({ details: newDetails });
                    }}
                    placeholder="Local flavor, customs, idioms..."
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
              {(locationDataState.research || []).map((item, index) => (
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
                      <input
                        type="checkbox"
                        checked={item.notesTaken || false}
                        onChange={(e) => updateArrayItem('research', index, { notesTaken: e.target.checked })}
                        className="rounded"
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
                  value={locationDataState.writerNotes || ''}
                  onChange={(e) => updateLocationData({ writerNotes: e.target.value })}
                  placeholder="Behind-the-scenes notes, reminders, development ideas..."
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

LocationSheet.displayName = 'LocationSheet';

export { LocationSheet };
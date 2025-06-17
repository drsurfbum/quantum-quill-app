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
import { Save, Trash2, Plus, X, ChevronDown, ChevronRight, Calendar, Users, MapPin, Cpu, Flag, Tag } from 'lucide-react';
import { useUpdateStoryBibleEntry, useDeleteStoryBibleEntry } from '@/hooks/use-story-bible';
import { useToast } from '@/hooks/use-toast';
import { StoryBibleEntry } from '@shared/schema';
import { debounce } from 'lodash';

// Event data structure
interface EventData {
  // Header
  eventType?: string;
  era?: string;
  shortSummary?: string;
  
  // Date Information
  date?: {
    year: string;
    month?: string;
    day?: string;
    fictionalDate?: string;
    isApproximate?: boolean;
  };
  
  // Context
  narrativeContext?: string;
  
  // Relational data
  charactersInvolved?: Array<{
    name: string;
    role?: string;
    notes?: string;
  }>;
  
  groupsFactions?: Array<{
    name: string;
    involvement?: string;
    notes?: string;
  }>;
  
  locations?: Array<{
    name: string;
    significance?: string;
    notes?: string;
  }>;
  
  worldElements?: Array<{
    name: string;
    usage?: string;
    notes?: string;
  }>;
  
  // Metadata
  eventStatus?: string;
  includeOnTimeline?: boolean;
  tags?: string[];
  
  // Notes
  writerNotes?: string;
}

interface EventSheetProps {
  entry: StoryBibleEntry;
  projectId: number;
}

// Event types for the dropdown
const EVENT_TYPES = [
  'Battle', 'Discovery', 'Meeting', 'Birth', 'Death', 'Collapse', 'Formation',
  'Arrival', 'Departure', 'Betrayal', 'Alliance', 'Conflict', 'Resolution',
  'Revelation', 'Transformation', 'Ceremony', 'Disaster', 'Victory', 'Defeat',
  'Negotiation', 'Treaty', 'War', 'Peace', 'Other'
];

// Event status options
const EVENT_STATUS_OPTIONS = [
  'Historical', 'Speculative', 'Canonical', 'Unverified', 'Planned', 'Draft'
];

// Character role options
const CHARACTER_ROLES = [
  'Protagonist', 'Antagonist', 'Witness', 'Victim', 'Commander', 'Leader',
  'Advisor', 'Messenger', 'Bystander', 'Instigator', 'Mediator', 'Other'
];

// Month options for standard calendar
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const EventSheet = memo(({ entry, projectId }: EventSheetProps) => {
  const { toast } = useToast();
  const updateStoryBibleEntry = useUpdateStoryBibleEntry();
  const deleteStoryBibleEntry = useDeleteStoryBibleEntry();
  
  const [title, setTitle] = useState(entry.title);
  const [isSaving, setIsSaving] = useState(false);
  const [metadataExpanded, setMetadataExpanded] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);

  // Parse event data from content
  const eventData = useMemo(() => {
    if (!entry.content) return {} as EventData;
    
    try {
      const parsed = JSON.parse(entry.content);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as EventData;
      }
    } catch {
      // If JSON parsing fails, treat as legacy description content
      return {
        narrativeContext: entry.content,
        date: { year: '', isApproximate: false },
        charactersInvolved: [],
        groupsFactions: [],
        locations: [],
        worldElements: [],
        tags: [],
        includeOnTimeline: true
      } as EventData;
    }
    
    return {} as EventData;
  }, [entry.content]);

  const [eventDataState, setEventData] = useState<EventData>({
    date: { year: '', isApproximate: false },
    charactersInvolved: [],
    groupsFactions: [],
    locations: [],
    worldElements: [],
    tags: [],
    includeOnTimeline: true,
    ...eventData
  });

  // Debounced save function
  const debouncedSave = useMemo(
    () => debounce(async (newTitle: string, newData: EventData) => {
      try {
        await updateStoryBibleEntry.mutateAsync({
          id: entry.id,
          title: newTitle,
          content: JSON.stringify(newData, null, 2),
          entryType: 'event'
        });
      } catch (error) {
        console.error('Failed to save event:', error);
        toast({
          title: "Save failed",
          description: "Could not save changes. Please try again.",
          variant: "destructive",
        });
      }
    }, 3000),
    [entry.id, updateStoryBibleEntry, toast]
  );

  // Update event data
  const updateEventData = useCallback((updates: Partial<EventData>) => {
    const newData = { ...eventDataState, ...updates };
    setEventData(newData);
    debouncedSave(title, newData);
  }, [eventDataState, title, debouncedSave]);

  // Update nested data
  const updateNestedData = useCallback((path: keyof EventData, updates: any) => {
    const currentValue = eventDataState[path] as any;
    const newData = { 
      ...eventDataState, 
      [path]: { ...(currentValue || {}), ...updates } 
    };
    setEventData(newData);
    debouncedSave(title, newData);
  }, [eventDataState, title, debouncedSave]);

  // Handle title changes
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    debouncedSave(newTitle, eventDataState);
  }, [eventDataState, debouncedSave]);

  // Manual save function
  const handleManualSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await updateStoryBibleEntry.mutateAsync({
        id: entry.id,
        title,
        content: JSON.stringify(eventDataState, null, 2),
        entryType: 'event'
      });
      
      toast({
        title: "Event saved",
        description: "All changes have been saved successfully.",
      });
    } catch (error) {
      console.error('Failed to save event:', error);
      toast({
        title: "Save failed",
        description: "Could not save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [entry.id, title, eventDataState, updateStoryBibleEntry, toast]);

  // Delete function
  const handleDelete = useCallback(async () => {
    try {
      await deleteStoryBibleEntry.mutateAsync({ id: entry.id, projectId });
      toast({
        title: "Event deleted",
        description: "The event has been removed from your story bible.",
      });
    } catch (error) {
      console.error('Failed to delete event:', error);
      toast({
        title: "Delete failed",
        description: "Could not delete the event. Please try again.",
        variant: "destructive",
      });
    }
  }, [entry.id, projectId, deleteStoryBibleEntry, toast]);

  // Array management functions
  const addToArray = useCallback((key: keyof EventData, newItem: any) => {
    const currentArray = (eventDataState[key] as any[]) || [];
    updateEventData({ [key]: [...currentArray, newItem] });
  }, [eventDataState, updateEventData]);

  const removeFromArray = useCallback((key: keyof EventData, index: number) => {
    const currentArray = (eventDataState[key] as any[]) || [];
    const newArray = [...currentArray];
    newArray.splice(index, 1);
    updateEventData({ [key]: newArray });
  }, [eventDataState, updateEventData]);

  const updateArrayItem = useCallback((key: keyof EventData, index: number, updates: any) => {
    const currentArray = (eventDataState[key] as any[]) || [];
    const newArray = [...currentArray];
    newArray[index] = { ...newArray[index], ...updates };
    updateEventData({ [key]: newArray });
  }, [eventDataState, updateEventData]);

  // Tag management
  const addTag = useCallback((tag: string) => {
    if (tag && !eventDataState.tags?.includes(tag)) {
      updateEventData({ tags: [...(eventDataState.tags || []), tag] });
    }
  }, [eventDataState.tags, updateEventData]);

  const removeTag = useCallback((tagToRemove: string) => {
    updateEventData({ tags: eventDataState.tags?.filter(tag => tag !== tagToRemove) || [] });
  }, [eventDataState.tags, updateEventData]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-none border-b bg-card p-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex-1 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <Input
                value={title}
                onChange={handleTitleChange}
                className="text-xl font-bold border-none p-0 h-auto bg-transparent focus-visible:ring-0"
                placeholder="Event title..."
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Select
              value={eventDataState.eventType || ''}
              onValueChange={(value) => updateEventData({ eventType: value })}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((type) => (
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
                  <AlertDialogTitle>Delete Event</AlertDialogTitle>
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

        {/* Era and Short Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="era">Era</Label>
            <Input
              id="era"
              value={eventDataState.era || ''}
              onChange={(e) => updateEventData({ era: e.target.value })}
              placeholder="e.g., Colonial Era, Dark Cycle..."
            />
          </div>
          <div>
            <Label htmlFor="shortSummary">Short Summary</Label>
            <Input
              id="shortSummary"
              value={eventDataState.shortSummary || ''}
              onChange={(e) => updateEventData({ shortSummary: e.target.value })}
              placeholder="One-line description of the event..."
            />
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Date Information Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Date Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="year">Year *</Label>
                <Input
                  id="year"
                  value={eventDataState.date?.year || ''}
                  onChange={(e) => updateNestedData('date', { year: e.target.value })}
                  placeholder="Required for timeline"
                />
              </div>
              <div>
                <Label htmlFor="month">Month</Label>
                <Select
                  value={eventDataState.date?.month || ''}
                  onValueChange={(value) => updateNestedData('date', { month: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month} value={month}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="day">Day</Label>
                <Input
                  id="day"
                  type="number"
                  min="1"
                  max="31"
                  value={eventDataState.date?.day || ''}
                  onChange={(e) => updateNestedData('date', { day: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="fictionalDate">Fictional Calendar</Label>
              <Input
                id="fictionalDate"
                value={eventDataState.date?.fictionalDate || ''}
                onChange={(e) => updateNestedData('date', { fictionalDate: e.target.value })}
                placeholder="e.g., Cycle 12, Sol 82..."
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isApproximate"
                checked={eventDataState.date?.isApproximate || false}
                onCheckedChange={(checked) => updateNestedData('date', { isApproximate: checked === true })}
              />
              <Label htmlFor="isApproximate">Date is approximate/flexible</Label>
            </div>
          </CardContent>
        </Card>

        {/* Narrative Context */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Narrative Context</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={eventDataState.narrativeContext || ''}
              onChange={(e) => updateEventData({ narrativeContext: e.target.value })}
              placeholder="Describe what happened, why it occurred, and the outcomes..."
              className="min-h-32"
            />
          </CardContent>
        </Card>

        {/* Characters Involved */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Characters Involved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(eventDataState.charactersInvolved || []).map((character, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={character.name}
                      onChange={(e) => updateArrayItem('charactersInvolved', index, { name: e.target.value })}
                      placeholder="Character name"
                      className="font-medium"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={character.role || ''}
                        onValueChange={(value) => updateArrayItem('charactersInvolved', index, { role: value })}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          {CHARACTER_ROLES.map((role) => (
                            <SelectItem key={role} value={role}>{role}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={character.notes || ''}
                        onChange={(e) => updateArrayItem('charactersInvolved', index, { notes: e.target.value })}
                        placeholder="Notes"
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromArray('charactersInvolved', index)}
                    className="hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => addToArray('charactersInvolved', { name: '', role: '', notes: '' })}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Character
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Groups / Factions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Flag className="h-5 w-5" />
              Groups / Factions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(eventDataState.groupsFactions || []).map((group, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={group.name}
                      onChange={(e) => updateArrayItem('groupsFactions', index, { name: e.target.value })}
                      placeholder="Group or faction name"
                      className="font-medium"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={group.involvement || ''}
                        onChange={(e) => updateArrayItem('groupsFactions', index, { involvement: e.target.value })}
                        placeholder="Involvement (e.g., attacked, defended...)"
                        className="text-sm"
                      />
                      <Input
                        value={group.notes || ''}
                        onChange={(e) => updateArrayItem('groupsFactions', index, { notes: e.target.value })}
                        placeholder="Notes"
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromArray('groupsFactions', index)}
                    className="hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => addToArray('groupsFactions', { name: '', involvement: '', notes: '' })}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Group/Faction
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
              {(eventDataState.locations || []).map((location, index) => (
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
                        value={location.significance || ''}
                        onChange={(e) => updateArrayItem('locations', index, { significance: e.target.value })}
                        placeholder="Significance (e.g., primary, secondary...)"
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
                onClick={() => addToArray('locations', { name: '', significance: '', notes: '' })}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Location
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
              {(eventDataState.worldElements || []).map((element, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={element.name}
                      onChange={(e) => updateArrayItem('worldElements', index, { name: e.target.value })}
                      placeholder="Element name"
                      className="font-medium"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={element.usage || ''}
                        onChange={(e) => updateArrayItem('worldElements', index, { usage: e.target.value })}
                        placeholder="Usage (e.g., weapon used, tech introduced...)"
                        className="text-sm"
                      />
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
                onClick={() => addToArray('worldElements', { name: '', usage: '', notes: '' })}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add World Element
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Optional Metadata - Collapsible */}
        <Collapsible open={metadataExpanded} onOpenChange={setMetadataExpanded}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Metadata
                  </span>
                  {metadataExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="eventStatus">Event Status</Label>
                    <Select
                      value={eventDataState.eventStatus || ''}
                      onValueChange={(value) => updateEventData({ eventStatus: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {EVENT_STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <Checkbox
                      id="includeOnTimeline"
                      checked={eventDataState.includeOnTimeline !== false}
                      onCheckedChange={(checked) => updateEventData({ includeOnTimeline: checked === true })}
                    />
                    <Label htmlFor="includeOnTimeline">Include on Timeline</Label>
                  </div>
                </div>
                
                {/* Tags */}
                <div>
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(eventDataState.tags || []).map((tag, index) => (
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
                          const target = e.target as HTMLInputElement;
                          addTag(target.value);
                          target.value = '';
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        addTag(input.value);
                        input.value = '';
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

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
                  value={eventDataState.writerNotes || ''}
                  onChange={(e) => updateEventData({ writerNotes: e.target.value })}
                  placeholder="Behind-the-scenes notes, development ideas, timeline considerations..."
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

EventSheet.displayName = 'EventSheet';

export { EventSheet };
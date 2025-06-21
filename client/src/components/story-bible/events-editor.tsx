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
import { Save, Trash2, Plus, X, ChevronDown, ChevronRight, Calendar, Users, MapPin, Zap, Flag, Tag, ArrowLeft, Clock, Users2 } from 'lucide-react';
import { useUpdateStoryBibleEntry, useDeleteStoryBibleEntry, useStoryBibleEntries } from '@/hooks/use-story-bible';
import { useToast } from '@/hooks/use-toast';
import { StoryBibleEntry } from '@shared/schema';
import { debounce } from 'lodash';

// Event data structure based on specification
interface EventData {
  // Header
  eventType?: string;
  status?: string;
  
  // Date & Era (expanded initially)
  date?: {
    year: string;
    month?: string;
    day?: string;
    fictionalDate?: string;
    isApproximate?: boolean;
  };
  era?: string;
  
  // Core Summary (expanded initially)
  shortSummary?: string;
  locations?: Array<{
    id: number;
    name: string;
    context?: string;
  }>;
  
  // Narrative Context (collapsible)
  narrativeContext?: string;
  
  // Participants (collapsible)
  charactersInvolved?: Array<{
    id: number;
    name: string;
    role?: string; // Leader, Victim, Witness, etc.
  }>;
  groupsRacesInvolved?: Array<{
    id: number;
    name: string;
    role?: string;
  }>;
  
  // Consequences & Follow-ups (collapsible)
  outcomeType?: string;
  outcomeTags?: string[];
  linkedEvents?: Array<{
    id: number;
    name: string;
    relationship?: string;
  }>;
  
  // Related World Elements (collapsible)
  worldElements?: Array<{
    id: number;
    name: string;
    context?: string;
  }>;
  
  // Notes / GM/Writer Annotations (collapsed by default)
  writerNotes?: string;
  hiddenDetails?: string;
  alternativeVersions?: string;
  researchReminders?: string;
  
  // Metadata
  includeOnTimeline?: boolean;
  tags?: string[];
}

interface EventsEditorProps {
  entry: StoryBibleEntry;
  projectId: number;
  onClose?: () => void;
}

// Constants
const EVENT_TYPES = [
  'Battle', 'Discovery', 'Treaty', 'Meeting', 'Birth', 'Death', 'Collapse', 'Formation',
  'Arrival', 'Departure', 'Betrayal', 'Alliance', 'Conflict', 'Resolution',
  'Revelation', 'Transformation', 'Ceremony', 'Disaster', 'Victory', 'Defeat',
  'Negotiation', 'War', 'Peace', 'Rebellion', 'Other'
];

const EVENT_STATUS_OPTIONS = [
  'Canonical', 'Rumor', 'Historical', 'Speculative', 'Unverified', 'Planned', 'Draft'
];

const CHARACTER_ROLES = [
  'Leader', 'Victim', 'Witness', 'Participant', 'Instigator', 'Bystander', 'Hero', 'Villain'
];

const OUTCOME_TYPES = [
  'Victory', 'Defeat', 'Alliance Formed', 'Cataclysm', 'Treaty Signed', 'War Declared',
  'Discovery Made', 'Secret Revealed', 'Betrayal', 'Sacrifice', 'Transformation', 'Other'
];

const EventsEditor = memo(({ entry, projectId, onClose }: EventsEditorProps) => {
  const { toast } = useToast();
  const updateStoryBibleEntry = useUpdateStoryBibleEntry();
  const deleteStoryBibleEntry = useDeleteStoryBibleEntry();
  const { data: allEntries } = useStoryBibleEntries(projectId);

  const [title, setTitle] = useState(entry.title);
  const [isSaving, setIsSaving] = useState(false);

  // Collapsible states - Date & Era and Core Summary expanded initially
  const [dateEraExpanded, setDateEraExpanded] = useState(true);
  const [coreSummaryExpanded, setCoreSummaryExpanded] = useState(true);
  const [narrativeExpanded, setNarrativeExpanded] = useState(false);
  const [participantsExpanded, setParticipantsExpanded] = useState(false);
  const [consequencesExpanded, setConsequencesExpanded] = useState(false);
  const [worldElementsExpanded, setWorldElementsExpanded] = useState(false);
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
      return {
        narrativeContext: entry.content,
        date: { year: '', isApproximate: false },
        charactersInvolved: [],
        groupsRacesInvolved: [],
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
    groupsRacesInvolved: [],
    locations: [],
    worldElements: [],
    tags: [],
    includeOnTimeline: true,
    ...eventData
  });

  // Available entries for linking
  const characterEntries = (allEntries || []).filter(e => e.entryType === 'characters');
  const groupEntries = (allEntries || []).filter(e => e.entryType === 'groups_races');
  const locationEntries = (allEntries || []).filter(e => e.entryType === 'locations');
  const worldElementEntries = (allEntries || []).filter(e => e.entryType === 'world_elements');
  const eventEntries = (allEntries || []).filter(e => e.entryType === 'events' && e.id !== entry.id);

  const updateEventData = useCallback((updates: Partial<EventData>) => {
    setEventData(prev => ({ ...prev, ...updates }));
  }, []);

  const updateNestedData = useCallback((key: keyof EventData, nestedUpdates: any) => {
    setEventData(prev => ({
      ...prev,
      [key]: { ...prev[key], ...nestedUpdates }
    }));
  }, []);

  // Debounced save function
  const debouncedSave = useMemo(
    () => debounce(async () => {
      setIsSaving(true);
      try {
        await updateStoryBibleEntry.mutateAsync({
          id: entry.id,
          title,
          content: JSON.stringify(eventDataState),
        });
      } catch (error) {
        console.error('Failed to save:', error);
        toast({
          title: "Error",
          description: "Failed to save changes",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    }, 1000),
    [entry.id, title, eventDataState, updateStoryBibleEntry, toast]
  );

  // Auto-save on changes
  useEffect(() => {
    debouncedSave();
    return () => debouncedSave.cancel();
  }, [debouncedSave]);

  const handleDelete = async () => {
    try {
      await deleteStoryBibleEntry.mutateAsync(entry.id);
      toast({
        title: "Success",
        description: "Event deleted successfully",
      });
      onClose?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
    }
  };

  // Helper functions for array management
  const addTag = (tag: string) => {
    if (tag.trim() && !(eventDataState.tags || []).includes(tag.trim())) {
      updateEventData({ tags: [...(eventDataState.tags || []), tag.trim()] });
    }
  };

  const removeTag = (tagToRemove: string) => {
    updateEventData({ tags: (eventDataState.tags || []).filter(tag => tag !== tagToRemove) });
  };

  const addOutcomeTag = (tag: string) => {
    if (tag.trim() && !(eventDataState.outcomeTags || []).includes(tag.trim())) {
      updateEventData({ outcomeTags: [...(eventDataState.outcomeTags || []), tag.trim()] });
    }
  };

  const removeOutcomeTag = (tagToRemove: string) => {
    updateEventData({ outcomeTags: (eventDataState.outcomeTags || []).filter(tag => tag !== tagToRemove) });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex items-center gap-3">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-2xl font-bold border-none p-0 h-auto bg-transparent"
                placeholder="Event Name (e.g., Battle of Black Crater)"
              />
              <div className="flex gap-2">
                {eventDataState.eventType && (
                  <Badge variant="secondary">{eventDataState.eventType}</Badge>
                )}
                {eventDataState.status && (
                  <Badge variant={eventDataState.status === 'Canonical' ? 'default' : 'outline'}>
                    {eventDataState.status}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSaving && <span className="text-sm text-muted-foreground">Saving...</span>}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Event</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this event? This action cannot be undone.
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

      <div className="flex gap-6 p-6">
        {/* Main Column */}
        <div className="flex-1 space-y-6">
          {/* Date & Era - Expanded initially */}
          <Collapsible open={dateEraExpanded} onOpenChange={setDateEraExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Date & Era
                    </span>
                    {dateEraExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="year">Year</Label>
                      <Input
                        id="year"
                        value={eventDataState.date?.year || ''}
                        onChange={(e) => updateNestedData('date', { year: e.target.value })}
                        placeholder="Required if known"
                      />
                    </div>
                    <div>
                      <Label htmlFor="month">Month</Label>
                      <Input
                        id="month"
                        value={eventDataState.date?.month || ''}
                        onChange={(e) => updateNestedData('date', { month: e.target.value })}
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <Label htmlFor="day">Day</Label>
                      <Input
                        id="day"
                        value={eventDataState.date?.day || ''}
                        onChange={(e) => updateNestedData('date', { day: e.target.value })}
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fictionalDate">Fictional Calendar</Label>
                      <Input
                        id="fictionalDate"
                        value={eventDataState.date?.fictionalDate || ''}
                        onChange={(e) => updateNestedData('date', { fictionalDate: e.target.value })}
                        placeholder="e.g., Cycle 12, Sol 82..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="era">Era</Label>
                      <Input
                        id="era"
                        value={eventDataState.era || ''}
                        onChange={(e) => updateEventData({ era: e.target.value })}
                        placeholder="e.g., Colonial Era, Dark Cycle..."
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isApproximate"
                      checked={eventDataState.date?.isApproximate || false}
                      onCheckedChange={(checked) => updateNestedData('date', { isApproximate: checked === true })}
                    />
                    <Label htmlFor="isApproximate">Date is approximate</Label>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Core Summary - Expanded initially */}
          <Collapsible open={coreSummaryExpanded} onOpenChange={setCoreSummaryExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Flag className="h-5 w-5" />
                      Core Summary
                    </span>
                    {coreSummaryExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="shortSummary">Short Summary (one-liner)</Label>
                    <Input
                      id="shortSummary"
                      value={eventDataState.shortSummary || ''}
                      onChange={(e) => updateEventData({ shortSummary: e.target.value })}
                      placeholder="Brief description of what happened..."
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="eventType">Type</Label>
                    <Select
                      value={eventDataState.eventType || ''}
                      onValueChange={(value) => updateEventData({ eventType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                      <SelectContent>
                        {EVENT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Location(s)</Label>
                    <div className="space-y-2">
                      {(eventDataState.locations || []).map((location, index) => (
                        <div key={index} className="flex gap-2 items-center p-2 bg-muted rounded">
                          <Select
                            value={location.id?.toString() || ''}
                            onValueChange={(value) => {
                              const selectedLocation = locationEntries.find(e => e.id.toString() === value);
                              if (selectedLocation) {
                                const updatedLocations = [...(eventDataState.locations || [])];
                                updatedLocations[index] = { 
                                  id: selectedLocation.id, 
                                  name: selectedLocation.title,
                                  context: location.context 
                                };
                                updateEventData({ locations: updatedLocations });
                              }
                            }}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                            <SelectContent>
                              {locationEntries.map((loc) => (
                                <SelectItem key={loc.id} value={loc.id.toString()}>{loc.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const updatedLocations = (eventDataState.locations || []).filter((_, i) => i !== index);
                              updateEventData({ locations: updatedLocations });
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          updateEventData({ 
                            locations: [...(eventDataState.locations || []), { id: 0, name: '', context: '' }]
                          });
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Location
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Narrative Context - Collapsible */}
          <Collapsible open={narrativeExpanded} onOpenChange={setNarrativeExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-lg flex items-center justify-between">
                    Narrative Context
                    {narrativeExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <Textarea
                    value={eventDataState.narrativeContext || ''}
                    onChange={(e) => updateEventData({ narrativeContext: e.target.value })}
                    placeholder="Detailed description: causes, participants, outcomes..."
                    className="min-h-32"
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Notes / GM/Writer Annotations - Collapsed by default */}
          <Collapsible open={notesExpanded} onOpenChange={setNotesExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Tag className="h-5 w-5" />
                      Notes / GM Annotations
                    </span>
                    {notesExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="writerNotes">Writer's Notes</Label>
                    <Textarea
                      id="writerNotes"
                      value={eventDataState.writerNotes || ''}
                      onChange={(e) => updateEventData({ writerNotes: e.target.value })}
                      placeholder="Behind-the-scenes notes, development ideas..."
                      className="min-h-24"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="hiddenDetails">Hidden Details</Label>
                    <Textarea
                      id="hiddenDetails"
                      value={eventDataState.hiddenDetails || ''}
                      onChange={(e) => updateEventData({ hiddenDetails: e.target.value })}
                      placeholder="Secret information not known to characters..."
                      className="min-h-24"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="alternativeVersions">Alternative Versions</Label>
                    <Textarea
                      id="alternativeVersions"
                      value={eventDataState.alternativeVersions || ''}
                      onChange={(e) => updateEventData({ alternativeVersions: e.target.value })}
                      placeholder="Different ways this event could have played out..."
                      className="min-h-24"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="researchReminders">Research Reminders</Label>
                    <Textarea
                      id="researchReminders"
                      value={eventDataState.researchReminders || ''}
                      onChange={(e) => updateEventData({ researchReminders: e.target.value })}
                      placeholder="Things to research or verify later..."
                      className="min-h-24"
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        {/* Sidebar */}
        <div className="w-80 space-y-4">
          {/* Classification */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Classification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={eventDataState.status || ''}
                  onValueChange={(value) => updateEventData({ status: value })}
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
            </CardContent>
          </Card>

          {/* Date Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Date Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium">
                {eventDataState.date?.year ? (
                  <>
                    {eventDataState.date.isApproximate && '~'}
                    {eventDataState.date.month && eventDataState.date.day ? 
                      `${eventDataState.date.month}/${eventDataState.date.day}/` : ''
                    }{eventDataState.date.year}
                    {eventDataState.era && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {eventDataState.era}
                      </div>
                    )}
                    {eventDataState.date.fictionalDate && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {eventDataState.date.fictionalDate}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground">Date not set</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tags</CardTitle>
            </CardHeader>
            <CardContent>
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
                      addTag(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Timeline Toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeOnTimeline"
                  checked={eventDataState.includeOnTimeline !== false}
                  onCheckedChange={(checked) => updateEventData({ includeOnTimeline: checked === true })}
                />
                <Label htmlFor="includeOnTimeline">Include on Timeline</Label>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
});

EventsEditor.displayName = 'EventsEditor';

export { EventsEditor };
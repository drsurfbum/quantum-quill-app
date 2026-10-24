import { GuidedFieldGroup, FieldHelp } from "./guidance";
import { TagInput } from "./tag-input";
import { RelationshipSection } from "./relationships";
import { fieldOptions } from "@shared/bible-catalog";
import { readBibleFields } from "@shared/story-bible";
import { useEditorDraft } from "@/hooks/use-editor-draft";
import { useAutosave, withPendingEdits } from "@/hooks/use-autosave";
import { SaveStatus } from "@/components/save-status";
import { FileUpload } from "@/components/ui/file-upload";
import { useState, useCallback, useMemo, memo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Save, Trash2, Plus, X, ImageIcon, Calendar, Users, MapPin, Zap, Flag, Tag, ArrowLeft, Clock, Users2 } from 'lucide-react';
import { useDeleteStoryBibleEntry, useStoryBibleEntries } from '@/hooks/use-story-bible';
import { useToast } from '@/hooks/use-toast';
import { StoryBibleEntry } from '@shared/schema';

// Event data structure based on specification
interface EventData {
  imageUrl?: string;
  imageDescription?: string;
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
const EVENT_TYPES = fieldOptions("events", "eventType");

const EVENT_STATUS_OPTIONS = fieldOptions("events", "status");

const CHARACTER_ROLES = fieldOptions("events", "participantRole");

const OUTCOME_TYPES = fieldOptions("events", "outcomeType");

const EventsEditor = memo(({ entry, projectId, onClose }: EventsEditorProps) => {
  entry = withPendingEdits(`/api/story-bible/${entry.id}`, entry);
  const autosave = useAutosave(`/api/story-bible/${entry.id}`, `/api/projects/${projectId}/story-bible`);

  const { toast } = useToast();
  const deleteStoryBibleEntry = useDeleteStoryBibleEntry();
  const { data: allEntries } = useStoryBibleEntries(projectId);

  const [title, setTitle] = useState(entry.title);



  // Summary opens first; chronology can wait.
  const [dateEraExpanded, setDateEraExpanded] = useState(false);
  const [coreSummaryExpanded, setCoreSummaryExpanded] = useState(true);
  const [narrativeExpanded, setNarrativeExpanded] = useState(false);
  const [participantsExpanded, setParticipantsExpanded] = useState(false);
  const [consequencesExpanded, setConsequencesExpanded] = useState(false);
  const [worldElementsExpanded, setWorldElementsExpanded] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);

  // Parse event data from content
  const initialEventData = useMemo(() => ({ date: { year: '', isApproximate: false }, charactersInvolved: [], groupsRacesInvolved: [], locations: [], worldElements: [], tags: entry.tags || [], includeOnTimeline: true, ...readBibleFields(entry) }) as EventData, [entry.content]);

  const [eventDataState, setEventData] = useEditorDraft<EventData>(initialEventData);

  // Available entries for linking
  const characterEntries = (allEntries || []).filter(e => e.entryType === 'characters');
  const groupEntries = (allEntries || []).filter(e => e.entryType === 'groups_races');
  const locationEntries = (allEntries || []).filter(e => e.entryType === 'locations');
  const worldElementEntries = (allEntries || []).filter(e => e.entryType === 'world_elements');
  const eventEntries = (allEntries || []).filter(e => e.entryType === 'events' && e.id !== entry.id);

  const updateEventData = useCallback((updates: Partial<EventData>) => {
    const next = setEventData(previous => ({ ...previous, ...updates }));
    autosave.save({ content: JSON.stringify(next),
      ...(Object.hasOwn(updates, 'tags') ? { tags: next.tags || [] } : {}),
    });
  }, [setEventData, autosave.save]);

  const updateNestedData = useCallback((key: keyof EventData, nestedUpdates: Record<string, unknown>) => {
    const next = setEventData(previous => ({
      ...previous,
      [key]: { ...(typeof previous[key] === "object" && previous[key] !== null ? previous[key] : {}), ...nestedUpdates }
    }));
    autosave.save({ content: JSON.stringify(next) });
  }, [setEventData, autosave.save]);

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    autosave.save({ title: newTitle });
  }, [autosave.save]);

  // Reset state when entry changes
  useEffect(() => {
    setTitle(entry.title);
    setEventData(initialEventData);

  }, [entry.id]);

  const handleDelete = async () => {
    if (!await autosave.flush()) return;
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
        description: error instanceof Error ? error.message : "Failed to delete entry",
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
                <Label htmlFor={`events-title-${entry.id}`}>Event title</Label>
                <Input
                  id={`events-title-${entry.id}`}
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="text-2xl font-bold h-12"
                  placeholder="Event Name (e.g., Battle of Black Crater)"
                />
              </div>
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
            <SaveStatus status={autosave.status} retry={autosave.flush} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button aria-label="Delete entry" variant="outline" size="sm">
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

      <div data-bible-form-body className="flex gap-6 p-6">
        {/* Main Column */}
        <div className="flex-1 space-y-6">
          {/* Start with what happened. */}
          <GuidedFieldGroup type="events" group="coreSummary" open={coreSummaryExpanded} onOpenChange={setCoreSummaryExpanded}>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="shortSummary">Short Summary (one-liner)</Label>
                    <FieldHelp type="events" field="shortSummary"/>
                    <Input
                      id="shortSummary" aria-describedby="events-shortSummary-help"
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

                  <RelationshipSection entry={entry} title="Event locations" kinds={["occurs_at"]} />
                </CardContent>
              </GuidedFieldGroup>

          <GuidedFieldGroup type="events" group="dateEra" open={dateEraExpanded} onOpenChange={setDateEraExpanded}>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="year">Year</Label>
                      <Input
                        id="year"
                        value={eventDataState.date?.year || ''}
                        onChange={(e) => updateNestedData('date', { year: e.target.value })}
                        placeholder="Optional year or period"
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
                    <FieldHelp type="events" field="fictionalDate"/>
                      <Input
                        id="fictionalDate" aria-describedby="events-fictionalDate-help"
                        value={eventDataState.date?.fictionalDate || ''}
                        onChange={(e) => updateNestedData('date', { fictionalDate: e.target.value })}
                        placeholder="e.g., Cycle 12, Sol 82..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="era">Era</Label>
                    <FieldHelp type="events" field="era"/>
                      <Input
                        id="era" aria-describedby="events-era-help"
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
              </GuidedFieldGroup>

          {/* Optional chronology and further development. */}


          <RelationshipSection entry={entry} title="Participants" kinds={["participant"]} />
          <RelationshipSection entry={entry} title="Consequences & follow-ups" kinds={["consequence"]} />
          <Card><CardHeader><CardTitle className="text-lg">Outcome</CardTitle></CardHeader><CardContent className="space-y-3">
            <label className="text-sm">Outcome type<Input value={eventDataState.outcomeType || ""} onChange={e => updateEventData({ outcomeType: e.target.value })} placeholder="Victory, discovery, turning point…" /></label>
            <label className="text-sm">Outcome tags<TagInput placeholder="Add outcome tag..." tags={eventDataState.outcomeTags || []} onChange={outcomeTags => updateEventData({ outcomeTags })} /></label>
          </CardContent></Card>
          <RelationshipSection entry={entry} title="References & other connections" kinds={["reference","related","associated","history"]} />
          {/* Narrative Context - Collapsible */}
          <GuidedFieldGroup type="events" group="narrative" open={narrativeExpanded} onOpenChange={setNarrativeExpanded}>
                <CardContent>
                  <Textarea aria-label="Causes & story context"
                    value={eventDataState.narrativeContext || ''}
                    onChange={(e) => updateEventData({ narrativeContext: e.target.value })}
                    placeholder="Detailed description: causes, participants, outcomes..."
                    className="min-h-32"
                  />
                </CardContent>
              </GuidedFieldGroup>

          {/* Notes / GM/Writer Annotations - Collapsed by default */}
          <GuidedFieldGroup type="events" group="notes" open={notesExpanded} onOpenChange={setNotesExpanded}>
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
                    <FieldHelp type="events" field="hiddenDetails"/>
                    <Textarea
                      id="hiddenDetails" aria-describedby="events-hiddenDetails-help"
                      value={eventDataState.hiddenDetails || ''}
                      onChange={(e) => updateEventData({ hiddenDetails: e.target.value })}
                      placeholder="Secret information not known to characters..."
                      className="min-h-24"
                    />
                  </div>

                  <div>
                    <Label htmlFor="alternativeVersions">Alternative Versions</Label>
                    <FieldHelp type="events" field="alternativeVersions"/>
                    <Textarea
                      id="alternativeVersions" aria-describedby="events-alternativeVersions-help"
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
              </GuidedFieldGroup>
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
                {(eventDataState.date?.year || eventDataState.date?.fictionalDate) ? (
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

          {/* Event Image */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Event Image
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload projectId={Number(projectId)}
                imageUrl={eventDataState.imageUrl}
                imageDescription={eventDataState.imageDescription}
                onImageChange={(url, description) => {
                  updateEventData({ imageUrl: url, imageDescription: description || "" });
                }}
                onRemoveImage={() => {
                  updateEventData({ imageUrl: "", imageDescription: "" });
                }}
                title="Event Image"
                placeholder="Add event image"
              />
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

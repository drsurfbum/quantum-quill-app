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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Save, Trash2, Plus, X, ChevronDown, ChevronRight, BookOpen, Link2, Users, MapPin, Calendar, Zap, Tag, ArrowLeft, Clock, Archive, FileText, ExternalLink, CheckCircle, Eye, AlertCircle, ImageIcon, Upload } from 'lucide-react';
import { useDeleteStoryBibleEntry, useStoryBibleEntries } from '@/hooks/use-story-bible';
import { useToast } from '@/hooks/use-toast';
import { StoryBibleEntry } from '@shared/schema';

// Research data structure based on specification
interface ResearchData {
  // Image
  imageUrl?: string;
  imageDescription?: string;
  
  // Core Info (expanded initially)
  sourceType: string; // Article, Book, Video, Map, Website, Interview
  urlOrReference: string;
  shortSummary: string;
  
  // Linked Applications (collapsible)
  linkedElements: Array<{
    id: number;
    name: string;
    type: 'characters' | 'locations' | 'events' | 'world_elements' | 'groups_races' | 'details';
    applicationNotes?: string;
  }>;
  suggestedLinks?: Array<{
    id: number;
    name: string;
    type: string;
    reason: string;
  }>;
  
  // Detailed Notes (collapsible)
  detailedNotes: string;
  keyPoints?: string[];
  quotes?: string[];
  
  // Utility & Actions (collapsible)
  status: string; // Reviewed, To Review, Archived, In Progress
  nextSteps?: string;
  incorporationPlans?: string;
  
  // Attachments (collapsed by default)
  attachments?: Array<{
    name: string;
    url?: string;
    description?: string;
  }>;
  
  // Tags & Topics
  tags: string[];
  topics: string[];
  
  // Notes for Team/You (collapsed by default)
  teamNotes?: string;
  reminders?: string[];
  
  // Classification
  isArchived?: boolean;
}

interface ResearchEditorProps {
  entry: StoryBibleEntry;
  projectId: number;
  onClose?: () => void;
}

// Constants
const SOURCE_TYPES = fieldOptions("research", "sourceType");

const RESEARCH_STATUS = fieldOptions("research", "status");

const TOPIC_CATEGORIES = fieldOptions("research", "topics");

const ResearchEditor = memo(({ entry, projectId, onClose }: ResearchEditorProps) => {
  entry = withPendingEdits(`/api/story-bible/${entry.id}`, entry);
  const autosave = useAutosave(`/api/story-bible/${entry.id}`, `/api/projects/${projectId}/story-bible`);

  const { toast } = useToast();
  const deleteStoryBibleEntry = useDeleteStoryBibleEntry();
  const { data: allEntries } = useStoryBibleEntries(projectId);

  const [title, setTitle] = useState(entry.title);



  // Collapsible states - Core Info and Tags & Topics expanded initially
  const [coreInfoExpanded, setCoreInfoExpanded] = useState(true);
  const [linkedApplicationsExpanded, setLinkedApplicationsExpanded] = useState(false);
  const [detailedNotesExpanded, setDetailedNotesExpanded] = useState(false);
  const [utilityActionsExpanded, setUtilityActionsExpanded] = useState(false);
  const [attachmentsExpanded, setAttachmentsExpanded] = useState(false);
  const [tagsTopicsExpanded, setTagsTopicsExpanded] = useState(true);
  const [teamNotesExpanded, setTeamNotesExpanded] = useState(false);

  // Parse research data from content
  const initialResearchData = useMemo(() => {
    const defaultData: ResearchData = {
      sourceType: 'Article',
      urlOrReference: '',
      shortSummary: '',
      linkedElements: [],
      detailedNotes: '',
      status: 'To Review',
      tags: entry.tags || [],
      topics: [],
      isArchived: entry.isArchived || false
    };

    return { ...defaultData, ...readBibleFields(entry) } as ResearchData;
  }, [entry.content]);

  const [researchDataState, setResearchData] = useEditorDraft<ResearchData>(initialResearchData);

  // Available entries for linking
  const characterEntries = (allEntries || []).filter(e => e.entryType === 'characters');
  const groupEntries = (allEntries || []).filter(e => e.entryType === 'groups_races');
  const locationEntries = (allEntries || []).filter(e => e.entryType === 'locations');
  const eventEntries = (allEntries || []).filter(e => e.entryType === 'events');
  const worldElementEntries = (allEntries || []).filter(e => e.entryType === 'world_elements');
  const detailEntries = (allEntries || []).filter(e => e.entryType === 'details');

  const updateResearchData = useCallback((updates: Partial<ResearchData>) => {
    const next = setResearchData(previous => ({ ...previous, ...updates }));
    autosave.save({ content: JSON.stringify(next),
      ...(Object.hasOwn(updates, 'tags') ? { tags: next.tags || [] } : {}),
      ...(Object.hasOwn(updates, 'isArchived') ? { isArchived: next.isArchived || false } : {}),
    });
  }, [setResearchData, autosave.save]);

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    autosave.save({ title: newTitle });
  }, [autosave.save]);

  // Reset state when entry changes
  useEffect(() => {
    setTitle(entry.title);
    setResearchData(initialResearchData);

  }, [entry.id]);

  const handleDelete = async () => {
    if (!await autosave.flush()) return;
    try {
      await deleteStoryBibleEntry.mutateAsync(entry.id);
      toast({
        title: "Success",
        description: "Research entry deleted successfully",
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
    if (tag.trim() && !(researchDataState.tags || []).includes(tag.trim())) {
      updateResearchData({ tags: [...(researchDataState.tags || []), tag.trim()] });
    }
  };

  const removeTag = (tagToRemove: string) => {
    updateResearchData({ tags: (researchDataState.tags || []).filter(tag => tag !== tagToRemove) });
  };

  const addTopic = (topic: string) => {
    if (topic.trim() && !(researchDataState.topics || []).includes(topic.trim())) {
      updateResearchData({ topics: [...(researchDataState.topics || []), topic.trim()] });
    }
  };

  const removeTopic = (topicToRemove: string) => {
    updateResearchData({ topics: (researchDataState.topics || []).filter(topic => topic !== topicToRemove) });
  };





  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Reviewed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'Applied': return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'In Progress': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'To Review': return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'Archived': return <Archive className="h-4 w-4 text-gray-600" />;
      default: return <Eye className="h-4 w-4" />;
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
                <Label htmlFor={`research-title-${entry.id}`}>Research title</Label>
                <Input
                  id={`research-title-${entry.id}`}
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="text-2xl font-bold h-12"
                  placeholder="Research Title (e.g., Asteroid Mining Techniques)"
                />
              </div>
              <div className="flex gap-2">
                {researchDataState.sourceType && (
                  <Badge variant="secondary">{researchDataState.sourceType}</Badge>
                )}
                {researchDataState.status && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    {getStatusIcon(researchDataState.status)}
                    {researchDataState.status}
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
                  <AlertDialogTitle>Delete Research Entry</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this research entry? This action cannot be undone.
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
          {/* Core Info - Expanded initially */}
          <Collapsible open={coreInfoExpanded} onOpenChange={setCoreInfoExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Core Info
                    </span>
                    {coreInfoExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sourceType">Source Type</Label>
                      <Select
                        value={researchDataState.sourceType}
                        onValueChange={(value) => updateResearchData({ sourceType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select source type" />
                        </SelectTrigger>
                        <SelectContent>
                          {SOURCE_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={researchDataState.status}
                        onValueChange={(value) => updateResearchData({ status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {RESEARCH_STATUS.map((status) => (
                            <SelectItem key={status} value={status}>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(status)}
                                {status}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="urlOrReference">URL or Reference Details</Label>
                    <div className="flex gap-2">
                      <Input
                        id="urlOrReference"
                        value={researchDataState.urlOrReference}
                        onChange={(e) => updateResearchData({ urlOrReference: e.target.value })}
                        placeholder="https://example.com or book reference..."
                      />
                      {researchDataState.urlOrReference.startsWith('http') && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={researchDataState.urlOrReference} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="shortSummary">Short Summary of Findings</Label>
                    <Textarea
                      id="shortSummary"
                      value={researchDataState.shortSummary}
                      onChange={(e) => updateResearchData({ shortSummary: e.target.value })}
                      placeholder="Brief summary of key findings or relevance..."
                      className="min-h-20"
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Tags & Topics - Expanded initially */}
          <Collapsible open={tagsTopicsExpanded} onOpenChange={setTagsTopicsExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Tag className="h-5 w-5" />
                      Tags & Topics
                    </span>
                    {tagsTopicsExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  {/* Topics */}
                  <div>
                    <Label>Topics</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(researchDataState.topics || []).map((topic, index) => (
                        <Badge key={index} variant="default" className="flex items-center gap-1">
                          {topic}
                          <button
                            onClick={() => removeTopic(topic)}
                            className="hover:bg-red-500 hover:text-white rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Select onValueChange={(value) => addTopic(value)}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Add topic category" />
                        </SelectTrigger>
                        <SelectContent>
                          {TOPIC_CATEGORIES.filter(cat => !researchDataState.topics.includes(cat)).map((topic) => (
                            <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Custom topic..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addTopic(e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Tags */}
                  <div>
                    <Label>Tags</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(researchDataState.tags || []).map((tag, index) => (
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
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Linked Applications - Collapsible */}
          <Collapsible open={linkedApplicationsExpanded} onOpenChange={setLinkedApplicationsExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Link2 className="h-5 w-5" />
                      Linked Applications
                    </span>
                    {linkedApplicationsExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  {/* Linked Elements */}
                  <RelationshipSection entry={entry} title="Linked applications" kinds={["application"]} />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Detailed Notes - Collapsible */}
          <Collapsible open={detailedNotesExpanded} onOpenChange={setDetailedNotesExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Detailed Notes
                    </span>
                    {detailedNotesExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div>
                    <Label htmlFor="detailedNotes">Key Points, Quotes, Data Captured</Label>
                    <Textarea
                      id="detailedNotes"
                      value={researchDataState.detailedNotes}
                      onChange={(e) => updateResearchData({ detailedNotes: e.target.value })}
                      placeholder="Detailed research notes, key findings, important quotes..."
                      className="min-h-32"
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Utility & Actions - Collapsible */}
          <Collapsible open={utilityActionsExpanded} onOpenChange={setUtilityActionsExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Utility & Actions
                    </span>
                    {utilityActionsExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="nextSteps">Next Steps</Label>
                    <Textarea
                      id="nextSteps"
                      value={researchDataState.nextSteps || ''}
                      onChange={(e) => updateResearchData({ nextSteps: e.target.value })}
                      placeholder="What to do with this research? e.g., 'Incorporate into World Element: Low-gravity agriculture'"
                      className="min-h-20"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="incorporationPlans">Incorporation Plans</Label>
                    <Textarea
                      id="incorporationPlans"
                      value={researchDataState.incorporationPlans || ''}
                      onChange={(e) => updateResearchData({ incorporationPlans: e.target.value })}
                      placeholder="How to integrate this research into the story..."
                      className="min-h-20"
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Team Notes - Collapsed by default */}
          <Collapsible open={teamNotesExpanded} onOpenChange={setTeamNotesExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Notes for Team/You
                    </span>
                    {teamNotesExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div>
                    <Label htmlFor="teamNotes">Reminders & Team Notes</Label>
                    <Textarea
                      id="teamNotes"
                      value={researchDataState.teamNotes || ''}
                      onChange={(e) => updateResearchData({ teamNotes: e.target.value })}
                      placeholder="e.g., 'Check deeper data on soil composition', 'Verify with expert', etc."
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
              <div className="flex flex-wrap gap-2">
                {researchDataState.sourceType && (
                  <Badge variant="secondary">{researchDataState.sourceType}</Badge>
                )}
                {researchDataState.status && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    {getStatusIcon(researchDataState.status)}
                    {researchDataState.status}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Links Summary */}
          <RelationshipSection entry={entry} title="Other connections" kinds={["related","reference","associated","history"]} />

          {/* Research Image */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Research Image
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload projectId={Number(projectId)}
                imageUrl={researchDataState.imageUrl}
                imageDescription={researchDataState.imageDescription}
                onImageChange={(url, description) => {
                  updateResearchData({ imageUrl: url, imageDescription: description || "" });
                }}
                onRemoveImage={() => {
                  updateResearchData({ imageUrl: "", imageDescription: "" });
                }}
                title="Research Image"
                placeholder="Add research image"
              />
            </CardContent>
          </Card>

          {/* Topics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Topics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(researchDataState.topics || []).map((topic, index) => (
                  <Badge key={index} variant="default" className="text-xs">
                    {topic}
                  </Badge>
                ))}
                {researchDataState.topics.length === 0 && (
                  <p className="text-sm text-muted-foreground">No topics assigned</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Archive Toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Archive className="h-5 w-5" />
                Archive
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="archived"
                  checked={researchDataState.isArchived || false}
                  onCheckedChange={(checked) => updateResearchData({ isArchived: checked === true })}
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

ResearchEditor.displayName = 'ResearchEditor';

export { ResearchEditor };

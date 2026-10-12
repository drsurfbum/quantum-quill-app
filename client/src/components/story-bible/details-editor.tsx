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
import { Save, Trash2, Plus, X, ChevronDown, ChevronRight, FileText, Link2, Users, MapPin, Calendar, Zap, Tag, ArrowLeft, Clock, Archive, Lightbulb, MessageSquare, Eye, EyeOff, ImageIcon, Upload } from 'lucide-react';
import { useDeleteStoryBibleEntry, useStoryBibleEntries } from '@/hooks/use-story-bible';
import { useToast } from '@/hooks/use-toast';
import { StoryBibleEntry } from '@shared/schema';

// Detail data structure based on specification
interface DetailData {
  // Image
  imageUrl?: string;
  imageDescription?: string;
  
  // Core Link (expanded initially)
  linkedElements: Array<{
    id: number;
    name: string;
    type: 'characters' | 'locations' | 'events' | 'world_elements' | 'groups_races' | 'research' | 'details';
  }>;
  type: string; // Note, Quote, Idea, Reminder, Foreshadow
  shortSummary: string;
  
  // Content (expanded initially)
  content: string;
  
  // Context & Usage (collapsible)
  explanation?: string; // How/when to use this detail
  visibility: string; // Internal only or visible to collaborators
  
  // Relational Suggestions (collapsible)
  suggestedLinks?: Array<{
    id: number;
    name: string;
    type: string;
    reason: string;
  }>;
  
  // Archive/Resolution (collapsible)
  status: string; // Open, Resolved, Archived
  outcomeNotes?: string;
  
  // Classification
  tags?: string[];
  isArchived?: boolean;
}

interface DetailsEditorProps {
  entry: StoryBibleEntry;
  projectId: number;
  onClose?: () => void;
}

// Constants
const DETAIL_TYPES = fieldOptions("details", "type");

const DETAIL_STATUS = fieldOptions("details", "status");

const VISIBILITY_OPTIONS = fieldOptions("details", "visibility");

const DetailsEditor = memo(({ entry, projectId, onClose }: DetailsEditorProps) => {
  entry = withPendingEdits(`/api/story-bible/${entry.id}`, entry);
  const autosave = useAutosave(`/api/story-bible/${entry.id}`, `/api/projects/${projectId}/story-bible`);

  const { toast } = useToast();
  const deleteStoryBibleEntry = useDeleteStoryBibleEntry();
  const { data: allEntries } = useStoryBibleEntries(projectId);

  const [title, setTitle] = useState(entry.title);



  // Collapsible states - Core Link and Content expanded initially
  const [coreLinkExpanded, setCoreLinkExpanded] = useState(true);
  const [contentExpanded, setContentExpanded] = useState(true);
  const [contextUsageExpanded, setContextUsageExpanded] = useState(false);
  const [relationalSuggestionsExpanded, setRelationalSuggestionsExpanded] = useState(false);
  const [archiveResolutionExpanded, setArchiveResolutionExpanded] = useState(false);

  // Parse detail data from content
  const initialDetailData = useMemo(() => {
    const defaultData: DetailData = {
      linkedElements: [],
      type: 'Note',
      shortSummary: '',
      content: '',
      visibility: 'Internal Only',
      status: 'Open',
      tags: entry.tags || [],
      isArchived: entry.isArchived || false
    };

    return { ...defaultData, ...readBibleFields(entry) } as DetailData;
  }, [entry.content]);

  const [detailDataState, setDetailData] = useEditorDraft<DetailData>(initialDetailData);

  // Available entries for linking
  const characterEntries = (allEntries || []).filter(e => e.entryType === 'characters');
  const groupEntries = (allEntries || []).filter(e => e.entryType === 'groups_races');
  const locationEntries = (allEntries || []).filter(e => e.entryType === 'locations');
  const eventEntries = (allEntries || []).filter(e => e.entryType === 'events');
  const worldElementEntries = (allEntries || []).filter(e => e.entryType === 'world_elements');

  const updateDetailData = useCallback((updates: Partial<DetailData>) => {
    const next = setDetailData(previous => ({ ...previous, ...updates }));
    autosave.save({ content: JSON.stringify(next),
      ...(Object.hasOwn(updates, 'tags') ? { tags: next.tags || [] } : {}),
      ...(Object.hasOwn(updates, 'isArchived') ? { isArchived: next.isArchived || false } : {}),
    });
  }, [setDetailData, autosave.save]);

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    autosave.save({ title: newTitle });
  }, [autosave.save]);

  // Reset state when entry changes
  useEffect(() => {
    setTitle(entry.title);
    setDetailData(initialDetailData);

  }, [entry.id]);

  const handleDelete = async () => {
    if (!await autosave.flush()) return;
    try {
      await deleteStoryBibleEntry.mutateAsync(entry.id);
      toast({
        title: "Success",
        description: "Detail deleted successfully",
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
    if (tag.trim() && !(detailDataState.tags || []).includes(tag.trim())) {
      updateDetailData({ tags: [...(detailDataState.tags || []), tag.trim()] });
    }
  };

  const removeTag = (tagToRemove: string) => {
    updateDetailData({ tags: (detailDataState.tags || []).filter(tag => tag !== tagToRemove) });
  };





  // Auto-generate title from summary if title is empty
  const generateTitleFromSummary = () => {
    if (!title.trim() && detailDataState.shortSummary.trim()) {
      const generatedTitle = detailDataState.type + ': ' + detailDataState.shortSummary.substring(0, 30);
      handleTitleChange(generatedTitle);
    }
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
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor={`details-title-${entry.id}`}>Detail title</Label>
                <Input
                  id={`details-title-${entry.id}`}
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  onBlur={generateTitleFromSummary}
                  className="text-2xl font-bold h-12"
                  placeholder="Detail Title (e.g., Foreshadow: Broken Beacon)"
                />
              </div>
              <div className="flex gap-2">
                {detailDataState.type && (
                  <Badge variant="secondary">{detailDataState.type}</Badge>
                )}
                {detailDataState.status && detailDataState.status !== 'Open' && (
                  <Badge variant={detailDataState.status === 'Resolved' ? 'default' : 'outline'}>
                    {detailDataState.status}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SaveStatus status={autosave.status} retry={autosave.flush} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Detail</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this detail? This action cannot be undone.
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
          {/* Core Link - Expanded initially */}
          <Collapsible open={coreLinkExpanded} onOpenChange={setCoreLinkExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Link2 className="h-5 w-5" />
                      Core Link
                    </span>
                    {coreLinkExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  {/* Linked Elements */}
                  <RelationshipSection entry={entry} title="Linked applications" kinds={["application"]} />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="type">Type</Label>
                      <Select
                        value={detailDataState.type}
                        onValueChange={(value) => updateDetailData({ type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {DETAIL_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={detailDataState.status}
                        onValueChange={(value) => updateDetailData({ status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {DETAIL_STATUS.map((status) => (
                            <SelectItem key={status} value={status}>{status}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="shortSummary">Short Summary (One-liner)</Label>
                    <Input
                      id="shortSummary"
                      value={detailDataState.shortSummary}
                      onChange={(e) => updateDetailData({ shortSummary: e.target.value })}
                      placeholder="Brief description of this detail..."
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Content - Expanded initially */}
          <Collapsible open={contentExpanded} onOpenChange={setContentExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Content
                    </span>
                    {contentExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div>
                    <Label htmlFor="content">Detail Content</Label>
                    <Textarea
                      id="content"
                      value={detailDataState.content}
                      onChange={(e) => updateDetailData({ content: e.target.value })}
                      placeholder="The full detail, note, quote, or idea..."
                      className="min-h-32"
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Context & Usage - Collapsible */}
          <Collapsible open={contextUsageExpanded} onOpenChange={setContextUsageExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5" />
                      Context & Usage
                    </span>
                    {contextUsageExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="explanation">How/When to Use This Detail</Label>
                    <Textarea
                      id="explanation"
                      value={detailDataState.explanation || ''}
                      onChange={(e) => updateDetailData({ explanation: e.target.value })}
                      placeholder="e.g., 'Drop this hint in Chapter 3' or 'Use when describing the marketplace'"
                      className="min-h-20"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="visibility">Visibility</Label>
                    <Select
                      value={detailDataState.visibility}
                      onValueChange={(value) => updateDetailData({ visibility: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        {VISIBILITY_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            <div className="flex items-center gap-2">
                              {option === 'Internal Only' && <EyeOff className="h-4 w-4" />}
                              {option !== 'Internal Only' && <Eye className="h-4 w-4" />}
                              {option}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Archive/Resolution - Collapsible */}
          <Collapsible open={archiveResolutionExpanded} onOpenChange={setArchiveResolutionExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Archive className="h-5 w-5" />
                      Archive / Resolution
                    </span>
                    {archiveResolutionExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="outcomeNotes">Outcome Notes (if resolved)</Label>
                    <Textarea
                      id="outcomeNotes"
                      value={detailDataState.outcomeNotes || ''}
                      onChange={(e) => updateDetailData({ outcomeNotes: e.target.value })}
                      placeholder="What happened with this detail? How was it resolved?"
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
          {/* Classification */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Classification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {detailDataState.type && (
                  <Badge variant="secondary">{detailDataState.type}</Badge>
                )}
                {detailDataState.status && (
                  <Badge variant="outline">{detailDataState.status}</Badge>
                )}
                {detailDataState.visibility && (
                  <Badge variant="outline" className="text-xs">
                    {detailDataState.visibility === 'Internal Only' && <EyeOff className="h-3 w-3 mr-1" />}
                    {detailDataState.visibility !== 'Internal Only' && <Eye className="h-3 w-3 mr-1" />}
                    {detailDataState.visibility}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Detail Image */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Detail Image
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload
                imageUrl={detailDataState.imageUrl}
                imageDescription={detailDataState.imageDescription}
                onImageChange={(url, description) => {
                  updateDetailData({ imageUrl: url, imageDescription: description || "" });
                }}
                onRemoveImage={() => {
                  updateDetailData({ imageUrl: "", imageDescription: "" });
                }}
                title="Detail Image"
                placeholder="Add detail image"
              />
            </CardContent>
          </Card>

          {/* Links Summary */}
          <RelationshipSection entry={entry} title="Other connections" kinds={["related","reference","associated","history"]} />

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
                {(detailDataState.tags || []).map((tag, index) => (
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
                Archive
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="archived"
                  checked={detailDataState.isArchived || false}
                  onCheckedChange={(checked) => updateDetailData({ isArchived: checked === true })}
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

DetailsEditor.displayName = 'DetailsEditor';

export { DetailsEditor };

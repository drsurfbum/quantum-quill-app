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
import { useUpdateStoryBibleEntry, useDeleteStoryBibleEntry, useStoryBibleEntries } from '@/hooks/use-story-bible';
import { useToast } from '@/hooks/use-toast';
import { StoryBibleEntry } from '@shared/schema';
import { debounce } from 'lodash';

// Detail data structure based on specification
interface DetailData {
  // Image
  imageUrl?: string;
  imageDescription?: string;
  
  // Core Link (expanded initially)
  linkedElements: Array<{
    id: number;
    name: string;
    type: 'characters' | 'locations' | 'events' | 'world_elements' | 'groups_races';
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
const DETAIL_TYPES = [
  'Note', 'Quote', 'Idea', 'Reminder', 'Foreshadow', 'Plot Hook', 'Character Note', 
  'World Note', 'Research', 'Continuity Check', 'Other'
];

const DETAIL_STATUS = [
  'Open', 'In Progress', 'Resolved', 'Archived', 'On Hold'
];

const VISIBILITY_OPTIONS = [
  'Internal Only', 'Visible to Collaborators', 'Public Notes'
];

const DetailsEditor = memo(({ entry, projectId, onClose }: DetailsEditorProps) => {
  const { toast } = useToast();
  const updateStoryBibleEntry = useUpdateStoryBibleEntry();
  const deleteStoryBibleEntry = useDeleteStoryBibleEntry();
  const { data: allEntries } = useStoryBibleEntries(projectId);

  const [title, setTitle] = useState(entry.title);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
      tags: [],
      isArchived: false
    };

    if (!entry.content) return defaultData;
    
    try {
      const parsed = JSON.parse(entry.content);
      if (typeof parsed === 'object' && parsed !== null) {
        return { ...defaultData, ...parsed } as DetailData;
      }
    } catch {
      return {
        ...defaultData,
        content: entry.content
      } as DetailData;
    }
    
    return defaultData;
  }, [entry.content]);

  const [detailDataState, setDetailData] = useState<DetailData>(initialDetailData);

  // Available entries for linking
  const characterEntries = (allEntries || []).filter(e => e.entryType === 'characters');
  const groupEntries = (allEntries || []).filter(e => e.entryType === 'groups_races');
  const locationEntries = (allEntries || []).filter(e => e.entryType === 'locations');
  const eventEntries = (allEntries || []).filter(e => e.entryType === 'events');
  const worldElementEntries = (allEntries || []).filter(e => e.entryType === 'world_elements');

  // Debounced save function - stable reference
  const debouncedSave = useMemo(
    () => debounce(async (titleToSave: string, dataToSave: DetailData) => {
      setIsSaving(true);
      try {
        await updateStoryBibleEntry.mutateAsync({
          id: entry.id,
          title: titleToSave,
          content: JSON.stringify(dataToSave),
        });
        setHasUnsavedChanges(false);
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
    }, 1500),
    [entry.id, updateStoryBibleEntry, toast]
  );

  const updateDetailData = useCallback((updates: Partial<DetailData>) => {
    setDetailData(prev => {
      const newData = { ...prev, ...updates };
      return newData;
    });
    setHasUnsavedChanges(true);
    debouncedSave(title, { ...detailDataState, ...updates });
  }, [title, detailDataState, debouncedSave]);

  // Handle title changes
  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    setHasUnsavedChanges(true);
    debouncedSave(newTitle, detailDataState);
  }, [detailDataState, debouncedSave]);

  // Reset state when entry changes
  useEffect(() => {
    setTitle(entry.title);
    setDetailData(initialDetailData);
    setHasUnsavedChanges(false);
  }, [entry.id, entry.title, initialDetailData]);

  const handleDelete = async () => {
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
        description: "Failed to delete detail",
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

  const addLinkedElement = (elementId: number, elementName: string, elementType: string) => {
    const existingElement = detailDataState.linkedElements.find(el => el.id === elementId);
    if (!existingElement) {
      updateDetailData({
        linkedElements: [...detailDataState.linkedElements, {
          id: elementId,
          name: elementName,
          type: elementType as any
        }]
      });
    }
  };

  const removeLinkedElement = (elementId: number) => {
    updateDetailData({
      linkedElements: detailDataState.linkedElements.filter(el => el.id !== elementId)
    });
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
              <Input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={generateTitleFromSummary}
                className="text-2xl font-bold border-none p-0 h-auto bg-transparent"
                placeholder="Detail Title (e.g., Foreshadow: Broken Beacon)"
              />
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
            {isSaving && <span className="text-sm text-muted-foreground">Saving...</span>}
            {hasUnsavedChanges && !isSaving && <span className="text-sm text-muted-foreground">Unsaved changes</span>}
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
                  <div>
                    <Label>Linked Elements</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {detailDataState.linkedElements.map((element) => (
                        <Badge key={element.id} variant="outline" className="flex items-center gap-1">
                          {element.type === 'characters' && <Users className="h-3 w-3" />}
                          {element.type === 'locations' && <MapPin className="h-3 w-3" />}
                          {element.type === 'events' && <Calendar className="h-3 w-3" />}
                          {element.type === 'world_elements' && <Zap className="h-3 w-3" />}
                          {element.type === 'groups_races' && <Users className="h-3 w-3" />}
                          {element.name}
                          <button
                            onClick={() => removeLinkedElement(element.id)}
                            className="hover:bg-red-500 hover:text-white rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    
                    {/* Add element dropdowns */}
                    <div className="grid grid-cols-2 gap-2">
                      <Select onValueChange={(value) => {
                        const [id, name] = value.split('|');
                        addLinkedElement(parseInt(id), name, 'characters');
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Add Character" />
                        </SelectTrigger>
                        <SelectContent>
                          {characterEntries.map((char) => (
                            <SelectItem key={char.id} value={`${char.id}|${char.title}`}>
                              {char.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select onValueChange={(value) => {
                        const [id, name] = value.split('|');
                        addLinkedElement(parseInt(id), name, 'locations');
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Add Location" />
                        </SelectTrigger>
                        <SelectContent>
                          {locationEntries.map((loc) => (
                            <SelectItem key={loc.id} value={`${loc.id}|${loc.title}`}>
                              {loc.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select onValueChange={(value) => {
                        const [id, name] = value.split('|');
                        addLinkedElement(parseInt(id), name, 'events');
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Add Event" />
                        </SelectTrigger>
                        <SelectContent>
                          {eventEntries.map((event) => (
                            <SelectItem key={event.id} value={`${event.id}|${event.title}`}>
                              {event.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select onValueChange={(value) => {
                        const [id, name] = value.split('|');
                        addLinkedElement(parseInt(id), name, 'world_elements');
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Add World Element" />
                        </SelectTrigger>
                        <SelectContent>
                          {worldElementEntries.map((element) => (
                            <SelectItem key={element.id} value={`${element.id}|${element.title}`}>
                              {element.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
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
            <CardContent className="space-y-4">
              {detailDataState.imageUrl ? (
                <div className="space-y-2">
                  <img 
                    src={detailDataState.imageUrl} 
                    alt={detailDataState.imageDescription || title}
                    className="w-full h-48 object-cover rounded-md"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => updateDetailData({ imageUrl: '', imageDescription: '' })}
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
                    <p className="text-sm text-muted-foreground mb-2">Add detail image</p>
                  </div>
                  <Input
                    placeholder="Image URL..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        updateDetailData({ imageUrl: e.currentTarget.value });
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>
              )}
              {detailDataState.imageUrl && (
                <div>
                  <Label htmlFor="imageDescription">Image Description</Label>
                  <Input
                    id="imageDescription"
                    value={detailDataState.imageDescription || ''}
                    onChange={(e) => updateDetailData({ imageDescription: e.target.value })}
                    placeholder="Describe the image..."
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Links Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Links Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {detailDataState.linkedElements.map((element) => (
                  <Badge key={element.id} variant="outline" className="text-xs">
                    {element.type === 'characters' && <Users className="h-3 w-3 mr-1" />}
                    {element.type === 'locations' && <MapPin className="h-3 w-3 mr-1" />}
                    {element.type === 'events' && <Calendar className="h-3 w-3 mr-1" />}
                    {element.type === 'world_elements' && <Zap className="h-3 w-3 mr-1" />}
                    {element.type === 'groups_races' && <Users className="h-3 w-3 mr-1" />}
                    {element.name}
                  </Badge>
                ))}
                {detailDataState.linkedElements.length === 0 && (
                  <p className="text-sm text-muted-foreground">No linked elements</p>
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
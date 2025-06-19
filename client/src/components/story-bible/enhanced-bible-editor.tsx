import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Save, Trash2, Archive, ArchiveRestore, Link, Plus, Star, StarOff } from "lucide-react";
import { useUpdateStoryBibleEntry, useDeleteStoryBibleEntry, useStoryBibleEntries } from "@/hooks/use-story-bible";
import { useToast } from "@/hooks/use-toast";
import { StoryBibleEntry } from "@shared/schema";
import { TaxonomySelector } from "./taxonomy-selector";
import { DynamicFormFields } from "./dynamic-form-fields";
import { debounce } from "lodash";

interface EnhancedBibleEditorProps {
  entry: StoryBibleEntry;
  projectId: number;
  onClose?: () => void;
}

export function EnhancedBibleEditor({ entry, projectId, onClose }: EnhancedBibleEditorProps) {
  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content || "");
  const [entryType, setEntryType] = useState(entry.entryType);
  const [category, setCategory] = useState(entry.category || "");
  const [subcategory, setSubcategory] = useState(entry.subcategory || "");
  const [tags, setTags] = useState<string[]>(entry.tags || []);
  const [relatedEntryIds, setRelatedEntryIds] = useState<number[]>(entry.relatedEntryIds || []);
  const [metadata, setMetadata] = useState(entry.metadata || {});
  const [isArchived, setIsArchived] = useState(entry.isArchived || false);
  const [priority, setPriority] = useState(entry.priority || 0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const updateMutation = useUpdateStoryBibleEntry();
  const deleteMutation = useDeleteStoryBibleEntry();
  const { data: allEntries } = useStoryBibleEntries(projectId);
  const { toast } = useToast();

  // Available entries for linking (excluding current entry)
  const availableForLinking = (allEntries || []).filter(e => e.id !== entry.id);

  // Debounced save function
  const debouncedSave = debounce(async () => {
    if (!hasUnsavedChanges) return;

    try {
      await updateMutation.mutateAsync({
        id: entry.id,
        title,
        content,
        entryType,
        subcategory: subcategory || null,
        tags: tags.length > 0 ? tags : null,
        relatedEntryIds: relatedEntryIds.length > 0 ? relatedEntryIds : null,
        metadata,
        isArchived,
        priority,
      });
      setHasUnsavedChanges(false);
      toast({
        title: "Saved",
        description: "Entry updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save entry",
        variant: "destructive",
      });
    }
  }, 1000);

  // Mark as changed when any field updates
  useEffect(() => {
    setHasUnsavedChanges(true);
    debouncedSave();
  }, [title, content, entryType, category, subcategory, tags, relatedEntryIds, metadata, isArchived, priority]);

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(entry.id);
      toast({
        title: "Deleted",
        description: "Entry deleted successfully",
      });
      onClose?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete entry",
        variant: "destructive",
      });
    }
  };

  const handleAddRelatedEntry = (entryId: number) => {
    if (!relatedEntryIds.includes(entryId)) {
      setRelatedEntryIds([...relatedEntryIds, entryId]);
    }
  };

  const handleRemoveRelatedEntry = (entryId: number) => {
    setRelatedEntryIds(relatedEntryIds.filter(id => id !== entryId));
  };

  const togglePriority = () => {
    setPriority(priority > 0 ? 0 : 1);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-semibold border-none p-0 h-auto bg-transparent"
            placeholder="Entry title..."
          />
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-xs">
              Unsaved
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={togglePriority}
            className={priority > 0 ? "text-yellow-600" : ""}
          >
            {priority > 0 ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsArchived(!isArchived)}
          >
            {isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Entry</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{title}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your entry content here..."
                className="min-h-[400px] resize-none"
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Basic Classification */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Classification</CardTitle>
            </CardHeader>
            <CardContent>
              <TaxonomySelector
                entryType={entryType}
                category={category}
                subcategory={subcategory}
                tags={tags}
                onEntryTypeChange={setEntryType}
                onCategoryChange={setCategory}
                onSubcategoryChange={setSubcategory}
                onTagsChange={setTags}
              />
            </CardContent>
          </Card>

          {/* Dynamic Structured Fields */}
          <DynamicFormFields
            entryType={entryType}
            metadata={metadata}
            onMetadataChange={setMetadata}
            projectId={projectId}
            disabled={hasUnsavedChanges}
          />

          {/* Related Entries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                Related Entries
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Current Related Entries */}
              {relatedEntryIds.length > 0 && (
                <div className="space-y-2">
                  {relatedEntryIds.map(id => {
                    const relatedEntry = availableForLinking.find(e => e.id === id);
                    if (!relatedEntry) return null;
                    return (
                      <div key={id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{relatedEntry.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {relatedEntry.entryType} • {relatedEntry.category || 'No category'}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveRelatedEntry(id)}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Related Entry */}
              <Select onValueChange={(value) => handleAddRelatedEntry(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Link to another entry..." />
                </SelectTrigger>
                <SelectContent>
                  {availableForLinking
                    .filter(e => !relatedEntryIds.includes(e.id))
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id.toString()}>
                        <div className="flex flex-col">
                          <span className="font-medium">{e.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {e.entryType} • {e.category || 'No category'}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Entry Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="archived" 
                  checked={isArchived} 
                  onCheckedChange={(checked) => setIsArchived(checked === true)}
                />
                <Label htmlFor="archived">Archived</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="priority" 
                  checked={priority > 0} 
                  onCheckedChange={(checked) => setPriority(checked === true ? 1 : 0)}
                />
                <Label htmlFor="priority">High Priority</Label>
              </div>
              <Separator />
              <div className="text-xs text-muted-foreground">
                <div>Created: {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : 'Unknown'}</div>
                <div>Updated: {entry.updatedAt ? new Date(entry.updatedAt).toLocaleDateString() : 'Unknown'}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
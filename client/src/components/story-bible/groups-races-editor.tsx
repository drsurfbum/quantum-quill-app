import { fieldChoices } from "@shared/bible-catalog";
import { TagInput } from "./tag-input";
import { useEditorDraft } from "@/hooks/use-editor-draft";
import { useAutosave, withPendingEdits } from "@/hooks/use-autosave";
import { SaveStatus } from "@/components/save-status";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Save, Trash2, Archive, ArchiveRestore, Star, StarOff, ChevronDown, ChevronRight, Plus, X, Users, ImageIcon } from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";
import { useDeleteStoryBibleEntry, useStoryBibleEntries } from "@/hooks/use-story-bible";
import { useToast } from "@/hooks/use-toast";
import { StoryBibleEntry } from "@shared/schema";

interface GroupsRacesEditorProps {
  entry: StoryBibleEntry;
  projectId: number;
  onClose?: () => void;
}

export function GroupsRacesEditor({ entry, projectId, onClose }: GroupsRacesEditorProps) {
  entry = withPendingEdits(`/api/story-bible/${entry.id}`, entry);
  const autosave = useAutosave(`/api/story-bible/${entry.id}`, `/api/projects/${projectId}/story-bible`);

  // Core fields
  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content || "");
  const [category, setCategory] = useState(entry.category || "");
  const [tags, setTags] = useState<string[]>(entry.tags || []);
  const [relatedEntryIds, setRelatedEntryIds] = useState<number[]>(entry.relatedEntryIds || []);
  const [metadata, setMetadata] = useEditorDraft<Record<string, any>>(entry.metadata || {});
  const [isArchived, setIsArchived] = useState(entry.isArchived || false);
  const [priority, setPriority] = useState(entry.priority || 0);
  const saveStatus = autosave.status;

  // Groups & Races specific fields from metadata
  const [groupCategory, setGroupCategory] = useState((metadata as any)?.groupCategory || "");
  const [status, setStatus] = useState((metadata as any)?.status || "active");
  const [tagline, setTagline] = useState((metadata as any)?.tagline || "");
  
  // Hierarchy & Structure
  const [parentGroup, setParentGroup] = useState((metadata as any)?.parentGroup || "");
  const [subGroups, setSubGroups] = useState<string[]>((metadata as any)?.subGroups || []);
  const [eraEstablished, setEraEstablished] = useState((metadata as any)?.eraEstablished || "");
  const [eraDissolved, setEraDissolved] = useState((metadata as any)?.eraDissolved || "");
  
  // Leadership & Membership
  const [notableMembers, setNotableMembers] = useState<{id: number, role: string}[]>((metadata as any)?.notableMembers || []);
  const [leadershipStructure, setLeadershipStructure] = useState((metadata as any)?.leadershipStructure || "");
  
  // Attributes & Traits
  const [homeworld, setHomeworld] = useState((metadata as any)?.homeworld || "");
  const [physiology, setPhysiology] = useState((metadata as any)?.physiology || "");
  const [purpose, setPurpose] = useState((metadata as any)?.purpose || "");
  const [ideology, setIdeology] = useState((metadata as any)?.ideology || "");
  const [resources, setResources] = useState((metadata as any)?.resources || "");
  const [culturalNotes, setCulturalNotes] = useState((metadata as any)?.culturalNotes || "");
  
  // Relationships
  const [alliances, setAlliances] = useState<string[]>((metadata as any)?.alliances || []);
  const [rivalries, setRivalries] = useState<string[]>((metadata as any)?.rivalries || []);
  
  // Image
  const [imageUrl, setImageUrl] = useState((metadata as any)?.imageUrl || "");
  const [imageDescription, setImageDescription] = useState((metadata as any)?.imageDescription || "");
  
  // Form helpers
  const [newSubGroup, setNewSubGroup] = useState("");
  const [newAlliance, setNewAlliance] = useState("");
  const [newRivalry, setNewRivalry] = useState("");

  // Section collapse states - smart defaults
  const isNewEntry = !entry.id || entry.id === 0;
  const [basicInfoExpanded, setBasicInfoExpanded] = useState(isNewEntry || !groupCategory || !tagline);
  const [hierarchyExpanded, setHierarchyExpanded] = useState(false);
  const [leadershipExpanded, setLeadershipExpanded] = useState(false);
  const [attributesExpanded, setAttributesExpanded] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [relationshipsExpanded, setRelationshipsExpanded] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);

  const deleteMutation = useDeleteStoryBibleEntry();
  const { data: allEntries } = useStoryBibleEntries(projectId);
  const { toast } = useToast();

  // Available entries for linking
  const availableForLinking = (allEntries || []).filter(e => e.id !== entry.id);
  const characterEntries = availableForLinking.filter(e => e.entryType === "characters");
  const groupEntries = availableForLinking.filter(e => e.entryType === "groups_races");
  const locationEntries = availableForLinking.filter(e => e.entryType === "locations");

  // Debounced save function
  const debouncedSave = autosave.save;

  // Update metadata helper
  const updateMetadata = (newFields: Record<string, any>) => {
    const updatedMetadata = setMetadata(previous => ({ ...previous, ...newFields }));
    debouncedSave({ metadata: updatedMetadata });
  };

  // Field change handlers
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    debouncedSave({ title: newTitle });
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    debouncedSave({ category: value || null });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    debouncedSave({ content: newContent });
  };

  const togglePriority = () => {
    const newPriority = priority > 0 ? 0 : 1;
    setPriority(newPriority);
    debouncedSave({ priority: newPriority });
  };

  // Array management helpers
  const handleAddSubGroup = () => {
    if (newSubGroup.trim() && !subGroups.includes(newSubGroup.trim())) {
      const updatedSubGroups = [...subGroups, newSubGroup.trim()];
      setSubGroups(updatedSubGroups);
      setNewSubGroup("");
      updateMetadata({ subGroups: updatedSubGroups });
    }
  };

  const handleRemoveSubGroup = (groupToRemove: string) => {
    const updatedSubGroups = subGroups.filter(group => group !== groupToRemove);
    setSubGroups(updatedSubGroups);
    updateMetadata({ subGroups: updatedSubGroups });
  };

  const handleAddAlliance = () => {
    if (newAlliance.trim() && !alliances.includes(newAlliance.trim())) {
      const updatedAlliances = [...alliances, newAlliance.trim()];
      setAlliances(updatedAlliances);
      setNewAlliance("");
      updateMetadata({ alliances: updatedAlliances });
    }
  };

  const handleRemoveAlliance = (allianceToRemove: string) => {
    const updatedAlliances = alliances.filter(alliance => alliance !== allianceToRemove);
    setAlliances(updatedAlliances);
    updateMetadata({ alliances: updatedAlliances });
  };

  const handleAddRivalry = () => {
    if (newRivalry.trim() && !rivalries.includes(newRivalry.trim())) {
      const updatedRivalries = [...rivalries, newRivalry.trim()];
      setRivalries(updatedRivalries);
      setNewRivalry("");
      updateMetadata({ rivalries: updatedRivalries });
    }
  };

  const handleRemoveRivalry = (rivalryToRemove: string) => {
    const updatedRivalries = rivalries.filter(rivalry => rivalry !== rivalryToRemove);
    setRivalries(updatedRivalries);
    updateMetadata({ rivalries: updatedRivalries });
  };

  const handleAddRelatedEntry = (entryId: number) => {
    if (!relatedEntryIds.includes(entryId)) {
      const updatedIds = [...relatedEntryIds, entryId];
      setRelatedEntryIds(updatedIds);
      debouncedSave({ relatedEntryIds: updatedIds });
    }
  };

  const handleRemoveRelatedEntry = (entryId: number) => {
    const updatedIds = relatedEntryIds.filter(id => id !== entryId);
    setRelatedEntryIds(updatedIds);
    debouncedSave({ relatedEntryIds: updatedIds });
  };

  const handleDelete = async () => {
    if (!await autosave.flush()) return;
    try {
      await deleteMutation.mutateAsync(entry.id);
      toast({
        title: "Deleted",
        description: "Group/Race deleted successfully",
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

  // Mark as loaded after first render

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Area (Sticky) */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor={`groups-races-title-${entry.id}`}>Group or race name</Label>
                <Input
                  id={`groups-races-title-${entry.id}`}
                  value={title}
                  onChange={handleTitleChange}
                  className="text-2xl font-bold h-12"
                  placeholder="Group/Race name..."
                />
              </div>
              <SaveStatus status={saveStatus} retry={autosave.flush} />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {groupCategory && (
              <Badge variant="secondary">{groupCategory}</Badge>
            )}
            {status && (
              <Badge variant={status === "active" ? "default" : "destructive"}>
                {status}
              </Badge>
            )}
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
              onClick={() => { setIsArchived(!isArchived); autosave.save({ isArchived: !isArchived }); }}
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
                  <AlertDialogTitle>Delete Group/Race</AlertDialogTitle>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Basic Info Card */}
          <Collapsible open={basicInfoExpanded} onOpenChange={setBasicInfoExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-xl flex items-center justify-between">
                    Basic Info
                    {basicInfoExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="groupCategory">Category</Label>
                      <Select 
                        value={groupCategory} 
                        onValueChange={(value) => {
                          setGroupCategory(value);
                          updateMetadata({ groupCategory: value });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category..." />
                        </SelectTrigger>
                        <SelectContent>
                          {fieldChoices("groups_races", "groupCategory").map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select 
                        value={status} 
                        onValueChange={(value) => {
                          setStatus(value);
                          updateMetadata({ status: value });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status..." />
                        </SelectTrigger>
                        <SelectContent>
                          {fieldChoices("groups_races", "status").map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tagline">Short Notes / Tagline</Label>
                    <Input
                      id="tagline"
                      value={tagline}
                      onChange={(e) => {
                        setTagline(e.target.value);
                        updateMetadata({ tagline: e.target.value });
                      }}
                      placeholder="Brief description or motto..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category Tag</Label>
                    <Input
                      id="category"
                      value={category}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      placeholder="Major Powers, Ancient Races, etc."
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Hierarchy & Structure Card */}
          <Collapsible open={hierarchyExpanded} onOpenChange={setHierarchyExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-xl flex items-center justify-between">
                    Hierarchy & Structure
                    {hierarchyExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="parentGroup">Parent Group</Label>
                    <Select value={parentGroup || "__none__"} onValueChange={(value) => {
                      const next = value === "__none__" ? "" : value;
                      setParentGroup(next);
                      updateMetadata({ parentGroup: next });
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent group..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {groupEntries.map((group) => (
                          <SelectItem key={group.id} value={group.id.toString()}>
                            {group.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <Label>Sub-groups / Child Races</Label>
                    {subGroups.length > 0 && (
                      <div className="space-y-2">
                        {subGroups.map((group, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <span>{group}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveSubGroup(group)}
                              className="h-6 w-6 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        value={newSubGroup}
                        onChange={(e) => setNewSubGroup(e.target.value)}
                        placeholder="Add sub-group or child race..."
                        onKeyPress={(e) => e.key === 'Enter' && handleAddSubGroup()}
                      />
                      <Button onClick={handleAddSubGroup} disabled={!newSubGroup.trim()}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="eraEstablished">Founding Date / Era Established</Label>
                      <Input
                        id="eraEstablished"
                        value={eraEstablished}
                        onChange={(e) => {
                          setEraEstablished(e.target.value);
                          updateMetadata({ eraEstablished: e.target.value });
                        }}
                        placeholder="2387 CE, First Age, etc."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="eraDissolved">Dissolution Date (if defunct)</Label>
                      <Input
                        id="eraDissolved"
                        value={eraDissolved}
                        onChange={(e) => {
                          setEraDissolved(e.target.value);
                          updateMetadata({ eraDissolved: e.target.value });
                        }}
                        placeholder="Leave empty if still active"
                      />
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Leadership & Membership Card */}
          <Collapsible open={leadershipExpanded} onOpenChange={setLeadershipExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-xl flex items-center justify-between">
                    Leadership & Membership
                    {leadershipExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Notable Members</Label>
                    <div className="space-y-2">
                      {characterEntries.map((character) => (
                        <div key={character.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <span className="font-medium">{character.title}</span>
                            <Badge variant="outline" className="ml-2 text-xs">Member</Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddRelatedEntry(character.id)}
                            disabled={relatedEntryIds.includes(character.id)}
                          >
                            {relatedEntryIds.includes(character.id) ? "Linked" : "Link"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="leadershipStructure">Leadership Structure</Label>
                    <Textarea
                      id="leadershipStructure"
                      value={leadershipStructure}
                      onChange={(e) => {
                        setLeadershipStructure(e.target.value);
                        updateMetadata({ leadershipStructure: e.target.value });
                      }}
                      placeholder="Hierarchy, decision-making process, key roles..."
                      className="min-h-20"
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Attributes & Traits Card */}
          <Collapsible open={attributesExpanded} onOpenChange={setAttributesExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-xl flex items-center justify-between">
                    Attributes & Traits
                    {attributesExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  {groupCategory === "species" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="homeworld">Homeworld / Origin</Label>
                        <Input
                          id="homeworld"
                          value={homeworld}
                          onChange={(e) => {
                            setHomeworld(e.target.value);
                            updateMetadata({ homeworld: e.target.value });
                          }}
                          placeholder="Planet, region, or dimension of origin"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="physiology">Physiology & Biology</Label>
                        <Textarea
                          id="physiology"
                          value={physiology}
                          onChange={(e) => {
                            setPhysiology(e.target.value);
                            updateMetadata({ physiology: e.target.value });
                          }}
                          placeholder="Physical characteristics, abilities, lifespan..."
                          className="min-h-20"
                        />
                      </div>
                    </>
                  )}

                  {(groupCategory === "faction" || groupCategory === "government" || groupCategory === "guild") && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="purpose">Purpose & Goals</Label>
                        <Textarea
                          id="purpose"
                          value={purpose}
                          onChange={(e) => {
                            setPurpose(e.target.value);
                            updateMetadata({ purpose: e.target.value });
                          }}
                          placeholder="Primary objectives, mission statement..."
                          className="min-h-20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ideology">Ideology & Beliefs</Label>
                        <Textarea
                          id="ideology"
                          value={ideology}
                          onChange={(e) => {
                            setIdeology(e.target.value);
                            updateMetadata({ ideology: e.target.value });
                          }}
                          placeholder="Core beliefs, principles, philosophy..."
                          className="min-h-20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="resources">Resources & Assets</Label>
                        <Textarea
                          id="resources"
                          value={resources}
                          onChange={(e) => {
                            setResources(e.target.value);
                            updateMetadata({ resources: e.target.value });
                          }}
                          placeholder="Military, economic, technological resources..."
                          className="min-h-20"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="culturalNotes">Cultural Notes & Characteristics</Label>
                    <Textarea
                      id="culturalNotes"
                      value={culturalNotes}
                      onChange={(e) => {
                        setCulturalNotes(e.target.value);
                        updateMetadata({ culturalNotes: e.target.value });
                      }}
                      placeholder="Traditions, customs, notable traits..."
                      className="min-h-20"
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* History & Events Card */}
          <Collapsible open={historyExpanded} onOpenChange={setHistoryExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-xl flex items-center justify-between">
                    History & Events
                    {historyExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <Textarea
                    value={content}
                    onChange={handleContentChange}
                    placeholder="Origin story, major milestones, significant events, historical context..."
                    className="min-h-[200px] resize-none"
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Relationships Card */}
          <Collapsible open={relationshipsExpanded} onOpenChange={setRelationshipsExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-xl flex items-center justify-between">
                    Relationships
                    {relationshipsExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <Label>Alliances</Label>
                    {alliances.length > 0 && (
                      <div className="space-y-2">
                        {alliances.map((alliance, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                            <span>{alliance}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAlliance(alliance)}
                              className="h-6 w-6 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        value={newAlliance}
                        onChange={(e) => setNewAlliance(e.target.value)}
                        placeholder="Add allied group..."
                        onKeyPress={(e) => e.key === 'Enter' && handleAddAlliance()}
                      />
                      <Button onClick={handleAddAlliance} disabled={!newAlliance.trim()}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>Rivalries</Label>
                    {rivalries.length > 0 && (
                      <div className="space-y-2">
                        {rivalries.map((rivalry, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                            <span>{rivalry}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveRivalry(rivalry)}
                              className="h-6 w-6 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        value={newRivalry}
                        onChange={(e) => setNewRivalry(e.target.value)}
                        placeholder="Add rival group..."
                        onKeyPress={(e) => e.key === 'Enter' && handleAddRivalry()}
                      />
                      <Button onClick={handleAddRivalry} disabled={!newRivalry.trim()}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Notes / Internal Comments Card */}
          <Collapsible open={notesExpanded} onOpenChange={setNotesExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-xl flex items-center justify-between">
                    Notes & Internal Comments
                    {notesExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <Textarea
                    id="notes"
                    aria-label="Development notes"
                    value={metadata.notes || ""}
                    onChange={(e) => updateMetadata({ notes: e.target.value })}
                    placeholder="Writer's ideas, future plot hooks, open questions, development notes..."
                    className="min-h-[150px] resize-none"
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          
          {/* Classification */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Classification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {groupCategory && <Badge variant="secondary">{groupCategory}</Badge>}
                {status && <Badge variant={status === "active" ? "default" : "destructive"}>{status}</Badge>}
              </div>
            </CardContent>
          </Card>

          {/* Affiliations & Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Affiliations & Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Home Location(s)</Label>
                <Select onValueChange={(value) => handleAddRelatedEntry(parseInt(value))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Link to location..." />
                  </SelectTrigger>
                  <SelectContent>
                    {locationEntries.map((location) => (
                      <SelectItem key={location.id} value={location.id.toString()}>
                        {location.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {relatedEntryIds.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Related Entries</Label>
                  {relatedEntryIds.map(id => {
                    const relatedEntry = availableForLinking.find(e => e.id === id);
                    if (!relatedEntry) return null;
                    return (
                      <div key={id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{relatedEntry.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {relatedEntry.entryType}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveRelatedEntry(id)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Group/Race Image */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Group/Race Image
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload
                imageUrl={imageUrl}
                imageDescription={imageDescription}
                onImageChange={(url, description) => {
                  setImageUrl(url);
                  setImageDescription(description || "");
                  updateMetadata({ imageUrl: url, imageDescription: description || "" });
                }}
                onRemoveImage={() => {
                  setImageUrl("");
                  setImageDescription("");
                  updateMetadata({ imageUrl: "", imageDescription: "" });
                }}
                title="Group/Race Image"
                placeholder="Add group/race image"
              />
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <TagInput tags={tags} onChange={(next) => { setTags(next); autosave.save({ tags: next }); }} />
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Footer */}
      <div className="border-t pt-6 pb-12">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Created: {new Date(entry.createdAt || '').toLocaleDateString()}</span>
          <span>Last Updated: {new Date(entry.updatedAt || '').toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
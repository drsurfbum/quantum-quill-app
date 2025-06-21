import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Save, Trash2, Archive, ArchiveRestore, Star, StarOff, ChevronDown, ChevronRight, Plus, X, User, ImageIcon } from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";
import { useUpdateStoryBibleEntry, useDeleteStoryBibleEntry, useStoryBibleEntries } from "@/hooks/use-story-bible";
import { useToast } from "@/hooks/use-toast";
import { StoryBibleEntry } from "@shared/schema";
import { debounce } from "lodash";

interface CharacterEditorProps {
  entry: StoryBibleEntry;
  projectId: number;
  onClose?: () => void;
}

export function CharacterEditor({ entry, projectId, onClose }: CharacterEditorProps) {
  // Core fields
  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content || "");
  const [category, setCategory] = useState(entry.category || "");
  const [tags, setTags] = useState<string[]>(entry.tags || []);
  const [relatedEntryIds, setRelatedEntryIds] = useState<number[]>(entry.relatedEntryIds || []);
  const [metadata, setMetadata] = useState(entry.metadata || {});
  const [isArchived, setIsArchived] = useState(entry.isArchived || false);
  const [priority, setPriority] = useState(entry.priority || 0);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Character-specific fields from metadata
  const [age, setAge] = useState((metadata as any)?.age || "");
  const [gender, setGender] = useState((metadata as any)?.gender || "");
  const [species, setSpecies] = useState((metadata as any)?.species || "");
  const [origin, setOrigin] = useState((metadata as any)?.origin || "");
  const [primaryRole, setPrimaryRole] = useState((metadata as any)?.primaryRole || "");
  
  // Appearance
  const [eyeColor, setEyeColor] = useState((metadata as any)?.eyeColor || "");
  const [hairColor, setHairColor] = useState((metadata as any)?.hairColor || "");
  const [build, setBuild] = useState((metadata as any)?.build || "");
  const [clothingStyle, setClothingStyle] = useState((metadata as any)?.clothingStyle || "");
  const [distinguishingFeatures, setDistinguishingFeatures] = useState((metadata as any)?.distinguishingFeatures || "");
  
  // Personality & Motivations
  const [personalityTraits, setPersonalityTraits] = useState((metadata as any)?.personalityTraits || "");
  const [beliefs, setBeliefs] = useState((metadata as any)?.beliefs || "");
  const [motivations, setMotivations] = useState((metadata as any)?.motivations || "");
  const [conflicts, setConflicts] = useState((metadata as any)?.conflicts || "");
  
  // Abilities
  const [abilities, setAbilities] = useState<string[]>((metadata as any)?.abilities || []);
  const [newAbility, setNewAbility] = useState("");
  
  // Image
  const [imageUrl, setImageUrl] = useState((metadata as any)?.imageUrl || "");
  const [imageDescription, setImageDescription] = useState((metadata as any)?.imageDescription || "");

  // Section collapse states - smart defaults based on entry content
  const isNewEntry = !entry.id || entry.id === 0;
  const [basicInfoExpanded, setBasicInfoExpanded] = useState(isNewEntry || !age || !gender || !species);
  const [appearanceExpanded, setAppearanceExpanded] = useState(false);
  const [personalityExpanded, setPersonalityExpanded] = useState(false);
  const [abilitiesExpanded, setAbilitiesExpanded] = useState(false);
  const [relationshipsExpanded, setRelationshipsExpanded] = useState(false);
  const [backstoryExpanded, setBackstoryExpanded] = useState(false);
  const [researchExpanded, setResearchExpanded] = useState(false);

  const updateMutation = useUpdateStoryBibleEntry();
  const deleteMutation = useDeleteStoryBibleEntry();
  const { data: allEntries } = useStoryBibleEntries(projectId);
  const { toast } = useToast();

  // Available entries for linking (excluding current entry)
  const availableForLinking = (allEntries || []).filter(e => e.id !== entry.id);

  // Debounced save function
  const debouncedSave = debounce(
    (updates: any) => {
      updateMutation.mutate(
        { id: entry.id, ...updates },
        {
          onSuccess: () => {
            setSaveStatus('saved');
          },
          onError: () => {
            toast({
              title: "Failed to save",
              description: "There was an error saving your changes. Please try again.",
              variant: "destructive",
            });
            setSaveStatus('saved');
          }
        }
      );
    }, 1000);

  // Update metadata helper
  const updateMetadata = (newFields: Record<string, any>) => {
    const updatedMetadata = { ...metadata, ...newFields };
    setMetadata(updatedMetadata);
    if (!isInitialLoad) {
      setSaveStatus('saving');
      debouncedSave({ metadata: updatedMetadata });
    }
  };

  // Field change handlers
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (!isInitialLoad) {
      setSaveStatus('saving');
      debouncedSave({ title: newTitle });
    }
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    if (!isInitialLoad) {
      setSaveStatus('saving');
      debouncedSave({ category: value || null });
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    if (!isInitialLoad) {
      setSaveStatus('saving');
      debouncedSave({ content: newContent });
    }
  };

  const togglePriority = () => {
    const newPriority = priority > 0 ? 0 : 1;
    setPriority(newPriority);
    if (!isInitialLoad) {
      setSaveStatus('saving');
      debouncedSave({ priority: newPriority });
    }
  };

  const handleAddAbility = () => {
    if (newAbility.trim() && !abilities.includes(newAbility.trim())) {
      const updatedAbilities = [...abilities, newAbility.trim()];
      setAbilities(updatedAbilities);
      setNewAbility("");
      updateMetadata({ abilities: updatedAbilities });
    }
  };

  const handleRemoveAbility = (abilityToRemove: string) => {
    const updatedAbilities = abilities.filter(ability => ability !== abilityToRemove);
    setAbilities(updatedAbilities);
    updateMetadata({ abilities: updatedAbilities });
  };

  const handleAddRelatedEntry = (entryId: number) => {
    if (!relatedEntryIds.includes(entryId)) {
      const updatedIds = [...relatedEntryIds, entryId];
      setRelatedEntryIds(updatedIds);
      if (!isInitialLoad) {
        setSaveStatus('saving');
        debouncedSave({ relatedEntryIds: updatedIds });
      }
    }
  };

  const handleRemoveRelatedEntry = (entryId: number) => {
    const updatedIds = relatedEntryIds.filter(id => id !== entryId);
    setRelatedEntryIds(updatedIds);
    if (!isInitialLoad) {
      setSaveStatus('saving');
      debouncedSave({ relatedEntryIds: updatedIds });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(entry.id);
      toast({
        title: "Deleted",
        description: "Character deleted successfully",
      });
      onClose?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete character",
        variant: "destructive",
      });
    }
  };

  // Mark as loaded after first render to prevent initial saves
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [isInitialLoad]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Area (Sticky) */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <Input
                value={title}
                onChange={handleTitleChange}
                className="text-2xl font-bold border-none p-0 h-auto bg-transparent text-foreground"
                placeholder="Character name..."
              />
              {saveStatus === 'saving' && (
                <Badge variant="outline" className="text-xs mt-1">
                  Saving...
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {category && (
              <Badge variant="secondary">{category}</Badge>
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
                  <AlertDialogTitle>Delete Character</AlertDialogTitle>
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="age">Age</Label>
                      <Input
                        id="age"
                        value={age}
                        onChange={(e) => {
                          setAge(e.target.value);
                          updateMetadata({ age: e.target.value });
                        }}
                        placeholder="25"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Input
                        id="gender"
                        value={gender}
                        onChange={(e) => {
                          setGender(e.target.value);
                          updateMetadata({ gender: e.target.value });
                        }}
                        placeholder="Female"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="species">Species</Label>
                      <Input
                        id="species"
                        value={species}
                        onChange={(e) => {
                          setSpecies(e.target.value);
                          updateMetadata({ species: e.target.value });
                        }}
                        placeholder="Human"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="origin">Origin/Homeworld</Label>
                      <Input
                        id="origin"
                        value={origin}
                        onChange={(e) => {
                          setOrigin(e.target.value);
                          updateMetadata({ origin: e.target.value });
                        }}
                        placeholder="Earth"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="primaryRole">Primary Role</Label>
                      <Select 
                        value={primaryRole} 
                        onValueChange={(value) => {
                          setPrimaryRole(value);
                          updateMetadata({ primaryRole: value });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="protagonist">Protagonist</SelectItem>
                          <SelectItem value="antagonist">Antagonist</SelectItem>
                          <SelectItem value="supporting">Supporting Character</SelectItem>
                          <SelectItem value="minor">Minor Character</SelectItem>
                          <SelectItem value="cameo">Cameo/Background</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={category}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      placeholder="Main Characters, Villains, etc."
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Appearance Card */}
          <Collapsible open={appearanceExpanded} onOpenChange={setAppearanceExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-xl flex items-center justify-between">
                    Appearance
                    {appearanceExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="eyeColor">Eye Color</Label>
                      <Input
                        id="eyeColor"
                        value={eyeColor}
                        onChange={(e) => {
                          setEyeColor(e.target.value);
                          updateMetadata({ eyeColor: e.target.value });
                        }}
                        placeholder="Brown"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hairColor">Hair Color</Label>
                      <Input
                        id="hairColor"
                        value={hairColor}
                        onChange={(e) => {
                          setHairColor(e.target.value);
                          updateMetadata({ hairColor: e.target.value });
                        }}
                        placeholder="Black"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="build">Build</Label>
                      <Input
                        id="build"
                        value={build}
                        onChange={(e) => {
                          setBuild(e.target.value);
                          updateMetadata({ build: e.target.value });
                        }}
                        placeholder="Athletic"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clothingStyle">Clothing Style</Label>
                      <Input
                        id="clothingStyle"
                        value={clothingStyle}
                        onChange={(e) => {
                          setClothingStyle(e.target.value);
                          updateMetadata({ clothingStyle: e.target.value });
                        }}
                        placeholder="Casual, formal, etc."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="distinguishingFeatures">Distinguishing Features</Label>
                    <Textarea
                      id="distinguishingFeatures"
                      value={distinguishingFeatures}
                      onChange={(e) => {
                        setDistinguishingFeatures(e.target.value);
                        updateMetadata({ distinguishingFeatures: e.target.value });
                      }}
                      placeholder="Scars, tattoos, unique characteristics..."
                      className="min-h-20"
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Personality & Motivations Card */}
          <Collapsible open={personalityExpanded} onOpenChange={setPersonalityExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-xl flex items-center justify-between">
                    Personality & Motivations
                    {personalityExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="personalityTraits">Personality Traits</Label>
                    <Textarea
                      id="personalityTraits"
                      value={personalityTraits}
                      onChange={(e) => {
                        setPersonalityTraits(e.target.value);
                        updateMetadata({ personalityTraits: e.target.value });
                      }}
                      placeholder="Brave, loyal, impulsive..."
                      className="min-h-20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="beliefs">Beliefs</Label>
                    <Textarea
                      id="beliefs"
                      value={beliefs}
                      onChange={(e) => {
                        setBeliefs(e.target.value);
                        updateMetadata({ beliefs: e.target.value });
                      }}
                      placeholder="Core values, worldview, philosophy..."
                      className="min-h-20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="motivations">Motivations</Label>
                    <Textarea
                      id="motivations"
                      value={motivations}
                      onChange={(e) => {
                        setMotivations(e.target.value);
                        updateMetadata({ motivations: e.target.value });
                      }}
                      placeholder="What drives this character..."
                      className="min-h-20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="conflicts">Conflicts</Label>
                    <Textarea
                      id="conflicts"
                      value={conflicts}
                      onChange={(e) => {
                        setConflicts(e.target.value);
                        updateMetadata({ conflicts: e.target.value });
                      }}
                      placeholder="Internal struggles, external obstacles..."
                      className="min-h-20"
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Abilities/Skills Card */}
          <Collapsible open={abilitiesExpanded} onOpenChange={setAbilitiesExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-xl flex items-center justify-between">
                    Abilities & Skills
                    {abilitiesExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  {/* Current Abilities */}
                  {abilities.length > 0 && (
                    <div className="space-y-2">
                      {abilities.map((ability, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <span>{ability}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAbility(ability)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add New Ability */}
                  <div className="flex gap-2">
                    <Input
                      value={newAbility}
                      onChange={(e) => setNewAbility(e.target.value)}
                      placeholder="Enter an ability or skill..."
                      onKeyPress={(e) => e.key === 'Enter' && handleAddAbility()}
                    />
                    <Button onClick={handleAddAbility} disabled={!newAbility.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Backstory/Notes Card */}
          <Collapsible open={backstoryExpanded} onOpenChange={setBackstoryExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-xl flex items-center justify-between">
                    Backstory & Notes
                    {backstoryExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <Textarea
                    value={content}
                    onChange={handleContentChange}
                    placeholder="Character's backstory, detailed notes, development ideas..."
                    className="min-h-[300px] resize-none"
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          
          {/* Relationships Card */}
          <Collapsible open={relationshipsExpanded} onOpenChange={setRelationshipsExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-lg flex items-center justify-between">
                    Relationships
                    {relationshipsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-3">
                  {/* Current Related Entries */}
                  {relatedEntryIds.length > 0 && (
                    <div className="space-y-2">
                      {relatedEntryIds.map(id => {
                        const relatedEntry = availableForLinking.find(e => e.id === id);
                        if (!relatedEntry) return null;
                        return (
                          <div key={id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
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
                              <X className="h-3 w-3" />
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
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {tags.length === 0 && (
                  <p className="text-sm text-muted-foreground">No tags added</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Character Image Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Character Image
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
                title="Character Image"
                placeholder="Add character image"
              />
            </CardContent>
          </Card>

          {/* Research/References Card */}
          <Collapsible open={researchExpanded} onOpenChange={setResearchExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-lg flex items-center justify-between">
                    Research & References
                    {researchExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Link to research entries, reference images, or inspiration sources...
                  </p>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

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
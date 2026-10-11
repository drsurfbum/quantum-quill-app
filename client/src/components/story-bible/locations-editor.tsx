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
import { Save, Trash2, Archive, ArchiveRestore, Star, StarOff, ChevronDown, ChevronRight, Plus, X, MapPin, ImageIcon } from "lucide-react";
import { useDeleteStoryBibleEntry, useStoryBibleEntries, useCreateStoryBibleEntry } from "@/hooks/use-story-bible";
import { useToast } from "@/hooks/use-toast";
import { FileUpload } from "@/components/ui/file-upload";
import { StoryBibleEntry } from "@shared/schema";

interface LocationsEditorProps {
  entry: StoryBibleEntry;
  projectId: number;
  onClose?: () => void;
}

export function LocationsEditor({ entry, projectId, onClose }: LocationsEditorProps) {
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

  // Location-specific fields from metadata
  const [locationType, setLocationType] = useState((metadata as any)?.locationType || "");
  const [status, setStatus] = useState((metadata as any)?.status || "inhabited");
  const [tagline, setTagline] = useState((metadata as any)?.tagline || "");
  const [parentLocation, setParentLocation] = useState((metadata as any)?.parentLocation || "");
  
  // Physical & Environmental Details
  const [environment, setEnvironment] = useState((metadata as any)?.environment || "");
  const [coordinates, setCoordinates] = useState((metadata as any)?.coordinates || "");
  const [size, setSize] = useState((metadata as any)?.size || "");
  const [gravity, setGravity] = useState((metadata as any)?.gravity || "");
  const [atmosphere, setAtmosphere] = useState((metadata as any)?.atmosphere || "");
  const [capacity, setCapacity] = useState((metadata as any)?.capacity || "");
  const [layout, setLayout] = useState((metadata as any)?.layout || "");
  
  // Significance & Function
  const [purpose, setPurpose] = useState((metadata as any)?.purpose || "");
  const [keyFeatures, setKeyFeatures] = useState<string[]>((metadata as any)?.keyFeatures || []);
  
  // History & Timeline
  const [eraEstablished, setEraEstablished] = useState((metadata as any)?.eraEstablished || "");
  const [statusChanges, setStatusChanges] = useState((metadata as any)?.statusChanges || "");
  
  // Inhabitants & Governance
  const [controllingGroups, setControllingGroups] = useState<number[]>((metadata as any)?.controllingGroups || []);
  const [notableCharacters, setNotableCharacters] = useState<{id: number, role: string}[]>((metadata as any)?.notableCharacters || []);
  
  // Relational Connections
  const [nearbyLocations, setNearbyLocations] = useState<number[]>((metadata as any)?.nearbyLocations || []);
  const [worldElements, setWorldElements] = useState<string[]>((metadata as any)?.worldElements || []);
  
  // Image
  const [imageUrl, setImageUrl] = useState((metadata as any)?.imageUrl || "");
  const [imageDescription, setImageDescription] = useState((metadata as any)?.imageDescription || "");
  
  // Form helpers
  const [newKeyFeature, setNewKeyFeature] = useState("");
  const [newWorldElement, setNewWorldElement] = useState("");

  // Section collapse states - smart defaults
  const isNewEntry = !entry.id || entry.id === 0;
  const [coreInfoExpanded, setCoreInfoExpanded] = useState(isNewEntry || !locationType || !tagline);
  const [physicalExpanded, setPhysicalExpanded] = useState(false);
  const [significanceExpanded, setSignificanceExpanded] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [inhabitantsExpanded, setInhabitantsExpanded] = useState(false);
  const [relationalExpanded, setRelationalExpanded] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);

  const deleteMutation = useDeleteStoryBibleEntry();
  const createMutation = useCreateStoryBibleEntry();
  const { data: allEntries } = useStoryBibleEntries(projectId);
  const { toast } = useToast();

  // Available entries for linking
  const availableForLinking = (allEntries || []).filter(e => e.id !== entry.id);
  const locationEntries = availableForLinking.filter(e => e.entryType === "locations");
  const characterEntries = availableForLinking.filter(e => e.entryType === "characters");
  const groupEntries = availableForLinking.filter(e => e.entryType === "groups_races");

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
  const handleAddKeyFeature = () => {
    if (newKeyFeature.trim() && !keyFeatures.includes(newKeyFeature.trim())) {
      const updatedFeatures = [...keyFeatures, newKeyFeature.trim()];
      setKeyFeatures(updatedFeatures);
      setNewKeyFeature("");
      updateMetadata({ keyFeatures: updatedFeatures });
    }
  };

  const handleRemoveKeyFeature = (featureToRemove: string) => {
    const updatedFeatures = keyFeatures.filter(feature => feature !== featureToRemove);
    setKeyFeatures(updatedFeatures);
    updateMetadata({ keyFeatures: updatedFeatures });
  };

  const handleAddWorldElement = () => {
    if (newWorldElement.trim() && !worldElements.includes(newWorldElement.trim())) {
      const updatedElements = [...worldElements, newWorldElement.trim()];
      setWorldElements(updatedElements);
      setNewWorldElement("");
      updateMetadata({ worldElements: updatedElements });
    }
  };

  const handleRemoveWorldElement = (elementToRemove: string) => {
    const updatedElements = worldElements.filter(element => element !== elementToRemove);
    setWorldElements(updatedElements);
    updateMetadata({ worldElements: updatedElements });
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

  const handleAddNearbyLocation = (locationId: number) => {
    if (!nearbyLocations.includes(locationId)) {
      const updatedNearby = [...nearbyLocations, locationId];
      setNearbyLocations(updatedNearby);
      updateMetadata({ nearbyLocations: updatedNearby });
    }
  };

  const handleRemoveNearbyLocation = (locationId: number) => {
    const updatedNearby = nearbyLocations.filter(id => id !== locationId);
    setNearbyLocations(updatedNearby);
    updateMetadata({ nearbyLocations: updatedNearby });
  };

  const handleDelete = async () => {
    if (!await autosave.flush()) return;
    try {
      await deleteMutation.mutateAsync(entry.id);
      toast({
        title: "Deleted",
        description: "Location deleted successfully",
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

  const isPlanetaryBody = ["planet", "moon", "asteroid"].includes(locationType);
  const isStructure = ["city", "station", "structure", "building"].includes(locationType);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Area (Sticky) */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <MapPin className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor={`locations-title-${entry.id}`}>Location name</Label>
                <Input
                  id={`locations-title-${entry.id}`}
                  value={title}
                  onChange={handleTitleChange}
                  className="text-2xl font-bold h-12"
                  placeholder="Location name..."
                />
              </div>
              <SaveStatus status={saveStatus} retry={autosave.flush} />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {locationType && (
              <Badge variant="secondary">{locationType}</Badge>
            )}
            {status && (
              <Badge variant={status === "inhabited" ? "default" : status === "abandoned" ? "destructive" : "secondary"}>
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
                  <AlertDialogTitle>Delete Location</AlertDialogTitle>
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
          
          {/* Core Info Card */}
          <Collapsible open={coreInfoExpanded} onOpenChange={setCoreInfoExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-xl flex items-center justify-between">
                    Core Info
                    {coreInfoExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="locationType">Type</Label>
                      <Select 
                        value={locationType} 
                        onValueChange={(value) => {
                          setLocationType(value);
                          updateMetadata({ locationType: value });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="planet">Planet</SelectItem>
                          <SelectItem value="moon">Moon</SelectItem>
                          <SelectItem value="asteroid">Asteroid</SelectItem>
                          <SelectItem value="city">City</SelectItem>
                          <SelectItem value="station">Station</SelectItem>
                          <SelectItem value="structure">Structure/Building</SelectItem>
                          <SelectItem value="region">Region/Territory</SelectItem>
                          <SelectItem value="dimension">Dimension/Realm</SelectItem>
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
                          <SelectItem value="inhabited">Inhabited</SelectItem>
                          <SelectItem value="abandoned">Abandoned</SelectItem>
                          <SelectItem value="destroyed">Destroyed</SelectItem>
                          <SelectItem value="hidden">Hidden/Secret</SelectItem>
                          <SelectItem value="construction">Under Construction</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="parentLocation">Parent Location</Label>
                    <Select 
                      value={parentLocation || "none"}
                      onValueChange={async (value) => {
                        if (value === "__create_new__") {
                          const locationName = prompt("Enter name for new location:");
                          if (locationName?.trim()) {
                            try {
                              const newLocation = await createMutation.mutateAsync({
                                projectId,
                                entryType: "locations",
                                title: locationName.trim(),
                                content: "",
                              });
                              const newValue = newLocation.data.id.toString();
                              setParentLocation(newValue);
                              updateMetadata({ parentLocation: newValue });
                              toast({
                                title: "Location created",
                                description: `Created "${locationName.trim()}" and set as parent location`,
                              });
                            } catch (error) {
                              toast({
                                title: "Error",
                                description: "Failed to create new location",
                                variant: "destructive",
                              });
                            }
                          }
                        } else {
                          const newValue = value === "none" ? "" : value;
                          setParentLocation(newValue);
                          updateMetadata({ parentLocation: newValue });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent location..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- No Parent Location --</SelectItem>
                        {locationEntries.map((location) => (
                          <SelectItem key={location.id} value={location.id.toString()}>
                            {location.title}
                          </SelectItem>
                        ))}
                        <SelectItem value="__create_new__" className="text-blue-600 font-medium">
                          + Create New Location
                        </SelectItem>
                      </SelectContent>
                    </Select>
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
                      placeholder="Brief description or key characteristic..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category Tag</Label>
                    <Input
                      id="category"
                      value={category}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      placeholder="Core Worlds, Frontier, Hidden Bases, etc."
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Physical & Environmental Details Card */}
          <Collapsible open={physicalExpanded} onOpenChange={setPhysicalExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-xl flex items-center justify-between">
                    Physical & Environmental Details
                    {physicalExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="environment">Environment/Biome</Label>
                      <Select 
                        value={environment} 
                        onValueChange={(value) => {
                          setEnvironment(value);
                          updateMetadata({ environment: value });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select environment..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="desert">Desert</SelectItem>
                          <SelectItem value="forest">Forest</SelectItem>
                          <SelectItem value="ice">Ice/Arctic</SelectItem>
                          <SelectItem value="ocean">Ocean/Aquatic</SelectItem>
                          <SelectItem value="volcanic">Volcanic</SelectItem>
                          <SelectItem value="urban">Urban</SelectItem>
                          <SelectItem value="industrial">Industrial</SelectItem>
                          <SelectItem value="space">Space/Void</SelectItem>
                          <SelectItem value="underground">Underground</SelectItem>
                          <SelectItem value="mountain">Mountain/Highland</SelectItem>
                          <SelectItem value="tropical">Tropical</SelectItem>
                          <SelectItem value="artificial">Artificial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="coordinates">Coordinates/Map Reference</Label>
                      <Input
                        id="coordinates"
                        value={coordinates}
                        onChange={(e) => {
                          setCoordinates(e.target.value);
                          updateMetadata({ coordinates: e.target.value });
                        }}
                        placeholder="Sector 7-G, Grid 42.3N 18.7E, etc."
                      />
                    </div>
                  </div>

                  {isPlanetaryBody && (
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm text-muted-foreground">Planetary Metrics</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="size">Size</Label>
                          <Input
                            id="size"
                            value={size}
                            onChange={(e) => {
                              setSize(e.target.value);
                              updateMetadata({ size: e.target.value });
                            }}
                            placeholder="Earth-size, 0.8x Earth, etc."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gravity">Gravity</Label>
                          <Input
                            id="gravity"
                            value={gravity}
                            onChange={(e) => {
                              setGravity(e.target.value);
                              updateMetadata({ gravity: e.target.value });
                            }}
                            placeholder="1.2G, Low, High, etc."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="atmosphere">Atmosphere</Label>
                          <Input
                            id="atmosphere"
                            value={atmosphere}
                            onChange={(e) => {
                              setAtmosphere(e.target.value);
                              updateMetadata({ atmosphere: e.target.value });
                            }}
                            placeholder="Breathable, Toxic, None, etc."
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {isStructure && (
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm text-muted-foreground">Structure Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="capacity">Capacity</Label>
                          <Input
                            id="capacity"
                            value={capacity}
                            onChange={(e) => {
                              setCapacity(e.target.value);
                              updateMetadata({ capacity: e.target.value });
                            }}
                            placeholder="Population, docking bays, etc."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="layout">Layout</Label>
                          <Input
                            id="layout"
                            value={layout}
                            onChange={(e) => {
                              setLayout(e.target.value);
                              updateMetadata({ layout: e.target.value });
                            }}
                            placeholder="Levels, districts, sections..."
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Significance & Function Card */}
          <Collapsible open={significanceExpanded} onOpenChange={setSignificanceExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-xl flex items-center justify-between">
                    Significance & Function
                    {significanceExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="purpose">Purpose</Label>
                    <Textarea
                      id="purpose"
                      value={purpose}
                      onChange={(e) => {
                        setPurpose(e.target.value);
                        updateMetadata({ purpose: e.target.value });
                      }}
                      placeholder="Military base, trading hub, hidden temple, residential area, research facility..."
                      className="min-h-20"
                    />
                  </div>

                  <div className="space-y-4">
                    <Label>Key Features & Facilities</Label>
                    {keyFeatures.length > 0 && (
                      <div className="space-y-2">
                        {keyFeatures.map((feature, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <span>{feature}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveKeyFeature(feature)}
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
                        value={newKeyFeature}
                        onChange={(e) => setNewKeyFeature(e.target.value)}
                        placeholder="Add key feature or facility..."
                        onKeyPress={(e) => e.key === 'Enter' && handleAddKeyFeature()}
                      />
                      <Button onClick={handleAddKeyFeature} disabled={!newKeyFeature.trim()}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* History & Timeline Card */}
          <Collapsible open={historyExpanded} onOpenChange={setHistoryExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-xl flex items-center justify-between">
                    History & Timeline
                    {historyExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="eraEstablished">Founding/Creation Date</Label>
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
                      <Label htmlFor="statusChanges">Status Changes</Label>
                      <Input
                        id="statusChanges"
                        value={statusChanges}
                        onChange={(e) => {
                          setStatusChanges(e.target.value);
                          updateMetadata({ statusChanges: e.target.value });
                        }}
                        placeholder="Destroyed 2401, Rebuilt 2405, etc."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="history">Major Events & History</Label>
                    <Textarea
                      id="history"
                      value={content}
                      onChange={handleContentChange}
                      placeholder="Founding story, major events, historical significance, battles fought here..."
                      className="min-h-[200px] resize-none"
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Inhabitants & Governance Card */}
          <Collapsible open={inhabitantsExpanded} onOpenChange={setInhabitantsExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-xl flex items-center justify-between">
                    Inhabitants & Governance
                    {inhabitantsExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Controlling Groups/Races</Label>
                    <div className="space-y-2">
                      {groupEntries.map((group) => (
                        <div key={group.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <span className="font-medium">{group.title}</span>
                            <Badge variant="outline" className="ml-2 text-xs">Controller</Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddRelatedEntry(group.id)}
                            disabled={relatedEntryIds.includes(group.id)}
                          >
                            {relatedEntryIds.includes(group.id) ? "Linked" : "Link"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Notable Characters</Label>
                    <div className="space-y-2">
                      {characterEntries.map((character) => (
                        <div key={character.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <span className="font-medium">{character.title}</span>
                            <Badge variant="outline" className="ml-2 text-xs">Resident</Badge>
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
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Relational Connections Card */}
          <Collapsible open={relationalExpanded} onOpenChange={setRelationalExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-xl flex items-center justify-between">
                    Relational Connections
                    {relationalExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <Label>Nearby or Connected Locations</Label>
                    {nearbyLocations.length > 0 && (
                      <div className="space-y-2">
                        {nearbyLocations.map((locationId) => {
                          const location = locationEntries.find(l => l.id === locationId);
                          if (!location) return null;
                          return (
                            <div key={locationId} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                              <span>{location.title}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveNearbyLocation(locationId)}
                                className="h-6 w-6 p-0"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <Select onValueChange={(value) => handleAddNearbyLocation(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Add nearby location..." />
                      </SelectTrigger>
                      <SelectContent>
                        {locationEntries
                          .filter(location => !nearbyLocations.includes(location.id))
                          .map((location) => (
                            <SelectItem key={location.id} value={location.id.toString()}>
                              {location.title}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <Label>World Elements Present</Label>
                    {worldElements.length > 0 && (
                      <div className="space-y-2">
                        {worldElements.map((element, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                            <span>{element}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveWorldElement(element)}
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
                        value={newWorldElement}
                        onChange={(e) => setNewWorldElement(e.target.value)}
                        placeholder="Add flora, fauna, technology, resource..."
                        onKeyPress={(e) => e.key === 'Enter' && handleAddWorldElement()}
                      />
                      <Button onClick={handleAddWorldElement} disabled={!newWorldElement.trim()}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Notes / Development Ideas Card */}
          <Collapsible open={notesExpanded} onOpenChange={setNotesExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-xl flex items-center justify-between">
                    Notes & Development Ideas
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
                    placeholder="Future expansion ideas, plot hooks, lore puzzles, development notes..."
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
                {locationType && <Badge variant="secondary">{locationType}</Badge>}
                {status && <Badge variant={status === "inhabited" ? "default" : status === "abandoned" ? "destructive" : "secondary"}>{status}</Badge>}
                {environment && <Badge variant="outline">{environment}</Badge>}
              </div>
            </CardContent>
          </Card>

          {/* Location Image */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Location Image
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload
                imageUrl={imageUrl}
                imageDescription={imageDescription}
                onImageChange={(url: string, description?: string) => {
                  setImageUrl(url);
                  setImageDescription(description || "");
                  updateMetadata({ imageUrl: url, imageDescription: description || "" });
                }}
                onRemoveImage={() => {
                  setImageUrl("");
                  setImageDescription("");
                  updateMetadata({ imageUrl: "", imageDescription: "" });
                }}
                title="Location Image"
                placeholder="Add location image"
              />
            </CardContent>
          </Card>

          {/* Tags & Significance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tags & Significance</CardTitle>
            </CardHeader>
            <CardContent>
              <TagInput tags={tags} onChange={(next) => { setTags(next); autosave.save({ tags: next }); }} />
            </CardContent>
          </Card>

          {/* Links & Related Entries */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Links & Related Entries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                          <div className="text-xs text-muted-foreground capitalize">
                            {relatedEntry.entryType.replace('_', ' ')}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveRelatedEntry(id)}
                          className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                          title="Unlink entry"
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
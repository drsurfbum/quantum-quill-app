import { useState, useEffect, useCallback } from "react";
import { StoryBibleEntry } from "@shared/schema";
import { useUpdateStoryBibleEntry, useDeleteStoryBibleEntry, useStoryBibleEntries } from "@/hooks/use-story-bible";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Save, Trash2, User, Plus, X, Check } from "lucide-react";
import { debounce } from "lodash";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CharacterData {
  // Basic Info
  name?: string;
  age?: string;
  gender?: string;
  species?: string;
  origin?: string;
  
  // Appearance
  appearance?: {
    eyeColor?: string;
    hairColor?: string;
    height?: string;
    build?: string;
    distinguishingFeatures?: string;
    clothingStyle?: string;
    portraitUrl?: string;
  };
  
  // Abilities & Traits
  abilities?: {
    powers?: string[];
    skills?: string[];
    talents?: string[];
    training?: string[];
  };
  
  // Personality & Beliefs
  personality?: {
    traits?: string[];
    beliefs?: string;
    values?: string;
    motivations?: string;
    conflicts?: string;
  };
  
  // Associations
  associations?: {
    characters?: string[];
    locations?: string[];
    factions?: string[];
    events?: string[];
  };
  
  // Miscellaneous
  notes?: string;
  quotes?: string[];
  backstory?: string;
}

interface CharacterSheetProps {
  entry: StoryBibleEntry;
  projectId: number;
}

export default function CharacterSheet({ entry, projectId }: CharacterSheetProps) {
  const { toast } = useToast();
  const [saveButtonClicked, setSaveButtonClicked] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Parse character data from content
  const [characterData, setCharacterData] = useState<CharacterData>(() => {
    try {
      if (entry.content && entry.content.trim() !== '') {
        const parsed = JSON.parse(entry.content);
        return parsed;
      }
    } catch (e) {
      // If content isn't JSON, treat as legacy freeform content
      if (entry.content && entry.content.trim() !== '') {
        return { notes: entry.content };
      }
    }
    return {};
  });

  const [title, setTitle] = useState(entry.title);
  
  const { mutate: updateEntry, isError: isUpdateError } = useUpdateStoryBibleEntry();
  const { mutate: deleteEntry, isError: isDeleteError } = useDeleteStoryBibleEntry();
  const { data: allEntries = [] } = useStoryBibleEntries(projectId);

  // Reset state when entry changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setTitle(entry.title);
      try {
        if (entry.content && entry.content.trim() !== '') {
          const parsed = JSON.parse(entry.content);
          setCharacterData(parsed);
        } else {
          setCharacterData({});
        }
      } catch (e) {
        if (entry.content && entry.content.trim() !== '') {
          setCharacterData({ notes: entry.content });
        } else {
          setCharacterData({});
        }
      }
      setIsInitialLoad(false);
    }, 50);
    
    return () => clearTimeout(timer);
  }, [entry]);

  // Handle update errors
  useEffect(() => {
    if (isUpdateError) {
      toast({
        title: "Failed to save",
        description: "There was an error saving your changes. Please try again.",
        variant: "destructive",
      });
    }
  }, [isUpdateError, toast]);

  // Handle delete errors
  useEffect(() => {
    if (isDeleteError) {
      toast({
        title: "Error deleting character",
        description: "There was an error deleting the character. Please try again.",
        variant: "destructive",
      });
    }
  }, [isDeleteError, toast]);

  // Create a stable debounced save function
  const debouncedSave = useCallback(
    debounce((newTitle: string, newData: CharacterData) => {
      if (isInitialLoad) return;
      
      const jsonContent = JSON.stringify(newData, null, 2);
      const titleUnchanged = entry.title === newTitle;
      const contentUnchanged = entry.content === jsonContent;
      
      if (titleUnchanged && contentUnchanged) return;

      updateEntry({ 
        id: entry.id, 
        title: newTitle, 
        content: jsonContent
      });
    }, 3000),
    [entry.id, entry.title, entry.content, updateEntry, isInitialLoad]
  );

  // Update functions
  const updateCharacterData = useCallback((updates: Partial<CharacterData>) => {
    const newData = { ...characterData, ...updates };
    setCharacterData(newData);
    debouncedSave(title, newData);
  }, [characterData, title, debouncedSave]);

  const updateNestedData = useCallback((path: keyof CharacterData, updates: any) => {
    const currentValue = characterData[path] as any;
    const newData = { 
      ...characterData, 
      [path]: { ...(currentValue || {}), ...updates } 
    };
    setCharacterData(newData);
    debouncedSave(title, newData);
  }, [characterData, title, debouncedSave]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    debouncedSave(newTitle, characterData);
  }, [characterData, debouncedSave]);

  const handleSave = useCallback(() => {
    setSaveButtonClicked(true);
    const jsonContent = JSON.stringify(characterData, null, 2);
    updateEntry({ 
      id: entry.id, 
      title, 
      content: jsonContent
    });
    
    setTimeout(() => {
      setSaveButtonClicked(false);
    }, 1000);
  }, [entry.id, title, characterData, updateEntry]);

  const handleDelete = useCallback(() => {
    deleteEntry({ id: entry.id, projectId });
    setIsDeleteDialogOpen(false);
  }, [entry.id, projectId, deleteEntry]);

  // Helper functions for array management
  const addToArray = (path: keyof CharacterData, subPath: string, value: string) => {
    if (!value.trim()) return;
    
    const currentArray = (characterData[path] as any)?.[subPath] || [];
    if (!currentArray.includes(value.trim())) {
      updateNestedData(path, { [subPath]: [...currentArray, value.trim()] });
    }
  };

  const removeFromArray = (path: keyof CharacterData, subPath: string, index: number) => {
    const currentArray = (characterData[path] as any)?.[subPath] || [];
    const newArray = currentArray.filter((_: any, i: number) => i !== index);
    updateNestedData(path, { [subPath]: newArray });
  };

  return (
    <div className="flex-grow flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-white dark:bg-neutral-900">
        <div className="flex items-center space-x-3 flex-1">
          <Avatar className="h-10 w-10">
            <AvatarImage src={characterData.appearance?.portraitUrl} />
            <AvatarFallback>
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <Input 
            value={title}
            onChange={handleTitleChange}
            className="font-medium text-xl border-0 px-0 max-w-md focus-visible:ring-0"
            placeholder="Character Name"
          />
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="text-red-500"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
          <Button
            onClick={handleSave}
            size="sm"
            className={cn(
              "transition-colors duration-200",
              saveButtonClicked && "bg-green-500 hover:bg-green-600 text-white"
            )}
          >
            {saveButtonClicked ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saveButtonClicked ? "Saved!" : "Save"}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow overflow-y-auto p-6 bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    value={characterData.age || ''}
                    onChange={(e) => updateCharacterData({ age: e.target.value })}
                    placeholder="Age or age range"
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Input
                    id="gender"
                    value={characterData.gender || ''}
                    onChange={(e) => updateCharacterData({ gender: e.target.value })}
                    placeholder="Gender identity"
                  />
                </div>
                <div>
                  <Label htmlFor="species">Species/Race</Label>
                  <Input
                    id="species"
                    value={characterData.species || ''}
                    onChange={(e) => updateCharacterData({ species: e.target.value })}
                    placeholder="Human, Elf, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="origin">Origin/Homeworld</Label>
                  <Input
                    id="origin"
                    value={characterData.origin || ''}
                    onChange={(e) => updateCharacterData({ origin: e.target.value })}
                    placeholder="Where they're from"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Appearance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Appearance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="eyeColor">Eye Color</Label>
                    <Input
                      id="eyeColor"
                      value={characterData.appearance?.eyeColor || ''}
                      onChange={(e) => updateNestedData('appearance', { eyeColor: e.target.value })}
                      placeholder="Blue, brown, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="hairColor">Hair Color</Label>
                    <Input
                      id="hairColor"
                      value={characterData.appearance?.hairColor || ''}
                      onChange={(e) => updateNestedData('appearance', { hairColor: e.target.value })}
                      placeholder="Blonde, black, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="height">Height</Label>
                    <Input
                      id="height"
                      value={characterData.appearance?.height || ''}
                      onChange={(e) => updateNestedData('appearance', { height: e.target.value })}
                      placeholder="5'6, tall, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="build">Build</Label>
                    <Input
                      id="build"
                      value={characterData.appearance?.build || ''}
                      onChange={(e) => updateNestedData('appearance', { build: e.target.value })}
                      placeholder="Athletic, slim, etc."
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="clothingStyle">Clothing Style</Label>
                  <Textarea
                    id="clothingStyle"
                    value={characterData.appearance?.clothingStyle || ''}
                    onChange={(e) => updateNestedData('appearance', { clothingStyle: e.target.value })}
                    placeholder="Describe their typical attire..."
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="distinguishingFeatures">Distinguishing Features</Label>
                  <Textarea
                    id="distinguishingFeatures"
                    value={characterData.appearance?.distinguishingFeatures || ''}
                    onChange={(e) => updateNestedData('appearance', { distinguishingFeatures: e.target.value })}
                    placeholder="Scars, tattoos, unique features..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Abilities & Traits */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Abilities & Traits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {['powers', 'skills', 'talents', 'training'].map((category) => (
                  <div key={category}>
                    <Label className="capitalize">{category}</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {((characterData.abilities as any)?.[category] || []).map((item: string, index: number) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {item}
                          <button
                            onClick={() => removeFromArray('abilities', category, index)}
                            className="ml-1 hover:bg-red-500 hover:text-white rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder={`Add ${category.slice(0, -1)}...`}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addToArray('abilities', category, e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          addToArray('abilities', category, input.value);
                          input.value = '';
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Personality & Beliefs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Personality & Beliefs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Personality Traits</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(characterData.personality?.traits || []).map((trait: string, index: number) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {trait}
                        <button
                          onClick={() => removeFromArray('personality', 'traits', index)}
                          className="ml-1 hover:bg-red-500 hover:text-white rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add personality trait..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addToArray('personality', 'traits', e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        addToArray('personality', 'traits', input.value);
                        input.value = '';
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="beliefs">Beliefs</Label>
                  <Textarea
                    id="beliefs"
                    value={characterData.personality?.beliefs || ''}
                    onChange={(e) => updateNestedData('personality', { beliefs: e.target.value })}
                    placeholder="Political, religious, philosophical beliefs..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="values">Core Values</Label>
                  <Textarea
                    id="values"
                    value={characterData.personality?.values || ''}
                    onChange={(e) => updateNestedData('personality', { values: e.target.value })}
                    placeholder="What does this character value most?"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="motivations">Motivations</Label>
                  <Textarea
                    id="motivations"
                    value={characterData.personality?.motivations || ''}
                    onChange={(e) => updateNestedData('personality', { motivations: e.target.value })}
                    placeholder="What drives this character?"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="conflicts">Internal Conflicts</Label>
                  <Textarea
                    id="conflicts"
                    value={characterData.personality?.conflicts || ''}
                    onChange={(e) => updateNestedData('personality', { conflicts: e.target.value })}
                    placeholder="Internal struggles, contradictions..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Miscellaneous Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Additional Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="backstory">Backstory</Label>
                  <Textarea
                    id="backstory"
                    value={characterData.backstory || ''}
                    onChange={(e) => updateCharacterData({ backstory: e.target.value })}
                    placeholder="Character's history and background..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label>Memorable Quotes</Label>
                  <div className="space-y-2 mb-2">
                    {(characterData.quotes || []).map((quote: string, index: number) => (
                      <div key={index} className="flex items-start gap-2 p-2 bg-neutral-100 dark:bg-neutral-800 rounded">
                        <span className="flex-1 italic">"{quote}"</span>
                        <button
                          onClick={() => {
                            const newQuotes = [...(characterData.quotes || [])];
                            newQuotes.splice(index, 1);
                            updateCharacterData({ quotes: newQuotes });
                          }}
                          className="hover:bg-red-500 hover:text-white rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add memorable quote..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const value = e.currentTarget.value;
                          if (value.trim()) {
                            const newQuotes = [...(characterData.quotes || []), value.trim()];
                            updateCharacterData({ quotes: newQuotes });
                            e.currentTarget.value = '';
                          }
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        const value = input.value;
                        if (value.trim()) {
                          const newQuotes = [...(characterData.quotes || []), value.trim()];
                          updateCharacterData({ quotes: newQuotes });
                          input.value = '';
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">General Notes</Label>
                  <Textarea
                    id="notes"
                    value={characterData.notes || ''}
                    onChange={(e) => updateCharacterData({ notes: e.target.value })}
                    placeholder="Additional notes, quirks, voice notes..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Associations */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Associations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {['characters', 'locations', 'factions', 'events'].map((category) => (
                  <div key={category}>
                    <Label className="capitalize">{category}</Label>
                    <div className="space-y-2 mb-2">
                      {((characterData.associations as any)?.[category] || []).map((item: string, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-neutral-100 dark:bg-neutral-800 rounded">
                          <span className="text-sm">{item}</span>
                          <button
                            onClick={() => removeFromArray('associations', category, index)}
                            className="hover:bg-red-500 hover:text-white rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder={`Add ${category.slice(0, -1)}...`}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addToArray('associations', category, e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          addToArray('associations', category, input.value);
                          input.value = '';
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Character</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this character? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
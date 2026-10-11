import { bibleEntryArchived, bibleEntrySearchText } from "@/lib/story-bible-data";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Search, Star, Users, MapPin, Calendar, Zap, FileText, BookOpen, ChevronDown, ChevronUp, Edit2, MoreHorizontal, Filter } from "lucide-react";
import { StoryBibleEntry } from "@shared/schema";
import { useStoryBibleEntries, useUpdateStoryBibleEntry } from "@/hooks/use-story-bible";
import { ENHANCED_TAXONOMY, getEnhancedTaxonomyByKey } from "@shared/enhanced-taxonomy";
import { apiRequest } from "@/lib/queryClient";

interface SimplifiedBentoDashboardProps {
  projectId: number;
  onCreateEntry: (entryType: string) => void;
  onEditEntry: (entry: StoryBibleEntry) => void;
}

// Icon mapping for entry types
const ENTRY_TYPE_ICONS = {
  characters: Users,
  groups_races: Users,
  locations: MapPin,
  events: Calendar,
  world_elements: Zap,
  details: FileText,
  research: BookOpen,
} as const;

export function SimplifiedBentoDashboard({ projectId, onCreateEntry, onEditEntry }: SimplifiedBentoDashboardProps) {
  const [archiveFilter, setArchiveFilter] = useState("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEntryType, setSelectedEntryType] = useState<string>("all");
  const [tileCategories, setTileCategories] = useState<Record<string, string>>({});
  const [expandedTiles, setExpandedTiles] = useState<Set<string>>(new Set());

  const { data: entries = [] } = useStoryBibleEntries(projectId, { staleTime: 60000 });
  const updateEntryMutation = useUpdateStoryBibleEntry({ skipInvalidation: true });
  
  // Get starred entries from database (priority > 0)
  const starredEntries = useMemo(() => {
    return new Set(entries.filter(entry => (entry.priority || 0) > 0).map(entry => entry.id));
  }, [entries]);

  // Toggle star status by updating priority field in database
  const toggleStarEntry = (entryId: number) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    const newPriority = (entry.priority || 0) > 0 ? 0 : 1;
    
    updateEntryMutation.mutate({
      id: entryId,
      priority: newPriority
    });
  };

  // Filter entries based on search and type
  const filteredEntries = useMemo(() => {
    let filtered = entries.filter(entry => archiveFilter === "all" || bibleEntryArchived(entry) === (archiveFilter === "archived"));

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(entry => bibleEntrySearchText(entry).includes(term));
    }

    if (selectedEntryType !== "all") {
      filtered = filtered.filter(entry => entry.entryType === selectedEntryType);
    }

    return filtered;
  }, [entries, searchTerm, selectedEntryType, archiveFilter]);

  // Group entries by type
  const entriesByType = useMemo(() => {
    const grouped: Record<string, StoryBibleEntry[]> = {};
    filteredEntries.forEach(entry => {
      if (!grouped[entry.entryType]) {
        grouped[entry.entryType] = [];
      }
      grouped[entry.entryType].push(entry);
    });
    return grouped;
  }, [filteredEntries]);

  // Group entries by type and category
  const entriesByTypeAndCategory = useMemo(() => {
    const grouped: Record<string, Record<string, StoryBibleEntry[]>> = {};
    filteredEntries.forEach(entry => {
      if (!grouped[entry.entryType]) {
        grouped[entry.entryType] = {};
      }
      const category = entry.entryType === "locations" 
        ? (entry.metadata as any)?.locationType || 'Uncategorized'
        : entry.entryType === "events"
        ? (() => {
            try {
              const eventData = JSON.parse(entry.content || '{}');
              return eventData.eventType || 'Uncategorized';
            } catch {
              return 'Uncategorized';
            }
          })()
        : entry.entryType === "world_elements"
        ? (() => {
            try {
              const worldElementData = JSON.parse(entry.content || '{}');
              return worldElementData.category || 'Uncategorized';
            } catch {
              return 'Uncategorized';
            }
          })()
        : entry.entryType === "details"
        ? (() => {
            try {
              const detailData = JSON.parse(entry.content || '{}');
              return detailData.type || 'Uncategorized';
            } catch {
              return 'Uncategorized';
            }
          })()
        : entry.entryType === "research"
        ? (() => {
            try {
              const researchData = JSON.parse(entry.content || '{}');
              return researchData.sourceType || 'Uncategorized';
            } catch {
              return 'Uncategorized';
            }
          })()
        : entry.category || 'Uncategorized';
      if (!grouped[entry.entryType][category]) {
        grouped[entry.entryType][category] = [];
      }
      grouped[entry.entryType][category].push(entry);
    });
    return grouped;
  }, [filteredEntries]);

  const toggleTileExpansion = (tileKey: string) => {
    setExpandedTiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tileKey)) {
        newSet.delete(tileKey);
      } else {
        newSet.add(tileKey);
      }
      return newSet;
    });
  };



  const getRecentEntries = (entries: StoryBibleEntry[], limit = 2) => {
    return [...entries]
      .sort((a, b) => {
        const aDate = new Date(a.updatedAt || a.createdAt || 0);
        const bDate = new Date(b.updatedAt || b.createdAt || 0);
        return bDate.getTime() - aDate.getTime();
      })
      .slice(0, limit);
  };

  const getStarredEntries = (entries: StoryBibleEntry[]) => {
    return entries.filter(entry => starredEntries.has(entry.id));
  };

  // Search Results Component
  const SearchResults = ({
    searchTerm,
    searchResults,
    starredEntries,
    onEditEntry,
    toggleStarEntry,
    onClearSearch
  }: {
    searchTerm: string;
    searchResults: StoryBibleEntry[];
    starredEntries: Set<number>;
    onEditEntry: (entry: StoryBibleEntry) => void;
    toggleStarEntry: (entryId: number) => void;
    onClearSearch: () => void;
  }) => {
    const resultsByType = useMemo(() => {
      const grouped: Record<string, StoryBibleEntry[]> = {};
      searchResults.forEach(entry => {
        if (!grouped[entry.entryType]) {
          grouped[entry.entryType] = [];
        }
        grouped[entry.entryType].push(entry);
      });
      return grouped;
    }, [searchResults]);

    if (searchResults.length === 0) {
      return (
        <Card className="mb-6 border-dashed">
          <CardContent className="pt-6 pb-4 text-center">
            <div className="text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <div className="text-sm">No entries found for "{searchTerm}"</div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClearSearch}
                className="mt-2"
              >
                Clear search
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="mb-6 bg-accent/5 border-accent/20">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-accent" />
              <span className="font-medium">Search Results</span>
              <Badge variant="secondary">
                {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}
              </Badge>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClearSearch}
              className="text-xs"
            >
              Clear
            </Button>
          </div>

          <ScrollArea className="max-h-96">
            <div className="space-y-4">
              {Object.entries(resultsByType).map(([entryType, entries]) => {
                const taxonomy = getEnhancedTaxonomyByKey(entryType);
                // Map entry types to icons
                const getIconForType = (type: string) => {
                  switch (type) {
                    case 'characters': return Users;
                    case 'groups_races': return Users;
                    case 'locations': return MapPin;
                    case 'events': return Calendar;
                    case 'world_elements': return Zap;
                    case 'details': return FileText;
                    default: return FileText;
                  }
                };
                const Icon = getIconForType(entryType);
                
                return (
                  <div key={entryType} className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Icon className="h-4 w-4" />
                      {taxonomy?.name || entryType} ({entries.length})
                    </div>
                    
                    <div className="grid gap-2 ml-6">
                      {entries
                        .sort((a, b) => {
                          const aStarred = starredEntries.has(a.id);
                          const bStarred = starredEntries.has(b.id);
                          if (aStarred && !bStarred) return -1;
                          if (!aStarred && bStarred) return 1;
                          return 0;
                        })
                        .map(entry => (
                          <div
                            key={entry.id}
                            className="group flex items-center justify-between p-3 border rounded-lg hover:shadow-sm transition-all duration-200 cursor-pointer bg-background"
                            onClick={() => onEditEntry(entry)}
                          >
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              {starredEntries.has(entry.id) && (
                                <Star className="h-4 w-4 text-amber-500 fill-current flex-shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{entry.title}</div>
                                <div className="flex items-center gap-2 mt-1">
                                  {(entry.entryType === "locations" ? (entry.metadata as any)?.locationType : entry.category) && (
                                    <Badge variant="outline" className="text-xs">
                                      {entry.entryType === "locations" ? (entry.metadata as any)?.locationType : entry.category}
                                    </Badge>
                                  )}
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(entry.updatedAt || entry.createdAt || 0).toLocaleDateString()}
                                  </div>
                                </div>
                                {entry.content && (
                                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {entry.content.substring(0, 100)}...
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleStarEntry(entry.id);
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <Star className={`h-3 w-3 ${starredEntries.has(entry.id) ? 'text-amber-500 fill-current' : 'text-muted-foreground'}`} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditEntry(entry);
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  };

  // Hybrid Expanded Entry Browser Component
  const ExpandedEntryBrowser = ({ 
    taxonomy, 
    typeEntries, 
    typeCategories, 
    starredEntries, 
    onEditEntry, 
    onCreateEntry, 
    toggleStarEntry 
  }: {
    taxonomy: any;
    typeEntries: StoryBibleEntry[];
    typeCategories: Record<string, StoryBibleEntry[]>;
    starredEntries: Set<number>;
    onEditEntry: (entry: StoryBibleEntry) => void;
    onCreateEntry: (entryType: string) => void;
    toggleStarEntry: (entryId: number) => void;
  }) => {
    const selectedCategory = tileCategories[taxonomy.key] || "all";
    const setSelectedCategory = (category: string) => setTileCategories(previous => ({ ...previous, [taxonomy.key]: category }));
    
    // Get entries based on category filter
    const filteredEntries = useMemo(() => {
      if (selectedCategory === "all") return typeEntries;
      if (selectedCategory === "starred") return typeEntries.filter(entry => starredEntries.has(entry.id));
      return typeCategories[selectedCategory] || [];
    }, [typeEntries, typeCategories, selectedCategory, starredEntries]);

    // Sort entries: starred first, then by recency
    const sortedEntries = useMemo(() => {
      return [...filteredEntries].sort((a, b) => {
        const aStarred = starredEntries.has(a.id);
        const bStarred = starredEntries.has(b.id);
        
        if (aStarred && !bStarred) return -1;
        if (!aStarred && bStarred) return 1;
        
        const aDate = new Date(a.updatedAt || a.createdAt || 0);
        const bDate = new Date(b.updatedAt || b.createdAt || 0);
        return bDate.getTime() - aDate.getTime();
      });
    }, [filteredEntries, starredEntries]);

    return (
      <div className="space-y-4">
        {/* Category Filter Tabs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Browse Entries</span>
            <Badge variant="outline" className="text-xs">
              {sortedEntries.length} {sortedEntries.length === 1 ? 'entry' : 'entries'}
            </Badge>
          </div>
          
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
            <TabsList className="grid grid-cols-3 lg:grid-cols-4 gap-1 h-auto p-1">
              <TabsTrigger value="all" className="text-xs px-2 py-1">
                All ({typeEntries.length})
              </TabsTrigger>
              <TabsTrigger value="starred" className="text-xs px-2 py-1">
                <Star className="h-3 w-3 mr-1" />
                Starred
              </TabsTrigger>
              {Object.entries(typeCategories)
                .sort(([, a], [, b]) => b.length - a.length)
                .slice(0, 2)
                .map(([category, entries]) => (
                  <TabsTrigger key={category} value={category} className="text-xs px-2 py-1">
                    {category} ({entries.length})
                  </TabsTrigger>
                ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Entry Grid */}
        <ScrollArea className="h-64">
          <div className="grid grid-cols-1 gap-2 pr-4">
            {sortedEntries.map(entry => (
              <div
                key={entry.id}
                className="group flex items-center justify-between p-3 border rounded-lg hover:shadow-sm transition-all duration-200 cursor-pointer"
                onClick={() => onEditEntry(entry)}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {starredEntries.has(entry.id) && (
                    <Star className="h-4 w-4 text-amber-500 fill-current flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{entry.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {(entry.entryType === "locations" ? (entry.metadata as any)?.locationType : entry.category) && (
                        <Badge variant="outline" className="text-xs">
                          {entry.entryType === "locations" ? (entry.metadata as any)?.locationType : entry.category}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.updatedAt || entry.createdAt || 0).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStarEntry(entry.id);
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <Star className={`h-3 w-3 ${starredEntries.has(entry.id) ? 'text-amber-500 fill-current' : 'text-muted-foreground'}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditEntry(entry);
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            
            {sortedEntries.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <div className="text-sm">No entries found</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCreateEntry(taxonomy.key)}
                  className="mt-2 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Create your first {taxonomy.name.slice(0, -1).toLowerCase()}
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Category Management */}
        {Object.keys(typeCategories).length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Category Management
              </span>

            </div>
            
            <div className="flex flex-wrap gap-1">
              {Object.entries(typeCategories)
                .sort(([, a], [, b]) => b.length - a.length)
                .map(([category, categoryEntries]) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="h-6 px-2 text-xs"
                  >
                    {category} ({categoryEntries.length})
                  </Button>
                ))}
            </div>
          </div>
        )}

        {/* Smart Add Button */}
        <Button
          onClick={() => onCreateEntry(taxonomy.key)}
          className="w-full"
          size="sm"
        >
          <Plus className="h-3 w-3 mr-2" />
          Add {selectedCategory !== "all" && selectedCategory !== "starred" 
            ? `${selectedCategory} ${taxonomy.name.slice(0, -1)}` 
            : taxonomy.name.slice(0, -1)}
        </Button>
      </div>
    );
  };

  // Bento Tile Component - Clean Two States
  const BentoTile = ({ taxonomyKey, taxonomy }: { taxonomyKey: string, taxonomy: any }) => {
    const typeEntries = entriesByType[taxonomy.key] || [];
    const typeCategories = entriesByTypeAndCategory[taxonomy.key] || {};
    const isExpanded = expandedTiles.has(taxonomy.key);
    const IconComponent = ENTRY_TYPE_ICONS[taxonomy.key as keyof typeof ENTRY_TYPE_ICONS] || FileText;
    
    const recentEntries = getRecentEntries(typeEntries);
    const starred = getStarredEntries(typeEntries);

    // Tile accent colors
    const getTileAccentColor = (key: string) => {
      const colors = {
        'characters': 'border-l-blue-400 bg-blue-50/30',
        'groups': 'border-l-green-400 bg-green-50/30',
        'locations': 'border-l-purple-400 bg-purple-50/30',
        'events': 'border-l-orange-400 bg-orange-50/30',
        'world_elements': 'border-l-indigo-400 bg-indigo-50/30',
        'details': 'border-l-pink-400 bg-pink-50/30',
        'research': 'border-l-yellow-400 bg-yellow-50/30'
      };
      return colors[key as keyof typeof colors] || 'border-l-gray-400 bg-gray-50/30';
    };

    return (
      <Card className={`border-l-4 ${getTileAccentColor(taxonomy.key)} hover:shadow-md transition-all duration-200 relative`}>
        {/* Single Corner Chevron */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleTileExpansion(taxonomy.key)}
          className="absolute top-2 right-2 h-6 w-6 p-0 z-10"
        >
          {isExpanded ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </Button>

        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 pr-8">
            <div className="p-2 rounded-lg bg-background border shadow-sm">
              <IconComponent className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">{taxonomy.name}</CardTitle>
              <Badge variant="secondary" className="text-sm">
                {typeEntries.length}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Starred Entries */}
          {starred.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">Pinned</span>
              </div>
              <div className="space-y-1">
                {starred.slice(0, 2).map(entry => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 rounded cursor-pointer hover:shadow-sm transition-all"
                    onClick={() => onEditEntry(entry)}
                  >
                    <span className="text-sm font-medium text-amber-900 truncate">{entry.title}</span>
                    <Star className="h-3 w-3 text-amber-500 fill-current" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {recentEntries.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Recent Activity</span>
              <div className="space-y-1">
                {recentEntries.map(entry => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => onEditEntry(entry)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{entry.title}</div>
                      {(entry.entryType === "locations" ? (entry.metadata as any)?.locationType : entry.category) && (
                        <div className="text-xs text-muted-foreground">
                          {entry.entryType === "locations" ? (entry.metadata as any)?.locationType : entry.category}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStarEntry(entry.id);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <Star className={`h-3 w-3 ${starredEntries.has(entry.id) ? 'text-amber-500 fill-current' : 'text-muted-foreground'}`} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category Carousel - Always Visible */}
          {Object.keys(typeCategories).length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Categories</span>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {Object.entries(typeCategories)
                  .sort(([, a], [, b]) => b.length - a.length)
                  .map(([category, categoryEntries]) => (
                    <Button
                      key={category}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedEntryType(taxonomy.key);
                        setTileCategories(previous => ({ ...previous, [taxonomy.key]: category }));
                        setExpandedTiles(previous => new Set([...previous, taxonomy.key]));
                      }}
                      className="flex-shrink-0 h-8 px-3 text-xs"
                    >
                      {category} ({categoryEntries.length})
                    </Button>
                  ))}
              </div>
            </div>
          )}

          {/* Expanded Content - Entry Browser with Category Management */}
          {isExpanded && (
            <>
              <Separator />
              <ExpandedEntryBrowser 
                taxonomy={taxonomy}
                typeEntries={typeEntries}
                typeCategories={typeCategories}
                starredEntries={starredEntries}
                onEditEntry={onEditEntry}
                onCreateEntry={onCreateEntry}
                toggleStarEntry={toggleStarEntry}
              />
            </>
          )}


        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Global Search with Category Filter */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Story Bible</h1>
          <p className="text-muted-foreground">Organize and manage your world elements</p>
        </div>

        <Card className="shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search across all categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
              <Select value={archiveFilter} onValueChange={setArchiveFilter}>
                <SelectTrigger aria-label="Archive filter" className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active entries</SelectItem><SelectItem value="archived">Archived entries</SelectItem><SelectItem value="all">All entries</SelectItem></SelectContent>
              </Select>
              <Select value={selectedEntryType} onValueChange={setSelectedEntryType}>
                <SelectTrigger className="w-[180px] h-10">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(ENHANCED_TAXONOMY).map(([key, taxonomy]) => (
                    <SelectItem key={key} value={taxonomy.key}>
                      {taxonomy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {searchTerm && (
              <div className="mt-3 text-sm text-muted-foreground">
                Found {filteredEntries.length} entries
                {selectedEntryType !== "all" && ` in ${getEnhancedTaxonomyByKey(selectedEntryType)?.name || selectedEntryType}`}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search Results */}
      {searchTerm && (
        <SearchResults 
          searchTerm={searchTerm}
          searchResults={filteredEntries}
          starredEntries={starredEntries}
          onEditEntry={onEditEntry}
          toggleStarEntry={toggleStarEntry}
          onClearSearch={() => setSearchTerm('')}
        />
      )}

      {/* Bento Grid - Hidden when searching */}
      {!searchTerm && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {Object.entries(ENHANCED_TAXONOMY).filter(([, taxonomy]) => selectedEntryType === "all" || taxonomy.key === selectedEntryType).map(([key, taxonomy]) => (
            <BentoTile key={key} taxonomyKey={key} taxonomy={taxonomy} />
          ))}
        </div>
      )}
    </div>
  );
}
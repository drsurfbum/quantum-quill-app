import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Plus, Search, Filter, Star, Archive, Users, MapPin, Calendar, Zap, Leaf, Heart, Church, Scroll, Package, Languages, Settings, Palette, Utensils, Shield, Scale, Briefcase, Cpu, Globe, Cloud, FileText, BookOpen, Grid, List, ChevronDown, ChevronRight, Eye, MoreHorizontal, Minus } from "lucide-react";
import { StoryBibleEntry } from "@shared/schema";
import { useStoryBibleEntries } from "@/hooks/use-story-bible";
import { ENHANCED_TAXONOMY, getEntryTypeDisplayName } from "@shared/enhanced-taxonomy";

interface EnhancedBentoDashboardProps {
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
  flora: Leaf,
  fauna: Heart,
  religion_ritual: Church,
  mythology: Scroll,
  item_artifact: Package,
  language: Languages,
  system: Settings,
  entertainment: Palette,
  clothing: Palette,
  food: Utensils,
  disease_medicine: Shield,
  law_politics: Scale,
  professions: Briefcase,
  technology: Cpu,
  astronomy: Globe,
  weather: Cloud,
  details: FileText,
  research: BookOpen,
};

export function EnhancedBentoDashboard({ projectId, onCreateEntry, onEditEntry }: EnhancedBentoDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEntryType, setSelectedEntryType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showArchived, setShowArchived] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [expandedTiles, setExpandedTiles] = useState<Set<string>>(new Set());
  const [starredEntries, setStarredEntries] = useState<Set<number>>(new Set());
  const [tileSearchTerms, setTileSearchTerms] = useState<Record<string, string>>({});
  const [savedQueries, setSavedQueries] = useState<Array<{id: string, name: string, filters: any}>>([]);
  const [collapsedTiles, setCollapsedTiles] = useState<Set<string>>(new Set());
  const [tileOrder, setTileOrder] = useState<string[]>(Object.keys(ENHANCED_TAXONOMY));
  const [dashboardMode, setDashboardMode] = useState<"compact" | "expanded">("expanded");

  const { data: entries = [] } = useStoryBibleEntries(projectId);

  // Create a mapping from old entry types to enhanced taxonomy categories
  const entryTypeMapping = useMemo(() => ({
    'government': 'groups_races',
    'lore': 'world_elements',
    'timeline': 'events',
    'location': 'locations',
    'event': 'events',
    'race': 'groups_races',
    'group': 'groups_races',
    // Keep direct matches
    'characters': 'characters',
    'groups_races': 'groups_races', 
    'locations': 'locations',
    'events': 'events',
    'world_elements': 'world_elements',
    'details': 'details',
    'research': 'research'
  } as Record<string, string>), []);

  // Filter and search entries
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchesSearch = entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           entry.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           entry.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Use mapping for type filtering
      const mappedType = entryTypeMapping[entry.entryType] || entry.entryType;
      const matchesType = selectedEntryType === "all" || mappedType === selectedEntryType || entry.entryType === selectedEntryType;
      const matchesCategory = selectedCategory === "all" || entry.category === selectedCategory;
      const matchesArchived = showArchived ? entry.isArchived : !entry.isArchived;
      const matchesPriority = priorityFilter === "all" || 
                            (priorityFilter === "high" && (entry.priority || 0) > 0) ||
                            (priorityFilter === "normal" && (entry.priority || 0) === 0);

      return matchesSearch && matchesType && matchesCategory && matchesArchived && matchesPriority;
    });
  }, [entries, searchTerm, selectedEntryType, selectedCategory, showArchived, priorityFilter, entryTypeMapping]);

  // Group entries by mapped type for overview
  const entriesByType = useMemo(() => {
    const grouped: Record<string, StoryBibleEntry[]> = {};
    entries.forEach(entry => {
      const mappedType = entryTypeMapping[entry.entryType] || entry.entryType;
      if (!grouped[mappedType]) {
        grouped[mappedType] = [];
      }
      grouped[mappedType].push(entry);
    });
    return grouped;
  }, [entries]);

  // Group entries by category within each type for subcategory breakdown
  const entriesByTypeAndCategory = useMemo(() => {
    const groups: Record<string, Record<string, StoryBibleEntry[]>> = {};
    
    Object.entries(entriesByType).forEach(([type, entries]) => {
      groups[type] = {};
      entries.forEach(entry => {
        const category = entry.category || 'Uncategorized';
        if (!groups[type][category]) {
          groups[type][category] = [];
        }
        groups[type][category].push(entry);
      });
    });
    
    return groups;
  }, [entriesByType]);

  // Helper functions for tile management
  const toggleTileExpansion = (tileKey: string) => {
    const newExpanded = new Set(expandedTiles);
    if (newExpanded.has(tileKey)) {
      newExpanded.delete(tileKey);
    } else {
      newExpanded.add(tileKey);
    }
    setExpandedTiles(newExpanded);
  };

  const toggleStarEntry = (entryId: number) => {
    const newStarred = new Set(starredEntries);
    if (newStarred.has(entryId)) {
      newStarred.delete(entryId);
    } else {
      newStarred.add(entryId);
    }
    setStarredEntries(newStarred);
  };

  // Get recent entries for a type (last 3 edited)
  const getRecentEntries = (entries: StoryBibleEntry[], limit = 3) => {
    return entries
      .filter(entry => entry.updatedAt || entry.createdAt)
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt!).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt!).getTime();
        return dateB - dateA;
      })
      .slice(0, limit);
  };

  // Get starred entries for a type
  const getStarredEntries = (entries: StoryBibleEntry[]) => {
    return entries.filter(entry => starredEntries.has(entry.id));
  };

  // Filter entries within a tile by search term
  const getFilteredTileEntries = (entries: StoryBibleEntry[], tileKey: string) => {
    const searchTerm = tileSearchTerms[tileKey]?.toLowerCase() || '';
    if (!searchTerm) return entries;
    
    return entries.filter(entry => 
      entry.title.toLowerCase().includes(searchTerm) ||
      (entry.content || '').toLowerCase().includes(searchTerm) ||
      entry.category?.toLowerCase().includes(searchTerm) ||
      entry.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  };

  // Cross-type query functionality
  const performCrossTypeQuery = (query: string) => {
    // Examples:
    // "Events involving Mars" -> find events with related locations containing "Mars"
    // "Characters in Lunar Resistance" -> find characters with group affiliations
    const results: StoryBibleEntry[] = [];
    
    // Simple implementation - can be enhanced with more sophisticated parsing
    const queryLower = query.toLowerCase();
    
    entries.forEach(entry => {
      const searchableText = [
        entry.title,
        entry.content,
        entry.category,
        ...(entry.tags || []),
        JSON.stringify(entry.metadata || {})
      ].join(' ').toLowerCase();
      
      if (searchableText.includes(queryLower)) {
        results.push(entry);
      }
    });
    
    return results;
  };

  // Save current filter state as a query
  const saveCurrentQuery = (name: string) => {
    const newQuery = {
      id: Date.now().toString(),
      name,
      filters: {
        searchTerm,
        selectedEntryType,
        selectedCategory,
        priorityFilter,
        showArchived
      }
    };
    
    setSavedQueries(prev => [...prev, newQuery]);
  };

  // Apply a saved query
  const applySavedQuery = (query: any) => {
    setSearchTerm(query.filters.searchTerm);
    setSelectedEntryType(query.filters.selectedEntryType);
    setSelectedCategory(query.filters.selectedCategory);
    setPriorityFilter(query.filters.priorityFilter);
    setShowArchived(query.filters.showArchived);
  };

  // Get unique categories for current entry type
  const availableCategories = useMemo(() => {
    if (selectedEntryType === "all") return [];
    const categories = entries
      .filter(entry => entry.entryType === selectedEntryType && entry.category)
      .map(entry => entry.category!)
      .filter((category, index, array) => array.indexOf(category) === index);
    return categories;
  }, [entries, selectedEntryType]);

  // Tile management functions
  const toggleTileCollapse = (tileKey: string) => {
    setCollapsedTiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tileKey)) {
        newSet.delete(tileKey);
      } else {
        newSet.add(tileKey);
      }
      return newSet;
    });
  };

  // Enhanced Bento Tile Component with improved design
  const BentoTile = ({ taxonomyKey, taxonomy }: { taxonomyKey: string, taxonomy: any }) => {
    const typeEntries = entriesByType[taxonomy.key] || [];
    const filteredTypeEntries = getFilteredTileEntries(typeEntries, taxonomy.key);
    const typeCategories = entriesByTypeAndCategory[taxonomy.key] || {};
    const isExpanded = expandedTiles.has(taxonomy.key);
    const isCollapsed = collapsedTiles.has(taxonomy.key);
    const IconComponent = ENTRY_TYPE_ICONS[taxonomy.key as keyof typeof ENTRY_TYPE_ICONS] || FileText;
    const tileSearchTerm = tileSearchTerms[taxonomy.key] || '';
    
    const recentEntries = getRecentEntries(filteredTypeEntries);
    const starred = getStarredEntries(filteredTypeEntries);
    
    // Subtle tile accent colors for visual distinction
    const getTileAccentColor = (key: string) => {
      const colors = {
        'characters': 'border-l-blue-400 bg-blue-50/30',
        'groups': 'border-l-green-400 bg-green-50/30',
        'locations': 'border-l-purple-400 bg-purple-50/30',
        'events': 'border-l-orange-400 bg-orange-50/30',
        'world-elements': 'border-l-indigo-400 bg-indigo-50/30',
        'details': 'border-l-pink-400 bg-pink-50/30',
        'research': 'border-l-yellow-400 bg-yellow-50/30'
      };
      return colors[key as keyof typeof colors] || 'border-l-gray-400 bg-gray-50/30';
    };
    
    // Category color mapping for subcategories
    const getCategoryColor = (category: string) => {
      const colors = [
        'bg-blue-100 text-blue-700 border-blue-200',
        'bg-green-100 text-green-700 border-green-200', 
        'bg-purple-100 text-purple-700 border-purple-200',
        'bg-orange-100 text-orange-700 border-orange-200',
        'bg-pink-100 text-pink-700 border-pink-200',
        'bg-indigo-100 text-indigo-700 border-indigo-200',
        'bg-yellow-100 text-yellow-700 border-yellow-200',
        'bg-red-100 text-red-700 border-red-200'
      ];
      const hash = category.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
      return colors[hash % colors.length];
    };
    
    // Collapsed tile - thin header only
    if (isCollapsed) {
      return (
        <Card className={`border-l-4 ${getTileAccentColor(taxonomy.key)} hover:shadow-sm transition-all duration-200`}>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <IconComponent className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">{taxonomy.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {typeEntries.length}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleTileCollapse(taxonomy.key)}
                className="h-6 w-6 p-0"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
        </Card>
      );
    }

    return (
      <Card 
        className={`border-l-4 ${getTileAccentColor(taxonomy.key)} hover:shadow-lg transition-all duration-200 ${
          typeEntries.length === 0 ? 'opacity-70' : ''
        } min-h-[200px]`}
      >
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-background border shadow-sm">
                <IconComponent className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold mb-1">{taxonomy.name}</CardTitle>
                <Badge variant="secondary" className="text-sm font-medium px-3 py-1">
                  {typeEntries.length}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleTileCollapse(taxonomy.key)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                title="Collapse tile"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCreateEntry(taxonomy.key)}
                className="h-8 px-3"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
              {Object.keys(typeCategories).length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleTileExpansion(taxonomy.key)}
                  className="h-8 w-8 p-0"
                  title={isExpanded ? "Collapse categories" : "Expand categories"}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Mini-Search Within Tile */}
          {typeEntries.length > 3 && (
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder={`Search ${taxonomy.name.toLowerCase()}...`}
                value={tileSearchTerm}
                onChange={(e) => setTileSearchTerms(prev => ({ ...prev, [taxonomy.key]: e.target.value }))}
                className="h-7 pl-7 text-xs"
              />
            </div>
          )}

          {/* Featured/Starred Entries */}
          {starred.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Pinned</span>
              </div>
              <div className="space-y-1">
                {starred.slice(0, 2).map(entry => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => onEditEntry(entry)}
                  >
                    <span className="text-sm font-medium truncate">{entry.title}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStarEntry(entry.id);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <Star className="h-3 w-3 text-yellow-500 fill-current" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Entries */}
          {recentEntries.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Recent</span>
              <div className="space-y-1">
                {recentEntries.map(entry => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => onEditEntry(entry)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{entry.title}</div>
                      {entry.category && (
                        <div className="text-xs text-muted-foreground">{entry.category}</div>
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
                      <Star className={`h-3 w-3 ${starredEntries.has(entry.id) ? 'text-yellow-500 fill-current' : 'text-muted-foreground'}`} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subcategory Breakdown */}
          {isExpanded && Object.keys(typeCategories).length > 0 && (
            <Collapsible open={isExpanded}>
              <CollapsibleContent className="space-y-2">
                <Separator />
                <div className="space-y-2">
                  <span className="text-sm font-medium">Categories</span>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(typeCategories)
                      .sort(([, a], [, b]) => b.length - a.length) // Sort by entry count
                      .map(([category, categoryEntries]) => {
                        const filteredCategoryEntries = getFilteredTileEntries(categoryEntries, taxonomy.key);
                        return (
                          <div
                            key={category}
                            className="flex items-center justify-between p-2 bg-background border rounded hover:bg-muted/50 transition-colors group"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{category}</span>
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${getCategoryColor(category)}`}
                              >
                                {filteredCategoryEntries.length}
                              </Badge>
                              {tileSearchTerm && filteredCategoryEntries.length !== categoryEntries.length && (
                                <Badge variant="outline" className="text-xs">
                                  of {categoryEntries.length}
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedEntryType(taxonomy.key);
                                  setSelectedCategory(category);
                                }}
                                className="h-6 px-2 text-xs"
                                title={`View all ${category} entries`}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onCreateEntry(taxonomy.key)}
                                className="h-6 px-2 text-xs"
                                title={`Add new ${category}`}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Quick Category Pills (when collapsed) */}
          {!isExpanded && Object.keys(typeCategories).length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Categories</span>
              <div className="flex flex-wrap gap-1">
                {Object.entries(typeCategories)
                  .sort(([, a], [, b]) => b.length - a.length)
                  .slice(0, 6) // Show top 6 categories
                  .map(([category, categoryEntries]) => (
                    <Button
                      key={category}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedEntryType(taxonomy.key);
                        setSelectedCategory(category);
                      }}
                      className={`h-6 px-2 text-xs hover:bg-muted/50 ${getCategoryColor(category)}`}
                    >
                      {category} ({categoryEntries.length})
                    </Button>
                  ))}
                {Object.keys(typeCategories).length > 6 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleTileExpansion(taxonomy.key)}
                    className="h-6 px-2 text-xs text-muted-foreground"
                  >
                    +{Object.keys(typeCategories).length - 6} more
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {typeEntries.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <div className="text-sm">No {taxonomy.name.toLowerCase()} yet</div>
              <Button
                variant="ghost"
                onClick={() => onCreateEntry(taxonomy.key)}
                className="mt-2 text-xs"
              >
                Create your first {taxonomy.name.toLowerCase().slice(0, -1)}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const EntryCard = ({ entry }: { entry: StoryBibleEntry }) => {
    const IconComponent = ENTRY_TYPE_ICONS[entry.entryType as keyof typeof ENTRY_TYPE_ICONS] || FileText;
    
    return (
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onEditEntry(entry)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <IconComponent className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium truncate">{entry.title}</CardTitle>
            </div>
            <div className="flex gap-1">
              {starredEntries.has(entry.id) && (
                <Star className="h-3 w-3 text-yellow-500 fill-current" />
              )}
              {entry.isArchived && (
                <Archive className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-xs">
                {getEntryTypeDisplayName(entry.entryType)}
              </Badge>
              {entry.category && (
                <Badge variant="secondary" className="text-xs">
                  {entry.category}
                </Badge>
              )}
            </div>
            {entry.content && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {entry.content.substring(0, 100)}...
              </p>
            )}
            <div className="flex flex-wrap gap-1">
              {entry.tags?.slice(0, 3).map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {(entry.tags?.length || 0) > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{(entry.tags?.length || 0) - 3}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Story Bible</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          >
            {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Global Search & Dashboard Controls */}
      <div className="mb-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Story Bible</h1>
            <p className="text-muted-foreground">Organize and manage your world elements</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant={dashboardMode === "expanded" ? "default" : "outline"}
                size="sm"
                onClick={() => setDashboardMode("expanded")}
                className="h-8"
              >
                Expanded
              </Button>
              <Button
                variant={dashboardMode === "compact" ? "default" : "outline"}
                size="sm"
                onClick={() => setDashboardMode("compact")}
                className="h-8"
              >
                Compact
              </Button>
            </div>
            {savedQueries.length > 0 && (
              <Select value="" onValueChange={(queryId) => {
                const query = savedQueries.find(q => q.id === queryId);
                if (query) applySavedQuery(query);
              }}>
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue placeholder="Saved filters" />
                </SelectTrigger>
                <SelectContent>
                  {savedQueries.map(query => (
                    <SelectItem key={query.id} value={query.id}>
                      {query.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <Card className="shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search across all categories... Try: 'Events involving Mars' or 'Characters in Resistance'"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
              {searchTerm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const name = prompt("Save current search as:");
                    if (name) saveCurrentQuery(name);
                  }}
                  className="h-10 px-3"
                >
                  Save Filter
                </Button>
              )}
            </div>
            {searchTerm && (
              <div className="mt-3 text-sm text-muted-foreground">
                Found {filteredEntries.length} entries across {Object.keys(ENHANCED_TAXONOMY).length} categories
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Bento-Style Tiles with Improved Spacing */}
      <div className={`grid gap-8 ${
        dashboardMode === "compact" 
          ? "grid-cols-1 lg:grid-cols-2 xl:grid-cols-4" 
          : "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3"
      }`}>
        {tileOrder
          .filter(key => !collapsedTiles.has(key) || dashboardMode === "compact")
          .map(key => {
            const taxonomy = ENHANCED_TAXONOMY[key];
            return taxonomy ? (
              <BentoTile key={key} taxonomyKey={key} taxonomy={taxonomy} />
            ) : null;
          })}
      </div>

      {/* Collapsed Tiles Section */}
      {collapsedTiles.size > 0 && dashboardMode === "expanded" && (
        <div className="mt-8">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Collapsed Categories</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from(collapsedTiles).map(key => {
              const taxonomy = ENHANCED_TAXONOMY[key];
              return taxonomy ? (
                <BentoTile key={key} taxonomyKey={key} taxonomy={taxonomy} />
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search entries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={selectedEntryType} onValueChange={setSelectedEntryType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.values(ENHANCED_TAXONOMY).map(taxonomy => (
              <SelectItem key={taxonomy.key} value={taxonomy.key}>
                {taxonomy.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {availableCategories.length > 0 && (
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {availableCategories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="high">High Priority</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowArchived(!showArchived)}
          className={showArchived ? "bg-muted" : ""}
        >
          <Archive className="h-4 w-4 mr-2" />
          {showArchived ? "Hide Archived" : "Show Archived"}
        </Button>
      </div>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {filteredEntries.length} entries found
          </span>
          {selectedEntryType !== "all" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCreateEntry(selectedEntryType)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add {getEntryTypeDisplayName(selectedEntryType)}
            </Button>
          )}
        </div>

        {filteredEntries.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No entries found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? "Try adjusting your search terms" : "Start building your story bible"}
              </p>
              <Button onClick={() => onCreateEntry("characters")}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Entry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className={viewMode === "grid" ? 
            "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : 
            "space-y-2"
          }>
            {filteredEntries.map(entry => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
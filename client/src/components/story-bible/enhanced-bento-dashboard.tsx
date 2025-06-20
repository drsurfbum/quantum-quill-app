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
import { Plus, Search, Filter, Star, Archive, Users, MapPin, Calendar, Zap, Leaf, Heart, Church, Scroll, Package, Languages, Settings, Palette, Utensils, Shield, Scale, Briefcase, Cpu, Globe, Cloud, FileText, BookOpen, Grid, List, ChevronDown, ChevronRight, Eye, MoreHorizontal } from "lucide-react";
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

  // Get unique categories for current entry type
  const availableCategories = useMemo(() => {
    if (selectedEntryType === "all") return [];
    const categories = entries
      .filter(entry => entry.entryType === selectedEntryType && entry.category)
      .map(entry => entry.category!)
      .filter((category, index, array) => array.indexOf(category) === index);
    return categories;
  }, [entries, selectedEntryType]);

  // Enhanced Bento Tile Component
  const BentoTile = ({ taxonomyKey, taxonomy }: { taxonomyKey: string, taxonomy: any }) => {
    const typeEntries = entriesByType[taxonomy.key] || [];
    const typeCategories = entriesByTypeAndCategory[taxonomy.key] || {};
    const isExpanded = expandedTiles.has(taxonomy.key);
    const IconComponent = ENTRY_TYPE_ICONS[taxonomy.key as keyof typeof ENTRY_TYPE_ICONS] || FileText;
    
    const recentEntries = getRecentEntries(typeEntries);
    const starred = getStarredEntries(typeEntries);
    
    return (
      <Card className="h-fit">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <IconComponent className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{taxonomy.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{typeEntries.length} entries</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCreateEntry(taxonomy.key)}
                className="h-8 px-3"
              >
                <Plus className="h-3 w-3 mr-1" />
                New
              </Button>
              {Object.keys(typeCategories).length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleTileExpansion(taxonomy.key)}
                  className="h-8 w-8 p-0"
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
          {/* Featured/Starred Entries */}
          {starred.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Featured</span>
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
                    {Object.entries(typeCategories).map(([category, categoryEntries]) => (
                      <div
                        key={category}
                        className="flex items-center justify-between p-2 bg-background border rounded hover:bg-muted/50 transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{category}</span>
                          <Badge variant="secondary" className="text-xs">
                            {categoryEntries.length}
                          </Badge>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Navigate to filtered view
                              setSelectedEntryType(taxonomy.key);
                              setSelectedCategory(category);
                            }}
                            className="h-6 px-2 text-xs"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onCreateEntry(taxonomy.key)}
                            className="h-6 px-2 text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
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

      {/* Enhanced Bento-Style Tiles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {Object.entries(ENHANCED_TAXONOMY).map(([key, taxonomy]) => (
          <BentoTile key={key} taxonomyKey={key} taxonomy={taxonomy} />
        ))}
      </div>

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
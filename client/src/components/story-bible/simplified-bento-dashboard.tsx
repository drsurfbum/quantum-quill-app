import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Search, Star, Users, MapPin, Calendar, Zap, FileText, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { StoryBibleEntry } from "@shared/schema";
import { useStoryBibleEntries } from "@/hooks/use-story-bible";
import { ENHANCED_TAXONOMY } from "@shared/enhanced-taxonomy";

interface SimplifiedBentoDashboardProps {
  projectId: number;
  onCreateEntry: (entryType: string) => void;
  onEditEntry: (entry: StoryBibleEntry) => void;
}

// Icon mapping for entry types
const ENTRY_TYPE_ICONS = {
  characters: Users,
  groups: Users,
  locations: MapPin,
  events: Calendar,
  world_elements: Zap,
  details: FileText,
  research: BookOpen,
} as const;

export function SimplifiedBentoDashboard({ projectId, onCreateEntry, onEditEntry }: SimplifiedBentoDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEntryType, setSelectedEntryType] = useState<string>("all");
  const [expandedTiles, setExpandedTiles] = useState<Set<string>>(new Set());
  const [starredEntries, setStarredEntries] = useState<Set<number>>(new Set());

  const { data: entries = [] } = useStoryBibleEntries(projectId);

  // Filter entries based on search and type
  const filteredEntries = useMemo(() => {
    let filtered = entries;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.title.toLowerCase().includes(term) ||
        (entry.content || '').toLowerCase().includes(term) ||
        entry.category?.toLowerCase().includes(term) ||
        entry.tags?.some(tag => tag.toLowerCase().includes(term))
      );
    }

    if (selectedEntryType !== "all") {
      filtered = filtered.filter(entry => entry.entryType === selectedEntryType);
    }

    return filtered;
  }, [entries, searchTerm, selectedEntryType]);

  // Group entries by type
  const entriesByType = useMemo(() => {
    const grouped: Record<string, StoryBibleEntry[]> = {};
    entries.forEach(entry => {
      if (!grouped[entry.entryType]) {
        grouped[entry.entryType] = [];
      }
      grouped[entry.entryType].push(entry);
    });
    return grouped;
  }, [entries]);

  // Group entries by type and category
  const entriesByTypeAndCategory = useMemo(() => {
    const grouped: Record<string, Record<string, StoryBibleEntry[]>> = {};
    entries.forEach(entry => {
      if (!grouped[entry.entryType]) {
        grouped[entry.entryType] = {};
      }
      const category = entry.category || 'Uncategorized';
      if (!grouped[entry.entryType][category]) {
        grouped[entry.entryType][category] = [];
      }
      grouped[entry.entryType][category].push(entry);
    });
    return grouped;
  }, [entries]);

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

  const toggleStarEntry = (entryId: number) => {
    setStarredEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const getRecentEntries = (entries: StoryBibleEntry[], limit = 2) => {
    return entries
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
                        // Could add category filtering here if needed
                      }}
                      className="flex-shrink-0 h-8 px-3 text-xs"
                    >
                      {category} ({categoryEntries.length})
                    </Button>
                  ))}
              </div>
            </div>
          )}

          {/* Expanded Content - Detailed Categories */}
          {isExpanded && Object.keys(typeCategories).length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <span className="text-sm font-medium">Category Details</span>
                <div className="space-y-2">
                  {Object.entries(typeCategories).map(([category, categoryEntries]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between p-2 bg-background border rounded hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{category}</span>
                        <Badge variant="secondary" className="text-xs">
                          {categoryEntries.length}
                        </Badge>
                      </div>
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
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Add Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCreateEntry(taxonomy.key)}
            className="w-full"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add {taxonomy.name.slice(0, -1)}
          </Button>
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
                {selectedEntryType !== "all" && ` in ${ENHANCED_TAXONOMY[selectedEntryType]?.name || selectedEntryType}`}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {Object.entries(ENHANCED_TAXONOMY).map(([key, taxonomy]) => (
          <BentoTile key={key} taxonomyKey={key} taxonomy={taxonomy} />
        ))}
      </div>
    </div>
  );
}
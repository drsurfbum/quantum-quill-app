import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, Filter, Star, Archive, Users, MapPin, Calendar, Zap, Leaf, Paw, Church, Scroll, Package, Languages, Settings, Palette, Utensils, Shield, Scale, Briefcase, Cpu, Globe, Cloud, FileText, BookOpen, Grid, List } from "lucide-react";
import { StoryBibleEntry } from "@shared/schema";
import { useStoryBibleEntries } from "@/hooks/use-story-bible";
import { STORY_BIBLE_TAXONOMY, getEntryTypeDisplayName } from "@shared/taxonomy";

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
  fauna: Paw,
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

  const { data: entries = [] } = useStoryBibleEntries(projectId);

  // Filter and search entries
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchesSearch = entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           entry.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           entry.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesType = selectedEntryType === "all" || entry.entryType === selectedEntryType;
      const matchesCategory = selectedCategory === "all" || entry.category === selectedCategory;
      const matchesArchived = showArchived ? entry.isArchived : !entry.isArchived;
      const matchesPriority = priorityFilter === "all" || 
                            (priorityFilter === "high" && (entry.priority || 0) > 0) ||
                            (priorityFilter === "normal" && (entry.priority || 0) === 0);

      return matchesSearch && matchesType && matchesCategory && matchesArchived && matchesPriority;
    });
  }, [entries, searchTerm, selectedEntryType, selectedCategory, showArchived, priorityFilter]);

  // Group entries by type for overview
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

  // Get unique categories for current entry type
  const availableCategories = useMemo(() => {
    if (selectedEntryType === "all") return [];
    return [...new Set(entries
      .filter(entry => entry.entryType === selectedEntryType && entry.category)
      .map(entry => entry.category!)
    )];
  }, [entries, selectedEntryType]);

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
              {(entry.priority || 0) > 0 && (
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

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Object.entries(STORY_BIBLE_TAXONOMY).map(([key, taxonomy]) => {
          const count = entriesByType[taxonomy.key]?.length || 0;
          const IconComponent = ENTRY_TYPE_ICONS[taxonomy.key as keyof typeof ENTRY_TYPE_ICONS] || FileText;
          
          return (
            <Card 
              key={key}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => count > 0 ? setSelectedEntryType(taxonomy.key) : onCreateEntry(taxonomy.key)}
            >
              <CardContent className="p-4 text-center">
                <IconComponent className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <div className="text-sm font-medium">{taxonomy.name}</div>
                <div className="text-lg font-bold">{count}</div>
                {count === 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 h-6 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateEntry(taxonomy.key);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
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
            {Object.values(STORY_BIBLE_TAXONOMY).map(taxonomy => (
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
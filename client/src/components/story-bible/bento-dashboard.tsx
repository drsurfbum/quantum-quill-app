import { useState } from "react";
import { StoryBibleEntry } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, MapPin, Calendar, Workflow, ShoppingBag, Languages, 
  Wand2, Train, Building, FolderTree, GitBranch, Scroll, 
  Mountain, Globe, Plus, Pin, Clock, Star
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BentoDashboardProps {
  entries: StoryBibleEntry[];
  onCreateEntry: (entryType: string) => void;
  onSelectEntry: (entry: StoryBibleEntry) => void;
  selectedEntryId?: number | null;
}

// Category definitions with icons and colors
const categories = [
  {
    id: "character",
    label: "Characters",
    icon: Users,
    color: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
    iconColor: "text-blue-600 dark:text-blue-400",
    subcategories: ["character", "race", "group", "government"]
  },
  {
    id: "location",
    label: "Locations",
    icon: MapPin,
    color: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
    iconColor: "text-green-600 dark:text-green-400",
    subcategories: ["location", "geography"]
  },
  {
    id: "world-element",
    label: "World Elements",
    icon: Workflow,
    color: "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800",
    iconColor: "text-purple-600 dark:text-purple-400",
    subcategories: ["world-element", "magicSystem", "language", "transportation", "item"]
  },
  {
    id: "history",
    label: "History & Lore",
    icon: Calendar,
    color: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
    iconColor: "text-amber-600 dark:text-amber-400",
    subcategories: ["event", "timeline", "lore"]
  }
];

// World element subcategories for the detailed view
const worldElementCategories = [
  { id: "flora", label: "Flora", icon: "🌿", color: "text-green-600" },
  { id: "fauna", label: "Fauna", icon: "🦋", color: "text-blue-600" },
  { id: "technology", label: "Technology", icon: "⚙️", color: "text-gray-600" },
  { id: "mythology", label: "Mythology", icon: "📜", color: "text-purple-600" },
  { id: "religion", label: "Religion/Ritual", icon: "🕯️", color: "text-orange-600" },
  { id: "artifact", label: "Item/Artifact", icon: "💎", color: "text-indigo-600" },
  { id: "architecture", label: "Architecture", icon: "🏛️", color: "text-stone-600" },
  { id: "culture", label: "Culture/Custom", icon: "🎭", color: "text-pink-600" },
  { id: "organization", label: "Organization", icon: "🏢", color: "text-cyan-600" },
  { id: "concept", label: "Concept/Idea", icon: "💭", color: "text-violet-600" },
  { id: "natural", label: "Natural Phenomenon", icon: "⚡", color: "text-yellow-600" },
  { id: "material", label: "Material/Resource", icon: "🔩", color: "text-gray-700" },
  { id: "food", label: "Food/Cuisine", icon: "🍽️", color: "text-red-600" },
  { id: "art", label: "Art/Literature", icon: "🎨", color: "text-rose-600" },
  { id: "science", label: "Science/Medicine", icon: "🧪", color: "text-teal-600" },
  { id: "vehicle", label: "Vehicle/Transport", icon: "🚀", color: "text-blue-700" },
  { id: "weapon", label: "Weapon/Tool", icon: "⚔️", color: "text-red-700" },
  { id: "other", label: "Other/Misc", icon: "📦", color: "text-neutral-600" }
];

export default function BentoDashboard({ entries, onCreateEntry, onSelectEntry, selectedEntryId }: BentoDashboardProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Group entries by their main categories
  const groupedEntries = categories.reduce((acc, category) => {
    acc[category.id] = entries.filter(entry => 
      category.subcategories.includes(entry.entryType)
    );
    return acc;
  }, {} as Record<string, StoryBibleEntry[]>);

  // Get recent entries (last 7 days or most recent 5)
  const getRecentEntries = (categoryEntries: StoryBibleEntry[]) => {
    return categoryEntries
      .sort((a, b) => {
        const dateA = a.updatedAt || a.createdAt;
        const dateB = b.updatedAt || b.createdAt;
        if (!dateA || !dateB) return 0;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      })
      .slice(0, 3);
  };

  // Get world element entries grouped by their subcategories
  const getWorldElementsByCategory = () => {
    const worldElements = groupedEntries["world-element"] || [];
    return worldElementCategories.map(category => {
      const categoryEntries = worldElements.filter(entry => {
        try {
          const content = JSON.parse(entry.content || '{}');
          return content.category === category.id;
        } catch {
          return false;
        }
      });
      return { ...category, entries: categoryEntries };
    }).filter(category => category.entries.length > 0);
  };

  const renderCategoryTile = (category: typeof categories[0]) => {
    const categoryEntries = groupedEntries[category.id] || [];
    const recentEntries = getRecentEntries(categoryEntries);
    const isExpanded = expandedCategory === category.id;

    return (
      <Card key={category.id} className={cn("transition-all duration-200 hover:shadow-md", category.color)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <category.icon className={cn("h-6 w-6", category.iconColor)} />
              <div>
                <CardTitle className="text-lg">{category.label}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {categoryEntries.length} {categoryEntries.length === 1 ? 'entry' : 'entries'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
              className="h-8 w-8 p-0"
            >
              <Plus className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-45")} />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {/* Recent entries preview */}
          {recentEntries.length > 0 && (
            <div className="space-y-2 mb-4">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent</h4>
              {recentEntries.map(entry => (
                <button
                  key={entry.id}
                  onClick={() => onSelectEntry(entry)}
                  className={cn(
                    "flex items-center gap-2 w-full p-2 rounded-md text-left transition-colors hover:bg-background/60",
                    selectedEntryId === entry.id && "bg-background/80 ring-1 ring-ring"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.entryType.charAt(0).toUpperCase() + entry.entryType.slice(1).replace('-', ' ')}
                    </p>
                  </div>
                  {selectedEntryId === entry.id && <Pin className="h-3 w-3 text-muted-foreground" />}
                </button>
              ))}
            </div>
          )}

          {/* Special handling for World Elements */}
          {category.id === "world-element" && isExpanded && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Categories</h4>
              <div className="grid grid-cols-2 gap-2">
                {getWorldElementsByCategory().map(subCategory => (
                  <div
                    key={subCategory.id}
                    className="flex items-center gap-2 p-2 rounded-md bg-background/40"
                  >
                    <span className="text-sm">{subCategory.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{subCategory.label}</p>
                      <p className="text-xs text-muted-foreground">{subCategory.entries.length}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expanded view for other categories */}
          {category.id !== "world-element" && isExpanded && categoryEntries.length > 3 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">All Entries</h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {categoryEntries.map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => onSelectEntry(entry)}
                    className={cn(
                      "flex items-center gap-2 w-full p-2 rounded-md text-left transition-colors hover:bg-background/60",
                      selectedEntryId === entry.id && "bg-background/80 ring-1 ring-ring"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{entry.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.entryType.charAt(0).toUpperCase() + entry.entryType.slice(1).replace('-', ' ')}
                      </p>
                    </div>
                    {selectedEntryId === entry.id && <Pin className="h-3 w-3 text-muted-foreground" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add new button */}
          <div className="mt-4 pt-3 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center gap-2"
              onClick={() => {
                // For world elements, default to the most common category
                if (category.id === "world-element") {
                  onCreateEntry("world-element");
                } else {
                  // For other categories, use the primary subcategory
                  onCreateEntry(category.subcategories[0]);
                }
              }}
            >
              <Plus className="h-4 w-4" />
              Add {category.label.slice(0, -1)}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Story Bible</h2>
          <p className="text-muted-foreground">
            {entries.length} total entries across {categories.length} categories
          </p>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {categories.map(renderCategoryTile)}
      </div>

      {/* Quick Stats */}
      {entries.length > 0 && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.map(category => {
                const count = groupedEntries[category.id]?.length || 0;
                return (
                  <div key={category.id} className="flex items-center gap-3">
                    <category.icon className={cn("h-5 w-5", category.iconColor)} />
                    <div>
                      <p className="text-sm font-medium">{count}</p>
                      <p className="text-xs text-muted-foreground">{category.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
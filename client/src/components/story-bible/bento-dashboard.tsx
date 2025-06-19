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
    if (category.id === "world-element") {
      // For world elements, include all world-element types
      acc[category.id] = entries.filter(entry => 
        entry.entryType === "world-element" || 
        ["government", "technology", "culture", "religion", "economy", "geography"].includes(entry.entryType)
      );
    } else {
      // For other categories, use subcategories array
      acc[category.id] = entries.filter(entry => 
        category.subcategories.includes(entry.entryType)
      );
    }
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
        // For world elements, match by entry type instead of JSON content
        return entry.entryType === category.id;
      });
      return { ...category, entries: categoryEntries };
    }).filter(category => category.entries.length > 0);
  };

  const renderCategoryTile = (category: typeof categories[0]) => {
    const categoryEntries = groupedEntries[category.id] || [];
    const isExpanded = expandedCategory === category.id;

    return (
      <Card key={category.id} className={cn("transition-all duration-200 hover:shadow-md flex flex-col h-full overflow-hidden relative", category.color)}>
        <CardHeader className="pb-3 flex-shrink-0 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <category.icon className={cn("h-6 w-6 flex-shrink-0", category.iconColor)} />
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg truncate">{category.label}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {categoryEntries.length} {categoryEntries.length === 1 ? 'entry' : 'entries'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
              className="h-8 w-8 p-0 flex-shrink-0 ml-2"
            >
              <Plus className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-45")} />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 flex flex-col flex-1 overflow-hidden relative z-10">
          {/* Entry Grid - Better space utilization */}
          <div className="flex-1 overflow-auto mb-4">
            {categoryEntries.length > 0 ? (
              category.id === "world-element" ? (
                // Bento-in-bento for World Elements with same color coding as other categories
                <div className="grid grid-cols-2 gap-3">
                  {categoryEntries.slice(0, isExpanded ? undefined : 8).map(entry => {
                    const getEntryColor = (entryType: string) => {
                      switch (entryType) {
                        case 'government': return 'bg-red-100 hover:bg-red-200 border-red-200 text-red-900';
                        case 'technology': return 'bg-cyan-100 hover:bg-cyan-200 border-cyan-200 text-cyan-900';
                        case 'culture': return 'bg-pink-100 hover:bg-pink-200 border-pink-200 text-pink-900';
                        case 'religion': return 'bg-indigo-100 hover:bg-indigo-200 border-indigo-200 text-indigo-900';
                        case 'economy': return 'bg-emerald-100 hover:bg-emerald-200 border-emerald-200 text-emerald-900';
                        case 'geography': return 'bg-teal-100 hover:bg-teal-200 border-teal-200 text-teal-900';
                        default: return 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-900';
                      }
                    };

                    return (
                      <button
                        key={entry.id}
                        onClick={() => onSelectEntry(entry)}
                        className={cn(
                          "relative p-3 rounded-lg border transition-all duration-200 text-left group",
                          getEntryColor(entry.entryType),
                          selectedEntryId === entry.id && "ring-2 ring-primary ring-offset-1 shadow-md"
                        )}
                      >
                        <div className="flex flex-col min-h-[60px]">
                          <p className="font-medium text-sm truncate leading-tight">
                            {entry.title}
                          </p>
                          <div className="flex-1 flex items-end mt-1">
                            <span className="text-xs opacity-70 capitalize">
                              {entry.entryType.replace('-', ' ')}
                            </span>
                          </div>
                        </div>
                        {selectedEntryId === entry.id && (
                          <Pin className="absolute top-2 right-2 h-3 w-3 opacity-60" />
                        )}
                      </button>
                    );
                  })}
                  {!isExpanded && categoryEntries.length > 8 && (
                    <button
                      onClick={() => setExpandedCategory(category.id)}
                      className="flex items-center justify-center p-3 rounded-lg border border-dashed border-gray-300 hover:border-gray-400 transition-colors text-muted-foreground hover:text-foreground min-h-[60px]"
                    >
                      <div className="text-center">
                        <span className="text-lg">+</span>
                        <p className="text-xs mt-1">{categoryEntries.length - 8} more</p>
                      </div>
                    </button>
                  )}
                </div>
              ) : (
                // Bento-in-bento: Compact color-coded mini-cards
                <div className="grid grid-cols-2 gap-3">
                  {categoryEntries.slice(0, isExpanded ? undefined : 8).map(entry => {
                    // Color coding based on entry type
                    const getEntryColor = (entryType: string) => {
                      switch (entryType) {
                        case 'character': return 'bg-blue-100 hover:bg-blue-200 border-blue-200 text-blue-900';
                        case 'location': return 'bg-green-100 hover:bg-green-200 border-green-200 text-green-900';
                        case 'event': return 'bg-amber-100 hover:bg-amber-200 border-amber-200 text-amber-900';
                        case 'lore': return 'bg-purple-100 hover:bg-purple-200 border-purple-200 text-purple-900';
                        case 'government': return 'bg-red-100 hover:bg-red-200 border-red-200 text-red-900';
                        case 'technology': return 'bg-cyan-100 hover:bg-cyan-200 border-cyan-200 text-cyan-900';
                        case 'culture': return 'bg-pink-100 hover:bg-pink-200 border-pink-200 text-pink-900';
                        case 'religion': return 'bg-indigo-100 hover:bg-indigo-200 border-indigo-200 text-indigo-900';
                        case 'economy': return 'bg-emerald-100 hover:bg-emerald-200 border-emerald-200 text-emerald-900';
                        case 'geography': return 'bg-teal-100 hover:bg-teal-200 border-teal-200 text-teal-900';
                        default: return 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-900';
                      }
                    };

                    return (
                      <button
                        key={entry.id}
                        onClick={() => onSelectEntry(entry)}
                        className={cn(
                          "relative p-3 rounded-lg border transition-all duration-200 text-left group",
                          getEntryColor(entry.entryType),
                          selectedEntryId === entry.id && "ring-2 ring-primary ring-offset-1 shadow-md"
                        )}
                      >
                        <div className="flex flex-col min-h-[60px]">
                          <p className="font-medium text-sm truncate leading-tight">
                            {entry.title}
                          </p>
                          <div className="flex-1 flex items-end mt-1">
                            <span className="text-xs opacity-70 capitalize">
                              {entry.entryType.replace('-', ' ')}
                            </span>
                          </div>
                        </div>
                        {selectedEntryId === entry.id && (
                          <Pin className="absolute top-2 right-2 h-3 w-3 opacity-60" />
                        )}
                      </button>
                    );
                  })}
                  {!isExpanded && categoryEntries.length > 8 && (
                    <button
                      onClick={() => setExpandedCategory(category.id)}
                      className="flex items-center justify-center p-3 rounded-lg border border-dashed border-gray-300 hover:border-gray-400 transition-colors text-muted-foreground hover:text-foreground min-h-[60px]"
                    >
                      <div className="text-center">
                        <span className="text-lg">+</span>
                        <p className="text-xs mt-1">{categoryEntries.length - 8} more</p>
                      </div>
                    </button>
                  )}
                </div>
              )
            ) : (
              // Empty state - show placeholder message
              <div className="flex-1 flex items-center justify-center text-center py-8">
                <div className="text-muted-foreground">
                  <category.icon className={cn("h-8 w-8 mx-auto mb-2", category.iconColor)} />
                  <p className="text-sm">No {category.label.toLowerCase()} yet</p>
                  <p className="text-xs">Create your first one below</p>
                </div>
              </div>
            )}
          </div>

          {/* Add new button - Always at bottom with proper spacing */}
          <div className="mt-auto pt-4 border-t border-border/50 relative z-10 bg-background">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center gap-2 h-9"
              onClick={() => {
                // For world elements, use specific subcategories instead of generic "world-element"
                if (category.id === "world-element") {
                  onCreateEntry("government"); // Default to government as most common
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

      {/* Bento Grid - Optimized for 2x4 display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[800px]">
        {categories.map(renderCategoryTile)}
      </div>

      {/* Quick Stats - Completely separate from grid */}
      {entries.length > 0 && (
        <Card className="bg-muted/50 mt-6">
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
import { StoryBibleEntry } from "@shared/schema";
import { Users, MapPin, ShoppingBag, Calendar, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface BibleEntryProps {
  entry: StoryBibleEntry;
  isSelected: boolean;
  onClick: () => void;
}

export default function BibleEntry({ entry, isSelected, onClick }: BibleEntryProps) {
  // Get the appropriate icon based on entry type
  const getIcon = () => {
    switch (entry.entryType) {
      case "character":
        return <Users className="h-4 w-4" />;
      case "location":
        return <MapPin className="h-4 w-4" />;
      case "item":
        return <ShoppingBag className="h-4 w-4" />;
      case "event":
        return <Calendar className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };
  
  // Get entry type color
  const getTypeColor = () => {
    switch (entry.entryType) {
      case "character":
        return "text-blue-500";
      case "location":
        return "text-green-500";
      case "item":
        return "text-amber-500";
      case "event":
        return "text-purple-500";
      default:
        return "text-neutral-500";
    }
  };
  
  return (
    <div 
      className={cn(
        "flex items-center p-2 rounded-md cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800",
        isSelected && "bg-neutral-100 dark:bg-neutral-800"
      )}
      onClick={onClick}
    >
      <div className={cn("mr-2", getTypeColor())}>
        {getIcon()}
      </div>
      <div className="overflow-hidden">
        <div className="text-sm font-medium truncate">{entry.title}</div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400 capitalize truncate">
          {entry.entryType}
        </div>
      </div>
    </div>
  );
}

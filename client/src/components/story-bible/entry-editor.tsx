import type { StoryBibleEntry } from "@shared/schema";
import { EnhancedBibleEditor } from "@/components/story-bible/enhanced-bible-editor";
import { CharacterEditor } from "@/components/story-bible/character-editor";
import { GroupsRacesEditor } from "@/components/story-bible/groups-races-editor";
import { LocationsEditor } from "@/components/story-bible/locations-editor";
import { EventsEditor } from "@/components/story-bible/events-editor";
import { WorldElementsEditor } from "@/components/story-bible/world-elements-editor";
import { DetailsEditor } from "@/components/story-bible/details-editor";
import { ResearchEditor } from "@/components/story-bible/research-editor";

export function EntryEditor({entry,projectId,onClose}:{entry:StoryBibleEntry;projectId:number;onClose:()=>void}) {
    switch (entry.entryType) {
      case "characters":
        return <CharacterEditor entry={entry} projectId={projectId} onClose={onClose} />;
      case "groups_races":
        return <GroupsRacesEditor entry={entry} projectId={projectId} onClose={onClose} />;
      case "locations":
        return <LocationsEditor entry={entry} projectId={projectId} onClose={onClose} />;
      case "events":
        return <EventsEditor entry={entry} projectId={projectId} onClose={onClose} />;
      case "world_elements":
        return <WorldElementsEditor entry={entry} projectId={projectId} onClose={onClose} />;
      case "details":
        return <DetailsEditor entry={entry} projectId={projectId} onClose={onClose} />;
      case "research":
        return <ResearchEditor entry={entry} projectId={projectId} onClose={onClose} />;
      default:
        return <EnhancedBibleEditor entry={entry} projectId={projectId} onClose={onClose} />;
    }
}

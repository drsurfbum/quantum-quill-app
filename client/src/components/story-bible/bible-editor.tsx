import type { StoryBibleEntry } from "@shared/schema";
import { CharacterEditor } from "./character-editor";
import { LocationsEditor } from "./locations-editor";
import { EventsEditor } from "./events-editor";
import { WorldElementsEditor } from "./world-elements-editor";
import { EnhancedBibleEditor } from "./enhanced-bible-editor";

// Keep historical routes usable without maintaining a second, unsafe autosave implementation.
export default function BibleEditor(props: { entry: StoryBibleEntry; projectId: number }) {
  switch (props.entry.entryType) {
    case "character": case "characters": return <CharacterEditor key={props.entry.id} {...props} />;
    case "location": case "locations": return <LocationsEditor key={props.entry.id} {...props} />;
    case "event": case "events": return <EventsEditor key={props.entry.id} {...props} />;
    case "world-element": case "world_elements": return <WorldElementsEditor key={props.entry.id} {...props} />;
    default: return <EnhancedBibleEditor key={props.entry.id} {...props} />;
  }
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { flushPendingSaves, getSaveQueue } from "@/hooks/use-autosave";
import { apiRequest } from "@/lib/queryClient";
import { bibleEntryArchived } from "@/lib/story-bible-data";
import { useStoryBibleEntries } from "@/hooks/use-story-bible";
import type { StoryBibleEntry } from "@shared/schema";
import { relationshipDefinition } from "@shared/relationships";
import { useRelationships, RelationshipTarget, RelationshipNavigation, RelationshipSection } from "./relationships";
export function EntryLinks({ entry, onOpen }: { entry: StoryBibleEntry; onOpen: (entry: StoryBibleEntry) => void }) {
  const { data: entries = [] } = useStoryBibleEntries(entry.projectId, { staleTime: 0 });
  const { data: links = [], isError } = useRelationships(entry.projectId);
  const current = entries.find(item => item.id === entry.id) || entry;
  const archived = bibleEntryArchived(current);
  const [archiveBusy, setArchiveBusy] = useState(false), [archiveError, setArchiveError] = useState("");
  async function archive() {
    setArchiveBusy(true); setArchiveError("");
    try {
      if (!await flushPendingSaves()) throw new Error("Resolve pending drafts before changing archive status.");
      const queue = getSaveQueue(`/api/story-bible/${entry.id}`, `/api/projects/${entry.projectId}/story-bible`);
      queue.enqueue({ isArchived: !archived });
      if (!await queue.flush()) throw new Error("Archive status could not be saved. Review or retry the retained draft.");
      onOpen(await (await apiRequest("GET", `/api/story-bible/${entry.id}`)).json());
    } catch (cause) { setArchiveError(cause instanceof Error ? cause.message : "Could not change archive status."); }
    finally { setArchiveBusy(false); }
  }
  const incoming = links.filter(link => link.targetId === entry.id);
  return <RelationshipNavigation.Provider value={onOpen}><section className="mt-6 rounded-lg border p-4 space-y-3" aria-label="Entry connections">
    <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Backlinks</h2><Button variant="outline" size="sm" disabled={archiveBusy} onClick={() => void archive()}>{archived ? "Restore entry" : "Archive entry"}</Button></div>
    {archiveError && <p role="alert" className="text-sm text-destructive">{archiveError}</p>}
    <p className="text-sm text-muted-foreground">Linked entries cannot be deleted until connections are removed. Archive keeps their links and history.</p>
    {isError ? <p role="alert">Backlinks could not load.</p> : incoming.length ? <ul className="space-y-3">{incoming.map(link => <li key={link.id} data-backlink-id={link.id}><RelationshipTarget entry={entries.find(item => item.id === link.sourceId)} /><span className="text-sm text-muted-foreground"> · {relationshipDefinition(link.relationshipType).label}{link.role && ` · ${link.role}`}</span>{link.context && <p className="text-sm whitespace-pre-wrap">{link.context}</p>}</li>)}</ul> : <p className="text-sm">No incoming links.</p>}
    <details><summary className="cursor-pointer text-sm">All outgoing relationships</summary><RelationshipSection entry={entry} /></details>
  </section></RelationshipNavigation.Provider>;
}

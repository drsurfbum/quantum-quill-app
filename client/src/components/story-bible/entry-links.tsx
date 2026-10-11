import { useStoryBibleEntries } from "@/hooks/use-story-bible";
import { bibleLinks } from "@shared/story-bible";
import type { StoryBibleEntry } from "@shared/schema";
import { getSaveQueue, usePendingSaves } from "@/hooks/use-autosave";
export function EntryLinks({ entry, onOpen }: { entry: StoryBibleEntry; onOpen: (entry: StoryBibleEntry) => void }) {
  const { data: entries = [] } = useStoryBibleEntries(entry.projectId);
  usePendingSaves();
  const current = { ...(entries.find(item => item.id === entry.id) || entry), ...getSaveQueue(`/api/story-bible/${entry.id}`).getDraft() };
  const outgoing = [...new Set(bibleLinks(current).map(link => link.targetId))];
  const incoming = entries.filter(other => other.id !== entry.id && bibleLinks(other).some(link => link.targetId === entry.id));
  async function open(target: StoryBibleEntry) {
    if (await getSaveQueue(`/api/story-bible/${entry.id}`).flush()) onOpen(target);
  }
  return <section className="mt-6 rounded-lg border p-4 space-y-3" aria-label="Entry connections">
    <h2 className="font-semibold">Entry connections</h2>
    <div className="grid sm:grid-cols-2 gap-4">
      <div><h3 className="text-sm text-muted-foreground">Links from this entry</h3>
        {outgoing.length ? <ul>{outgoing.map(id => { const target = entries.find(item => item.id === id); return <li key={id}>{target ? <button className="underline text-sm" onClick={() => void open(target)}>{target.title}</button> : <span className="text-sm">Entry {id} (unavailable)</span>}</li>; })}</ul> : <p className="text-sm">No outgoing links.</p>}
      </div>
      <div><h3 className="text-sm text-muted-foreground">Entries linking here</h3>
        {incoming.length ? <ul>{incoming.map(target => <li key={target.id}><button className="underline text-sm" onClick={() => void open(target)}>{target.title}</button></li>)}</ul> : <p className="text-sm">No incoming links.</p>}
      </div>
    </div>
  </section>;
}

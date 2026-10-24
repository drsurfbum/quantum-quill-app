import { useState } from "react";
import { ArrowLeft, BookOpen, Pencil, Star } from "lucide-react";
import type { StoryBibleEntry } from "@shared/schema";
import { fieldChoices } from "@shared/bible-catalog";
import { legacyClassification } from "@shared/bible-contract";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SaveStatus } from "@/components/save-status";
import { useAutosave, withPendingEdits } from "@/hooks/use-autosave";
import { structuredBibleData, bibleEntryArchived } from "@/lib/story-bible-data";
import { bibleCategory, bibleDescription, bibleGuidance, bibleImage, bibleText, bibleTypeName, hasImportedSource } from "@/lib/bible-workspace";
import { EntryEditor } from "./entry-editor";
import { ImportedSource } from "./imported-source";
import { RelationshipNavigation, RelationshipSection, RelationshipTarget, useRelationships } from "./relationships";
import { useStoryBibleEntries } from "@/hooks/use-story-bible";
import { EntryLinks } from "./entry-links";
import { SceneBacklinks } from "./scene-backlinks";
import { ConversionPreview } from "./conversion-preview";
import { bibleGuide } from "@shared/bible-guidance";
import { BibleGuidanceVisibility, RetainedEntryValues } from "./guidance";

const facts: Record<string, Array<[string,string]>> = {
  characters: [["primaryRole","Role"],["age","Age"],["origin","Origin"],["species","Species"],["motivations","Motivations"],["conflicts","Conflicts"]],
  groups_races: [["status","Status"],["purpose","Purpose"],["ideology","Beliefs"],["leadershipStructure","Leadership"],["eraEstablished","Founded"],["homeworld","Origin"]],
  locations: [["status","Status"],["environment","Environment"],["purpose","Purpose"],["size","Size"],["eraEstablished","Established"],["history","History"]],
  events: [["fictionalDate","Date"],["era","Era"],["status","Status"],["outcomeType","Outcome"],["writerNotes","Writer’s notes"]],
  world_elements: [["status","Status"],["discoveryOrigin","Origins"],["loreHooks","Lore hooks"]],
  details: [["type","Type"],["status","Status"],["explanation","How to use it"],["outcomeNotes","Outcome"]],
  research: [["sourceType","Source type"],["status","Status"],["urlOrReference","Source reference"],["nextSteps","Next steps"]],
};

export function WorkspaceEntry({entry:serverEntry,onOpen,onBack,initialTab="overview",guidance:guided,onGuidanceChange}:{entry:StoryBibleEntry;onOpen:(entry:StoryBibleEntry)=>void;onBack:()=>void;initialTab?:string;guidance?:boolean;onGuidanceChange?:(visible:boolean)=>void}) {
  const [tab,setTab] = useState(initialTab);
  const [localGuidance,setLocalGuidance] = useState(true);
  const guidance = guided ?? localGuidance;
  const setGuidance = onGuidanceChange || setLocalGuidance;
  const url = `/api/story-bible/${serverEntry.id}`;
  const autosave = useAutosave(url,`/api/projects/${serverEntry.projectId}/story-bible`);
  const entry = withPendingEdits(url,serverEntry);
  const source = hasImportedSource(entry);
  return <RelationshipNavigation.Provider value={onOpen}><BibleGuidanceVisibility.Provider value={guidance}>
    <Tabs value={tab} onValueChange={setTab} className="bible-entry-workspace flex flex-col min-h-0 h-full">
      <div className="shrink-0 border-b bg-background px-4 pt-4 sm:px-7">
        <div className="flex items-center justify-between gap-2 mb-3"><Button size="sm" variant="ghost" onClick={onBack} className="-ml-2 gap-1.5"><ArrowLeft className="h-4 w-4"/>Library</Button><SaveStatus status={autosave.status} retry={autosave.flush} stable/></div>
        <div className="flex items-start justify-between gap-3 pb-4"><div className="min-w-0"><p className="text-xs text-muted-foreground mb-1">{bibleTypeName(entry.entryType)}{bibleCategory(entry) && ` · ${bibleCategory(entry)}`}{bibleEntryArchived(entry) && " · Archived"}</p><h1 className="text-xl sm:text-2xl font-semibold tracking-tight break-words">{entry.title}</h1></div><button aria-label={entry.priority ? "Unstar entry" : "Star entry"} aria-pressed={!!entry.priority} onClick={()=>autosave.save({priority:entry.priority ? 0 : 1})} className="shrink-0 p-2 rounded-md hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-ring"><Star className={`h-5 w-5 ${entry.priority ? "fill-current text-amber-600 dark:text-amber-300" : "text-muted-foreground"}`}/></button></div>
        <TabsList aria-label="Entry sections" className="bible-entry-tabs h-auto justify-start bg-transparent rounded-none p-0 gap-4 max-w-full overflow-x-auto">
          {[['overview','Overview'],['develop','Develop'],['connections','Connections'],...(source ? [['source','Source']] : [])].map(([key,label])=><TabsTrigger key={key} value={key} className="px-1 py-3 border-b-2 border-transparent rounded-none data-[state=active]:shadow-none data-[state=active]:border-violet-500 data-[state=active]:text-violet-700 dark:data-[state=active]:text-violet-300">{label}</TabsTrigger>)}
        </TabsList>
      </div>
      {/* Keep the editor and connection dialogs mounted across tabs. Local field
          state and failed-save drafts must survive a change of view. */}
      <TabsContent forceMount value="overview" hidden={tab!=="overview"} className="bible-tab-panel"><EntryOverview entry={entry} onDevelop={()=>setTab("develop")} onConnections={()=>setTab("connections")}/></TabsContent>
      <TabsContent forceMount value="develop" hidden={tab!=="develop"} className="bible-tab-panel">
        <div className="mb-5"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Develop this element</h2><Button type="button" size="sm" variant="ghost" aria-pressed={guidance} onClick={()=>setGuidance(!guidance)}>{guidance ? "Hide guidance" : "Show guidance"}</Button></div>
          <p hidden={!guidance} className="mt-1 text-sm leading-relaxed text-muted-foreground">{bibleGuide(entry.entryType)?.purpose || bibleGuidance[entry.entryType]} Start with what you know; every field below the name is optional. Changes save automatically.</p>
        </div>
        <div className="bible-workspace-fields"><EntryEditor entry={serverEntry} projectId={entry.projectId} onClose={onBack} showSource={false}/></div>
        <div className="mt-8"><RetainedEntryValues entry={entry}/><ConversionPreview entry={entry}/></div>
      </TabsContent>
      <TabsContent forceMount value="connections" hidden={tab!=="connections"} className="bible-tab-panel"><h2 className="text-lg font-semibold">Connections</h2><p className="mt-1 mb-5 text-sm text-muted-foreground">Link this element to your world and see where it appears in your writing. Choose a target and save explicitly to add a connection.</p><RelationshipSection entry={entry} title="Linked elements" suggestions={bibleGuide(entry.entryType)?.connections}/><EntryLinks entry={entry} onOpen={onOpen} showArchive={false}/><p className="mt-4 text-sm text-muted-foreground">Archive and other entry options are available in <button className="underline" onClick={()=>setTab("develop")}>Develop</button>.</p><SceneBacklinks entry={entry}/></TabsContent>
      {source && <TabsContent forceMount value="source" hidden={tab!=="source"} className="bible-tab-panel"><h2 className="text-lg font-semibold mb-1">Original source</h2><p className="text-sm text-muted-foreground mb-5">Your imported notes and original pages, kept alongside your working entry.</p><ImportedSource entry={entry} expanded/></TabsContent>}
    </Tabs>
  </BibleGuidanceVisibility.Provider></RelationshipNavigation.Provider>;
}

function EntryOverview({entry,onDevelop,onConnections}:{entry:StoryBibleEntry;onDevelop:()=>void;onConnections:()=>void}) {
  const fields = structuredBibleData(entry), image = bibleImage(entry), description = bibleDescription(entry);
  const {data:entries=[]} = useStoryBibleEntries(entry.projectId);
  const links = useRelationships(entry.projectId);
  const connected = [...new Set((links.data || []).filter(link=>link.sourceId===entry.id || link.targetId===entry.id).map(link=>link.sourceId===entry.id ? link.targetId : link.sourceId))];
  const populated = (facts[entry.entryType] || []).filter(([key])=>typeof fields[key]==="string" && fields[key].trim());
  const tags = legacyClassification(entry).tags;
  return <div className="space-y-7">
    <div className="bible-overview-grid">
      <section className="min-w-0 space-y-3"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">At a glance</h2><Button variant="outline" size="sm" onClick={onDevelop} className="gap-1.5"><Pencil className="h-3.5 w-3.5"/>Edit details</Button></div><p className={`text-sm leading-7 whitespace-pre-wrap break-words ${description ? "" : "text-muted-foreground"}`}>{description ? description.length>420 ? `${description.slice(0,420)}…` : description : "No description yet. Start with what this element contributes to your story."}</p>{description.length>420 && <button className="text-sm underline underline-offset-4" onClick={onDevelop}>Read and edit the full entry</button>}</section>
      {image && <figure className="m-0"><img src={image} alt={String(fields.imageDescription || entry.title)} className="w-full max-h-64 object-contain rounded-lg border border-border/60 bg-muted/10"/></figure>}
    </div>
    {!!populated.length && <section><h2 className="font-semibold mb-4">Key details</h2><dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">{populated.map(([key,label])=><div key={key} className="min-w-0"><dt className="text-xs text-muted-foreground mb-1">{label}</dt><dd className="text-sm leading-relaxed whitespace-pre-wrap break-words line-clamp-6">{fieldChoices(entry.entryType,key).find(choice=>choice.value===fields[key])?.label || bibleText(fields[key])}</dd></div>)}</dl></section>}
    <section className="border-t pt-5"><div className="flex justify-between items-center gap-3"><h2 className="font-semibold">Connected elements <span className="text-muted-foreground text-sm font-normal">{connected.length}</span></h2><Button size="sm" variant="ghost" onClick={onConnections}>Manage connections</Button></div>{links.isError ? <p role="alert" className="text-sm">Connections could not load. <button className="underline" onClick={()=>void links.refetch()}>Retry</button></p> : links.isLoading ? <p role="status" className="text-sm">Loading connections…</p> : connected.length ? <ul className="grid sm:grid-cols-2 gap-2 mt-3">{connected.map(id=><li key={id} className="flex items-center gap-2 min-w-0 rounded-md border border-border/60 p-3 text-sm"><BookOpen className="h-4 w-4 shrink-0 text-muted-foreground"/><RelationshipTarget entry={entries.find(item=>item.id===id)}/></li>)}</ul> : <p className="text-sm text-muted-foreground mt-2">No connected elements yet. Add people, places, or ideas that relate to this entry.</p>}</section>
    {!!tags.length && <section className="border-t pt-5"><h2 className="text-xs text-muted-foreground mb-2">Tags</h2><div className="flex flex-wrap gap-2">{tags.map(tag=><span key={tag} className="text-xs rounded-full border px-2.5 py-1">{tag}</span>)}</div></section>}
  </div>;
}

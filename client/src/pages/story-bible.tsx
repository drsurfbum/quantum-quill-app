import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, useSearch, Link } from "wouter";
import type { StoryBibleEntry } from "@shared/schema";
import WorkspaceHeader from "@/components/workspace-header";
import { WorkspaceLibrary } from "@/components/story-bible/workspace-library";
import { WorkspaceEntry } from "@/components/story-bible/workspace-entry";
import { SceneReturn } from "@/components/story-bible/scene-backlinks";
import { useProject } from "@/hooks/use-project";
import { useCreateStoryBibleEntry, useStoryBibleEntries } from "@/hooks/use-story-bible";
import { prepareManuscriptAction } from "@/lib/manuscript-actions";
import { bibleTypes, defaultBibleFilters } from "@/lib/bible-workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TypeGuidance } from "@/components/story-bible/guidance";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function StoryBible() {
  const {id} = useParams();
  return <StoryBibleWorkspace key={id} projectId={Number(id)}/>;
}
function StoryBibleWorkspace({projectId}:{projectId:number}) {
  const [,navigate] = useLocation();
  const search = new URLSearchParams(useSearch());
  const requestedEntry = Number(search.get("entry"));
  const fromScene = Number(search.get("fromScene"));
  const hasEntry = Number.isSafeInteger(requestedEntry) && requestedEntry>0;
  const {data:project,isLoading:projectLoading} = useProject(projectId);
  const entries = useStoryBibleEntries(projectId);
  const entryQuery = useQuery<StoryBibleEntry>({queryKey:[`/api/story-bible/${requestedEntry}`],enabled:hasEntry,staleTime:0});
  const entry = entryQuery.data?.projectId === projectId ? entryQuery.data : undefined;
  const [filters,setFilters] = useState(defaultBibleFilters);
  const [guidance,setGuidance] = useState(true);
  const [navigationError,setNavigationError] = useState("");
  const [creating,setCreating] = useState(false), [newType,setNewType] = useState("characters"), [newName,setNewName] = useState(""), [createError,setCreateError] = useState("");
  const createMutation = useCreateStoryBibleEntry();
  const createLock = useRef(false);
  const [createBusy,setCreateBusy] = useState(false);
  function entryUrl(entryId?:number,develop=false) {
    const params = new URLSearchParams();
    if(entryId) params.set("entry",String(entryId));
    if(fromScene>0) params.set("fromScene",String(fromScene));
    if(develop) params.set("section","develop");
    return `/project/${projectId}/story-bible${params.size ? `?${params}` : ""}`;
  }
  async function openEntry(next?:StoryBibleEntry) {
    setNavigationError("");
    try { await prepareManuscriptAction(projectId); navigate(entryUrl(next?.id)); }
    catch(cause) {setNavigationError(cause instanceof Error ? cause.message : "Could not leave this entry.");}
  }
  function openCreate() {setNewType(filters.type === "all" ? "characters" : filters.type);setNewName("");setCreateError("");setCreating(true);}
  async function createEntry(event:React.FormEvent) {
    event.preventDefault();if(!newName.trim() || createLock.current)return;
    createLock.current=true;setCreateBusy(true);
    setCreateError("");
    try {
      await prepareManuscriptAction(projectId);
      const result = await createMutation.mutateAsync({title:newName.trim(),entryType:newType,content:"",projectId});
      setCreating(false);navigate(entryUrl(result.data.id,true));
    } catch(cause) {setCreateError(cause instanceof Error ? cause.message : "Entry could not be created. Your name is still here.");}
    finally {createLock.current=false;setCreateBusy(false);}
  }
  if(!project) return <main className="p-8"><p role="status">{projectLoading ? "Opening your workspace…" : "This project is unavailable."}</p><Link href="/" className="underline text-sm">Back to projects</Link></main>;
  const libraryProps = {entries:entries.data || [],filters,onFilter:setFilters,onOpen:(entry:StoryBibleEntry)=>void openEntry(entry),onCreate:openCreate,loading:entries.isLoading,error:entries.isError,retry:()=>void entries.refetch()};
  return <main className="h-dvh flex flex-col overflow-hidden bg-background">
    <WorkspaceHeader project={project}/>
    {fromScene>0 && <SceneReturn sceneId={fromScene} projectId={projectId}/>}
    {navigationError && <p role="alert" className="shrink-0 border-b px-4 py-3 text-sm text-destructive">{navigationError}</p>}
    <div role="region" aria-label="Story Bible content" className="flex flex-1 min-h-0 overflow-hidden">
      <div className={hasEntry ? "bible-library-sidebar border-r shrink-0 bg-muted/5" : "flex-1 min-w-0"}><WorkspaceLibrary {...libraryProps} compact={hasEntry} selectedId={requestedEntry}/></div>
      {hasEntry && <section aria-label="Entry detail" className="flex-1 min-w-0 min-h-0">
        {entry ? <WorkspaceEntry key={`${entry.id}:${entry.entryType}`} entry={entry} onOpen={next=>void openEntry(next)} onBack={()=>void openEntry()} initialTab={search.get("section")==="develop" ? "develop" : "overview"} guidance={guidance} onGuidanceChange={setGuidance}/> : <div className="p-6 space-y-4"><p role="status">{entryQuery.isLoading ? "Opening Story Bible entry…" : "This entry is unavailable in this project."}</p><Button variant="outline" onClick={()=>void openEntry()}>Back to library</Button>{entryQuery.isError && <Button variant="ghost" onClick={()=>void entryQuery.refetch()}>Retry</Button>}</div>}
      </section>}
    </div>
    <Dialog open={creating} onOpenChange={open=>{if(!createBusy)setCreating(open);}}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Story Bible entry</DialogTitle><DialogDescription>Only a name and type are needed. Save an unfinished idea now and develop it as you write.</DialogDescription></DialogHeader>
        <form onSubmit={event=>void createEntry(event)} className="space-y-4">
          <label className="block text-sm space-y-2"><span>Entry type</span><select value={newType} onChange={event=>setNewType(event.target.value)} className="bible-select w-full" disabled={createBusy}>{bibleTypes.map(type=><option key={type.key} value={type.key}>{type.name}</option>)}</select></label>
          <TypeGuidance type={newType}/>
          <label className="block text-sm space-y-2"><span>Name <span className="text-muted-foreground">(required)</span></span><Input value={newName} onChange={event=>setNewName(event.target.value)} autoFocus maxLength={500} required placeholder="Give this element a name…" disabled={createBusy}/></label>
          <p className="text-xs text-muted-foreground">Descriptions, facts, images and connections are optional. Nothing from the examples is added to your entry.</p>
          {createError && <p role="alert" className="text-sm text-destructive">{createError}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={()=>setCreating(false)} disabled={createBusy}>Cancel</Button><Button type="submit" disabled={!newName.trim() || createBusy}>{createBusy ? "Creating…" : "Create entry"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  </main>;
}

import { BookOpen, ChevronRight, Plus, Search, Star, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { StoryBibleEntry } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bibleEntryArchived } from "@/lib/story-bible-data";
import { bibleCategory, bibleDescription, bibleImage, bibleTypes, bibleTypeName, defaultBibleFilters, filterBibleEntries, type BibleFilters } from "@/lib/bible-workspace";

type Props = {
  entries: StoryBibleEntry[]; filters: BibleFilters; onFilter: (filters: BibleFilters) => void;
  onOpen: (entry: StoryBibleEntry) => void; onCreate: () => void;
  compact?: boolean; selectedId?: number; loading?: boolean; error?: boolean; retry: () => void;
};
export function WorkspaceLibrary({entries,filters,onFilter,onOpen,onCreate,compact=false,selectedId,loading,error,retry}:Props) {
  const selectedRow = useRef<HTMLButtonElement>(null);
  // Keep the selected entry in view when opening the detail pane. Refetching or
  // saving does not reset the library scroll position.
  useEffect(()=>{if(compact)selectedRow.current?.scrollIntoView?.({block:"nearest"});},[compact,selectedId]);
  const change = (patch: Partial<BibleFilters>) => onFilter({...filters,...patch});
  const visible = filterBibleEntries(entries,filters);
  const scope = filterBibleEntries(entries,{...defaultBibleFilters,archive:filters.archive});
  const categories = [...new Set(scope.filter(entry=>filters.type === "all" || entry.entryType===filters.type).map(bibleCategory).filter(Boolean))].sort();
  const filtered = filters.query || filters.type!=="all" || filters.category!=="all" || filters.starred;
  return <section aria-label="Story Bible library" className={`bible-library flex min-h-0 flex-col ${compact ? "h-full" : "h-full max-w-6xl mx-auto w-full"}`}>
    <div className={`shrink-0 space-y-4 ${compact ? "p-4" : "px-4 pt-5 sm:px-8 sm:pt-7"}`}>
      <div className="flex items-start justify-between gap-3">
        <div><h1 className={compact ? "font-semibold" : "text-2xl sm:text-3xl font-semibold tracking-tight"}>Story Bible</h1>{!compact && <p className="mt-1 text-sm text-muted-foreground">The people, places & ideas behind your story.</p>}</div>
        <Button onClick={onCreate} size="sm" className="shrink-0 gap-2" aria-label="New entry"><Plus className="h-4 w-4"/>{compact ? "New" : "New entry"}</Button>
      </div>
      <div className="relative"><Search aria-hidden className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input aria-label="Search Story Bible" className="pl-9 pr-9 bg-background" value={filters.query} placeholder="Name, phrase or idea…" onChange={event=>change({query:event.target.value})}/>{filters.query && <button aria-label="Clear search" className="absolute right-2 top-2 p-1" onClick={()=>change({query:""})}><X className="h-4 w-4"/></button>}</div>
      {compact ? <label className="block text-xs text-muted-foreground">Entry type<select className="bible-select mt-1 w-full" value={filters.type} onChange={event=>change({type:event.target.value,category:"all"})}><option value="all">All elements ({scope.length})</option>{bibleTypes.map(type=><option key={type.key} value={type.key}>{type.name} ({scope.filter(entry=>entry.entryType===type.key).length})</option>)}</select></label> : <div className="flex flex-wrap gap-1.5" role="group" aria-label="Entry types">
        {[{key:"all",name:"All elements"},...bibleTypes].map(type=><button key={type.key} aria-pressed={filters.type===type.key} onClick={()=>change({type:type.key,category:"all"})} className={`rounded-md px-3 py-2 text-sm transition-colors ${filters.type===type.key ? "bg-violet-100 text-violet-950 dark:bg-violet-400/15 dark:text-violet-200" : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"}`}>{type.name}<span className="ml-2 text-xs opacity-75">{type.key==="all" ? scope.length : scope.filter(entry=>entry.entryType===type.key).length}</span></button>)}
      </div>}
      <div className={`flex gap-2 ${compact ? "flex-wrap" : "flex-wrap items-center"}`}>
        <select aria-label="Archive filter" className="bible-select" value={filters.archive} onChange={event=>change({archive:event.target.value,category:"all"})}><option value="active">Active entries</option><option value="archived">Archived entries</option><option value="all">All entries</option></select>
        <select aria-label="Category filter" className="bible-select min-w-0 max-w-full" value={filters.category} onChange={event=>change({category:event.target.value})}><option value="all">All categories</option>{categories.map(category=><option key={category} value={category}>{category}</option>)}</select>
        <button aria-label="Show starred entries" aria-pressed={filters.starred} className={`bible-select flex items-center gap-1.5 ${filters.starred ? "text-amber-600 dark:text-amber-300" : ""}`} onClick={()=>change({starred:!filters.starred})}><Star className={`h-3.5 w-3.5 ${filters.starred ? "fill-current" : ""}`}/>{!compact && "Starred"}</button>
        {!compact && <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">Sort<select aria-label="Sort entries" className="bible-select" value={filters.sort} onChange={event=>change({sort:event.target.value})}><option value="name">Name A–Z</option><option value="recent">Recently updated</option></select></label>}
      </div>
      <div className="flex items-center justify-between pb-3 border-b text-xs text-muted-foreground"><p role="status">{loading ? "Loading entries…" : `${visible.length} ${visible.length===1 ? "entry" : "entries"}`}</p>{filtered && <button className="underline underline-offset-2" onClick={()=>onFilter({...defaultBibleFilters,archive:filters.archive})}>Clear filters</button>}</div>
    </div>
    <div className={`min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable] ${compact ? "px-2 pb-4" : "px-4 pb-8 sm:px-8"}`}>
      {error && <p role="alert" className="py-4 text-sm text-destructive">Entries could not refresh. <button onClick={retry} className="underline">Retry</button></p>}
      {!loading && !visible.length && <div className="py-12 text-center space-y-3"><BookOpen className="h-8 w-8 mx-auto text-muted-foreground"/><h2 className="font-medium">{filtered ? "No matching entries" : filters.archive==="archived" ? "No archived entries" : "Make room for your world"}</h2><p className="text-sm text-muted-foreground">{filtered ? "Try another phrase or clear the filters." : "Start with a person, a place, or an idea. Add details as you go."}</p><Button variant="outline" size="sm" onClick={onCreate}>Create an entry</Button></div>}
      <ul aria-label="Story Bible entries" className="divide-y divide-border/60">{visible.map(entry=>{
        const image=bibleImage(entry), description=bibleDescription(entry).replace(/\s+/g," ");
        return <li key={entry.id}><button ref={selectedId===entry.id ? selectedRow : undefined} onClick={()=>onOpen(entry)} aria-label={`Open ${entry.title}`} aria-current={selectedId===entry.id ? "true" : undefined} className={`group w-full flex items-center gap-3 text-left rounded-md px-2 ${compact ? "py-3" : "py-4 sm:px-3"} hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selectedId===entry.id ? "bg-violet-100/70 dark:bg-violet-400/10" : ""}`}>
          <span className={`shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted/15 flex items-center justify-center ${compact ? "h-9 w-9" : "h-12 w-12"}`}>{image ? <img src={image} alt="" loading="lazy" className="w-full h-full object-cover"/> : <BookOpen className="h-4 w-4 text-muted-foreground"/>}</span>
          <span className="min-w-0 flex-1"><span className="flex items-start gap-2"><span className={`font-medium break-words ${compact ? "text-sm" : "text-base"}`}>{entry.title}</span>{!!entry.priority && <Star aria-label="Starred" className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-300 mt-1 fill-current"/>}</span><span className="block text-xs text-muted-foreground mt-1">{bibleTypeName(entry.entryType)}{bibleCategory(entry) && ` · ${bibleCategory(entry)}`}{bibleEntryArchived(entry) && " · Archived"}</span>{!compact && description && <span className="block truncate mt-1 text-sm text-muted-foreground">{description.slice(0,240)}</span>}</span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground"/>
        </button></li>;
      })}</ul>
    </div>
  </section>;
}

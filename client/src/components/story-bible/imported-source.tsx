import type { StoryBibleEntry } from "@shared/schema";
import { objectData } from "@shared/story-bible";

/** The import copy is reference material. Ordinary field edits never replace it. */
export function ImportedSource({entry, expanded=false}: {entry: StoryBibleEntry; expanded?:boolean}) {
  const source = objectData(objectData(entry.metadata)._notionImport);
  if (source.version !== 1 || typeof source.originalMarkdown !== "string") return null;
  const notes = Array.isArray(source.notes) ? source.notes : [];
  const supporting = Array.isArray(source.supportingPages) ? source.supportingPages : [];
  const sourceUrl = /^[a-f0-9]{32}$/.test(source.sourceId) ? `https://www.notion.so/${source.sourceId}` : undefined;
  function download() {
    const url = URL.createObjectURL(new Blob([source.originalMarkdown], {type:"text/markdown;charset=utf-8"}));
    const link = document.createElement("a"); link.href=url;link.download=`${entry.title.replace(/[^\p{L}\p{N} _-]/gu, "").slice(0,100) || "Notion source"}.md`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <details open={expanded || undefined} className="rounded-lg border bg-muted/10" aria-label="Imported Notion source">
    <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Imported from Notion · Original preserved</summary>
    <div className="px-4 pb-4 space-y-4 text-sm">
      <p className="text-muted-foreground">Edit the Quantum Quill fields to develop this entry. These source notes and the original page stay available for reference.</p>
      {source.archiveReason && <p>{String(source.archiveReason)}</p>}
      <div className="flex flex-wrap gap-4">{sourceUrl && <a className="underline" href={sourceUrl} target="_blank" rel="noreferrer">Open original in Notion ↗</a>}<button className="underline" onClick={download}>Download original page</button></div>
      {notes.map((note,index)=> <details key={index} className="border-t pt-2"><summary className="cursor-pointer font-medium">{String(note.heading || "Source notes")}</summary><p className="whitespace-pre-wrap break-words leading-relaxed mt-2">{String(note.text || "")}</p></details>)}
      {!!supporting.length && <details className="border-t pt-2"><summary className="cursor-pointer font-medium">Character-building & calendar references ({supporting.length})</summary>{supporting.map((page,index)=><details className="mt-3" key={index}><summary className="cursor-pointer">{String(page.title || "Reference")}</summary><pre className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed mt-2">{String(page.markdown || "")}</pre></details>)}</details>}
      <details className="border-t pt-2"><summary className="cursor-pointer font-medium">Complete original page</summary><pre className="max-h-96 overflow-y-auto whitespace-pre-wrap break-words font-sans text-xs leading-relaxed mt-2">{source.originalMarkdown}</pre></details>
    </div>
  </details>;
}

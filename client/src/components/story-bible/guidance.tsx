import { createContext, useContext, useId, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { bibleGuide } from "@shared/bible-guidance";
import type { StoryBibleEntry } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";

export const BibleGuidanceVisibility = createContext(true);

export function TypeGuidance({ type }: { type: string }) {
  const guide = bibleGuide(type);
  if (!guide) return null;
  return <div className="rounded-md border bg-muted/10 p-3 text-sm space-y-2" aria-live="polite">
    <p>{guide.purpose}</p>
    <p className="text-muted-foreground"><span className="font-medium">For example:</span> {guide.examples}</p>
    {guide.distinction && <p className="text-muted-foreground">{guide.distinction}</p>}
  </div>;
}

/** Hidden panels stay mounted. Disclosure is presentation state, never a save. */
export function GuidedFieldGroup({ type, group, open, onOpenChange, children }: {
  type: string; group: string; open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode;
}) {
  const id = useId();
  const visible = useContext(BibleGuidanceVisibility);
  const guide = bibleGuide(type)?.groups[group];
  if (!guide) throw new Error(`Missing Story Bible group guidance: ${type}.${group}`);
  return <Card data-bible-group={group}>
    <h3><button type="button" aria-expanded={open} aria-controls={id} onClick={() => onOpenChange(!open)}
      className="flex w-full items-center justify-between gap-3 rounded-t-lg px-6 py-4 text-left font-semibold hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
      <span>{guide.title}</span>
      <span className="flex shrink-0 items-center gap-2 text-xs font-normal text-muted-foreground">
        <span hidden={!visible}>{guide.start ? "Start here" : "Optional depth"}</span>
        {open ? <ChevronDown aria-hidden="true" className="h-4 w-4"/> : <ChevronRight aria-hidden="true" className="h-4 w-4"/>}
      </span>
    </button></h3>
    <p hidden={!visible} className="px-6 pb-4 text-sm leading-relaxed text-muted-foreground">{guide.prompt}</p>
    <div id={id} hidden={!open}>{children}</div>
  </Card>;
}

/** Help and examples are separate DOM text, never input values or save patches. */
export function FieldHelp({ type, field }: { type: string; field: string }) {
  const visible = useContext(BibleGuidanceVisibility);
  const guide = bibleGuide(type)?.fields[field];
  if (!guide) return null;
  return <div id={`${type}-${field}-help`} hidden={!visible} className="text-xs leading-relaxed text-muted-foreground mt-1 mb-2">
    <p>{guide.help}</p>
    {guide.example && <details className="mt-1"><summary className="cursor-pointer w-fit underline underline-offset-2">Show an example</summary><p className="mt-1">Example only: {guide.example}</p></details>}
  </div>;
}

/** A read-only escape hatch for generic, unknown and imported values. It uses the
 * current entry (including pending edits), not a lossy reconstruction of the form. */
export function RetainedEntryValues({ entry }: { entry: StoryBibleEntry }) {
  const [open, setOpen] = useState(false);
  return <details className="rounded-lg border p-4 mb-4" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="cursor-pointer font-medium">Saved & legacy values</summary>
    <p className="my-3 text-sm text-muted-foreground">Read-only entry data, including fields from older forms and retained imports. Opening this view does not convert or save anything. Imported pages are also available in Source.</p>
    {open && <CardContent className="p-0"><pre tabIndex={0} aria-label="Complete entry data" className="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded bg-muted/10 p-3 text-xs">{JSON.stringify(entry, null, 2)}</pre></CardContent>}
  </details>;
}

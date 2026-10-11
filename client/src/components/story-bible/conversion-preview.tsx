import { useState } from "react";
import { BIBLE_TAXONOMY, type BibleType } from "@shared/bible-catalog";
import type { ContractPreview } from "@shared/bible-contract";
import { apiRequest } from "@/lib/queryClient";
import { flushPendingSaves } from "@/hooks/use-autosave";
import { Button } from "@/components/ui/button";
import type { StoryBibleEntry } from "@shared/schema";

export function ConversionPreview({ entry }: { entry: StoryBibleEntry }) {
  const [type, setType] = useState<BibleType>("details");
  const [preview, setPreview] = useState<ContractPreview>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function inspect() {
    setBusy(true); setError(""); setPreview(undefined);
    try {
      if (!await flushPendingSaves()) throw new Error("Resolve pending drafts before previewing this entry.");
      const current = await (await apiRequest("GET", `/api/story-bible/${entry.id}`)).json();
      const result = await (await apiRequest("POST", `/api/story-bible/${entry.id}/conversion-preview`, { targetType: type, _revision: current.revision })).json();
      setPreview(result);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <details className="mb-4 rounded-lg border p-4">
    <summary className="cursor-pointer font-medium">Preview entry conversion</summary>
    <p className="my-3 text-sm text-muted-foreground">Review where this entry’s information would go. The original stays intact. Applying conversions will become available after the migration review.</p>
    <div className="flex flex-wrap gap-3 items-center">
      <label htmlFor={`conversion-${entry.id}`}>Convert to</label>
      <select id={`conversion-${entry.id}`} className="border rounded px-3 py-2 bg-background" value={type} onChange={event => { setType(event.target.value as BibleType); setPreview(undefined); }} disabled={busy}>
        {Object.values(BIBLE_TAXONOMY).map(item => <option key={item.key} value={item.key}>{item.name}</option>)}
      </select>
      <Button variant="outline" onClick={() => void inspect()} disabled={busy}>{busy ? "Preparing preview…" : "Preview conversion"}</Button>
    </div>
    {error && <p role="alert" className="mt-3 text-destructive">{error}</p>}
    {preview && <section aria-label="Conversion preview" className="mt-4 space-y-3">
      <p>{preview.sourceType} → {preview.targetType}. Original payload retained. No changes applied.</p>
      {preview.issues.map(issue => <p key={issue} role="alert">{issue}</p>)}
      {!!preview.document?.legacy.conflicts.length && <p role="alert">Conflicting representations retained for review: {preview.document.legacy.conflicts.join(", ")}</p>}
      <div className="max-h-64 overflow-auto"><table className="w-full text-sm text-left"><thead><tr><th>Original field</th><th>Proposed destination</th></tr></thead><tbody>{preview.mappings.map((mapping, index) => <tr key={index} className="border-t"><td className="py-1 pr-3">{mapping.source}</td><td>{mapping.destination}</td></tr>)}</tbody></table></div>
    </section>}
  </details>;
}

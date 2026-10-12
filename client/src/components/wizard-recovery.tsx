import { Button } from "@/components/ui/button";
import type { WizardRecord } from "@/lib/wizard-journal";

export function WizardRecovery({ drafts, restore, discard, error, value, disabled = false }: {
  disabled?: boolean; drafts: WizardRecord[]; restore: (draft: WizardRecord) => void; discard: (draft: WizardRecord) => void; error: string; value: unknown;
}) {
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "quantum-quill-wizard-draft.json"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <>
    {drafts.length > 0 && <div className="rounded-md border bg-muted/40 p-3 space-y-2" aria-label="Saved wizard drafts">
      <p className="text-sm">You have saved progress in this browser. Restore a draft or continue with a new plan.</p>
      {drafts.map(draft => <div key={draft.id} className="flex flex-wrap items-center gap-2 text-sm">
        <span className="flex-1">{String((draft.value as any)?.title || (draft.value as any)?.source?.structure?.name || "Saved plan")} · {new Date(draft.updatedAt).toLocaleString()}</span>
        <Button disabled={disabled} size="sm" variant="outline" onClick={() => restore(draft)}>Restore draft</Button>
        <Button disabled={disabled} size="sm" variant="ghost" onClick={() => discard(draft)}>Discard draft</Button>
      </div>)}
    </div>}
    {error && <p role="alert" className="text-sm text-destructive">{error} <button className="underline" onClick={download}>Download plan</button></p>}
  </>;
}

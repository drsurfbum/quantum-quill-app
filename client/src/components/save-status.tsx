import type { SaveStatus as Status } from "@/lib/save-queue";
export function SaveStatus({ status, retry }: { status: Status; retry: () => Promise<boolean> }) {
  return <span role="status" className={status === "error" ? "text-destructive text-xs" : "text-muted-foreground text-xs"}>
    {status === "saved" ? "Saved" : status === "typing" ? "Unsaved changes" : status === "saving" ? "Saving…" : "Save failed"}
    {status === "error" && <button type="button" className="underline ml-2" onClick={() => void retry()}>Retry save</button>}
  </span>;
}

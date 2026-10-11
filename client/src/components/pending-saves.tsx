import { useEffect } from "react";
import { flushPendingSaves, pendingSaveCount, usePendingSaves } from "@/hooks/use-autosave";
export function PendingSaves() {
  const { pending, failed, retry, storageError } = usePendingSaves();
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!pendingSaveCount()) return;
      void flushPendingSaves();
      event.preventDefault();
      event.returnValue = "";
    };
    const flush = () => { void flushPendingSaves(); };
    const hidden = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("beforeunload", warn);
    window.addEventListener("online", flush);
    window.addEventListener("blur", flush);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("beforeunload", warn);
      window.removeEventListener("online", flush);
      window.removeEventListener("blur", flush);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);
  if (!pending) return null;
  return <div role={failed ? "alert" : "status"} className="fixed bottom-4 left-4 z-[100] rounded-md border bg-background p-3 shadow-lg text-sm max-w-sm">
    {failed ? "Some changes could not be saved. Keep this tab open and retry." : "Saving your changes…"}
    {storageError && <p role="alert" className="mt-2">{storageError}</p>}
    {failed && <button type="button" className="ml-2 underline" onClick={() => void retry()}>Retry saves</button>}
  </div>;
}

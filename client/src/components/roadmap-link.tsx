import { ArrowUpRight, Map } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RoadmapLink({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <a
      href="https://drsurfbum.github.io/quantum-quill-roadmap/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Feature roadmap (opens in a new tab)"
      title="Feature roadmap (opens in a new tab)"
      className={cn("inline-flex shrink-0 items-center justify-center gap-1 rounded-md px-2 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}
    >
      {compact ? <Map className="h-4 w-4" aria-hidden="true" /> : <>Roadmap<ArrowUpRight className="h-3 w-3" aria-hidden="true" /></>}
    </a>
  );
}

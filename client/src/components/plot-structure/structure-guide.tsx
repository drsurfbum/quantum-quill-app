import { ExternalLink } from 'lucide-react';
import { getPlotStructureGuide } from '@/lib/plot-structure-guides';

export default function StructureGuide({ templateType, name }: { templateType: string; name: string }) {
  const guide = getPlotStructureGuide(templateType);
  if (!guide) return <p className="text-sm text-muted-foreground">No verified video guide is available for this template yet.</p>;

  return (
    <div className="space-y-2 text-sm">
      <p><span className="font-medium">Good fit: </span>{guide.bestFit}</p>
      {guide.note && <p className="text-muted-foreground">{guide.note}</p>}
      <a
        href={`https://www.youtube.com/watch?v=${guide.videoId}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={event => event.stopPropagation()}
        className="inline-flex items-center gap-1 rounded-sm text-foreground underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`Watch ${name} guide on YouTube (opens in a new tab): ${guide.title}`}
      >
        Watch on YouTube <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="text-xs">(new tab)</span>
      </a>
      <p className="text-xs text-muted-foreground">{guide.title}<br />{guide.teacher} · {guide.duration}</p>
    </div>
  );
}

import { ExternalLink, Play } from 'lucide-react';
import { useRef } from 'react';
import { getPlotStructureGuide } from '@/lib/plot-structure-guides';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';

export default function StructureGuide({ templateType, name }: { templateType: string; name: string }) {
  const videoTitleRef = useRef<HTMLHeadingElement>(null);
  const guide = getPlotStructureGuide(templateType);
  if (!guide) return <p className="text-sm text-muted-foreground">No verified video guide is available for this template yet.</p>;

  return (
    <div className="space-y-2 text-sm">
      <p><span className="font-medium">Good fit: </span>{guide.bestFit}</p>
      {guide.note && <p className="text-muted-foreground">{guide.note}</p>}
      <Dialog>
        <DialogTrigger asChild>
          <Button
            type="button"
            className="w-full bg-foreground text-background hover:bg-foreground/90"
            onClick={event => event.stopPropagation()}
            aria-label={`Watch video about ${name}`}
          >
            <Play aria-hidden="true" /> Watch video
          </Button>
        </DialogTrigger>
        <DialogContent
          className="max-w-3xl max-h-[90dvh] overflow-y-auto"
          onClick={event => event.stopPropagation()}
          onOpenAutoFocus={event => { event.preventDefault(); videoTitleRef.current?.focus(); }}
        >
          <DialogHeader>
            <DialogTitle ref={videoTitleRef} tabIndex={-1}>{name}: video guide</DialogTitle>
            <DialogDescription>{guide.title} · {guide.teacher} · {guide.duration}</DialogDescription>
          </DialogHeader>
          <iframe
            className="aspect-video min-h-[200px] w-full rounded-md border-0"
            src={`https://www.youtube-nocookie.com/embed/${guide.videoId}?rel=0`}
            title={`${name}: ${guide.title}`}
            allow="encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
          <p className="text-sm text-muted-foreground">If the player is blocked or unavailable, watch directly on YouTube. Watching is optional; your structure selection stays as it is.</p>
          <DialogFooter className="gap-3 sm:items-center">
            <a
              href={`https://www.youtube.com/watch?v=${guide.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1 rounded-sm text-sm text-foreground underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={`Watch ${name} on YouTube (opens in a new tab)`}
            >
              Watch on YouTube <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> (new tab)
            </a>
            <DialogClose asChild><Button type="button" variant="outline">Back to structures</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <p className="text-xs text-muted-foreground">{guide.title}<br />{guide.teacher} · {guide.duration}</p>
    </div>
  );
}

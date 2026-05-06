import { useState } from 'react';
import { Play, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { PrescribedVideo } from '@/demo/prescriptions/videoPrescription';
import { logDemoEvent } from '@/demo/guard';
import { VideoPreviewModal } from './VideoPreviewModal';

interface PrescribedVideoCardProps {
  v: PrescribedVideo;
  fromSlug: string;
  simId?: string;
  onPreviewClick?: (videoId: string) => void;
}

export function PrescribedVideoCard({ v, fromSlug, simId, onPreviewClick }: PrescribedVideoCardProps) {
  const [open, setOpen] = useState(false);
  const bg = `linear-gradient(135deg, hsl(${v.thumbnailHue} 70% 35%), hsl(${(v.thumbnailHue + 40) % 360} 60% 18%))`;

  const handleClick = () => {
    onPreviewClick?.(v.id);
    logDemoEvent('preview_attempted', { videoId: v.id, fromSlug, simId });
    setOpen(true);
  };

  return (
    <>
      <Card className="group relative overflow-hidden cursor-pointer transition hover:border-primary/40 hover:scale-[1.02]" onClick={handleClick}>
        <div className="relative aspect-video w-full overflow-hidden" style={{ background: bg }}>
          <svg className="absolute inset-0 h-full w-full opacity-40 mix-blend-screen" viewBox="0 0 100 56" preserveAspectRatio="none">
            <path d="M-10 40 Q 30 10 60 30 T 110 20" stroke="white" strokeWidth="0.5" fill="none" className="animate-[pulse_3s_ease-in-out_infinite]" />
            <path d="M-10 50 Q 40 25 70 38 T 110 30" stroke="white" strokeWidth="0.4" fill="none" opacity="0.6" />
          </svg>
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))] animate-pulse" />
          <div className="relative flex h-full items-center justify-center">
            <div className="relative">
              <span className="absolute inset-0 -m-3 rounded-full bg-white/20 blur-md group-hover:bg-white/30 animate-pulse" />
              <Play className="relative h-8 w-8 text-white drop-shadow-lg" />
            </div>
          </div>
          <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
            10-second preview
          </span>
        </div>
        <CardContent className="space-y-1.5 p-3">
          <p className="text-sm font-bold leading-tight">{v.title}</p>
          <p className="text-[11px] text-muted-foreground leading-snug">{v.purpose}</p>
          <div className="flex items-center justify-between pt-1">
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
              {v.expectedImprovement}
            </span>
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={(e) => { e.stopPropagation(); handleClick(); }}>
              <Sparkles className="h-3.5 w-3.5" /> Preview
            </Button>
          </div>
        </CardContent>
      </Card>
      <VideoPreviewModal open={open} onOpenChange={setOpen} video={v} fromSlug={fromSlug} simId={simId} />
    </>
  );
}

export function PrescribedVideoStrip({
  videos,
  fromSlug,
  simId,
  onPreviewClick,
}: {
  videos: PrescribedVideo[];
  fromSlug: string;
  simId?: string;
  onPreviewClick?: (videoId: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {videos.map(v => <PrescribedVideoCard key={v.id} v={v} fromSlug={fromSlug} simId={simId} onPreviewClick={onPreviewClick} />)}
    </div>
  );
}

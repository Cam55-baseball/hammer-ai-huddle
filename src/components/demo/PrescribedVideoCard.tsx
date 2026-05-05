import { useState } from 'react';
import { Loader2, Play, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import type { PrescribedVideo } from '@/demo/prescriptions/videoPrescription';
import { logDemoEvent } from '@/demo/guard';

interface PrescribedVideoCardProps {
  v: PrescribedVideo;
  fromSlug: string;
  onPreviewClick?: (videoId: string) => void;
}

export function PrescribedVideoCard({ v, fromSlug, onPreviewClick }: PrescribedVideoCardProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const bg = `linear-gradient(135deg, hsl(${v.thumbnailHue} 70% 35%), hsl(${(v.thumbnailHue + 40) % 360} 60% 18%))`;

  const handleClick = () => {
    if (loading) return;
    onPreviewClick?.(v.id);
    logDemoEvent('preview_attempted', { videoId: v.id, fromSlug });
    setLoading(true);
    setTimeout(() => {
      navigate(`/demo/upgrade?from=${fromSlug}&video=${v.id}&reason=preview`);
    }, 600);
  };

  return (
    <Card className="relative overflow-hidden cursor-pointer transition hover:border-primary/40" onClick={handleClick}>
      <div className="relative aspect-video w-full" style={{ background: bg }}>
        <div className="flex h-full items-center justify-center">
          {loading ? (
            <Loader2 className="h-6 w-6 text-white/90 animate-spin" />
          ) : (
            <Play className="h-7 w-7 text-white/90" />
          )}
        </div>
        <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
          Preview: first 10s unlocked
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
            <Sparkles className="h-3.5 w-3.5" /> Unlock
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function PrescribedVideoStrip({
  videos,
  fromSlug,
  onPreviewClick,
}: {
  videos: PrescribedVideo[];
  fromSlug: string;
  onPreviewClick?: (videoId: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {videos.map(v => <PrescribedVideoCard key={v.id} v={v} fromSlug={fromSlug} onPreviewClick={onPreviewClick} />)}
    </div>
  );
}

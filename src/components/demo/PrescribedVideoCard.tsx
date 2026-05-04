import { Lock, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import type { PrescribedVideo } from '@/demo/prescriptions/videoPrescription';

export function PrescribedVideoCard({ v, fromSlug }: { v: PrescribedVideo; fromSlug: string }) {
  const navigate = useNavigate();
  const bg = `linear-gradient(135deg, hsl(${v.thumbnailHue} 70% 35%), hsl(${(v.thumbnailHue + 40) % 360} 60% 18%))`;
  return (
    <Card className="relative overflow-hidden">
      <div className="aspect-video w-full" style={{ background: bg }}>
        <div className="flex h-full items-center justify-center backdrop-blur-[2px]">
          <Lock className="h-6 w-6 text-white/90" />
        </div>
      </div>
      <CardContent className="space-y-1.5 p-3">
        <p className="text-sm font-bold leading-tight">{v.title}</p>
        <p className="text-[11px] text-muted-foreground leading-snug">{v.purpose}</p>
        <div className="flex items-center justify-between pt-1">
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
            {v.expectedImprovement}
          </span>
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs"
            onClick={() => navigate(`/demo/upgrade?from=${fromSlug}&video=${v.id}`)}>
            <Sparkles className="h-3.5 w-3.5" /> Unlock
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function PrescribedVideoStrip({ videos, fromSlug }: { videos: PrescribedVideo[]; fromSlug: string }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {videos.map(v => <PrescribedVideoCard key={v.id} v={v} fromSlug={fromSlug} />)}
    </div>
  );
}

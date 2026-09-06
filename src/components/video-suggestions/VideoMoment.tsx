import { useEffect } from 'react';
import { Play, Sparkles, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useVideoMoment } from '@/hooks/useVideoMoment';
import { trackVideoSuggestionShown, trackVideoWatched } from '@/hooks/useVideoSuggestions';
import { dismissMomentVideo } from '@/lib/videoMoments/cooldown';
import type { VideoMomentEvent } from '@/lib/videoMoments/types';
import { useVideoLightbox } from "@/components/video/useVideoLightbox";

interface Props {
  event: VideoMomentEvent;
  /** Inline card (in-page) or the body of the global pop-up sheet. */
  variant?: 'inline' | 'sheet';
  className?: string;
  /** Show an honest line instead of rendering nothing when the library is empty. */
  showEmptyState?: boolean;
  onDismissed?: () => void;
}

export function VideoMoment({ event, variant = 'inline', className, showEmptyState, onDismissed }: Props) {
  const { open: openVideo, element: videoLightbox } = useVideoLightbox();
  const { user } = useAuth();
  const { items, tier, loading, allowed, config } = useVideoMoment(event);

  useEffect(() => {
    if (!user || !items.length) return;
    items.forEach(item => {
      trackVideoSuggestionShown(user.id, item.id, config.mode, event.skillDomain, item.reasons).catch(() => {});
    });
  }, [user, items, config.mode, event.skillDomain]);

  if (!allowed || loading) return null;

  if (!items.length) {
    if (!showEmptyState) return null;
    return (
      <p className="text-xs text-muted-foreground">
        No matching videos in the library yet for this work — we'll surface them as soon as they land.
      </p>
    );
  }

  const body = (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.id} className="flex gap-3 p-2 rounded-md border bg-card hover:bg-accent/30 transition">
          {item.thumbnailUrl ? (
            <img src={item.thumbnailUrl} alt="" className="h-16 w-24 rounded object-cover shrink-0" />
          ) : (
            <div className="h-16 w-24 rounded bg-muted shrink-0 flex items-center justify-center">
              <Play className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{item.title}</p>
            <ul className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
              {item.reasons.slice(0, 3).map((r, i) => (
                <li key={i} className="line-clamp-1">• {r}</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-1 self-center shrink-0">
            <Button
              size="sm"
              onClick={() => {
                if (user) trackVideoWatched(user.id, item.id, 0).catch(() => {});
                openVideo({ id: item.id, title: item.title, video_url: item.videoUrl, thumbnail_url: item.thumbnailUrl });
              }}
            >
              <Play className="h-3 w-3 mr-1" /> Watch
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-[11px] h-6"
              onClick={() => {
                dismissMomentVideo(user?.id, item.id);
                onDismissed?.();
              }}
            >
              <X className="h-3 w-3 mr-1" /> Not now
            </Button>
          </div>
        </div>
      ))}
      <p className="text-[10px] text-muted-foreground">
        {tier === 'tagged'
          ? config.blurb
          : tier === 'domain'
            ? 'Core work for your sport and position while we match this rep.'
            : 'Start with the philosophy behind this work.'}
      </p>
    </div>
  );

  if (variant === 'sheet') return body;

  return (
    <Card className={`p-4 space-y-3 border-primary/20 ${className || ''}`}>
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">{config.title}</h3>
        {event.label ? (
          <Badge variant="outline" className="text-[10px] ml-auto">{event.label}</Badge>
        ) : null}
      </div>
      {body}
    </Card>
  );
}

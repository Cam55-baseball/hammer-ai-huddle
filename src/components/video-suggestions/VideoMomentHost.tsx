import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { VideoMoment } from '@/components/video-suggestions/VideoMoment';
import { onVideoMoment } from '@/lib/videoMoments/bus';
import { canShowMoment, markMomentShown } from '@/lib/videoMoments/cooldown';
import { MOMENT_CONFIG } from '@/lib/videoMoments/registry';
import type { VideoMomentEvent } from '@/lib/videoMoments/types';

/**
 * Global listener: any `emitVideoMoment(...)` call pops the suggestion sheet,
 * subject to per-kind cooldown and the daily cap.
 */
export function VideoMomentHost() {
  const { user } = useAuth();
  const [event, setEvent] = useState<VideoMomentEvent | null>(null);

  useEffect(
    () =>
      onVideoMoment(next => {
        if (!canShowMoment(user?.id, next.kind)) return;
        markMomentShown(user?.id, next.kind);
        setEvent(next);
      }),
    [user?.id],
  );

  if (!event) return null;
  const config = MOMENT_CONFIG[event.kind];

  return (
    <Sheet open onOpenChange={open => !open && setEvent(null)}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>{config.title}</SheetTitle>
          <SheetDescription>
            {event.label ? `${event.label} — ${config.blurb}` : config.blurb}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4">
          <VideoMoment event={event} variant="sheet" showEmptyState onDismissed={() => setEvent(null)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

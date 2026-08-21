import { useEffect, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { VideoMoment } from '@/components/video-suggestions/VideoMoment';
import { useVideoMoment } from '@/hooks/useVideoMoment';
import { onVideoMoment } from '@/lib/videoMoments/bus';
import { canShowMoment, markMomentShown } from '@/lib/videoMoments/cooldown';
import { MOMENT_CONFIG } from '@/lib/videoMoments/registry';
import type { VideoMomentEvent } from '@/lib/videoMoments/types';

/**
 * Global listener: any `emitVideoMoment(...)` call pops the suggestion sheet,
 * subject to per-kind cooldown and the daily cap.
 *
 * The sheet only opens once the engine has actually resolved picks, so an
 * athlete never gets an empty pop-up — and an empty resolve never burns the
 * cooldown or the daily cap.
 */
export function VideoMomentHost() {
  const { user } = useAuth();
  const [pending, setPending] = useState<VideoMomentEvent | null>(null);
  const [open, setOpen] = useState(false);
  const counted = useRef<string | null>(null);

  useEffect(
    () =>
      onVideoMoment(next => {
        if (!canShowMoment(user?.id, next.kind)) return;
        counted.current = null;
        setOpen(false);
        setPending(next);
      }),
    [user?.id],
  );

  const { items, loading, allowed } = useVideoMoment(pending, Boolean(pending) && !open);

  useEffect(() => {
    if (!pending || open) return;
    if (loading) return;
    if (!allowed || items.length === 0) {
      // nothing worth interrupting for — drop it silently, spend nothing
      setPending(null);
      return;
    }
    const key = `${pending.kind}:${pending.sourceId ?? ''}`;
    if (counted.current !== key) {
      counted.current = key;
      markMomentShown(user?.id, pending.kind);
    }
    setOpen(true);
  }, [pending, open, loading, allowed, items.length, user?.id]);

  if (!pending || !open) return null;
  const config = MOMENT_CONFIG[pending.kind];

  return (
    <Sheet
      open
      onOpenChange={isOpen => {
        if (!isOpen) {
          setOpen(false);
          setPending(null);
        }
      }}
    >
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>{config.title}</SheetTitle>
          <SheetDescription>
            {pending.label ? `${pending.label} — ${config.blurb}` : config.blurb}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4">
          <VideoMoment
            event={pending}
            variant="sheet"
            onDismissed={() => {
              setOpen(false);
              setPending(null);
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

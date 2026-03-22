import { RefObject } from 'react';
import { Play, Pause, RotateCcw, Link, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface InlineTimerProps {
  label: string;
  timer: {
    elapsed: number;
    isRunning: boolean;
    isSynced: boolean;
    start: () => void;
    stop: () => void;
    reset: () => void;
    syncToVideo: (ref: RefObject<HTMLVideoElement>) => void;
    unsync: () => void;
    formatTime: (ms: number) => string;
  };
  videoRef: RefObject<HTMLVideoElement>;
  hasVideo: boolean;
  compact?: boolean;
}

export function InlineTimer({ label, timer, videoRef, hasVideo, compact = false }: InlineTimerProps) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-muted/50 py-1 px-2">
      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{label}</span>

      <span className={`font-mono font-bold text-foreground tracking-wider ${compact ? 'text-base' : 'text-lg'}`}>
        {timer.formatTime(timer.elapsed)}
      </span>

      {timer.isSynced && (
        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">Synced</Badge>
      )}

      <div className="flex items-center gap-1 ml-auto">
        {timer.isRunning ? (
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={timer.stop}>
            <Pause className="h-3 w-3" />
          </Button>
        ) : (
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={timer.start}>
            <Play className="h-3 w-3" />
          </Button>
        )}
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={timer.reset}>
          <RotateCcw className="h-3 w-3" />
        </Button>
        {hasVideo && (
          timer.isSynced ? (
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={timer.unsync}>
              <Unlink className="h-3 w-3" />
            </Button>
          ) : (
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => timer.syncToVideo(videoRef)}>
              <Link className="h-3 w-3" />
            </Button>
          )
        )}
      </div>
    </div>
  );
}

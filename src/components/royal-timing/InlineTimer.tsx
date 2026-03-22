import { RefObject } from 'react';
import { Play, Pause, RotateCcw, Link, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

interface InlineTimerProps {
  label: string;
  timer: {
    elapsed: number;
    isRunning: boolean;
    isSynced: boolean;
    autoStartStop: boolean;
    setAutoStartStop: (val: boolean) => void;
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
  if (compact) {
    return (
    <div className="flex items-center gap-0.5 rounded-md bg-muted/50 py-0.5 px-1.5 overflow-hidden">
      <span className="text-[9px] font-medium text-muted-foreground shrink-0">{label}</span>
      <span className="font-mono font-bold text-foreground tracking-wider text-sm shrink-0">
          {timer.formatTime(timer.elapsed)}
        </span>
        {timer.isSynced && (
          <Badge variant="secondary" className="text-[8px] px-0.5 py-0 h-3.5 shrink-0">S</Badge>
        )}
        {timer.isSynced && (
          <div className="flex items-center gap-0.5 shrink-0">
            <Switch
              checked={timer.autoStartStop}
              onCheckedChange={timer.setAutoStartStop}
              className="h-3 w-5 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input [&>span]:h-2 [&>span]:w-2 [&>span]:data-[state=checked]:translate-x-2"
            />
          </div>
        )}
        {timer.isRunning ? (
          <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0" onClick={timer.stop}>
            <Pause className="h-2.5 w-2.5" />
          </Button>
        ) : (
          <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0" onClick={timer.start}>
            <Play className="h-2.5 w-2.5" />
          </Button>
        )}
        <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0" onClick={timer.reset}>
          <RotateCcw className="h-2.5 w-2.5" />
        </Button>
        {hasVideo && (
          timer.isSynced ? (
            <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0" onClick={timer.unsync}>
              <Unlink className="h-2.5 w-2.5" />
            </Button>
          ) : (
            <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0" onClick={() => timer.syncToVideo(videoRef)}>
              <Link className="h-2.5 w-2.5" />
            </Button>
          )
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md bg-muted/50 py-1 px-2 overflow-hidden">
      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{label}</span>

      <span className="font-mono font-bold text-foreground tracking-wider text-lg">
        {timer.formatTime(timer.elapsed)}
      </span>

      {timer.isSynced && (
        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 shrink-0">Synced</Badge>
      )}

      {timer.isSynced && (
        <div className="flex items-center gap-1 shrink-0">
          <Switch
            checked={timer.autoStartStop}
            onCheckedChange={timer.setAutoStartStop}
            className="h-4 w-7 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-3"
          />
          <span className="text-[9px] text-muted-foreground">Auto</span>
        </div>
      )}

      <div className="flex items-center gap-1 ml-auto shrink-0">
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

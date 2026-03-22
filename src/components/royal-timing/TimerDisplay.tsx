import { RefObject } from 'react';
import { Play, Pause, RotateCcw, Trash2, Link, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TimerDisplayProps {
  label: string;
  timer: {
    elapsed: number;
    isRunning: boolean;
    isSynced: boolean;
    start: () => void;
    stop: () => void;
    reset: () => void;
    clear: () => void;
    syncToVideo: (ref: RefObject<HTMLVideoElement>) => void;
    unsync: () => void;
    formatTime: (ms: number) => string;
  };
  videoRef: RefObject<HTMLVideoElement>;
  hasVideo: boolean;
}

export function TimerDisplay({ label, timer, videoRef, hasVideo }: TimerDisplayProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          {label}
          {timer.isSynced && (
            <Badge variant="secondary" className="text-[10px]">Synced</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Timer Display */}
        <div className="text-center">
          <span className="text-3xl font-mono font-bold text-foreground tracking-wider">
            {timer.formatTime(timer.elapsed)}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          {timer.isRunning ? (
            <Button size="sm" variant="outline" onClick={timer.stop}>
              <Pause className="h-3 w-3 mr-1" /> Stop
            </Button>
          ) : (
            <Button size="sm" onClick={timer.start}>
              <Play className="h-3 w-3 mr-1" /> Start
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={timer.reset}>
            <RotateCcw className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" onClick={timer.clear}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {/* Sync toggle */}
        {hasVideo && (
          <div className="flex justify-center">
            {timer.isSynced ? (
              <Button size="sm" variant="outline" className="text-xs" onClick={timer.unsync}>
                <Unlink className="h-3 w-3 mr-1" /> Unsync
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="text-xs" onClick={() => timer.syncToVideo(videoRef)}>
                <Link className="h-3 w-3 mr-1" /> Sync to Video
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

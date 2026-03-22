import { RefObject } from 'react';
import { Play, Pause, RotateCcw, Trash2, Link, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface TimerDisplayProps {
  label: string;
  timer: {
    elapsed: number;
    isRunning: boolean;
    isSynced: boolean;
    pauseWithVideo: boolean;
    start: () => void;
    stop: () => void;
    reset: () => void;
    clear: () => void;
    syncToVideo: (ref: RefObject<HTMLVideoElement>) => void;
    unsync: () => void;
    setPauseWithVideo: (val: boolean) => void;
    formatTime: (ms: number) => string;
  };
  videoRef: RefObject<HTMLVideoElement>;
  hasVideo: boolean;
  compact?: boolean;
}

export function TimerDisplay({ label, timer, videoRef, hasVideo, compact = false }: TimerDisplayProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/60 border border-border text-xs">
        <span className="font-mono font-bold text-sm text-foreground tracking-wider min-w-[70px]">
          {timer.formatTime(timer.elapsed)}
        </span>
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
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={timer.unsync} title="Unsync">
              <Unlink className="h-3 w-3" />
            </Button>
          ) : (
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => timer.syncToVideo(videoRef)} title="Sync to video">
              <Link className="h-3 w-3" />
            </Button>
          )
        )}
        {timer.isSynced && (
          <>
            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">Synced</Badge>
            <div className="flex items-center gap-0.5 ml-1">
              <Label className="text-[9px] text-muted-foreground cursor-pointer">Pause w/ vid</Label>
              <Switch
                checked={timer.pauseWithVideo}
                onCheckedChange={timer.setPauseWithVideo}
                className="scale-[0.6] origin-left"
              />
            </div>
          </>
        )}
        <span className="text-[9px] text-muted-foreground ml-auto">{label}</span>
      </div>
    );
  }

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

        {/* Pause with video toggle */}
        {timer.isSynced && (
          <div className="flex items-center justify-center gap-2">
            <Label className="text-xs text-muted-foreground cursor-pointer">Pause with video</Label>
            <Switch
              checked={timer.pauseWithVideo}
              onCheckedChange={timer.setPauseWithVideo}
              className="scale-75"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

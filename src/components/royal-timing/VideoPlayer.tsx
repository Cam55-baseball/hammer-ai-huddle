import { useRef, useState, useCallback, RefObject, ChangeEvent } from 'react';
import { Play, Pause, SkipBack, SkipForward, Camera, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface VideoPlayerProps {
  label: string;
  videoRef: RefObject<HTMLVideoElement>;
  videoUrl: string | null;
  speed: number;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  onScreenshot: () => void;
  onSpeedChange: (speed: number) => void;
}

export function VideoPlayer({ label, videoRef, videoUrl, speed, onFileSelect, onRemove, onScreenshot, onSpeedChange }: VideoPlayerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [localSpeed, setLocalSpeed] = useState(speed);

  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    localVideoRef.current = el;
    if (typeof videoRef === 'object' && videoRef !== null) {
      (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
    }
  }, [videoRef]);

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    e.target.value = '';
  }, [onFileSelect]);

  const handleTimeUpdate = useCallback(() => {
    if (localVideoRef.current) setCurrentTime(localVideoRef.current.currentTime);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (localVideoRef.current) {
      if (!isFinite(localVideoRef.current.duration)) {
        localVideoRef.current.currentTime = 1e10;
        setTimeout(() => {
          if (localVideoRef.current) {
            setDuration(localVideoRef.current.duration);
            localVideoRef.current.currentTime = 0;
          }
        }, 200);
      } else {
        setDuration(localVideoRef.current.duration);
      }
    }
  }, []);

  const handleScrub = useCallback((value: number[]) => {
    if (localVideoRef.current) localVideoRef.current.currentTime = value[0];
  }, []);

  const frameStep = useCallback((direction: 1 | -1) => {
    if (localVideoRef.current) {
      localVideoRef.current.pause();
      localVideoRef.current.currentTime += direction * (1 / 30);
    }
  }, []);

  const handleLocalSpeed = useCallback((s: string) => {
    const v = parseFloat(s);
    setLocalSpeed(v);
    if (localVideoRef.current) localVideoRef.current.playbackRate = v;
  }, []);

  const formatSec = (s: number) => {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          {label}
          {videoUrl && (
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onRemove}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!videoUrl ? (
          <div
            className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Click or drag video here</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <>
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
              <video
                ref={setVideoRef}
                src={videoUrl}
                className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                playsInline
              />
            </div>

            {/* Timeline scrubber */}
            <div className="space-y-1">
              <Slider
                min={0}
                max={duration || 1}
                step={0.01}
                value={[currentTime]}
                onValueChange={handleScrub}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatSec(currentTime)}</span>
                <span>{formatSec(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-1">
              <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => frameStep(-1)}>⏪</Button>
              <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => {
                if (localVideoRef.current) localVideoRef.current.currentTime = Math.max(0, localVideoRef.current.currentTime - 5);
              }}>
                <SkipBack className="h-3 w-3" />
              </Button>
              <Button size="sm" className="h-7 px-2" onClick={() => localVideoRef.current?.play()}>
                <Play className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => localVideoRef.current?.pause()}>
                <Pause className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => {
                if (localVideoRef.current) localVideoRef.current.currentTime += 5;
              }}>
                <SkipForward className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => frameStep(1)}>⏩</Button>
              <Button size="sm" variant="outline" className="h-7 px-2" onClick={onScreenshot}>
                <Camera className="h-3 w-3" />
              </Button>
              <Select value={String(localSpeed)} onValueChange={handleLocalSpeed}>
                <SelectTrigger className="w-16 h-7 text-xs ml-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map(s => (
                    <SelectItem key={s} value={String(s)}>{s}x</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

import { useRef, useState, useCallback, useEffect, RefObject, ChangeEvent } from 'react';
import { Play, Pause, SkipBack, SkipForward, Camera, Upload, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

function formatSec(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00.0';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec < 10 ? '0' : ''}${sec.toFixed(1)}`;
}

function clampTime(t: number, dur: number): number {
  return Math.max(0, Math.min(isFinite(dur) ? dur : 0, t));
}

export function VideoPlayer({ label, videoRef, videoUrl, speed, onFileSelect, onRemove, onScreenshot, onSpeedChange }: VideoPlayerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const seekingRef = useRef(false);
  const resolvingRef = useRef(false);
  const seekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [durationResolved, setDurationResolved] = useState(false);
  const [localSpeed, setLocalSpeed] = useState(speed);

  // Callback ref to sync local + parent refs
  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    localVideoRef.current = el;
    if (typeof videoRef === 'object' && videoRef !== null) {
      (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
    }
  }, [videoRef]);

  // Sync speed prop from master controls
  useEffect(() => {
    setLocalSpeed(speed);
    if (localVideoRef.current) {
      localVideoRef.current.playbackRate = speed;
    }
  }, [speed]);

  // Attach all video event listeners
  useEffect(() => {
    const vid = localVideoRef.current;
    if (!vid || !videoUrl) return;

    const resolveDuration = () => {
      if (isFinite(vid.duration) && vid.duration > 0) {
        setDuration(vid.duration);
        setDurationResolved(true);
        return;
      }
      // WebM workaround — guard with resolvingRef
      resolvingRef.current = true;
      vid.currentTime = 1e10;
      const onSeek = () => {
        vid.removeEventListener('seeked', onSeek);
        if (isFinite(vid.duration) && vid.duration > 0) {
          setDuration(vid.duration);
        }
        vid.currentTime = 0;
        setDurationResolved(true);
        // Small delay to let the seek-back complete before unguarding
        setTimeout(() => { resolvingRef.current = false; }, 100);
      };
      vid.addEventListener('seeked', onSeek);
    };

    const onLoadedMetadata = () => resolveDuration();
    const onDurationChange = () => {
      if (isFinite(vid.duration) && vid.duration > 0) {
        setDuration(vid.duration);
        setDurationResolved(true);
      }
    };
    const onTimeUpdate = () => {
      if (!seekingRef.current) {
        setCurrentTime(vid.currentTime);
      }
    };
    const onSeeked = () => {
      // Ignore seeks from the WebM duration workaround
      if (!resolvingRef.current) {
        seekingRef.current = false;
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    vid.addEventListener('loadedmetadata', onLoadedMetadata);
    vid.addEventListener('durationchange', onDurationChange);
    vid.addEventListener('timeupdate', onTimeUpdate);
    vid.addEventListener('seeked', onSeeked);
    vid.addEventListener('play', onPlay);
    vid.addEventListener('pause', onPause);
    vid.addEventListener('ended', onEnded);

    // Apply current speed
    vid.playbackRate = localSpeed;

    return () => {
      vid.removeEventListener('loadedmetadata', onLoadedMetadata);
      vid.removeEventListener('durationchange', onDurationChange);
      vid.removeEventListener('timeupdate', onTimeUpdate);
      vid.removeEventListener('seeked', onSeeked);
      vid.removeEventListener('play', onPlay);
      vid.removeEventListener('pause', onPause);
      vid.removeEventListener('ended', onEnded);
    };
  }, [videoUrl, localSpeed]);

  // Reset state when video changes
  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setDurationResolved(false);
    setIsPlaying(false);
  }, [videoUrl]);

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    e.target.value = '';
  }, [onFileSelect]);

  const togglePlayPause = useCallback(() => {
    const vid = localVideoRef.current;
    if (!vid) return;
    // Always clear seeking flag so timeupdate resumes
    seekingRef.current = false;
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
      seekTimeoutRef.current = null;
    }
    if (vid.paused) {
      vid.play().then(() => setIsPlaying(true)).catch((err) => {
        console.warn('Play interrupted:', err.message);
        setIsPlaying(false);
      });
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleScrub = useCallback((val: number) => {
    const vid = localVideoRef.current;
    if (!vid) return;
    seekingRef.current = true;
    const t = clampTime(val, isFinite(vid.duration) ? vid.duration : duration);
    vid.currentTime = t;
    setCurrentTime(t);
    // Safety fallback — clear seeking flag even if 'seeked' never fires
    if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
    seekTimeoutRef.current = setTimeout(() => {
      seekingRef.current = false;
      seekTimeoutRef.current = null;
    }, 300);
  }, [duration]);

  const frameStep = useCallback((direction: 1 | -1) => {
    const vid = localVideoRef.current;
    if (!vid) return;
    vid.pause();
    setIsPlaying(false);
    const safeDur = isFinite(vid.duration) ? vid.duration : 0;
    const newTime = clampTime(vid.currentTime + direction * (1 / 30), safeDur);
    vid.currentTime = newTime;
    setCurrentTime(newTime);
  }, []);

  const skip = useCallback((sec: number) => {
    const vid = localVideoRef.current;
    if (!vid) return;
    const safeDur = isFinite(vid.duration) ? vid.duration : 0;
    const newTime = clampTime(vid.currentTime + sec, safeDur);
    vid.currentTime = newTime;
    setCurrentTime(newTime);
  }, []);

  const handleLocalSpeed = useCallback((s: string) => {
    const v = parseFloat(s);
    setLocalSpeed(v);
    if (localVideoRef.current) localVideoRef.current.playbackRate = v;
  }, []);

  const safeDuration = isFinite(duration) && duration > 0 ? duration : 0;

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
                playsInline
              />
            </div>

            {/* Timeline scrubber */}
            <div className="px-1">
              <input
                type="range"
                min={0}
                max={safeDuration || 1}
                step={0.01}
                value={currentTime}
                onChange={handleScrub}
                className="w-full h-2 accent-primary cursor-pointer"
                disabled={!durationResolved}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatSec(currentTime)}</span>
                <span>{formatSec(safeDuration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1 flex-wrap">
              <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => frameStep(-1)} title="Frame back">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => skip(-5)} title="Rewind 5s">
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={togglePlayPause}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => skip(5)} title="Forward 5s">
                <SkipForward className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => frameStep(1)} title="Frame forward">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={onScreenshot} className="h-8 px-2">
                <Camera className="h-4 w-4" />
              </Button>
              <Select value={String(localSpeed)} onValueChange={handleLocalSpeed}>
                <SelectTrigger className="w-16 h-8 text-xs ml-auto">
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

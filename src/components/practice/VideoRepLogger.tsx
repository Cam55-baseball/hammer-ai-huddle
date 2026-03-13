import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Pause, Upload, Video, ChevronLeft, ChevronRight, Rewind, FastForward } from 'lucide-react';
import { VideoRepMarker, type RepMarker } from './VideoRepMarker';
import { RepScorer, type ScoredRep } from './RepScorer';
import type { SessionConfig } from './SessionConfigPanel';

interface VideoRepLoggerProps {
  module: string;
  reps: ScoredRep[];
  onRepsChange: (reps: ScoredRep[]) => void;
  sessionConfig?: SessionConfig;
}

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00.0';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`;
}

function clampTime(t: number, dur: number): number {
  return Math.max(0, Math.min(isFinite(dur) ? dur : 0, t));
}

export function VideoRepLogger({ module, reps, onRepsChange, sessionConfig }: VideoRepLoggerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [markers, setMarkers] = useState<RepMarker[]>([]);
  const [durationResolved, setDurationResolved] = useState(false);
  const seekingRef = useRef(false);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (videoSrc) URL.revokeObjectURL(videoSrc);
    setVideoSrc(URL.createObjectURL(file));
    setMarkers([]);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setDurationResolved(false);
    e.target.value = '';
  }, [videoSrc]);

  const togglePlay = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      const playPromise = vid.play();
      if (playPromise) {
        playPromise.then(() => setIsPlaying(true)).catch((err) => {
          console.warn('Play interrupted:', err.message);
          setIsPlaying(false);
        });
      }
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  }, []);

  const changeSpeed = useCallback(() => {
    const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
    const idx = speeds.indexOf(playbackRate);
    const next = speeds[(idx + 1) % speeds.length];
    setPlaybackRate(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
  }, [playbackRate]);

  const stepFrame = useCallback((dir: 1 | -1) => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.pause();
    setIsPlaying(false);
    const safeDur = isFinite(vid.duration) ? vid.duration : 0;
    vid.currentTime = clampTime(vid.currentTime + dir * 0.033, safeDur);
  }, []);

  const skip = useCallback((sec: number) => {
    const vid = videoRef.current;
    if (!vid) return;
    const safeDur = isFinite(vid.duration) ? vid.duration : 0;
    vid.currentTime = clampTime(vid.currentTime + sec, safeDur);
  }, []);

  const handleScrub = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const vid = videoRef.current;
    if (!vid) return;
    seekingRef.current = true;
    const t = parseFloat(e.target.value);
    vid.currentTime = clampTime(t, isFinite(vid.duration) ? vid.duration : duration);
    setCurrentTime(t);
  }, [duration]);

  // Duration resolution (handles WebM Infinity issue)
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !videoSrc) return;

    const resolveDuration = () => {
      if (isFinite(vid.duration) && vid.duration > 0) {
        setDuration(vid.duration);
        setDurationResolved(true);
        return;
      }
      // WebM workaround: seek to a huge time to force browser to compute duration
      vid.currentTime = 1e10;
      const onSeek = () => {
        vid.removeEventListener('seeked', onSeek);
        if (isFinite(vid.duration) && vid.duration > 0) {
          setDuration(vid.duration);
        }
        vid.currentTime = 0;
        setDurationResolved(true);
      };
      vid.addEventListener('seeked', onSeek);
    };

    const onLoaded = () => resolveDuration();
    const onDurationChange = () => {
      if (isFinite(vid.duration) && vid.duration > 0) {
        setDuration(vid.duration);
        setDurationResolved(true);
      }
    };
    const onTime = () => {
      if (!seekingRef.current) {
        setCurrentTime(vid.currentTime);
      }
    };
    const onSeeked = () => { seekingRef.current = false; };
    const onEnded = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    vid.addEventListener('loadedmetadata', onLoaded);
    vid.addEventListener('durationchange', onDurationChange);
    vid.addEventListener('timeupdate', onTime);
    vid.addEventListener('seeked', onSeeked);
    vid.addEventListener('ended', onEnded);
    vid.addEventListener('play', onPlay);
    vid.addEventListener('pause', onPause);

    return () => {
      vid.removeEventListener('loadedmetadata', onLoaded);
      vid.removeEventListener('durationchange', onDurationChange);
      vid.removeEventListener('timeupdate', onTime);
      vid.removeEventListener('seeked', onSeeked);
      vid.removeEventListener('ended', onEnded);
      vid.removeEventListener('play', onPlay);
      vid.removeEventListener('pause', onPause);
    };
  }, [videoSrc]);

  const handleRepsChange = useCallback((newReps: ScoredRep[]) => {
    const enriched = newReps.map((rep, i) => {
      const marker = markers[i];
      if (marker && marker.end_time_sec) {
        return { ...rep, video_start_sec: marker.start_time_sec, video_end_sec: marker.end_time_sec };
      }
      return rep;
    });
    onRepsChange(enriched);
  }, [onRepsChange, markers]);

  const safeDuration = isFinite(duration) && duration > 0 ? duration : 0;

  return (
    <div className="space-y-3">
      <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />

      {!videoSrc ? (
        <Card className="border-dashed border-primary/30">
          <CardContent className="py-8 flex flex-col items-center gap-3">
            <Video className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Upload or record a video to start</p>
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Upload className="h-4 w-4" />
              Select Video
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Video player */}
          <div className="relative rounded-lg overflow-hidden bg-black">
            <video ref={videoRef} src={videoSrc} className="w-full max-h-[300px] object-contain" playsInline />
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
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 flex-wrap">
            <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => stepFrame(-1)} title="Frame back">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => skip(-5)} title="Rewind 5s">
              <Rewind className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={togglePlay}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => skip(5)} title="Forward 5s">
              <FastForward className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => stepFrame(1)} title="Frame forward">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={changeSpeed} className="text-xs ml-1">
              {playbackRate}x
            </Button>
            <span className="text-xs text-muted-foreground ml-auto font-mono">
              {formatTime(currentTime)} / {formatTime(safeDuration)}
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="text-xs">
              Change
            </Button>
          </div>

          {/* Rep markers */}
          <VideoRepMarker
            videoRef={videoRef as React.RefObject<HTMLVideoElement>}
            markers={markers}
            onMarkersChange={setMarkers}
            duration={safeDuration}
            currentTime={currentTime}
          />
        </div>
      )}

      {/* Rep logging form */}
      <RepScorer module={module} reps={reps} onRepsChange={handleRepsChange} sessionConfig={sessionConfig} />
    </div>
  );
}

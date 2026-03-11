import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Play, Pause, Upload, Video, ChevronLeft, ChevronRight } from 'lucide-react';
import { VideoRepMarker, type RepMarker } from './VideoRepMarker';
import { RepScorer, type ScoredRep } from './RepScorer';
import type { SessionConfig } from './SessionConfigPanel';

interface VideoRepLoggerProps {
  module: string;
  reps: ScoredRep[];
  onRepsChange: (reps: ScoredRep[]) => void;
  sessionConfig?: SessionConfig;
}

const formatTime = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 10);
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
};

export function VideoRepLogger({ module, reps, onRepsChange, sessionConfig }: VideoRepLoggerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [markers, setMarkers] = useState<RepMarker[]>([]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (videoSrc) URL.revokeObjectURL(videoSrc);
    setVideoSrc(URL.createObjectURL(file));
    setMarkers([]);
    e.target.value = '';
  }, [videoSrc]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
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

  const stepFrame = useCallback((direction: 1 | -1) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + direction * 0.033));
  }, [duration]);

  const handleScrub = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const t = parseFloat(e.target.value);
    videoRef.current.currentTime = t;
    setCurrentTime(t);
  }, []);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onTime = () => setCurrentTime(vid.currentTime);
    const onLoaded = () => setDuration(vid.duration);
    const onEnded = () => setIsPlaying(false);
    vid.addEventListener('timeupdate', onTime);
    vid.addEventListener('loadedmetadata', onLoaded);
    vid.addEventListener('ended', onEnded);
    return () => {
      vid.removeEventListener('timeupdate', onTime);
      vid.removeEventListener('loadedmetadata', onLoaded);
      vid.removeEventListener('ended', onEnded);
    };
  }, [videoSrc]);

  const handleRepsChange = useCallback((newReps: ScoredRep[]) => {
    const enriched = newReps.map((rep, i) => {
      const marker = markers[i];
      if (marker && marker.end_time_sec) {
        return {
          ...rep,
          video_start_sec: marker.start_time_sec,
          video_end_sec: marker.end_time_sec,
        };
      }
      return rep;
    });
    onRepsChange(enriched);
  }, [onRepsChange, markers]);

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {!videoSrc ? (
        <Card className="border-dashed border-primary/30">
          <CardContent className="py-8 flex flex-col items-center gap-3">
            <Video className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Upload or record a video to start</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Select Video
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Video player */}
          <div className="relative rounded-lg overflow-hidden bg-black">
            <video
              ref={videoRef}
              src={videoSrc}
              className="w-full max-h-[300px] object-contain"
              playsInline
            />
          </div>

          {/* Scrubber */}
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.001}
            value={currentTime}
            onChange={handleScrub}
            className="w-full h-2 accent-primary cursor-pointer"
          />

          {/* Controls */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => stepFrame(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={togglePlay}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => stepFrame(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={changeSpeed} className="text-xs px-2 h-8">
              {playbackRate}x
            </Button>
            <span className="text-xs text-muted-foreground ml-auto font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs h-8"
            >
              Change
            </Button>
          </div>

          {/* Rep markers */}
          <VideoRepMarker
            videoRef={videoRef as React.RefObject<HTMLVideoElement>}
            markers={markers}
            onMarkersChange={setMarkers}
            duration={duration}
            currentTime={currentTime}
          />
        </div>
      )}

      {/* Rep logging form */}
      <RepScorer
        module={module}
        reps={reps}
        onRepsChange={handleRepsChange}
        sessionConfig={sessionConfig}
      />
    </div>
  );
}

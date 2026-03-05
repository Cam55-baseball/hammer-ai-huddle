import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Play, Pause, Upload, Video, Loader2 } from 'lucide-react';
import { VideoRepMarker, type RepMarker } from './VideoRepMarker';
import { RepScorer, type ScoredRep } from './RepScorer';
import type { SessionConfig } from './SessionConfigPanel';

interface VideoRepLoggerProps {
  module: string;
  reps: ScoredRep[];
  onRepsChange: (reps: ScoredRep[]) => void;
  sessionConfig?: SessionConfig;
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

  // Bind video data to reps when markers change
  const handleRepsChange = useCallback((newReps: ScoredRep[]) => {
    // Attach marker timing data to matching reps
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
        capture="environment"
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
        <div className="space-y-3">
          {/* Video player */}
          <div className="relative rounded-lg overflow-hidden bg-black">
            <video
              ref={videoRef}
              src={videoSrc}
              className="w-full max-h-[300px] object-contain"
              playsInline
            />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={togglePlay} className="gap-1">
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={changeSpeed} className="text-xs">
              {playbackRate}x
            </Button>
            <span className="text-xs text-muted-foreground ml-auto">
              {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs"
            >
              Change Video
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

      {/* Rep logging form — always visible below video */}
      <RepScorer
        module={module}
        reps={reps}
        onRepsChange={handleRepsChange}
        sessionConfig={sessionConfig}
      />
    </div>
  );
}

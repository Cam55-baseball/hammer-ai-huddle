import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Play, Pause, Upload, Video, Check, ChevronRight, Microscope } from 'lucide-react';
import { VideoRepMarker, type RepMarker } from './VideoRepMarker';
import { RepScorer, type ScoredRep } from './RepScorer';
import { isAnalyzableModule, RepVideoAnalysis } from './RepVideoAnalysis';
import type { SessionConfig } from './SessionConfigPanel';
import { validateVideoFile, VIDEO_LIMITS } from '@/data/videoLimits';

interface VideoRepReviewProps {
  module: string;
  sessionConfig?: SessionConfig;
  onComplete: (reps: ScoredRep[], markers: RepMarker[]) => void;
}

export function VideoRepReview({ module, sessionConfig, onComplete }: VideoRepReviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [markers, setMarkers] = useState<RepMarker[]>([]);
  const [reps, setReps] = useState<ScoredRep[]>([]);
  const [activeRepIndex, setActiveRepIndex] = useState<number | null>(null);
  const [analyzeState, setAnalyzeState] = useState<{ repIndex: number } | null>(null);

  const canAnalyze = isAnalyzableModule(module);
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateVideoFile(file);
    if (!validation.valid) {
      toast.error('Video too large to analyze', { description: validation.error });
      e.target.value = '';
      return;
    }
    if (videoSrc) URL.revokeObjectURL(videoSrc);
    setVideoSrc(URL.createObjectURL(file));
    setMarkers([]);
    setReps([]);
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

  const handleFinalize = useCallback(() => {
    // Lock all markers and attach timing to reps
    const locked = markers.map(m => ({ ...m, locked: true }));
    const enriched = reps.map((rep, i) => {
      const marker = locked[i];
      if (marker && marker.end_time_sec) {
        return { ...rep, video_start_sec: marker.start_time_sec, video_end_sec: marker.end_time_sec };
      }
      return rep;
    });
    onComplete(enriched, locked);
  }, [markers, reps, onComplete]);

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            Review & Tag Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!videoSrc ? (
            <div className="py-6 flex flex-col items-center gap-3">
              <p className="text-sm text-muted-foreground">Upload your full session video to review and tag reps</p>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
                <Upload className="h-4 w-4" /> Upload Session Video
              </Button>
              <p className="text-[11px] text-muted-foreground text-center max-w-xs">
                Max {VIDEO_LIMITS.MAX_FILE_SIZE_MB} MB ({(VIDEO_LIMITS.MAX_FILE_SIZE_MB / 1024).toFixed(0)} GB). If your file is too large, you'll see a message to try again with a shorter or compressed clip.
              </p>
            </div>
          ) : (
            <>
              <div className="relative rounded-lg overflow-hidden bg-black">
                <video ref={videoRef} src={videoSrc} className="w-full max-h-[250px] object-contain" playsInline />
              </div>

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
              </div>

              <VideoRepMarker
                videoRef={videoRef as React.RefObject<HTMLVideoElement>}
                markers={markers}
                onMarkersChange={setMarkers}
                duration={duration}
                currentTime={currentTime}
              />

              <RepScorer
                module={module}
                reps={reps}
                onRepsChange={setReps}
                sessionConfig={sessionConfig}
              />

              {reps.length > 0 && (
                <div className="space-y-2">
                  {canAnalyze && (
                    <div className="flex flex-wrap gap-1">
                      {reps.map((_, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          onClick={() => setAnalyzeState({ repIndex: i })}
                          className="gap-1 text-xs"
                        >
                          <Microscope className="h-3 w-3" />
                          Analyze #{i + 1}
                        </Button>
                      ))}
                    </div>
                  )}
                  <Button onClick={handleFinalize} className="w-full gap-2">
                    <Check className="h-4 w-4" />
                    Finalize {reps.length} Tagged Reps
                  </Button>
                </div>
              )}

              {/* Analysis dialog */}
              {analyzeState && videoSrc && (
                <RepVideoAnalysis
                  videoUrl={videoSrc}
                  module={module}
                  repIndex={analyzeState.repIndex}
                  open={!!analyzeState}
                  onOpenChange={(open) => !open && setAnalyzeState(null)}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

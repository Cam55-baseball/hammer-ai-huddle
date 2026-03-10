import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Pause, Upload, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { validateVideoFile } from '@/data/videoLimits';
import { useToast } from '@/hooks/use-toast';

interface GameVideoPlayerProps {
  onTimestamp: (seconds: number) => void;
  onVideoLoaded?: (url: string) => void;
}

export function GameVideoPlayer({ onTimestamp, onVideoLoaded }: GameVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();

  const processFile = useCallback((file: File) => {
    const validation = validateVideoFile(file);
    if (!validation.valid) {
      toast({ title: 'Invalid file', description: validation.error, variant: 'destructive' });
      return;
    }
    try {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      onVideoLoaded?.(url);
    } catch (err) {
      toast({ title: 'Error', description: 'Could not load video file.', variant: 'destructive' });
    }
  }, [toast, onVideoLoaded]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleScrub = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  }, []);

  const handleLogPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setIsPlaying(false);
    onTimestamp(Math.floor(video.currentTime));
  }, [onTimestamp]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold">🎥 Video + Logging</span>
        </div>

        {!videoUrl ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragOver
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-muted-foreground'
            }`}
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium mb-1">
              {isDragOver ? 'Drop video here' : 'Drag & drop game video'}
            </p>
            <Label htmlFor="video-upload" className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors underline">
              or click to browse (mp4, mov, webm)
            </Label>
            <Input
              id="video-upload"
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full rounded-lg bg-black max-h-[240px]"
              onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
              onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
              playsInline
              controls
            />
            {/* Scrubber */}
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={currentTime}
              onChange={handleScrub}
              className="w-full h-2 accent-primary cursor-pointer"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={togglePlay} className="h-8">
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                title="Back 1 frame"
                onClick={() => {
                  const video = videoRef.current;
                  if (!video) return;
                  video.pause();
                  setIsPlaying(false);
                  video.currentTime = Math.max(0, video.currentTime - 0.033);
                  setCurrentTime(video.currentTime);
                }}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                title="Forward 1 frame"
                onClick={() => {
                  const video = videoRef.current;
                  if (!video) return;
                  video.pause();
                  setIsPlaying(false);
                  video.currentTime = Math.min(duration, video.currentTime + 0.033);
                  setCurrentTime(video.currentTime);
                }}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span className="font-mono tabular-nums">{formatTime(currentTime)} / {formatTime(duration)}</span>
              </div>
              <Button
                size="sm"
                onClick={handleLogPlay}
                className="ml-auto h-8 text-xs"
              >
                ⏸ Pause & Log Play
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

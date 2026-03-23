import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Pause, Upload, Clock, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { validateVideoFile } from '@/data/videoLimits';
import { useToast } from '@/hooks/use-toast';

interface VideoEntry {
  id: string;
  file: File;
  url: string;
}

interface GameVideoPlayerProps {
  onTimestamp: (seconds: number) => void;
  onVideoLoaded?: (url: string) => void;
}

export function GameVideoPlayer({ onTimestamp, onVideoLoaded }: GameVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();

  const activeVideo = videos[activeIndex] || null;

  const processFiles = useCallback((files: FileList | File[]) => {
    const newVideos: VideoEntry[] = [];
    for (const file of Array.from(files)) {
      const validation = validateVideoFile(file);
      if (!validation.valid) {
        toast({ title: 'Invalid file', description: validation.error, variant: 'destructive' });
        continue;
      }
      try {
        const url = URL.createObjectURL(file);
        newVideos.push({ id: crypto.randomUUID(), file, url });
      } catch {
        toast({ title: 'Error', description: 'Could not load video file.', variant: 'destructive' });
      }
    }
    if (newVideos.length > 0) {
      setVideos(prev => {
        const updated = [...prev, ...newVideos];
        if (prev.length === 0) {
          setActiveIndex(0);
          onVideoLoaded?.(newVideos[0].url);
        }
        return updated;
      });
    }
  }, [toast, onVideoLoaded]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
  }, [processFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
  }, [processFiles]);

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

  const switchVideo = useCallback((index: number) => {
    setActiveIndex(index);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    onVideoLoaded?.(videos[index].url);
  }, [videos, onVideoLoaded]);

  const removeVideo = useCallback((index: number) => {
    setVideos(prev => {
      const updated = prev.filter((_, i) => i !== index);
      if (index === activeIndex) {
        const newIdx = Math.min(activeIndex, updated.length - 1);
        setActiveIndex(Math.max(0, newIdx));
        if (updated.length > 0) onVideoLoaded?.(updated[Math.max(0, newIdx)].url);
      } else if (index < activeIndex) {
        setActiveIndex(prev => Math.max(0, activeIndex - 1));
      }
      return updated;
    });
  }, [activeIndex, onVideoLoaded]);

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
          {videos.length > 0 && (
            <span className="text-[10px] text-muted-foreground ml-auto">{videos.length} video{videos.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {videos.length === 0 ? (
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
              {isDragOver ? 'Drop videos here' : 'Drag & drop game videos'}
            </p>
            <Label htmlFor="video-upload" className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors underline">
              or click to browse (mp4, mov, webm)
            </Label>
            <Input
              id="video-upload"
              type="file"
              accept="video/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-2">
            {/* Video thumbnail strip */}
            {videos.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {videos.map((v, i) => (
                  <button
                    key={v.id}
                    onClick={() => switchVideo(i)}
                    className={`relative shrink-0 rounded border-2 overflow-hidden transition-all ${
                      i === activeIndex ? 'border-primary ring-1 ring-primary/30' : 'border-border opacity-60 hover:opacity-100'
                    }`}
                    style={{ width: 64, height: 40 }}
                  >
                    <video src={v.url} className="w-full h-full object-cover" muted preload="metadata" />
                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-white text-center">{i + 1}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeVideo(i); }}
                      className="absolute top-0 right-0 bg-black/70 rounded-bl p-0.5"
                    >
                      <X className="h-2.5 w-2.5 text-white" />
                    </button>
                  </button>
                ))}
                {/* Add more button */}
                <label
                  htmlFor="video-upload-more"
                  className="shrink-0 flex items-center justify-center rounded border-2 border-dashed border-border hover:border-muted-foreground cursor-pointer transition-colors"
                  style={{ width: 64, height: 40 }}
                >
                  <Plus className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="video-upload-more"
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* Main player */}
            {activeVideo && (
              <>
                <video
                  ref={videoRef}
                  src={activeVideo.url}
                  className="w-full rounded-lg bg-black max-h-[240px]"
                  onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                  onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
                  playsInline
                  controls
                />
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

                {/* Add more videos when only 1 loaded */}
                {videos.length === 1 && (
                  <label
                    htmlFor="video-upload-more-single"
                    className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer py-1 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Add another video
                    <Input
                      id="video-upload-more-single"
                      type="file"
                      accept="video/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Pause, Upload, Clock } from 'lucide-react';
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
  const { toast } = useToast();

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateVideoFile(file);
    if (!validation.valid) {
      toast({ title: 'Invalid file', description: validation.error, variant: 'destructive' });
      return;
    }

    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    onVideoLoaded?.(url);
  }, [toast, onVideoLoaded]);

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
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
            <Label htmlFor="video-upload" className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              Upload game video (mp4, mov, webm)
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
              playsInline
            />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={togglePlay} className="h-8">
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </Button>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span className="font-mono tabular-nums">{formatTime(currentTime)}</span>
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

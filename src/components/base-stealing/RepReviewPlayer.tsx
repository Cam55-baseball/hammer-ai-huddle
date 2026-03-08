import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

interface RepReviewPlayerProps {
  videoBlob: Blob;
}

export function RepReviewPlayer({ videoBlob }: RepReviewPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [url, setUrl] = useState('');

  useEffect(() => {
    const u = URL.createObjectURL(videoBlob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [videoBlob]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying(!playing);
  };

  const stepFrame = (dir: number) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setPlaying(false);
    videoRef.current.currentTime += dir * (1 / 30);
  };

  const cycleSpeed = () => {
    const speeds = [0.25, 0.5, 1];
    const next = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
    setSpeed(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
  };

  return (
    <div className="space-y-3">
      <video
        ref={videoRef}
        src={url}
        className="w-full rounded-lg bg-black max-h-48"
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onEnded={() => setPlaying(false)}
        playsInline
      />
      {duration > 0 && (
        <>
          <Slider
            value={[currentTime]}
            max={duration}
            step={0.01}
            onValueChange={([v]) => {
              if (videoRef.current) videoRef.current.currentTime = v;
              setCurrentTime(v);
            }}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => stepFrame(-1)}>
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePlay}>
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => stepFrame(1)}>
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={cycleSpeed}>
              {speed}x
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
            </span>
          </div>
        </>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Camera, RotateCcw, Download } from "lucide-react";
import { toast } from "sonner";

interface EnhancedVideoPlayerProps {
  videoSrc: string;
  playbackRate?: number;
}

export const EnhancedVideoPlayer = ({ videoSrc, playbackRate = 1 }: EnhancedVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);
  const [keyFrames, setKeyFrames] = useState<string[]>([]);
  const [videoReady, setVideoReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setVideoReady(true);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    // Check if already loaded
    if (video.readyState >= 1) {
      setVideoReady(true);
    }

    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [videoSrc]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || loopStart === null || loopEnd === null) return;

    const handleTimeUpdate = () => {
      if (video.currentTime >= loopEnd) {
        video.currentTime = loopStart;
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [loopStart, loopEnd]);

  const stepFrame = (direction: 'forward' | 'backward') => {
    const video = videoRef.current;
    if (!video || !videoReady) {
      toast.error("Video not ready yet");
      return;
    }

    // Force pause before seeking (critical for mobile)
    video.pause();

    // Calculate frame step (try to use actual framerate, fallback to 30fps)
    const step = 1 / 30;
    
    const newTime = direction === 'forward' 
      ? Math.min(video.currentTime + step, video.duration)
      : Math.max(video.currentTime - step, 0);

    // Set new time
    video.currentTime = newTime;
  };

  const setLoopPoint = (type: 'start' | 'end') => {
    const video = videoRef.current;
    if (!video) return;

    if (type === 'start') {
      setLoopStart(video.currentTime);
      toast.success(`Loop start set at ${video.currentTime.toFixed(2)}s`);
    } else {
      setLoopEnd(video.currentTime);
      toast.success(`Loop end set at ${video.currentTime.toFixed(2)}s`);
    }
  };

  const clearLoop = () => {
    setLoopStart(null);
    setLoopEnd(null);
    toast.info("Loop cleared");
  };

  const captureKeyFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const frameUrl = canvas.toDataURL('image/png');
    setKeyFrames(prev => [...prev, frameUrl]);
    toast.success("Key frame captured!");
  };

  const downloadFrame = (frameDataUrl: string, index: number) => {
    const link = document.createElement('a');
    link.href = frameDataUrl;
    link.download = `key-frame-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Frame ${index + 1} downloaded!`);
  };

  const downloadAllFrames = () => {
    if (keyFrames.length === 0) return;
    
    toast.info(`Downloading ${keyFrames.length} frame${keyFrames.length > 1 ? 's' : ''}...`);
    
    keyFrames.forEach((frame, index) => {
      setTimeout(() => {
        downloadFrame(frame, index);
      }, index * 150);
    });
  };

  return (
    <div className="space-y-4">
      {/* Video Player */}
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          src={videoSrc}
          controls
          className="w-full"
          style={{ maxHeight: '600px' }}
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Frame Controls */}
      <div className="flex gap-2 flex-wrap items-center justify-between p-4 bg-muted/30 rounded-lg border">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => stepFrame('backward')}
            disabled={!videoReady}
            title="Step backward one frame"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => stepFrame('forward')}
            disabled={!videoReady}
            title="Step forward one frame"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={captureKeyFrame}
            disabled={!videoReady}
            title="Capture current frame"
          >
            <Camera className="h-4 w-4 mr-2" />
            Capture Frame
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLoopPoint('start')}
            disabled={loopStart !== null && loopEnd !== null}
          >
            Mark Loop Start
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLoopPoint('end')}
            disabled={loopStart === null || (loopStart !== null && loopEnd !== null)}
          >
            Mark Loop End
          </Button>
          {(loopStart !== null || loopEnd !== null) && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearLoop}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear Loop
            </Button>
          )}
        </div>
      </div>

      {/* Loop Status */}
      {loopStart !== null && loopEnd !== null && (
        <div className="text-sm text-muted-foreground text-center p-2 bg-primary/5 rounded-lg border border-primary/20">
          Looping: {loopStart.toFixed(2)}s → {loopEnd.toFixed(2)}s
        </div>
      )}

      {/* Captured Key Frames */}
      {keyFrames.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Captured Key Frames</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadAllFrames}
            >
              <Download className="h-4 w-4 mr-2" />
              Download All ({keyFrames.length})
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {keyFrames.map((frame, idx) => (
              <div key={idx} className="relative group">
                <img 
                  src={frame} 
                  alt={`Key frame ${idx + 1}`}
                  className="w-full rounded-lg border"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => downloadFrame(frame, idx)}
                  title="Download frame"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setKeyFrames(prev => prev.filter((_, i) => i !== idx))}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

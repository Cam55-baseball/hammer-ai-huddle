import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Camera, RotateCcw, Download, FlipHorizontal, Maximize2, Minimize2 } from "lucide-react";
import { toast } from "sonner";

interface EnhancedVideoPlayerProps {
  videoSrc: string;
  playbackRate?: number;
}

interface KeyFrame {
  original: string;
}

export const EnhancedVideoPlayer = ({ videoSrc, playbackRate = 1 }: EnhancedVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);
  const [keyFrames, setKeyFrames] = useState<KeyFrame[]>([]);
  const [videoReady, setVideoReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMirrored, setIsMirrored] = useState(false);
  const [isSteppingFrames, setIsSteppingFrames] = useState(false);
  const steppingTimeoutRef = useRef<NodeJS.Timeout>();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenControls, setShowFullscreenControls] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenControlsTimeoutRef = useRef<NodeJS.Timeout>();

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

  // Handle fullscreen changes to maintain mirror effect on mobile
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      
      // Reapply mirror state when exiting fullscreen
      if (!document.fullscreenElement && isMirrored) {
        setIsMirrored(false);
        setTimeout(() => setIsMirrored(true), 50);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [isMirrored]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (steppingTimeoutRef.current) {
        clearTimeout(steppingTimeoutRef.current);
      }
      if (fullscreenControlsTimeoutRef.current) {
        clearTimeout(fullscreenControlsTimeoutRef.current);
      }
    };
  }, []);

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if ((container as any).webkitRequestFullscreen) {
          await (container as any).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  const handleFullscreenTap = () => {
    setShowFullscreenControls(true);
    
    if (fullscreenControlsTimeoutRef.current) {
      clearTimeout(fullscreenControlsTimeoutRef.current);
    }
    
    fullscreenControlsTimeoutRef.current = setTimeout(() => {
      setShowFullscreenControls(false);
    }, 3000);
  };

  const stepFrame = (direction: 'forward' | 'backward') => {
    const video = videoRef.current;
    if (!video || !videoReady) {
      toast.error("Video not ready yet");
      return;
    }

    // Force pause before seeking (critical for mobile)
    video.pause();

    // Hide controls on mobile during frame stepping
    if (window.innerWidth < 768) {
      setIsSteppingFrames(true);
      video.controls = false;

      // Add haptic feedback on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }

      // Clear existing timeout
      if (steppingTimeoutRef.current) {
        clearTimeout(steppingTimeoutRef.current);
      }

      // Restore controls after 2 seconds of inactivity
      steppingTimeoutRef.current = setTimeout(() => {
        video.controls = true;
        setIsSteppingFrames(false);
      }, 2000);
    }

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
    if (!video || !canvas) {
      toast.error("Video or canvas not ready");
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      toast.error("Could not get canvas context");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const frameUrl = canvas.toDataURL('image/png');
    console.log("Frame captured, data URL length:", frameUrl.length);
    
    setKeyFrames(prev => [...prev, { original: frameUrl }]);
    toast.success("Key frame captured!");
  };

  const downloadFrame = (frame: KeyFrame, index: number) => {
    const link = document.createElement('a');
    link.href = frame.original;
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
      {/* Video Player Container */}
      <div 
        ref={containerRef}
        className={`relative bg-black rounded-lg overflow-hidden ${isFullscreen ? 'w-screen h-screen' : ''}`}
        onClick={isFullscreen ? handleFullscreenTap : undefined}
      >
        {/* Frame stepping indicator on mobile */}
        {isSteppingFrames && !isFullscreen && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-xs sm:hidden z-10">
            Frame-by-frame mode
          </div>
        )}
        
        {/* Mirror wrapper for video */}
        <div 
          style={{ 
            transform: isMirrored ? 'scaleX(-1)' : 'none',
            width: '100%',
            height: isFullscreen ? '100%' : 'auto'
          }}
        >
          <video
            ref={videoRef}
            src={videoSrc}
            controls
            preload="metadata"
            className={`w-full ${isFullscreen ? 'h-full object-contain' : 'h-auto'} ${isSteppingFrames ? 'pointer-events-none' : ''}`}
            style={{ maxHeight: isFullscreen ? '100%' : 'min(600px, 70vh)' }}
          />
        </div>
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Fullscreen Controls Overlay */}
        {isFullscreen && (
          <div 
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 z-20 transition-opacity duration-300 ${
              showFullscreenControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {/* Frame Navigation */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => stepFrame('backward')}
                disabled={!videoReady}
                className="text-white hover:bg-white/20 min-h-[44px] min-w-[44px]"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => stepFrame('forward')}
                disabled={!videoReady}
                className="text-white hover:bg-white/20 min-h-[44px] min-w-[44px]"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
              
              {/* Capture */}
              <Button
                variant="ghost"
                size="sm"
                onClick={captureKeyFrame}
                disabled={!videoReady}
                className="text-white hover:bg-white/20 min-h-[44px] min-w-[44px]"
              >
                <Camera className="h-5 w-5" />
              </Button>
              
              {/* Loop Start */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLoopPoint('start')}
                disabled={loopStart !== null && loopEnd !== null}
                className="text-white hover:bg-white/20 min-h-[44px] px-2"
              >
                <span className="text-xs">Loop Start</span>
              </Button>
              
              {/* Loop End */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLoopPoint('end')}
                disabled={loopStart === null || (loopStart !== null && loopEnd !== null)}
                className="text-white hover:bg-white/20 min-h-[44px] px-2"
              >
                <span className="text-xs">Loop End</span>
              </Button>
              
              {/* Clear Loop (if active) */}
              {(loopStart !== null || loopEnd !== null) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearLoop}
                  className="text-white hover:bg-white/20 min-h-[44px] min-w-[44px]"
                >
                  <RotateCcw className="h-5 w-5" />
                </Button>
              )}
              
              {/* Mirror Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMirrored(!isMirrored)}
                className={`text-white hover:bg-white/20 min-h-[44px] min-w-[44px] ${isMirrored ? 'bg-white/30' : ''}`}
              >
                <FlipHorizontal className="h-5 w-5" />
              </Button>
              
              {/* Exit Fullscreen */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20 min-h-[44px] min-w-[44px]"
              >
                <Minimize2 className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Loop Status Indicator */}
            {loopStart !== null && loopEnd !== null && (
              <div className="text-center text-white/80 text-xs mt-2">
                Looping: {loopStart.toFixed(2)}s → {loopEnd.toFixed(2)}s
              </div>
            )}
          </div>
        )}
      </div>

      {/* Frame Controls */}
      <div className="flex flex-col sm:flex-row gap-2 p-3 sm:p-4 bg-muted/30 rounded-lg border overflow-x-hidden">
        {/* Navigation & Capture */}
        <div className="flex gap-1 sm:gap-2 flex-wrap justify-center sm:justify-start">
          <Button
            variant="outline"
            size="sm"
            onClick={() => stepFrame('backward')}
            disabled={!videoReady}
            title="Step backward"
            className="min-h-[44px] min-w-[44px]"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Back</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => stepFrame('forward')}
            disabled={!videoReady}
            title="Step forward"
            className="min-h-[44px] min-w-[44px]"
          >
            <ChevronRight className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Forward</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={captureKeyFrame}
            disabled={!videoReady}
            title="Capture"
          >
            <Camera className="h-4 w-4" />
            <span className="hidden md:inline ml-1">Capture</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMirrored(!isMirrored)}
            title="Mirror"
            className={isMirrored ? 'bg-primary/10' : ''}
          >
            <FlipHorizontal className="h-4 w-4" />
            <span className="hidden md:inline ml-1">Mirror</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            title="Fullscreen"
            className="min-h-[44px] min-w-[44px]"
          >
            <Maximize2 className="h-4 w-4" />
            <span className="hidden md:inline ml-1">Fullscreen</span>
          </Button>
        </div>

        {/* Loop Controls */}
        <div className="flex gap-1 sm:gap-2 flex-wrap justify-center sm:justify-start sm:ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLoopPoint('start')}
            disabled={loopStart !== null && loopEnd !== null}
            className="text-xs sm:text-sm"
          >
            <span className="hidden sm:inline">Mark Loop Start</span>
            <span className="sm:hidden">Loop Start</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLoopPoint('end')}
            disabled={loopStart === null || (loopStart !== null && loopEnd !== null)}
            className="text-xs sm:text-sm"
          >
            <span className="hidden sm:inline">Mark Loop End</span>
            <span className="sm:hidden">Loop End</span>
          </Button>
          {(loopStart !== null || loopEnd !== null) && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearLoop}
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Clear</span>
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
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {keyFrames.map((frame, idx) => (
              <div key={idx} className="relative group">
                <img 
                  src={frame.original} 
                  alt={`Key frame ${idx + 1}`}
                  className="w-full rounded-lg border"
                />
                <div className="absolute top-2 left-2 flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadFrame(frame, idx)}
                    title="Download frame"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute bottom-2 right-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
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

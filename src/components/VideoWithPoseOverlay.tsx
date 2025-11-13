import { useEffect, useRef, useState } from 'react';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { Activity, Loader2 } from 'lucide-react';
import { Button } from './ui/button';

interface VideoWithPoseOverlayProps {
  videoSrc: string;
  showMarkers?: boolean;
  onToggleMarkers?: (enabled: boolean) => void;
}

export const VideoWithPoseOverlay = ({ 
  videoSrc, 
  showMarkers = false,
  onToggleMarkers 
}: VideoWithPoseOverlayProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [poseDetector, setPoseDetector] = useState<Pose | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [markersEnabled, setMarkersEnabled] = useState(showMarkers);
  const animationFrameRef = useRef<number>();

  // Initialize MediaPipe Pose
  useEffect(() => {
    if (!markersEnabled) return;

    const pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    pose.onResults((results) => {
      if (!canvasRef.current || !videoRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (results.poseLandmarks && markersEnabled) {
        // Draw connections (skeleton lines)
        drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
          color: 'rgba(59, 130, 246, 0.6)', // Blue
          lineWidth: 2
        });

        // Draw landmarks (joint points)
        drawLandmarks(ctx, results.poseLandmarks, {
          color: 'rgba(59, 130, 246, 0.9)',
          fillColor: 'rgba(59, 130, 246, 0.3)',
          lineWidth: 1,
          radius: 4
        });

        // Highlight key points for hitting analysis
        const keyLandmarks = [
          { index: 0, color: '#a855f7' }, // Nose (head)
          { index: 11, color: '#10b981' }, // Left shoulder
          { index: 12, color: '#10b981' }, // Right shoulder
          { index: 13, color: '#f59e0b' }, // Left elbow
          { index: 14, color: '#f59e0b' }, // Right elbow
          { index: 15, color: '#ef4444' }, // Left wrist
          { index: 16, color: '#ef4444' }, // Right wrist
        ];

        keyLandmarks.forEach(({ index, color }) => {
          const landmark = results.poseLandmarks[index];
          if (landmark) {
            ctx.beginPath();
            ctx.arc(
              landmark.x * canvas.width,
              landmark.y * canvas.height,
              6,
              0,
              2 * Math.PI
            );
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        });
      }
    });

    setPoseDetector(pose);

    return () => {
      pose.close();
    };
  }, [markersEnabled]);

  // Process video frames
  useEffect(() => {
    if (!poseDetector || !videoRef.current || !markersEnabled) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const processFrame = async () => {
      if (video.paused || video.ended) {
        setIsProcessing(false);
        return;
      }

      setIsProcessing(true);
      await poseDetector.send({ image: video });
      
      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    const handlePlay = () => {
      processFrame();
    };

    const handlePause = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setIsProcessing(false);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handlePause);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handlePause);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [poseDetector, markersEnabled]);

  // Sync canvas size with video
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const updateCanvasSize = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.style.width = `${video.clientWidth}px`;
      canvas.style.height = `${video.clientHeight}px`;
    };

    video.addEventListener('loadedmetadata', updateCanvasSize);
    window.addEventListener('resize', updateCanvasSize);

    return () => {
      video.removeEventListener('loadedmetadata', updateCanvasSize);
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  const handleToggleMarkers = () => {
    const newState = !markersEnabled;
    setMarkersEnabled(newState);
    onToggleMarkers?.(newState);
  };

  return (
    <div className="relative w-full">
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          src={videoSrc}
          controls
          className="w-full h-full"
          crossOrigin="anonymous"
        />
        {markersEnabled && (
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 pointer-events-none"
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </div>

      <div className="mt-4 flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggleMarkers}
          className="gap-2"
        >
          <Activity className="h-4 w-4" />
          {markersEnabled ? 'Hide' : 'Show'} Pose Markers
        </Button>

        {isProcessing && markersEnabled && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing pose detection...
          </div>
        )}

        {markersEnabled && !isProcessing && poseDetector && (
          <div className="text-sm text-muted-foreground">
            Pose detection ready
          </div>
        )}
      </div>

      {markersEnabled && (
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <h4 className="text-sm font-medium mb-2">Landmark Legend</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#a855f7' }} />
              <span>Head (Nose)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }} />
              <span>Shoulders</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
              <span>Elbows</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }} />
              <span>Wrists (Hands)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import { useEffect, useRef, useState } from 'react';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { Activity, Loader2 } from 'lucide-react';
import { Button } from './ui/button';

// Calculate Euclidean distance between two landmarks
const calculateDistance = (landmark1: any, landmark2: any): number => {
  const dx = landmark1.x - landmark2.x;
  const dy = landmark1.y - landmark2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// Calculate adaptive scale factor based on person size in frame
const calculateScaleFactor = (landmarks: any[], canvasWidth: number): number => {
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  
  if (!leftShoulder || !rightShoulder) {
    return 1.0; // Default scale if shoulders not detected
  }
  
  // Calculate shoulder width in pixels
  const shoulderWidthNormalized = calculateDistance(leftShoulder, rightShoulder);
  const shoulderWidthPixels = shoulderWidthNormalized * canvasWidth;
  
  // Base reference: 150px shoulder width (typical mid-distance video)
  const BASE_SHOULDER_WIDTH = 150;
  const scaleFactor = shoulderWidthPixels / BASE_SHOULDER_WIDTH;
  
  // Clamp between 0.5x and 2.0x to prevent extreme sizes
  return Math.max(0.5, Math.min(2.0, scaleFactor));
};

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
        // Calculate adaptive scale based on person size
        const scaleFactor = calculateScaleFactor(results.poseLandmarks, canvas.width);
        
        // Base sizes
        const baseLandmarkRadius = 4;
        const baseKeyLandmarkRadius = 6;
        const baseLineWidth = 2;
        
        // Scaled sizes
        const landmarkRadius = baseLandmarkRadius * scaleFactor;
        const keyLandmarkRadius = baseKeyLandmarkRadius * scaleFactor;
        const lineWidth = Math.max(1, baseLineWidth * scaleFactor); // Minimum 1px for visibility
        
        // Draw connections (skeleton lines) with adaptive thickness
        drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
          color: 'rgba(59, 130, 246, 0.6)',
          lineWidth: lineWidth
        });

        // Draw landmarks (joint points) with adaptive size
        drawLandmarks(ctx, results.poseLandmarks, {
          color: 'rgba(59, 130, 246, 0.9)',
          fillColor: 'rgba(59, 130, 246, 0.3)',
          lineWidth: Math.max(1, lineWidth * 0.5),
          radius: landmarkRadius
        });

        // Highlight key points for hitting analysis with adaptive size
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
              keyLandmarkRadius, // Adaptive size
              0,
              2 * Math.PI
            );
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = Math.max(1, lineWidth);
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

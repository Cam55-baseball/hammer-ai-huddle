import { useEffect, useRef, useState } from 'react';
import { Activity, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './ui/resizable';

// Define POSE_CONNECTIONS manually (MediaPipe Pose landmark connections)
const POSE_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10], [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
  [17, 19], [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28],
  [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32]
];

// MediaPipe types (loaded from CDN)
declare global {
  interface Window {
    Pose: any;
    drawConnectors: any;
    drawLandmarks: any;
  }
}

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
  const [poseDetector, setPoseDetector] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [markersEnabled, setMarkersEnabled] = useState(showMarkers);
  const animationFrameRef = useRef<number>();

  // Load MediaPipe scripts from CDN
  useEffect(() => {
    if (window.Pose && window.drawConnectors && window.drawLandmarks) return;

    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = 'anonymous';
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    Promise.all([
      loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js'),
      loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js')
    ]).catch(console.error);
  }, []);

  // Initialize MediaPipe Pose
  useEffect(() => {
    if (!markersEnabled || !window.Pose) return;

    const pose = new window.Pose({
      locateFile: (file: string) => {
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
        if (window.drawConnectors) {
          window.drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
            color: 'rgba(59, 130, 246, 0.6)',
            lineWidth: lineWidth
          });
        }

        // Draw landmarks (joint points) with adaptive size
        if (window.drawLandmarks) {
          window.drawLandmarks(ctx, results.poseLandmarks, {
            color: 'rgba(59, 130, 246, 0.9)',
            fillColor: 'rgba(59, 130, 246, 0.3)',
            lineWidth: Math.max(1, lineWidth * 0.5),
            radius: landmarkRadius
          });
        }

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
      // Set canvas to match video's natural dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    };

    video.addEventListener('loadedmetadata', updateCanvasSize);
    
    return () => {
      video.removeEventListener('loadedmetadata', updateCanvasSize);
    };
  }, []);

  const handleToggleMarkers = () => {
    const newState = !markersEnabled;
    setMarkersEnabled(newState);
    onToggleMarkers?.(newState);
  };

  return (
    <div className="w-full space-y-4">
      {/* Controls above the split view */}
      <div className="flex items-center justify-between">
        <Button
          onClick={handleToggleMarkers}
          variant={markersEnabled ? "default" : "outline"}
          size="sm"
          disabled={isProcessing}
          className="gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Activity className="h-4 w-4" />
              {markersEnabled ? "Hide" : "Show"} Pose Markers
            </>
          )}
        </Button>
        
        {markersEnabled && !isProcessing && poseDetector && (
          <p className="text-sm text-green-600">
            ✓ Pose detection active
          </p>
        )}
      </div>

      {/* Split-view panels */}
      <ResizablePanelGroup direction="horizontal" className="min-h-[400px] rounded-lg border">
        {/* Left Panel - Original Video */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col bg-black">
            <div className="flex-1 flex items-center justify-center p-4">
              <video 
                ref={videoRef}
                src={videoSrc}
                controls
                className="max-w-full max-h-full object-contain"
                crossOrigin="anonymous"
                playsInline
              />
            </div>
            <div className="p-3 bg-muted/10 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">Original Video</p>
            </div>
          </div>
        </ResizablePanel>

        {/* Resizable Handle */}
        <ResizableHandle withHandle />

        {/* Right Panel - Pose Detection Canvas */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col bg-black">
            <div className="flex-1 flex items-center justify-center p-4">
              {markersEnabled ? (
                <canvas 
                  ref={canvasRef}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-center p-8">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Enable pose markers to see analysis
                  </p>
                </div>
              )}
            </div>
            <div className="p-3 bg-muted/10 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">Pose Detection</p>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Legend below the split view */}
      {markersEnabled && (
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-semibold mb-2">Key Landmarks:</h4>
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

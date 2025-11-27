import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface PoseOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  enabled: boolean;
  sport: 'baseball' | 'softball';
  module: 'hitting' | 'pitching' | 'throwing';
  onViolationDetected?: (violation: {
    timestamp: number;
    type: string;
    severity: 'critical' | 'major' | 'minor';
  }) => void;
}

// MediaPipe landmark connections
const POSE_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10], [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
  [17, 19], [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [27, 29], [27, 31],
  [29, 31], [24, 26], [26, 28], [28, 30], [28, 32], [30, 32]
];

// Adaptive marker sizing constants
const BASE_SHOULDER_WIDTH = 150; // Reference shoulder width in pixels
const MIN_SCALE = 0.5; // Minimum scale for far shots
const MAX_SCALE = 2.0; // Maximum scale for close-ups

export const PoseOverlay = ({ videoRef, enabled, sport, module, onViolationDetected }: PoseOverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [poseLib, setPoseLib] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const animationFrameRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(0);
  const isMobile = window.innerWidth < 768;

  // Lazy load MediaPipe when enabled via CDN
  useEffect(() => {
    if (enabled && !poseLib) {
      setIsLoading(true);
      
      // Check if already loaded globally
      if ((window as any).Pose) {
        setPoseLib({ Pose: (window as any).Pose });
        setIsLoading(false);
        toast.success('Pose tracking initialized');
        return;
      }
      
      // Load via CDN script injection
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js';
      script.async = true;
      
      script.onload = () => {
        const Pose = (window as any).Pose;
        if (Pose) {
          setPoseLib({ Pose });
          setIsLoading(false);
          toast.success('Pose tracking initialized');
        } else {
          console.error('Pose class not found on window after script load');
          toast.error('Failed to load pose tracking');
          setIsLoading(false);
        }
      };
      
      script.onerror = (error) => {
        console.error('Failed to load MediaPipe script:', error);
        toast.error('Failed to load pose tracking');
        setIsLoading(false);
      };
      
      document.head.appendChild(script);
    }
  }, [enabled, poseLib]);

  // Calculate adaptive marker sizing based on person's size
  const calculateScale = (landmarks: any[]) => {
    if (!landmarks || landmarks.length < 12) return 1;

    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    
    if (!leftShoulder || !rightShoulder) return 1;

    const shoulderWidth = Math.hypot(
      (rightShoulder.x - leftShoulder.x) * (canvasRef.current?.width || 1),
      (rightShoulder.y - leftShoulder.y) * (canvasRef.current?.height || 1)
    );

    const scaleFactor = shoulderWidth / BASE_SHOULDER_WIDTH;
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, scaleFactor));
  };

  // Detect biomechanical violations
  const detectViolations = (landmarks: any[], timestamp: number) => {
    if (!landmarks || landmarks.length < 33) return;

    // Hitting violations
    if (module === 'hitting') {
      detectHandsPassingElbow(landmarks, timestamp);
      detectFrontShoulderOpening(landmarks, timestamp);
      detectHeadMovement(landmarks, timestamp);
    }

    // Pitching/Throwing violations
    if (module === 'pitching' || module === 'throwing') {
      detectArmAngle(landmarks, timestamp);
    }
  };

  const detectHandsPassingElbow = (landmarks: any[], timestamp: number) => {
    const backElbow = landmarks[13]; // Right elbow
    const backWrist = landmarks[15]; // Right wrist
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];

    if (!backElbow || !backWrist || !leftShoulder || !rightShoulder) return;

    // Check if hands are moving past back elbow before shoulder rotation
    const shoulderRotation = Math.abs(leftShoulder.y - rightShoulder.y);
    const handPosition = backWrist.x - backElbow.x;

    if (handPosition > 0.05 && shoulderRotation < 0.02) {
      onViolationDetected?.({
        timestamp,
        type: 'hands_passing_elbow',
        severity: 'critical'
      });
    }
  };

  const detectFrontShoulderOpening = (landmarks: any[], timestamp: number) => {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];

    if (!leftShoulder || !rightShoulder) return;

    // Check front shoulder opening angle
    const shoulderAngle = Math.atan2(
      rightShoulder.y - leftShoulder.y,
      rightShoulder.x - leftShoulder.x
    );

    if (Math.abs(shoulderAngle) > 0.3) {
      onViolationDetected?.({
        timestamp,
        type: 'front_shoulder_opening',
        severity: 'critical'
      });
    }
  };

  const detectHeadMovement = (landmarks: any[], timestamp: number) => {
    const nose = landmarks[0];
    const prevNose = (window as any)._prevNose;

    if (!nose || !prevNose) {
      (window as any)._prevNose = nose;
      return;
    }

    const lateralMovement = Math.abs(nose.x - prevNose.x);
    
    if (lateralMovement > 0.03) {
      onViolationDetected?.({
        timestamp,
        type: 'excessive_head_movement',
        severity: 'major'
      });
    }

    (window as any)._prevNose = nose;
  };

  const detectArmAngle = (landmarks: any[], timestamp: number) => {
    const shoulder = landmarks[12]; // Right shoulder
    const elbow = landmarks[14]; // Right elbow
    const wrist = landmarks[16]; // Right wrist

    if (!shoulder || !elbow || !wrist) return;

    // Calculate angle between hand-elbow-shoulder
    const angle1 = Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x);
    const angle2 = Math.atan2(shoulder.y - elbow.y, shoulder.x - elbow.x);
    const armAngle = Math.abs(angle1 - angle2) * (180 / Math.PI);

    if (armAngle >= 90) {
      onViolationDetected?.({
        timestamp,
        type: 'arm_angle_injury_risk',
        severity: 'critical'
      });
    }
  };

  // Draw landmarks and connections
  const drawPose = (landmarks: any[], scale: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Base sizes scaled by person size
    const landmarkRadius = 4 * scale * (isMobile ? 1.5 : 1);
    const keyLandmarkRadius = 6 * scale * (isMobile ? 1.5 : 1);
    const lineWidth = 2 * scale;

    // Draw connections
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
    ctx.lineWidth = lineWidth;

    POSE_CONNECTIONS.forEach(([start, end]) => {
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];

      if (startPoint && endPoint) {
        ctx.beginPath();
        ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
        ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
        ctx.stroke();
      }
    });

    // Draw landmarks
    const keyLandmarks = [0, 11, 12, 13, 14, 15, 16, 23, 24]; // Nose, shoulders, elbows, wrists, hips

    landmarks.forEach((landmark, index) => {
      if (!landmark) return;

      const x = landmark.x * canvas.width;
      const y = landmark.y * canvas.height;
      const isKeyLandmark = keyLandmarks.includes(index);
      const radius = isKeyLandmark ? keyLandmarkRadius : landmarkRadius;

      ctx.fillStyle = isKeyLandmark ? 'rgba(255, 0, 255, 0.8)' : 'rgba(0, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  // Process video frames
  useEffect(() => {
    if (!enabled || !poseLib || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Initialize MediaPipe Pose
    const pose = new poseLib.Pose({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }
    });

    pose.setOptions({
      modelComplexity: isMobile ? 0 : 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    pose.onResults((results: any) => {
      if (results.poseLandmarks) {
        const scale = calculateScale(results.poseLandmarks);
        drawPose(results.poseLandmarks, scale);
        
        const timestamp = video.currentTime;
        detectViolations(results.poseLandmarks, timestamp);
      }
    });

    const processFrame = async (currentTime: number) => {
      if (!enabled) return;

      // Frame rate throttling: process every frame on desktop, every 2nd on mobile
      const frameInterval = isMobile ? 66 : 33; // ~30fps desktop, ~15fps mobile
      
      if (currentTime - lastFrameTimeRef.current < frameInterval) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      lastFrameTimeRef.current = currentTime;

      if (video.paused || video.ended) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      try {
        await pose.send({ image: video });
      } catch (error) {
        console.error('Pose processing error:', error);
      }

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    // Sync canvas size with video
    const syncCanvasSize = () => {
      if (video.videoWidth && video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
    };

    video.addEventListener('loadedmetadata', syncCanvasSize);
    syncCanvasSize();

    animationFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      video.removeEventListener('loadedmetadata', syncCanvasSize);
      pose.close();
    };
  }, [enabled, poseLib, videoRef, sport, module, isMobile]);

  if (!enabled) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-white">Loading pose tracking...</p>
          </div>
        </div>
      )}
    </>
  );
};
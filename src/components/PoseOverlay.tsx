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

// Visual overlay removed - keeping only violation detection

export const PoseOverlay = ({ videoRef, enabled, sport, module, onViolationDetected }: PoseOverlayProps) => {
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


  // Process video frames
  useEffect(() => {
    if (!enabled || !poseLib || !videoRef.current) return;

    const video = videoRef.current;

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
        // Visual overlay removed - only detect violations
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

    // Canvas size sync no longer needed since we're not drawing

    animationFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      pose.close();
    };
  }, [enabled, poseLib, videoRef, sport, module, isMobile]);

  if (!enabled) return null;

  return (
    <>
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
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { DrillContainer } from '../shared/DrillContainer';
import { DrillTimer } from '../shared/DrillTimer';
import { DrillMetricsDisplay } from '../shared/DrillMetricsDisplay';
import { Target, CheckCircle } from 'lucide-react';
import { DrillResult } from '@/hooks/useTexVisionSession';

interface FollowTheTargetGameProps {
  tier: string;
  onComplete: (result: Omit<DrillResult, 'drillType' | 'tier'>) => void;
  onExit: () => void;
  isPaused?: boolean;
  onPauseChange?: (paused: boolean) => void;
}

interface Position {
  x: number;
  y: number;
}

export default function FollowTheTargetGame({ tier, onComplete, onExit, isPaused }: FollowTheTargetGameProps) {
  const { t } = useTranslation();
  const viewingAreaRef = useRef<HTMLDivElement>(null);
  const trackpadRef = useRef<HTMLDivElement>(null);
  const [targetPosition, setTargetPosition] = useState<Position>({ x: 50, y: 50 });
  const [cursorPosition, setCursorPosition] = useState<Position>({ x: 50, y: 50 });
  const [fingerPosition, setFingerPosition] = useState<Position | null>(null);
  const [trackingScore, setTrackingScore] = useState<number[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [finalAccuracy, setFinalAccuracy] = useState(0);
  
  // Use refs for stable callback access
  const trackingScoreRef = useRef<number[]>([]);
  const initialSeconds = tier === 'beginner' ? 60 : tier === 'advanced' ? 90 : 120;

  const speed = tier === 'beginner' ? 0.5 : tier === 'advanced' ? 1 : 1.5;
  const patternComplexity = tier === 'beginner' ? 1 : tier === 'advanced' ? 2 : 3;

  // Keep ref in sync with state for stable callback access
  useEffect(() => {
    trackingScoreRef.current = trackingScore;
  }, [trackingScore]);

  // Generate smooth movement path - starts immediately, respects isPaused
  useEffect(() => {
    if (isComplete || isPaused) return;

    let angle = 0;
    const radiusX = 30;
    const radiusY = 20;
    
    const interval = setInterval(() => {
      angle += speed * 0.05;
      
      // Create complex Lissajous pattern based on tier
      const freqX = patternComplexity;
      const freqY = patternComplexity + 0.5;
      
      const newX = 50 + radiusX * Math.sin(angle * freqX);
      const newY = 50 + radiusY * Math.sin(angle * freqY);
      
      setTargetPosition({ x: newX, y: newY });
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [speed, patternComplexity, isComplete, isPaused]);

  // Calculate tracking accuracy
  useEffect(() => {
    if (isComplete) return;

    const distance = Math.sqrt(
      Math.pow(targetPosition.x - cursorPosition.x, 2) +
      Math.pow(targetPosition.y - cursorPosition.y, 2)
    );
    
    // Convert distance to accuracy (closer = higher score)
    const accuracy = Math.max(0, 100 - distance * 2);
    setTrackingScore(prev => [...prev.slice(-100), accuracy]); // Keep last 100 samples
  }, [targetPosition, cursorPosition, isComplete]);

  // Desktop mouse handler - works on viewing area
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!viewingAreaRef.current || isComplete) return;

    if (!hasInteracted) setHasInteracted(true);
    
    const rect = viewingAreaRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setCursorPosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  }, [isComplete, hasInteracted]);

  // Trackpad touch handlers - map trackpad position to viewing area cursor
  const handleTrackpadTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!trackpadRef.current || isComplete) return;
    
    if (!hasInteracted) setHasInteracted(true);
    
    const touch = e.touches[0];
    const rect = trackpadRef.current.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));
    
    setFingerPosition({ x: clampedX, y: clampedY });
    setCursorPosition({ x: clampedX, y: clampedY });
  }, [isComplete, hasInteracted]);

  const handleTrackpadTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!trackpadRef.current || isComplete) return;
    
    e.preventDefault(); // Prevent scrolling while tracking
    
    const touch = e.touches[0];
    const rect = trackpadRef.current.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));
    
    setFingerPosition({ x: clampedX, y: clampedY });
    setCursorPosition({ x: clampedX, y: clampedY });
  }, [isComplete]);

  const handleTrackpadTouchEnd = useCallback(() => {
    setFingerPosition(null);
  }, []);

  // Trackpad mouse handler for desktop consistency
  const handleTrackpadMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackpadRef.current || isComplete) return;

    if (!hasInteracted) setHasInteracted(true);
    
    const rect = trackpadRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));
    
    setFingerPosition({ x: clampedX, y: clampedY });
    setCursorPosition({ x: clampedX, y: clampedY });
  }, [isComplete, hasInteracted]);

  const handleTrackpadMouseLeave = useCallback(() => {
    setFingerPosition(null);
  }, []);

  const handleTimerComplete = useCallback(() => {
    if (isComplete) return;
    
    setIsComplete(true);
    setShowCompletionOverlay(true);
    
    // Use ref for stable access to latest scores
    const scores = trackingScoreRef.current;
    const avgAccuracy = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
    
    setFinalAccuracy(avgAccuracy);
    
    // Delay transition to show completion overlay
    setTimeout(() => {
      onComplete({
        accuracyPercent: avgAccuracy,
        difficultyLevel: tier === 'beginner' ? 4 : tier === 'advanced' ? 6 : 9,
        drillMetrics: {
          trackingSamples: scores.length,
          duration: initialSeconds,
        },
      });
    }, 1500);
  }, [isComplete, tier, initialSeconds, onComplete]);

  const currentAccuracy = trackingScore.length > 0
    ? Math.round(trackingScore.slice(-10).reduce((a, b) => a + b, 0) / Math.min(trackingScore.length, 10))
    : 100;

  return (
    <DrillContainer
      title={t('texVision.drills.smoothPursuit.title', 'Follow the Target')}
      description={t('texVision.drills.smoothPursuit.description', 'Track the moving target')}
      icon={Target}
      onExit={onExit}
      timer={
        <DrillTimer
          initialSeconds={initialSeconds}
          mode="countdown"
          autoStart={true}
          onComplete={handleTimerComplete}
        />
      }
      metrics={
        <DrillMetricsDisplay
          accuracy={currentAccuracy}
          difficulty={tier === 'beginner' ? 4 : tier === 'advanced' ? 6 : 9}
        />
      }
    >
      <div className="flex flex-col w-full h-full min-h-[450px]">
        {/* Viewing Area - Target and cursor displayed here */}
        <div 
          ref={viewingAreaRef}
          className="relative flex-[2] min-h-[280px] cursor-none select-none"
          onMouseMove={handleMouseMove}
        >
          {/* Trail effect */}
          <div
            className="absolute w-8 h-8 rounded-full bg-[hsl(var(--tex-vision-feedback))]/20 transition-all duration-100"
            style={{
              left: `${targetPosition.x}%`,
              top: `${targetPosition.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />

          {/* Moving target */}
          <div
            className="absolute w-6 h-6 rounded-full bg-[hsl(var(--tex-vision-feedback))] transition-none"
            style={{
              left: `${targetPosition.x}%`,
              top: `${targetPosition.y}%`,
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 0 15px hsl(var(--tex-vision-feedback) / 0.6)',
            }}
          />

          {/* User cursor indicator in viewing area */}
          {hasInteracted && (
            <div
              className={`absolute w-10 h-10 rounded-full border-2 transition-colors duration-150 ${
                currentAccuracy > 80
                  ? 'border-[hsl(var(--tex-vision-success))] bg-[hsl(var(--tex-vision-success))]/10'
                  : currentAccuracy > 50
                    ? 'border-[hsl(var(--tex-vision-timing))] bg-[hsl(var(--tex-vision-timing))]/10'
                    : 'border-[hsl(var(--tex-vision-text-muted))] bg-[hsl(var(--tex-vision-text-muted))]/10'
              }`}
              style={{
                left: `${cursorPosition.x}%`,
                top: `${cursorPosition.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          )}

          {/* Accuracy indicator */}
          <div className="absolute top-4 right-4 text-sm">
            <span className={`font-medium ${
              currentAccuracy > 80
                ? 'text-[hsl(var(--tex-vision-success))]'
                : currentAccuracy > 50
                  ? 'text-[hsl(var(--tex-vision-timing))]'
                  : 'text-[hsl(var(--tex-vision-text-muted))]'
            }`}>
              {hasInteracted ? `${currentAccuracy}%` : '—'}
            </span>
          </div>

          {/* Completion Overlay */}
          {showCompletionOverlay && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[hsl(var(--tex-vision-primary-dark))]/95 rounded-xl z-10">
              <CheckCircle className="h-16 w-16 text-[hsl(var(--tex-vision-success))] mb-4 animate-pulse" />
              <h2 className="text-2xl font-bold text-[hsl(var(--tex-vision-text))] mb-2">
                {t('texVision.drills.complete', 'Complete!')}
              </h2>
              <p className="text-lg text-[hsl(var(--tex-vision-success))]">
                {finalAccuracy}% {t('texVision.drills.accuracy', 'Accuracy')}
              </p>
            </div>
          )}
        </div>

        {/* Trackpad Control Zone */}
        <div 
          ref={trackpadRef}
          className="relative flex-1 min-h-[150px] mt-3 rounded-xl border-2 border-dashed border-[hsl(var(--tex-vision-primary))]/50 bg-[hsl(var(--tex-vision-primary-dark))]/30 select-none"
          style={{ touchAction: 'none' }}
          onTouchStart={handleTrackpadTouchStart}
          onTouchMove={handleTrackpadTouchMove}
          onTouchEnd={handleTrackpadTouchEnd}
          onMouseMove={handleTrackpadMouseMove}
          onMouseLeave={handleTrackpadMouseLeave}
        >
          {/* Grid pattern for visual feedback */}
          <div className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(to right, hsl(var(--tex-vision-primary)) 1px, transparent 1px),
                linear-gradient(to bottom, hsl(var(--tex-vision-primary)) 1px, transparent 1px)
              `,
              backgroundSize: '20% 25%',
            }}
          />

          {/* Finger indicator dot */}
          {fingerPosition && (
            <div
              className="absolute w-5 h-5 rounded-full bg-[hsl(var(--tex-vision-primary-light))]/60 border-2 border-[hsl(var(--tex-vision-primary-light))] pointer-events-none"
              style={{
                left: `${fingerPosition.x}%`,
                top: `${fingerPosition.y}%`,
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 10px hsl(var(--tex-vision-primary-light) / 0.4)',
              }}
            />
          )}

          {/* Touch here prompt */}
          {!hasInteracted && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-sm text-[hsl(var(--tex-vision-text-muted))] animate-pulse">
                {t('texVision.drills.smoothPursuit.touchHere', 'Touch here to track')}
              </p>
            </div>
          )}

          {/* Trackpad label */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-[hsl(var(--tex-vision-text-muted))]/60 pointer-events-none">
            {t('texVision.drills.smoothPursuit.trackpad', 'Trackpad')}
          </div>
        </div>
      </div>
    </DrillContainer>
  );
}

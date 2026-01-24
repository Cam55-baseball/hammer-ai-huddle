import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { DrillContainer } from '../shared/DrillContainer';
import { DrillTimer } from '../shared/DrillTimer';
import { DrillMetricsDisplay } from '../shared/DrillMetricsDisplay';
import { Target } from 'lucide-react';
import { DrillResult } from '@/hooks/useTexVisionSession';

interface FollowTheTargetGameProps {
  tier: string;
  onComplete: (result: Omit<DrillResult, 'drillType' | 'tier'>) => void;
  onExit: () => void;
}

interface Position {
  x: number;
  y: number;
}

export default function FollowTheTargetGame({ tier, onComplete, onExit }: FollowTheTargetGameProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [targetPosition, setTargetPosition] = useState<Position>({ x: 50, y: 50 });
  const [cursorPosition, setCursorPosition] = useState<Position>({ x: 50, y: 50 });
  const [trackingScore, setTrackingScore] = useState<number[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [isTracking, setIsTracking] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const speed = tier === 'beginner' ? 0.5 : tier === 'advanced' ? 1 : 1.5;
  const patternComplexity = tier === 'beginner' ? 1 : tier === 'advanced' ? 2 : 3;

  // Countdown before tracking starts
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (!isTracking) {
      setIsTracking(true);
      setTimerStarted(true); // Start the drill timer after countdown
    }
  }, [countdown, isTracking]);

  // Generate smooth movement path
  useEffect(() => {
    if (isComplete || !isTracking) return;

    let angle = 0;
    let radiusX = 30;
    let radiusY = 20;
    
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
  }, [speed, patternComplexity, isComplete, isTracking]);

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

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || isComplete || !isTracking) return;

    if (!hasInteracted) setHasInteracted(true);
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setCursorPosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  }, [isComplete, isTracking, hasInteracted]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current || isComplete || !isTracking) return;
    
    if (!hasInteracted) setHasInteracted(true);
    
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    
    setCursorPosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  }, [isComplete, isTracking, hasInteracted]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current || isComplete || !isTracking) return;
    
    e.preventDefault(); // Prevent scrolling while tracking
    
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    
    setCursorPosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  }, [isComplete, isTracking]);

  const handleTimerTick = useCallback((seconds: number) => {
    setElapsedSeconds(seconds);
  }, []);

  const handleTimerComplete = useCallback(() => {
    if (!isComplete) {
      setIsComplete(true);
      
      const avgAccuracy = trackingScore.length > 0
        ? Math.round(trackingScore.reduce((a, b) => a + b, 0) / trackingScore.length)
        : 0;
      
      onComplete({
        accuracyPercent: avgAccuracy,
        difficultyLevel: tier === 'beginner' ? 4 : tier === 'advanced' ? 6 : 9,
        drillMetrics: {
          trackingSamples: trackingScore.length,
          duration: elapsedSeconds,
        },
      });
    }
  }, [isComplete, trackingScore, tier, elapsedSeconds, onComplete]);

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
          initialSeconds={tier === 'beginner' ? 60 : tier === 'advanced' ? 90 : 120}
          mode="countdown"
          autoStart={timerStarted}
          onTick={handleTimerTick}
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
      <div 
        ref={containerRef}
        className="relative w-full h-full min-h-[400px] cursor-none select-none"
        style={{ touchAction: 'manipulation' }}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {/* Countdown overlay */}
        {countdown > 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[hsl(var(--tex-vision-primary))]/80 z-10">
            <p className="text-6xl font-bold text-[hsl(var(--tex-vision-feedback))] animate-pulse">
              {countdown}
            </p>
            <p className="mt-4 text-lg text-[hsl(var(--tex-vision-text))]">
              {t('texVision.drills.smoothPursuit.getReady', 'Get ready to track!')}
            </p>
          </div>
        )}

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

        {/* User cursor/finger indicator */}
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

        {/* Tracking status indicator */}
        {isTracking && !hasInteracted && countdown === 0 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <p className="text-lg text-[hsl(var(--tex-vision-text))] animate-pulse">
              {t('texVision.drills.smoothPursuit.placeFingerDesktop', 'Move your cursor to the target')}
            </p>
          </div>
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
      </div>
    </DrillContainer>
  );
}

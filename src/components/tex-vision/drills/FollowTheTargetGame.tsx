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

  const speed = tier === 'beginner' ? 0.5 : tier === 'advanced' ? 1 : 1.5;
  const patternComplexity = tier === 'beginner' ? 1 : tier === 'advanced' ? 2 : 3;

  // Generate smooth movement path
  useEffect(() => {
    if (isComplete) return;

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
  }, [speed, patternComplexity, isComplete]);

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
    if (!containerRef.current || isComplete) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setCursorPosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  }, [isComplete]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current || isComplete) return;

    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    
    setCursorPosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  }, [isComplete]);

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
          autoStart={true}
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
        className="relative w-full h-full min-h-[400px] cursor-none touch-none"
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
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

        {/* User cursor/finger indicator */}
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

        {/* Instructions */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
          <p className="text-sm text-[hsl(var(--tex-vision-text-muted))]">
            {t('texVision.drills.smoothPursuit.instruction', 'Keep your cursor/finger on the moving target')}
          </p>
        </div>

        {/* Accuracy indicator */}
        <div className="absolute top-4 right-4 text-sm">
          <span className={`font-medium ${
            currentAccuracy > 80
              ? 'text-[hsl(var(--tex-vision-success))]'
              : currentAccuracy > 50
                ? 'text-[hsl(var(--tex-vision-timing))]'
                : 'text-[hsl(var(--tex-vision-text-muted))]'
          }`}>
            {currentAccuracy}%
          </span>
        </div>
      </div>
    </DrillContainer>
  );
}

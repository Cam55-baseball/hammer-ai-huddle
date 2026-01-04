import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DrillContainer } from '../shared/DrillContainer';
import { DrillTimer } from '../shared/DrillTimer';
import { DrillMetricsDisplay } from '../shared/DrillMetricsDisplay';
import { ScanEye } from 'lucide-react';
import { DrillResult } from '@/hooks/useTexVisionSession';

interface PeripheralVisionDrillProps {
  tier: string;
  onComplete: (result: Omit<DrillResult, 'drillType' | 'tier'>) => void;
  onExit: () => void;
}

type Direction = 'left' | 'right' | 'up' | 'down';

export default function PeripheralVisionDrill({ tier, onComplete, onExit }: PeripheralVisionDrillProps) {
  const { t } = useTranslation();
  const [activeDirection, setActiveDirection] = useState<Direction | null>(null);
  const [showingTarget, setShowingTarget] = useState(false);
  const [targetStartTime, setTargetStartTime] = useState(0);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [leftRightBalance, setLeftRightBalance] = useState({ left: 0, right: 0 });
  const [isComplete, setIsComplete] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const targetDuration = tier === 'beginner' ? 1500 : tier === 'advanced' ? 1000 : 700;
  const intervalMin = tier === 'beginner' ? 2000 : tier === 'advanced' ? 1500 : 1000;
  const intervalMax = tier === 'beginner' ? 4000 : tier === 'advanced' ? 3000 : 2000;
  const totalAttempts = tier === 'beginner' ? 15 : tier === 'advanced' ? 20 : 25;

  const showTarget = useCallback(() => {
    if (isComplete || attempts >= totalAttempts) return;

    const directions: Direction[] = ['left', 'right', 'up', 'down'];
    const direction = directions[Math.floor(Math.random() * directions.length)];
    
    setActiveDirection(direction);
    setShowingTarget(true);
    setTargetStartTime(Date.now());

    // Auto-hide after duration
    setTimeout(() => {
      setShowingTarget(false);
      setActiveDirection(null);
    }, targetDuration);
  }, [isComplete, attempts, totalAttempts, targetDuration]);

  useEffect(() => {
    if (isComplete || attempts >= totalAttempts) return;

    const delay = Math.random() * (intervalMax - intervalMin) + intervalMin;
    const timer = setTimeout(showTarget, delay);

    return () => clearTimeout(timer);
  }, [attempts, showTarget, isComplete, totalAttempts, intervalMin, intervalMax]);

  const handleDirectionClick = (direction: Direction) => {
    if (!showingTarget || isComplete) return;

    const reactionTime = Date.now() - targetStartTime;
    setAttempts(prev => prev + 1);

    if (direction === activeDirection) {
      setScore(prev => prev + 1);
      setReactionTimes(prev => [...prev, reactionTime]);
      setFeedback('correct');
      
      if (direction === 'left') {
        setLeftRightBalance(prev => ({ ...prev, left: prev.left + 1 }));
      } else if (direction === 'right') {
        setLeftRightBalance(prev => ({ ...prev, right: prev.right + 1 }));
      }
    } else {
      setFeedback('wrong');
    }

    setShowingTarget(false);
    setActiveDirection(null);

    setTimeout(() => setFeedback(null), 300);

    // Check completion
    if (attempts + 1 >= totalAttempts) {
      setIsComplete(true);
      const avgReaction = reactionTimes.length > 0 
        ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
        : 0;
      
      onComplete({
        accuracyPercent: Math.round((score / Math.max(attempts + 1, 1)) * 100),
        reactionTimeMs: avgReaction,
        difficultyLevel: tier === 'beginner' ? 2 : tier === 'advanced' ? 5 : 8,
        drillMetrics: {
          leftRightBalance,
          totalAttempts: attempts + 1,
        },
      });
    }
  };

  const handleTimerComplete = () => {
    if (!isComplete) {
      setIsComplete(true);
      const avgReaction = reactionTimes.length > 0 
        ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
        : 0;
      
      onComplete({
        accuracyPercent: Math.round((score / Math.max(attempts, 1)) * 100),
        reactionTimeMs: avgReaction,
        difficultyLevel: tier === 'beginner' ? 2 : tier === 'advanced' ? 5 : 8,
        drillMetrics: {
          leftRightBalance,
          totalAttempts: attempts,
        },
      });
    }
  };

  const renderTarget = (position: Direction) => {
    const isActive = showingTarget && activeDirection === position;
    const basePosition = 'absolute';
    const positions: Record<Direction, string> = {
      left: 'left-8 top-1/2 -translate-y-1/2',
      right: 'right-8 top-1/2 -translate-y-1/2',
      up: 'top-8 left-1/2 -translate-x-1/2',
      down: 'bottom-8 left-1/2 -translate-x-1/2',
    };

    return (
      <button
        onClick={() => handleDirectionClick(position)}
        className={`${basePosition} ${positions[position]} w-16 h-16 rounded-full transition-all duration-150 ${
          isActive
            ? 'bg-[hsl(var(--tex-vision-feedback))] scale-110'
            : 'bg-[hsl(var(--tex-vision-primary))]/30 hover:bg-[hsl(var(--tex-vision-primary))]/50'
        }`}
        style={{
          boxShadow: isActive ? '0 0 20px hsl(var(--tex-vision-feedback) / 0.5)' : undefined,
        }}
      />
    );
  };

  return (
    <DrillContainer
      title={t('texVision.drills.peripheralVision.title', 'Peripheral Vision')}
      description={t('texVision.drills.peripheralVision.description', 'Expand visual awareness')}
      icon={ScanEye}
      onExit={onExit}
      timer={
        <DrillTimer
          initialSeconds={tier === 'beginner' ? 90 : tier === 'advanced' ? 120 : 150}
          mode="countdown"
          autoStart={true}
          onComplete={handleTimerComplete}
        />
      }
      metrics={
        <DrillMetricsDisplay
          accuracy={Math.round((score / Math.max(attempts, 1)) * 100)}
          reactionTimeMs={reactionTimes.length > 0 ? reactionTimes[reactionTimes.length - 1] : undefined}
          streak={score}
        />
      }
    >
      <div className="relative flex items-center justify-center w-full h-full min-h-[400px]">
        {/* Center fixation point */}
        <div className="relative">
          <div 
            className={`w-6 h-6 rounded-full transition-all duration-150 ${
              feedback === 'correct'
                ? 'bg-[hsl(var(--tex-vision-success))] scale-125'
                : feedback === 'wrong'
                  ? 'bg-[hsl(var(--tex-vision-timing))] scale-75'
                  : 'bg-[hsl(var(--tex-vision-text))]'
            }`}
          />
          <p className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-[hsl(var(--tex-vision-text-muted))] whitespace-nowrap">
            {t('texVision.drills.peripheralVision.keepFocus', 'Keep focus here')}
          </p>
        </div>

        {/* Peripheral targets */}
        {renderTarget('left')}
        {renderTarget('right')}
        {renderTarget('up')}
        {renderTarget('down')}

        {/* Instructions - positioned above metrics area */}
        <div className="absolute bottom-20 left-4 right-4 text-center">
          <p className="text-sm text-[hsl(var(--tex-vision-text-muted))]">
            {t('texVision.drills.peripheralVision.instruction', 'Click the target that appears in your peripheral vision')}
          </p>
        </div>

        {/* Progress */}
        <div className="absolute top-4 left-4 text-sm text-[hsl(var(--tex-vision-text-muted))]">
          {attempts}/{totalAttempts}
        </div>
      </div>
    </DrillContainer>
  );
}

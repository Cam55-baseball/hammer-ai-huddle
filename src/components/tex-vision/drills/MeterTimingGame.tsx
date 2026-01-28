import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DrillContainer } from '../shared/DrillContainer';
import { DrillTimer } from '../shared/DrillTimer';
import { DrillMetricsDisplay } from '../shared/DrillMetricsDisplay';
import { Timer } from 'lucide-react';
import { DrillResult } from '@/hooks/useTexVisionSession';

interface MeterTimingGameProps {
  tier: string;
  onComplete: (result: Omit<DrillResult, 'drillType' | 'tier'>) => void;
  onExit: () => void;
  isPaused?: boolean;
  onPauseChange?: (paused: boolean) => void;
}

export default function MeterTimingGame({ tier, onComplete, onExit, isPaused }: MeterTimingGameProps) {
  const { t } = useTranslation();
  const [meterPosition, setMeterPosition] = useState(0); // 0-100
  const [meterDirection, setMeterDirection] = useState<1 | -1>(1);
  const [targetZone, setTargetZone] = useState({ start: 40, end: 60 });
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [feedback, setFeedback] = useState<'perfect' | 'good' | 'miss' | null>(null);
  const [lastAttemptTime, setLastAttemptTime] = useState(Date.now());

  const meterSpeed = tier === 'beginner' ? 0.8 : tier === 'advanced' ? 1.2 : 1.8;
  const targetWidth = tier === 'beginner' ? 25 : tier === 'advanced' ? 18 : 12;
  const totalAttempts = tier === 'beginner' ? 15 : tier === 'advanced' ? 20 : 25;

  // Generate new target zone
  const generateTargetZone = useCallback(() => {
    const start = 10 + Math.random() * (80 - targetWidth);
    setTargetZone({ start, end: start + targetWidth });
    setLastAttemptTime(Date.now());
  }, [targetWidth]);

  // Initialize
  useEffect(() => {
    generateTargetZone();
  }, [generateTargetZone]);

  // Animate meter - respects isPaused
  useEffect(() => {
    if (isComplete || isPaused) return;

    const interval = setInterval(() => {
      setMeterPosition(prev => {
        let next = prev + meterSpeed * meterDirection;
        
        if (next >= 100) {
          next = 100;
          setMeterDirection(-1);
        } else if (next <= 0) {
          next = 0;
          setMeterDirection(1);
        }
        
        return next;
      });
    }, 16);

    return () => clearInterval(interval);
  }, [meterSpeed, meterDirection, isComplete, isPaused]);

  const handleTap = useCallback(() => {
    if (isComplete) return;

    const reactionTime = Date.now() - lastAttemptTime;
    const inTargetZone = meterPosition >= targetZone.start && meterPosition <= targetZone.end;
    const targetCenter = (targetZone.start + targetZone.end) / 2;
    const distanceFromCenter = Math.abs(meterPosition - targetCenter);
    const isPerfect = distanceFromCenter <= targetWidth / 4;

    setAttempts(prev => prev + 1);
    setReactionTimes(prev => [...prev, reactionTime]);

    if (inTargetZone) {
      if (isPerfect) {
        setScore(prev => prev + 2);
        setFeedback('perfect');
      } else {
        setScore(prev => prev + 1);
        setFeedback('good');
      }
    } else {
      setFeedback('miss');
    }

    setTimeout(() => {
      setFeedback(null);
      if (attempts + 1 < totalAttempts) {
        generateTargetZone();
      }
    }, 300);

    // Check completion
    if (attempts + 1 >= totalAttempts) {
      setIsComplete(true);
      const avgReaction = reactionTimes.length > 0
        ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
        : 0;
      
      onComplete({
        accuracyPercent: Math.round((score / (totalAttempts * 2)) * 100),
        reactionTimeMs: avgReaction,
        difficultyLevel: tier === 'beginner' ? 5 : tier === 'advanced' ? 7 : 9,
        drillMetrics: {
          perfectHits: Math.floor(score / 2),
          goodHits: score % 2,
          totalAttempts: attempts + 1,
        },
      });
    }
  }, [meterPosition, targetZone, targetWidth, attempts, totalAttempts, isComplete, tier, score, reactionTimes, lastAttemptTime, onComplete, generateTargetZone]);

  const handleTimerComplete = useCallback(() => {
    if (!isComplete) {
      setIsComplete(true);
      const avgReaction = reactionTimes.length > 0
        ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
        : 0;
      
      onComplete({
        accuracyPercent: Math.round((score / Math.max(attempts * 2, 1)) * 100),
        reactionTimeMs: avgReaction,
        difficultyLevel: tier === 'beginner' ? 5 : tier === 'advanced' ? 7 : 9,
        drillMetrics: {
          totalAttempts: attempts,
        },
      });
    }
  }, [isComplete, score, attempts, reactionTimes, tier, onComplete]);

  return (
    <DrillContainer
      title={t('texVision.drills.meterTiming.title', 'Meter Timing')}
      description={t('texVision.drills.meterTiming.description', 'Precision timing')}
      icon={Timer}
      onExit={onExit}
      timer={
        <DrillTimer
          initialSeconds={tier === 'beginner' ? 60 : tier === 'advanced' ? 75 : 90}
          mode="countdown"
          autoStart={true}
          onComplete={handleTimerComplete}
        />
      }
      metrics={
        <DrillMetricsDisplay
          accuracy={Math.round((score / Math.max(attempts * 2, 1)) * 100)}
          streak={Math.floor(score / 2)}
        />
      }
    >
      <div 
        className="flex flex-col items-center justify-center w-full h-full min-h-[400px] cursor-pointer select-none"
        onClick={handleTap}
        onTouchStart={(e) => { e.preventDefault(); handleTap(); }}
      >
        {/* Instructions */}
        <p className="text-sm text-[hsl(var(--tex-vision-text-muted))] mb-8">
          {t('texVision.drills.meterTiming.instruction', 'Tap when the marker is in the target zone')}
        </p>

        {/* Meter container */}
        <div className="relative w-full max-w-md h-16 bg-[hsl(var(--tex-vision-primary))]/50 rounded-xl overflow-hidden">
          {/* Target zone */}
          <div
            className={`absolute top-0 bottom-0 transition-colors duration-150 ${
              feedback === 'perfect'
                ? 'bg-[hsl(var(--tex-vision-success))]/50'
                : feedback === 'good'
                  ? 'bg-[hsl(var(--tex-vision-feedback))]/40'
                  : 'bg-[hsl(var(--tex-vision-feedback))]/20'
            }`}
            style={{
              left: `${targetZone.start}%`,
              width: `${targetZone.end - targetZone.start}%`,
            }}
          >
            {/* Perfect zone indicator */}
            <div 
              className="absolute top-0 bottom-0 w-1 bg-[hsl(var(--tex-vision-success))]/50"
              style={{
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            />
          </div>

          {/* Moving marker */}
          <div
            className={`absolute top-1 bottom-1 w-2 rounded-full transition-colors duration-150 ${
              feedback === 'perfect'
                ? 'bg-[hsl(var(--tex-vision-success))]'
                : feedback === 'good'
                  ? 'bg-[hsl(var(--tex-vision-feedback))]'
                  : feedback === 'miss'
                    ? 'bg-[hsl(var(--tex-vision-timing))]'
                    : 'bg-[hsl(var(--tex-vision-text))]'
            }`}
            style={{
              left: `${meterPosition}%`,
              transform: 'translateX(-50%)',
              boxShadow: '0 0 10px hsl(var(--tex-vision-text) / 0.5)',
            }}
          />
        </div>

        {/* Feedback text */}
        <div className="h-8 mt-4 flex items-center justify-center">
          {feedback === 'perfect' && (
            <span className="text-lg font-bold text-[hsl(var(--tex-vision-success))] animate-pulse">
              {t('texVision.drills.meterTiming.perfect', 'PERFECT!')}
            </span>
          )}
          {feedback === 'good' && (
            <span className="text-lg font-medium text-[hsl(var(--tex-vision-feedback))]">
              {t('texVision.drills.meterTiming.good', 'Good!')}
            </span>
          )}
          {feedback === 'miss' && (
            <span className="text-lg text-[hsl(var(--tex-vision-timing))]">
              {t('texVision.drills.meterTiming.miss', 'Miss')}
            </span>
          )}
        </div>

        {/* Score display */}
        <div className="mt-8 text-center">
          <div className="text-3xl font-bold text-[hsl(var(--tex-vision-text))]">{score}</div>
          <div className="text-sm text-[hsl(var(--tex-vision-text-muted))]">
            {t('texVision.drills.meterTiming.points', 'Points')}
          </div>
        </div>

        {/* Progress */}
        <div className="absolute top-4 left-4 text-sm text-[hsl(var(--tex-vision-text-muted))]">
          {attempts}/{totalAttempts}
        </div>
      </div>
    </DrillContainer>
  );
}

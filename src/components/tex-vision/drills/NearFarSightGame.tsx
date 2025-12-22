import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DrillContainer } from '../shared/DrillContainer';
import { DrillTimer } from '../shared/DrillTimer';
import { DrillMetricsDisplay } from '../shared/DrillMetricsDisplay';
import { Glasses } from 'lucide-react';
import { DrillResult } from '@/hooks/useTexVisionSession';

interface NearFarSightGameProps {
  tier: string;
  onComplete: (result: Omit<DrillResult, 'drillType' | 'tier'>) => void;
  onExit: () => void;
}

type FocusDistance = 'near' | 'mid' | 'far';

export default function NearFarSightGame({ tier, onComplete, onExit }: NearFarSightGameProps) {
  const { t } = useTranslation();
  const [currentFocus, setCurrentFocus] = useState<FocusDistance>('near');
  const [targetFocus, setTargetFocus] = useState<FocusDistance>('near');
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [showTarget, setShowTarget] = useState(true);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [targetShowTime, setTargetShowTime] = useState(Date.now());
  const [isComplete, setIsComplete] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const totalAttempts = tier === 'beginner' ? 15 : tier === 'advanced' ? 20 : 25;
  const displayDuration = tier === 'beginner' ? 2500 : tier === 'advanced' ? 2000 : 1500;

  const generateNewTarget = useCallback(() => {
    const distances: FocusDistance[] = ['near', 'mid', 'far'];
    const newTarget = distances[Math.floor(Math.random() * distances.length)];
    setTargetFocus(newTarget);
    setShowTarget(true);
    setTargetShowTime(Date.now());

    // Auto-hide after duration
    setTimeout(() => {
      if (!isComplete) {
        setShowTarget(false);
        setAttempts(prev => {
          const next = prev + 1;
          if (next >= totalAttempts) {
            setIsComplete(true);
          }
          return next;
        });
        // Generate new target after brief pause
        setTimeout(() => generateNewTarget(), 500);
      }
    }, displayDuration);
  }, [displayDuration, isComplete, totalAttempts]);

  useEffect(() => {
    generateNewTarget();
    return () => {};
  }, []);

  const handleFocusClick = (distance: FocusDistance) => {
    if (!showTarget || isComplete) return;

    const reactionTime = Date.now() - targetShowTime;
    setCurrentFocus(distance);

    if (distance === targetFocus) {
      setScore(prev => prev + 1);
      setReactionTimes(prev => [...prev, reactionTime]);
      setFeedback('correct');
    } else {
      setFeedback('wrong');
    }

    setShowTarget(false);
    setAttempts(prev => {
      const next = prev + 1;
      if (next >= totalAttempts) {
        setIsComplete(true);
        const avgReaction = reactionTimes.length > 0 
          ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
          : 0;
        
        onComplete({
          accuracyPercent: Math.round((score / Math.max(next, 1)) * 100),
          reactionTimeMs: avgReaction,
          difficultyLevel: tier === 'beginner' ? 4 : tier === 'advanced' ? 6 : 9,
          drillMetrics: {
            totalAttempts: next,
            avgReactionTime: avgReaction,
          },
        });
      }
      return next;
    });

    setTimeout(() => setFeedback(null), 300);

    if (!isComplete && attempts + 1 < totalAttempts) {
      setTimeout(() => generateNewTarget(), 500);
    }
  };

  const handleTimerComplete = useCallback(() => {
    if (!isComplete) {
      setIsComplete(true);
      const avgReaction = reactionTimes.length > 0 
        ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
        : 0;
      
      onComplete({
        accuracyPercent: Math.round((score / Math.max(attempts, 1)) * 100),
        reactionTimeMs: avgReaction,
        difficultyLevel: tier === 'beginner' ? 4 : tier === 'advanced' ? 6 : 9,
        drillMetrics: {
          totalAttempts: attempts,
        },
      });
    }
  }, [isComplete, score, attempts, reactionTimes, tier, onComplete]);

  const getDistanceStyles = (distance: FocusDistance) => {
    const isTarget = showTarget && targetFocus === distance;
    const isSelected = currentFocus === distance;
    
    const sizeMap = {
      near: 'w-24 h-24',
      mid: 'w-16 h-16',
      far: 'w-10 h-10',
    };

    const opacityMap = {
      near: isTarget ? 'opacity-100' : 'opacity-40',
      mid: isTarget ? 'opacity-100' : 'opacity-50',
      far: isTarget ? 'opacity-100' : 'opacity-60',
    };

    return {
      size: sizeMap[distance],
      opacity: opacityMap[distance],
      glow: isTarget,
      selected: isSelected && feedback === 'correct',
    };
  };

  return (
    <DrillContainer
      title={t('texVision.drills.nearFar.title', 'Near-Far Sight')}
      description={t('texVision.drills.nearFar.description', 'Rapid depth switching')}
      icon={Glasses}
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
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[400px]">
        {/* Depth visualization */}
        <div className="relative h-80 w-80 flex items-center justify-center perspective-1000">
          {/* Far target */}
          <button
            onClick={() => handleFocusClick('far')}
            className={`absolute transition-all duration-150 rounded-full ${getDistanceStyles('far').size} ${getDistanceStyles('far').opacity} ${
              getDistanceStyles('far').glow 
                ? 'bg-[hsl(var(--tex-vision-feedback))]' 
                : 'bg-[hsl(var(--tex-vision-primary-light))]/30'
            } ${getDistanceStyles('far').selected ? 'ring-4 ring-[hsl(var(--tex-vision-success))]' : ''}`}
            style={{
              transform: 'translateZ(-100px) scale(0.6)',
              boxShadow: getDistanceStyles('far').glow ? '0 0 30px hsl(var(--tex-vision-feedback) / 0.6)' : undefined,
            }}
          >
            <span className="text-xs text-[hsl(var(--tex-vision-text))]">
              {t('texVision.drills.nearFar.far', 'Far')}
            </span>
          </button>

          {/* Mid target */}
          <button
            onClick={() => handleFocusClick('mid')}
            className={`absolute transition-all duration-150 rounded-full ${getDistanceStyles('mid').size} ${getDistanceStyles('mid').opacity} ${
              getDistanceStyles('mid').glow 
                ? 'bg-[hsl(var(--tex-vision-feedback))]' 
                : 'bg-[hsl(var(--tex-vision-primary-light))]/40'
            } ${getDistanceStyles('mid').selected ? 'ring-4 ring-[hsl(var(--tex-vision-success))]' : ''}`}
            style={{
              boxShadow: getDistanceStyles('mid').glow ? '0 0 25px hsl(var(--tex-vision-feedback) / 0.5)' : undefined,
            }}
          >
            <span className="text-sm text-[hsl(var(--tex-vision-text))]">
              {t('texVision.drills.nearFar.mid', 'Mid')}
            </span>
          </button>

          {/* Near target */}
          <button
            onClick={() => handleFocusClick('near')}
            className={`absolute transition-all duration-150 rounded-full ${getDistanceStyles('near').size} ${getDistanceStyles('near').opacity} ${
              getDistanceStyles('near').glow 
                ? 'bg-[hsl(var(--tex-vision-feedback))]' 
                : 'bg-[hsl(var(--tex-vision-primary-light))]/50'
            } ${getDistanceStyles('near').selected ? 'ring-4 ring-[hsl(var(--tex-vision-success))]' : ''}`}
            style={{
              transform: 'translateZ(50px) scale(1.2)',
              boxShadow: getDistanceStyles('near').glow ? '0 0 35px hsl(var(--tex-vision-feedback) / 0.7)' : undefined,
            }}
          >
            <span className="text-base font-medium text-[hsl(var(--tex-vision-text))]">
              {t('texVision.drills.nearFar.near', 'Near')}
            </span>
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-4 text-center">
          <p className="text-sm text-[hsl(var(--tex-vision-text-muted))]">
            {t('texVision.drills.nearFar.instruction', 'Click the glowing target at the correct depth')}
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

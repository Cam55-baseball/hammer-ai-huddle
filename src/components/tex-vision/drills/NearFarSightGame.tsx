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
    const isSelected = currentFocus === distance && feedback === 'correct';
    
    return {
      glow: isTarget,
      selected: isSelected,
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
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[350px]">
        {/* Progress indicator - top left */}
        <div className="absolute top-4 left-4 text-sm text-[hsl(var(--tex-vision-text-muted))]">
          {attempts}/{totalAttempts}
        </div>

        {/* Depth visualization - vertically stacked for clear separation */}
        <div 
          className="relative w-full max-w-xs h-72 flex flex-col items-center justify-between py-4"
          style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
        >
          {/* Depth labels - positioned outside tap zones */}
          <span className="absolute -left-8 top-4 text-xs text-[hsl(var(--tex-vision-text-muted))] font-medium">FAR</span>
          <span className="absolute -left-8 top-1/2 -translate-y-1/2 text-xs text-[hsl(var(--tex-vision-text-muted))] font-medium">MID</span>
          <span className="absolute -left-8 bottom-4 text-xs text-[hsl(var(--tex-vision-text-muted))] font-medium">NEAR</span>

          {/* Far target - top, smallest */}
          <button
            onClick={() => handleFocusClick('far')}
            aria-label="Far target"
            className={`transition-all duration-150 rounded-full flex items-center justify-center ${
              getDistanceStyles('far').glow 
                ? 'bg-[hsl(var(--tex-vision-feedback))] animate-pulse' 
                : 'bg-[hsl(var(--tex-vision-primary-light))]/30'
            } ${getDistanceStyles('far').selected ? 'ring-4 ring-[hsl(var(--tex-vision-success))]' : ''}`}
            style={{
              width: '2.5rem',
              height: '2.5rem',
              opacity: getDistanceStyles('far').glow ? 1 : 0.5,
              boxShadow: getDistanceStyles('far').glow ? '0 0 30px hsl(var(--tex-vision-feedback) / 0.6)' : undefined,
            }}
          />

          {/* Mid target - center, medium */}
          <button
            onClick={() => handleFocusClick('mid')}
            aria-label="Mid target"
            className={`transition-all duration-150 rounded-full flex items-center justify-center ${
              getDistanceStyles('mid').glow 
                ? 'bg-[hsl(var(--tex-vision-feedback))] animate-pulse' 
                : 'bg-[hsl(var(--tex-vision-primary-light))]/40'
            } ${getDistanceStyles('mid').selected ? 'ring-4 ring-[hsl(var(--tex-vision-success))]' : ''}`}
            style={{
              width: '4rem',
              height: '4rem',
              opacity: getDistanceStyles('mid').glow ? 1 : 0.6,
              boxShadow: getDistanceStyles('mid').glow ? '0 0 25px hsl(var(--tex-vision-feedback) / 0.5)' : undefined,
            }}
          />

          {/* Near target - bottom, largest */}
          <button
            onClick={() => handleFocusClick('near')}
            aria-label="Near target"
            className={`transition-all duration-150 rounded-full flex items-center justify-center ${
              getDistanceStyles('near').glow 
                ? 'bg-[hsl(var(--tex-vision-feedback))] animate-pulse' 
                : 'bg-[hsl(var(--tex-vision-primary-light))]/50'
            } ${getDistanceStyles('near').selected ? 'ring-4 ring-[hsl(var(--tex-vision-success))]' : ''}`}
            style={{
              width: '6rem',
              height: '6rem',
              opacity: getDistanceStyles('near').glow ? 1 : 0.7,
              boxShadow: getDistanceStyles('near').glow ? '0 0 35px hsl(var(--tex-vision-feedback) / 0.7)' : undefined,
            }}
          />
        </div>

        {/* Instructions - below game area, not overlapping */}
        <p className="mt-4 text-sm text-[hsl(var(--tex-vision-text-muted))] text-center">
          {t('texVision.drills.nearFar.instruction', 'Tap the glowing target')}
        </p>
      </div>
    </DrillContainer>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { DrillContainer } from '../shared/DrillContainer';
import { DrillTimer } from '../shared/DrillTimer';
import { DrillMetricsDisplay } from '../shared/DrillMetricsDisplay';
import { Glasses, CheckCircle } from 'lucide-react';
import { DrillResult } from '@/hooks/useTexVisionSession';

interface NearFarSightGameProps {
  tier: string;
  onComplete: (result: Omit<DrillResult, 'drillType' | 'tier'>) => void;
  onExit: () => void;
  isPaused?: boolean;
  onPauseChange?: (paused: boolean) => void;
}

type FocusDistance = 'near' | 'mid' | 'far';

export default function NearFarSightGame({ tier, onComplete, onExit, isPaused }: NearFarSightGameProps) {
  const { t } = useTranslation();
  const [currentFocus, setCurrentFocus] = useState<FocusDistance>('near');
  const [targetFocus, setTargetFocus] = useState<FocusDistance>('near');
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [showTarget, setShowTarget] = useState(true);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [targetShowTime, setTargetShowTime] = useState(Date.now());
  const [isComplete, setIsComplete] = useState(false);
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  // Refs for stable timeout management
  const autoHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const nextTargetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scoreRef = useRef(0);
  const attemptsRef = useRef(0);
  const reactionTimesRef = useRef<number[]>([]);

  const totalAttempts = tier === 'beginner' ? 15 : tier === 'advanced' ? 20 : 25;
  const displayDuration = tier === 'beginner' ? 2500 : tier === 'advanced' ? 2000 : 1500;

  // Keep refs in sync
  useEffect(() => {
    scoreRef.current = score;
    attemptsRef.current = attempts;
    reactionTimesRef.current = reactionTimes;
  }, [score, attempts, reactionTimes]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (autoHideTimeoutRef.current) clearTimeout(autoHideTimeoutRef.current);
      if (nextTargetTimeoutRef.current) clearTimeout(nextTargetTimeoutRef.current);
    };
  }, []);

  const generateNewTarget = useCallback(() => {
    if (isComplete || isPaused) return;

    // Clear any existing timeouts
    if (autoHideTimeoutRef.current) clearTimeout(autoHideTimeoutRef.current);

    const distances: FocusDistance[] = ['near', 'mid', 'far'];
    const newTarget = distances[Math.floor(Math.random() * distances.length)];
    setTargetFocus(newTarget);
    setShowTarget(true);
    setTargetShowTime(Date.now());

    // Auto-hide after duration (only if not paused)
    autoHideTimeoutRef.current = setTimeout(() => {
      if (isComplete) return;
      
      setShowTarget(false);
      setAttempts(prev => {
        const next = prev + 1;
        if (next >= totalAttempts) {
          setIsComplete(true);
        }
        return next;
      });
      
      // Generate new target after brief pause
      nextTargetTimeoutRef.current = setTimeout(() => generateNewTarget(), 500);
    }, displayDuration);
  }, [displayDuration, isComplete, isPaused, totalAttempts]);

  useEffect(() => {
    generateNewTarget();
  }, []);

  const handleFocusClick = (distance: FocusDistance) => {
    if (!showTarget || isComplete) return;

    // Cancel the auto-hide timeout since user responded
    if (autoHideTimeoutRef.current) {
      clearTimeout(autoHideTimeoutRef.current);
      autoHideTimeoutRef.current = null;
    }
    if (nextTargetTimeoutRef.current) {
      clearTimeout(nextTargetTimeoutRef.current);
      nextTargetTimeoutRef.current = null;
    }

    const reactionTime = Date.now() - targetShowTime;
    setCurrentFocus(distance);

    const isCorrect = distance === targetFocus;
    if (isCorrect) {
      setScore(prev => prev + 1);
      setReactionTimes(prev => [...prev, reactionTime]);
      setFeedback('correct');
    } else {
      setFeedback('wrong');
    }

    setShowTarget(false);
    
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    setTimeout(() => setFeedback(null), 300);

    if (nextAttempts >= totalAttempts) {
      // Complete - show overlay then transition
      setIsComplete(true);
      setShowCompletionOverlay(true);
      
      const finalScore = isCorrect ? score + 1 : score;
      const finalReactionTimes = isCorrect ? [...reactionTimes, reactionTime] : reactionTimes;
      const avgReaction = finalReactionTimes.length > 0 
        ? Math.round(finalReactionTimes.reduce((a, b) => a + b, 0) / finalReactionTimes.length)
        : 0;
      
      setTimeout(() => {
        onComplete({
          accuracyPercent: Math.round((finalScore / nextAttempts) * 100),
          reactionTimeMs: avgReaction,
          difficultyLevel: tier === 'beginner' ? 4 : tier === 'advanced' ? 6 : 9,
          drillMetrics: {
            totalAttempts: nextAttempts,
            avgReactionTime: avgReaction,
          },
        });
      }, 1500);
    } else {
      // Generate next target after brief pause
      nextTargetTimeoutRef.current = setTimeout(() => generateNewTarget(), 500);
    }
  };

  const handleTimerComplete = useCallback(() => {
    if (isComplete) return;
    
    // Clear any pending timeouts
    if (autoHideTimeoutRef.current) clearTimeout(autoHideTimeoutRef.current);
    if (nextTargetTimeoutRef.current) clearTimeout(nextTargetTimeoutRef.current);
    
    setIsComplete(true);
    setShowCompletionOverlay(true);
    
    const currentScore = scoreRef.current;
    const currentAttempts = attemptsRef.current;
    const currentReactionTimes = reactionTimesRef.current;
    
    const avgReaction = currentReactionTimes.length > 0 
      ? Math.round(currentReactionTimes.reduce((a, b) => a + b, 0) / currentReactionTimes.length)
      : 0;
    
    setTimeout(() => {
      onComplete({
        accuracyPercent: Math.round((currentScore / Math.max(currentAttempts, 1)) * 100),
        reactionTimeMs: avgReaction,
        difficultyLevel: tier === 'beginner' ? 4 : tier === 'advanced' ? 6 : 9,
        drillMetrics: {
          totalAttempts: currentAttempts,
        },
      });
    }, 1500);
  }, [isComplete, tier, onComplete]);

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

        {/* Completion Overlay */}
        {showCompletionOverlay && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[hsl(var(--tex-vision-primary-dark))]/95 rounded-xl z-10">
            <CheckCircle className="h-16 w-16 text-[hsl(var(--tex-vision-success))] mb-4 animate-pulse" />
            <h2 className="text-2xl font-bold text-[hsl(var(--tex-vision-text))] mb-2">
              {t('texVision.drills.complete', 'Complete!')}
            </h2>
            <p className="text-lg text-[hsl(var(--tex-vision-success))]">
              {Math.round((score / Math.max(attempts, 1)) * 100)}% {t('texVision.drills.accuracy', 'Accuracy')}
            </p>
          </div>
        )}
      </div>
    </DrillContainer>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { DrillContainer } from '../shared/DrillContainer';
import { DrillTimer } from '../shared/DrillTimer';
import { DrillMetricsDisplay } from '../shared/DrillMetricsDisplay';
import { Layers } from 'lucide-react';
import { DrillResult } from '@/hooks/useTexVisionSession';

interface MultiTargetTrackGameProps {
  tier: string;
  onComplete: (result: Omit<DrillResult, 'drillType' | 'tier'>) => void;
  onExit: () => void;
}

interface Target {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isTarget: boolean;
}

interface RoundFeedback {
  show: boolean;
  correct: number;
  total: number;
}

export default function MultiTargetTrackGame({ tier, onComplete, onExit }: MultiTargetTrackGameProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'memorize' | 'track' | 'slowdown' | 'select'>('memorize');
  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [memorizeCountdown, setMemorizeCountdown] = useState(3);
  const [slowdownProgress, setSlowdownProgress] = useState(0);
  const [roundFeedback, setRoundFeedback] = useState<RoundFeedback | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const velocityMultiplier = useRef(1);

  const totalRounds = tier === 'beginner' ? 5 : tier === 'advanced' ? 8 : 12;
  const targetCount = tier === 'beginner' ? 2 : tier === 'advanced' ? 3 : 4;
  const totalDots = tier === 'beginner' ? 6 : tier === 'advanced' ? 8 : 10;
  const trackDuration = tier === 'beginner' ? 4000 : tier === 'advanced' ? 5000 : 6000;
  
  // Progressive slowdown duration for smoother, more cinematic deceleration
  const slowdownDuration = tier === 'beginner' ? 1200 : tier === 'advanced' ? 1500 : 2000;

  const initializeRound = useCallback(() => {
    const newTargets: Target[] = [];
    const containerWidth = containerRef.current?.clientWidth || 300;
    const containerHeight = containerRef.current?.clientHeight || 300;
    const padding = 30;

    // Speed increases by 5% per round for progressive difficulty
    const speedBonus = 1 + (round - 1) * 0.05;
    const baseSpeed = tier === 'beginner' ? 3 : tier === 'advanced' ? 4 : 5;

    for (let i = 0; i < totalDots; i++) {
      newTargets.push({
        id: i,
        x: padding + Math.random() * (containerWidth - padding * 2),
        y: padding + Math.random() * (containerHeight - padding * 2),
        vx: (Math.random() - 0.5) * baseSpeed * speedBonus,
        vy: (Math.random() - 0.5) * baseSpeed * speedBonus,
        isTarget: i < targetCount,
      });
    }

    setTargets(newTargets);
    setSelectedIds(new Set());
    setPhase('memorize');
    setMemorizeCountdown(3);
    setSlowdownProgress(0);
    velocityMultiplier.current = 1;
  }, [totalDots, targetCount, tier, round]);

  // Initialize first round
  useEffect(() => {
    initializeRound();
  }, [initializeRound]);

  // Memorize countdown
  useEffect(() => {
    if (phase !== 'memorize') return;

    if (memorizeCountdown > 0) {
      const timer = setTimeout(() => setMemorizeCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setPhase('track');
      velocityMultiplier.current = 1;
      // Start tracking phase timer, then transition to slowdown
      setTimeout(() => {
        setPhase('slowdown');
        setSlowdownProgress(0);
      }, trackDuration);
    }
  }, [phase, memorizeCountdown, trackDuration]);

  // Slowdown phase - use cubic ease-out for smooth deceleration
  useEffect(() => {
    if (phase !== 'slowdown') return;

    const startTime = Date.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    
    const slowdownInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / slowdownDuration, 1);
      setSlowdownProgress(progress);
      // Apply cubic ease-out for smooth deceleration
      velocityMultiplier.current = 1 - easeOutCubic(progress);

      if (progress >= 1) {
        clearInterval(slowdownInterval);
        setPhase('select');
      }
    }, 16);

    return () => clearInterval(slowdownInterval);
  }, [phase, slowdownDuration]);

  // Animation loop for tracking and slowdown phases
  useEffect(() => {
    if (phase !== 'track' && phase !== 'slowdown') {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const containerWidth = containerRef.current?.clientWidth || 300;
    const containerHeight = containerRef.current?.clientHeight || 300;
    const padding = 20;

    const animate = () => {
      setTargets(prev => prev.map(target => {
        let { x, y, vx, vy } = target;
        
        // Apply velocity multiplier for slowdown effect
        const currentMultiplier = velocityMultiplier.current;
        x += vx * currentMultiplier;
        y += vy * currentMultiplier;

        // Bounce off walls
        if (x < padding || x > containerWidth - padding) {
          vx = -vx;
          x = Math.max(padding, Math.min(containerWidth - padding, x));
        }
        if (y < padding || y > containerHeight - padding) {
          vy = -vy;
          y = Math.max(padding, Math.min(containerHeight - padding, y));
        }

        return { ...target, x, y, vx, vy };
      }));

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [phase]);

  const handleDotClick = useCallback((id: number) => {
    if (phase !== 'select') return;

    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else if (newSet.size < targetCount) {
        newSet.add(id);
      }
      return newSet;
    });
  }, [phase, targetCount]);

  const handleSubmit = useCallback(() => {
    // Calculate score for this round
    let correct = 0;
    selectedIds.forEach(id => {
      if (targets.find(t => t.id === id)?.isTarget) {
        correct++;
      }
    });
    
    setScore(prev => prev + correct);

    // Show round feedback for 1.5 seconds before proceeding
    setRoundFeedback({ show: true, correct, total: targetCount });
    
    setTimeout(() => {
      setRoundFeedback(null);
      
      if (round >= totalRounds) {
        setIsComplete(true);
      } else {
        setRound(prev => prev + 1);
      }
    }, 1500);
  }, [selectedIds, targets, round, totalRounds, targetCount]);

  // Re-initialize when round changes (after feedback)
  useEffect(() => {
    if (round > 1 && !roundFeedback && !isComplete) {
      initializeRound();
    }
  }, [round, roundFeedback, isComplete, initializeRound]);

  // Completion effect
  useEffect(() => {
    if (isComplete) {
      const maxScore = totalRounds * targetCount;
      onComplete({
        accuracyPercent: Math.round((score / maxScore) * 100),
        difficultyLevel: tier === 'beginner' ? 4 : tier === 'advanced' ? 7 : 10,
        drillMetrics: {
          correctIdentifications: score,
          totalTargets: maxScore,
          rounds: totalRounds,
        },
      });
    }
  }, [isComplete, score, totalRounds, targetCount, tier, onComplete]);

  const handleTimerComplete = useCallback(() => {
    if (!isComplete) {
      setIsComplete(true);
    }
  }, [isComplete]);

  // Calculate current speed percentage for display
  const currentSpeedPercent = Math.round(100 + (round - 1) * 5);

  return (
    <DrillContainer
      title={t('texVision.drills.multiTargetTrack.title', 'Multi-Target Track')}
      description={t('texVision.drills.multiTargetTrack.description', 'Track multiple moving targets')}
      icon={Layers}
      onExit={onExit}
      timer={
        <DrillTimer
          initialSeconds={tier === 'beginner' ? 90 : tier === 'advanced' ? 120 : 180}
          mode="countdown"
          autoStart={true}
          onComplete={handleTimerComplete}
        />
      }
      metrics={
        <DrillMetricsDisplay
          accuracy={round > 1 ? Math.round((score / ((round - 1) * targetCount)) * 100) : undefined}
          difficulty={tier === 'beginner' ? 4 : tier === 'advanced' ? 7 : 10}
          streak={score}
        />
      }
    >
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[380px]">
        {/* Round progress - top left, outside game area */}
        <div className="absolute top-4 left-4 text-sm text-[hsl(var(--tex-vision-text-muted))]">
          {t('texVision.drills.round', 'Round')} {round}/{totalRounds}
        </div>

        {/* Speed indicator - top right, shows progressive difficulty */}
        <div className="absolute top-4 right-4 text-xs text-[hsl(var(--tex-vision-text-muted))]">
          Speed: {currentSpeedPercent}%
        </div>

        {/* Phase indicator - above tracking area, fixed height */}
        <div className="h-8 mb-3 text-center flex items-center justify-center">
          {phase === 'memorize' && (
            <p className="text-lg text-[hsl(var(--tex-vision-feedback))] font-bold">
              {t('texVision.drills.multiTargetTrack.memorize', 'MEMORIZE!')} ({memorizeCountdown})
            </p>
          )}
          {phase === 'track' && (
            <p className="text-lg text-[hsl(var(--tex-vision-timing))] font-bold animate-pulse">
              {t('texVision.drills.multiTargetTrack.tracking', 'Keep tracking...')}
            </p>
          )}
          {phase === 'slowdown' && (
            <p className="text-lg text-[hsl(var(--tex-vision-text))] font-bold">
              {t('texVision.drills.multiTargetTrack.slowdown', 'Get ready...')}
            </p>
          )}
          {phase === 'select' && (
            <p className="text-lg text-[hsl(var(--tex-vision-success))] font-bold">
              {t('texVision.drills.multiTargetTrack.select', 'Select!')} ({selectedIds.size}/{targetCount})
            </p>
          )}
        </div>

        {/* Tracking area - larger for better gameplay */}
        <div 
          ref={containerRef}
          className="relative w-full h-72 bg-[hsl(var(--tex-vision-primary))]/20 rounded-xl overflow-hidden border border-[hsl(var(--tex-vision-primary))]/30"
        >
          {/* Round feedback overlay */}
          {roundFeedback?.show && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[hsl(var(--tex-vision-primary))]/90 z-20 animate-fade-in rounded-xl">
              <p className={`text-3xl font-bold mb-2 ${
                roundFeedback.correct === roundFeedback.total 
                  ? 'text-[hsl(var(--tex-vision-success))]' 
                  : roundFeedback.correct > 0 
                    ? 'text-[hsl(var(--tex-vision-feedback))]'
                    : 'text-[hsl(var(--tex-vision-text-muted))]'
              }`}>
                {roundFeedback.correct === roundFeedback.total 
                  ? '🎯 PERFECT!' 
                  : roundFeedback.correct > 0 
                    ? '👍 NICE TRY!' 
                    : '💪 KEEP GOING!'}
              </p>
              <p className="text-lg text-[hsl(var(--tex-vision-text))]">
                {roundFeedback.correct}/{roundFeedback.total} correct
              </p>
            </div>
          )}

          {targets.map((target) => (
            <button
              key={target.id}
              onClick={() => handleDotClick(target.id)}
              disabled={phase !== 'select'}
              className={`absolute w-7 h-7 rounded-full transition-colors transition-transform duration-100 ${
                phase === 'memorize' && target.isTarget
                  ? 'bg-[hsl(var(--tex-vision-feedback))] scale-125 shadow-lg shadow-[hsl(var(--tex-vision-feedback))]/50'
                  : selectedIds.has(target.id)
                  ? 'bg-[hsl(var(--tex-vision-success))] ring-2 ring-white scale-110'
                  : phase === 'select'
                  ? 'bg-[hsl(var(--tex-vision-text-muted))] hover:bg-[hsl(var(--tex-vision-primary-light))] cursor-pointer'
                  : 'bg-[hsl(var(--tex-vision-text-muted))]'
              }`}
              style={{
                left: target.x - 14,
                top: target.y - 14,
              }}
            />
          ))}
        </div>

        {/* Submit button and score - below tracking area */}
        <div className="mt-4 flex flex-col items-center gap-2">
          {phase === 'select' && selectedIds.size === targetCount && !roundFeedback && (
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-[hsl(var(--tex-vision-feedback))] text-[hsl(var(--tex-vision-primary-dark))] font-bold rounded-lg hover:scale-105 transition-transform"
            >
              {t('texVision.drills.multiTargetTrack.submit', 'Submit')}
            </button>
          )}
          <p className="text-lg font-bold text-[hsl(var(--tex-vision-text))]">
            {t('texVision.drills.score', 'Score')}: {score}
          </p>
        </div>
      </div>
    </DrillContainer>
  );
}

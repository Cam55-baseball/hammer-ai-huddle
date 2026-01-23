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

export default function MultiTargetTrackGame({ tier, onComplete, onExit }: MultiTargetTrackGameProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'memorize' | 'track' | 'select'>('memorize');
  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [memorizeCountdown, setMemorizeCountdown] = useState(3);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  const totalRounds = tier === 'beginner' ? 5 : tier === 'advanced' ? 8 : 12;
  const targetCount = tier === 'beginner' ? 2 : tier === 'advanced' ? 3 : 4;
  const totalDots = tier === 'beginner' ? 6 : tier === 'advanced' ? 8 : 10;
  const trackDuration = tier === 'beginner' ? 4000 : tier === 'advanced' ? 5000 : 6000;

  const initializeRound = useCallback(() => {
    const newTargets: Target[] = [];
    const containerWidth = containerRef.current?.clientWidth || 300;
    const containerHeight = containerRef.current?.clientHeight || 300;
    const padding = 30;

    for (let i = 0; i < totalDots; i++) {
      newTargets.push({
        id: i,
        x: padding + Math.random() * (containerWidth - padding * 2),
        y: padding + Math.random() * (containerHeight - padding * 2),
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        isTarget: i < targetCount,
      });
    }

    setTargets(newTargets);
    setSelectedIds(new Set());
    setPhase('memorize');
    setMemorizeCountdown(3);
  }, [totalDots, targetCount]);

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
      // Start tracking phase timer
      setTimeout(() => setPhase('select'), trackDuration);
    }
  }, [phase, memorizeCountdown, trackDuration]);

  // Animation loop for tracking phase
  useEffect(() => {
    if (phase !== 'track') {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const containerWidth = containerRef.current?.clientWidth || 300;
    const containerHeight = containerRef.current?.clientHeight || 300;
    const padding = 20;

    const animate = () => {
      setTargets(prev => prev.map(target => {
        let { x, y, vx, vy } = target;
        
        x += vx;
        y += vy;

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

    if (round >= totalRounds) {
      setIsComplete(true);
    } else {
      setRound(prev => prev + 1);
      initializeRound();
    }
  }, [selectedIds, targets, round, totalRounds, initializeRound]);

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
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[400px] relative">
        {/* Phase indicator */}
        <div className="absolute top-4 text-center">
          {phase === 'memorize' && (
            <p className="text-lg text-[hsl(var(--tex-vision-feedback))] font-bold">
              {t('texVision.drills.multiTargetTrack.memorize', 'MEMORIZE the highlighted dots!')} ({memorizeCountdown})
            </p>
          )}
          {phase === 'track' && (
            <p className="text-lg text-[hsl(var(--tex-vision-timing))] font-bold animate-pulse">
              {t('texVision.drills.multiTargetTrack.tracking', 'Keep tracking...')}
            </p>
          )}
          {phase === 'select' && (
            <p className="text-lg text-[hsl(var(--tex-vision-success))] font-bold">
              {t('texVision.drills.multiTargetTrack.select', 'Select the targets!')} ({selectedIds.size}/{targetCount})
            </p>
          )}
        </div>

        {/* Tracking area */}
        <div 
          ref={containerRef}
          className="relative w-full h-64 bg-[hsl(var(--tex-vision-primary))]/20 rounded-xl overflow-hidden"
        >
          {targets.map((target) => (
            <div
              key={target.id}
              onClick={() => handleDotClick(target.id)}
              className={`absolute w-6 h-6 rounded-full transition-all duration-100 cursor-pointer ${
                phase === 'memorize' && target.isTarget
                  ? 'bg-[hsl(var(--tex-vision-feedback))] scale-125 shadow-lg shadow-[hsl(var(--tex-vision-feedback))]/50'
                  : selectedIds.has(target.id)
                  ? 'bg-[hsl(var(--tex-vision-success))] ring-2 ring-white'
                  : 'bg-[hsl(var(--tex-vision-text-muted))]'
              }`}
              style={{
                left: target.x - 12,
                top: target.y - 12,
              }}
            />
          ))}
        </div>

        {/* Submit button for select phase */}
        {phase === 'select' && selectedIds.size === targetCount && (
          <button
            onClick={handleSubmit}
            className="mt-4 px-6 py-2 bg-[hsl(var(--tex-vision-feedback))] text-[hsl(var(--tex-vision-primary-dark))] font-bold rounded-lg hover:scale-105 transition-transform"
          >
            {t('texVision.drills.multiTargetTrack.submit', 'Submit')}
          </button>
        )}

        {/* Round progress */}
        <div className="absolute top-4 left-4 text-sm text-[hsl(var(--tex-vision-text-muted))]">
          {t('texVision.drills.round', 'Round')} {round}/{totalRounds}
        </div>

        {/* Score */}
        <div className="absolute bottom-4 text-center">
          <p className="text-lg font-bold text-[hsl(var(--tex-vision-text))]">
            {t('texVision.drills.score', 'Score')}: {score}
          </p>
        </div>
      </div>
    </DrillContainer>
  );
}

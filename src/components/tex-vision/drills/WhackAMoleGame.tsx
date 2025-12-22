import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DrillContainer } from '../shared/DrillContainer';
import { DrillTimer } from '../shared/DrillTimer';
import { DrillMetricsDisplay } from '../shared/DrillMetricsDisplay';
import { Gamepad2, Check, X } from 'lucide-react';
import { DrillResult } from '@/hooks/useTexVisionSession';

interface WhackAMoleGameProps {
  tier: string;
  onComplete: (result: Omit<DrillResult, 'drillType' | 'tier'>) => void;
  onExit: () => void;
}

interface MoleState {
  id: number;
  isUp: boolean;
  isGo: boolean; // true = hit it, false = don't hit it
  wasHit: boolean;
}

export default function WhackAMoleGame({ tier, onComplete, onExit }: WhackAMoleGameProps) {
  const { t } = useTranslation();
  const gridSize = tier === 'beginner' ? 3 : tier === 'advanced' ? 4 : 5;
  const totalMoles = gridSize * gridSize;
  
  const [moles, setMoles] = useState<MoleState[]>([]);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [misses, setMisses] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [moleAppearTime, setMoleAppearTime] = useState(Date.now());
  const [isComplete, setIsComplete] = useState(false);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<{ id: number; type: 'hit' | 'miss' | 'wrong' } | null>(null);

  const moleUpDuration = tier === 'beginner' ? 1500 : tier === 'advanced' ? 1200 : 900;
  const moleInterval = tier === 'beginner' ? 1800 : tier === 'advanced' ? 1400 : 1000;
  const noGoRatio = tier === 'beginner' ? 0.2 : tier === 'advanced' ? 0.3 : 0.4;

  // Initialize moles
  useEffect(() => {
    const initialMoles: MoleState[] = Array.from({ length: totalMoles }, (_, i) => ({
      id: i,
      isUp: false,
      isGo: true,
      wasHit: false,
    }));
    setMoles(initialMoles);
  }, [totalMoles]);

  // Pop up moles randomly
  useEffect(() => {
    if (isComplete || moles.length === 0) return;

    const interval = setInterval(() => {
      // Find moles that are down
      const downMoles = moles.filter(m => !m.isUp);
      if (downMoles.length === 0) return;

      const randomMole = downMoles[Math.floor(Math.random() * downMoles.length)];
      const isGo = Math.random() > noGoRatio;

      setMoles(prev => prev.map(m => 
        m.id === randomMole.id 
          ? { ...m, isUp: true, isGo, wasHit: false }
          : m
      ));
      setMoleAppearTime(Date.now());

      // Auto-hide mole
      setTimeout(() => {
        setMoles(prev => {
          const mole = prev.find(m => m.id === randomMole.id);
          if (mole?.isUp && !mole.wasHit && mole.isGo) {
            setMisses(p => p + 1);
            setStreak(0);
          }
          return prev.map(m => 
            m.id === randomMole.id ? { ...m, isUp: false } : m
          );
        });
      }, moleUpDuration);
    }, moleInterval);

    return () => clearInterval(interval);
  }, [moles, isComplete, moleUpDuration, moleInterval, noGoRatio]);

  const handleMoleClick = useCallback((moleId: number) => {
    const mole = moles.find(m => m.id === moleId);
    if (!mole?.isUp || mole.wasHit || isComplete) return;

    const reactionTime = Date.now() - moleAppearTime;

    if (mole.isGo) {
      // Correct hit
      setScore(prev => prev + 1);
      setStreak(prev => prev + 1);
      setReactionTimes(prev => [...prev, reactionTime]);
      setFeedback({ id: moleId, type: 'hit' });
    } else {
      // Hit a no-go target
      setMistakes(prev => prev + 1);
      setStreak(0);
      setFeedback({ id: moleId, type: 'wrong' });
    }

    setMoles(prev => prev.map(m => 
      m.id === moleId ? { ...m, wasHit: true, isUp: false } : m
    ));

    setTimeout(() => setFeedback(null), 200);
  }, [moles, moleAppearTime, isComplete]);

  const handleTimerComplete = useCallback(() => {
    if (!isComplete) {
      setIsComplete(true);
      
      const avgReaction = reactionTimes.length > 0
        ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
        : 0;
      
      const totalAttempts = score + mistakes + misses;
      const accuracy = totalAttempts > 0 
        ? Math.round((score / totalAttempts) * 100)
        : 0;

      onComplete({
        accuracyPercent: accuracy,
        reactionTimeMs: avgReaction,
        difficultyLevel: tier === 'beginner' ? 5 : tier === 'advanced' ? 7 : 9,
        falsePositives: mistakes,
        drillMetrics: {
          totalHits: score,
          totalMisses: misses,
          noGoMistakes: mistakes,
          bestStreak: streak,
        },
      });
    }
  }, [isComplete, score, mistakes, misses, streak, reactionTimes, tier, onComplete]);

  return (
    <DrillContainer
      title={t('texVision.drills.whackAMole.title', 'Whack-a-Mole')}
      description={t('texVision.drills.whackAMole.description', 'Reaction + decision making')}
      icon={Gamepad2}
      onExit={onExit}
      timer={
        <DrillTimer
          initialSeconds={tier === 'beginner' ? 60 : tier === 'advanced' ? 90 : 120}
          mode="countdown"
          autoStart={true}
          onComplete={handleTimerComplete}
        />
      }
      metrics={
        <DrillMetricsDisplay
          accuracy={Math.round((score / Math.max(score + mistakes + misses, 1)) * 100)}
          reactionTimeMs={reactionTimes.length > 0 ? reactionTimes[reactionTimes.length - 1] : undefined}
          streak={streak}
        />
      }
    >
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[400px]">
        {/* Legend */}
        <div className="flex gap-4 mb-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-[hsl(var(--tex-vision-feedback))]" />
            <span className="text-[hsl(var(--tex-vision-text-muted))]">
              {t('texVision.drills.whackAMole.hit', 'Hit')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-[hsl(var(--tex-vision-timing))]" />
            <span className="text-[hsl(var(--tex-vision-text-muted))]">
              {t('texVision.drills.whackAMole.avoid', 'Avoid')}
            </span>
          </div>
        </div>

        {/* Grid */}
        <div 
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
        >
          {moles.map((mole) => (
            <button
              key={mole.id}
              onClick={() => handleMoleClick(mole.id)}
              disabled={!mole.isUp || mole.wasHit}
              className={`relative w-16 h-16 rounded-xl transition-all duration-150 overflow-hidden ${
                mole.isUp
                  ? mole.isGo
                    ? 'bg-[hsl(var(--tex-vision-feedback))] scale-105 cursor-pointer'
                    : 'bg-[hsl(var(--tex-vision-timing))] scale-105 cursor-pointer'
                  : 'bg-[hsl(var(--tex-vision-primary))]/30'
              }`}
              style={{
                boxShadow: mole.isUp 
                  ? mole.isGo 
                    ? '0 0 20px hsl(var(--tex-vision-feedback) / 0.5)' 
                    : '0 0 20px hsl(var(--tex-vision-timing) / 0.5)'
                  : undefined,
              }}
            >
              {/* Feedback overlay */}
              {feedback?.id === mole.id && (
                <div className={`absolute inset-0 flex items-center justify-center ${
                  feedback.type === 'hit' 
                    ? 'bg-[hsl(var(--tex-vision-success))]' 
                    : 'bg-[hsl(var(--tex-vision-timing))]'
                }`}>
                  {feedback.type === 'hit' ? (
                    <Check className="w-8 h-8 text-[hsl(var(--tex-vision-text))]" />
                  ) : (
                    <X className="w-8 h-8 text-[hsl(var(--tex-vision-text))]" />
                  )}
                </div>
              )}

              {/* Mole indicator */}
              {mole.isUp && !feedback && (
                <div className="absolute inset-0 flex items-center justify-center">
                  {mole.isGo ? (
                    <Check className="w-6 h-6 text-[hsl(var(--tex-vision-primary-dark))]" />
                  ) : (
                    <X className="w-6 h-6 text-[hsl(var(--tex-vision-primary-dark))]" />
                  )}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Score display */}
        <div className="mt-6 flex gap-6 text-sm">
          <div className="text-center">
            <div className="text-[hsl(var(--tex-vision-success))] font-bold text-lg">{score}</div>
            <div className="text-[hsl(var(--tex-vision-text-muted))]">
              {t('texVision.drills.whackAMole.hits', 'Hits')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[hsl(var(--tex-vision-timing))] font-bold text-lg">{mistakes}</div>
            <div className="text-[hsl(var(--tex-vision-text-muted))]">
              {t('texVision.drills.whackAMole.falseHits', 'False Hits')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[hsl(var(--tex-vision-text-muted))] font-bold text-lg">{misses}</div>
            <div className="text-[hsl(var(--tex-vision-text-muted))]">
              {t('texVision.drills.whackAMole.missed', 'Missed')}
            </div>
          </div>
        </div>
      </div>
    </DrillContainer>
  );
}

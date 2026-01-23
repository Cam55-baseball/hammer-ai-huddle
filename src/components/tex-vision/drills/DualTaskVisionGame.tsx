import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { DrillContainer } from '../shared/DrillContainer';
import { DrillTimer } from '../shared/DrillTimer';
import { DrillMetricsDisplay } from '../shared/DrillMetricsDisplay';
import { Split } from 'lucide-react';
import { DrillResult } from '@/hooks/useTexVisionSession';

interface DualTaskVisionGameProps {
  tier: string;
  onComplete: (result: Omit<DrillResult, 'drillType' | 'tier'>) => void;
  onExit: () => void;
}

type PeripheralPosition = 'left' | 'right' | 'top' | 'bottom' | null;

export default function DualTaskVisionGame({ tier, onComplete, onExit }: DualTaskVisionGameProps) {
  const { t } = useTranslation();
  
  // Central task: count
  const [centralNumber, setCentralNumber] = useState(0);
  const [countTotal, setCountTotal] = useState(0);
  
  // Peripheral task: tap targets
  const [peripheralTarget, setPeripheralTarget] = useState<PeripheralPosition>(null);
  const [peripheralScore, setPeripheralScore] = useState(0);
  const [peripheralMisses, setPeripheralMisses] = useState(0);
  
  // Combined state
  const [isComplete, setIsComplete] = useState(false);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const peripheralStartTime = useRef<number>(0);

  const centralChangeInterval = tier === 'beginner' ? 1500 : tier === 'advanced' ? 1200 : 800;
  const peripheralInterval = tier === 'beginner' ? 2500 : tier === 'advanced' ? 2000 : 1500;
  const peripheralDuration = tier === 'beginner' ? 1200 : tier === 'advanced' ? 1000 : 700;

  // Central task: numbers changing
  useEffect(() => {
    if (isComplete) return;

    const interval = setInterval(() => {
      const newNum = Math.floor(Math.random() * 9) + 1;
      setCentralNumber(newNum);
      setCountTotal(prev => prev + newNum);
    }, centralChangeInterval);

    return () => clearInterval(interval);
  }, [isComplete, centralChangeInterval]);

  // Peripheral task: targets appearing
  useEffect(() => {
    if (isComplete) return;

    const positions: PeripheralPosition[] = ['left', 'right', 'top', 'bottom'];
    
    const showTarget = () => {
      const pos = positions[Math.floor(Math.random() * positions.length)];
      setPeripheralTarget(pos);
      peripheralStartTime.current = Date.now();

      // Target disappears after duration
      setTimeout(() => {
        setPeripheralTarget(prev => {
          if (prev === pos) {
            // Missed this target
            setPeripheralMisses(m => m + 1);
            return null;
          }
          return prev;
        });
      }, peripheralDuration);
    };

    const interval = setInterval(showTarget, peripheralInterval);
    setTimeout(showTarget, 1000); // Initial target

    return () => clearInterval(interval);
  }, [isComplete, peripheralInterval, peripheralDuration]);

  const handlePeripheralTap = useCallback((position: PeripheralPosition) => {
    if (!peripheralTarget || peripheralTarget !== position) return;

    const reactionTime = Date.now() - peripheralStartTime.current;
    setReactionTimes(prev => [...prev, reactionTime]);
    setPeripheralScore(prev => prev + 1);
    setPeripheralTarget(null);
  }, [peripheralTarget]);

  const handleTimerComplete = useCallback(() => {
    if (!isComplete) {
      setIsComplete(true);

      const avgReaction = reactionTimes.length > 0
        ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
        : undefined;

      const totalPeripheralAttempts = peripheralScore + peripheralMisses;
      const peripheralAccuracy = totalPeripheralAttempts > 0 
        ? Math.round((peripheralScore / totalPeripheralAttempts) * 100)
        : 0;

      onComplete({
        accuracyPercent: peripheralAccuracy,
        reactionTimeMs: avgReaction,
        difficultyLevel: tier === 'beginner' ? 6 : tier === 'advanced' ? 8 : 10,
        drillMetrics: {
          peripheralHits: peripheralScore,
          peripheralMisses,
          centralTotal: countTotal,
        },
      });
    }
  }, [isComplete, reactionTimes, peripheralScore, peripheralMisses, countTotal, tier, onComplete]);

  const renderPeripheralTarget = (position: PeripheralPosition) => {
    const isActive = peripheralTarget === position;
    const baseClasses = "absolute w-12 h-12 rounded-full transition-all duration-100 flex items-center justify-center cursor-pointer";
    const activeClasses = isActive 
      ? "bg-[hsl(var(--tex-vision-feedback))] scale-110 shadow-lg shadow-[hsl(var(--tex-vision-feedback))]/50" 
      : "bg-transparent";

    const positions = {
      left: "left-4 top-1/2 -translate-y-1/2",
      right: "right-4 top-1/2 -translate-y-1/2",
      top: "top-4 left-1/2 -translate-x-1/2",
      bottom: "bottom-4 left-1/2 -translate-x-1/2",
    };

    return (
      <button
        key={position}
        onClick={() => handlePeripheralTap(position)}
        className={`${baseClasses} ${activeClasses} ${positions[position!]}`}
        disabled={!isActive}
      >
        {isActive && <span className="text-[hsl(var(--tex-vision-primary-dark))] font-bold">!</span>}
      </button>
    );
  };

  return (
    <DrillContainer
      title={t('texVision.drills.dualTaskVision.title', 'Dual-Task Vision')}
      description={t('texVision.drills.dualTaskVision.description', 'Central focus + peripheral awareness')}
      icon={Split}
      onExit={onExit}
      timer={
        <DrillTimer
          initialSeconds={tier === 'beginner' ? 45 : tier === 'advanced' ? 60 : 90}
          mode="countdown"
          autoStart={true}
          onComplete={handleTimerComplete}
        />
      }
      metrics={
        <DrillMetricsDisplay
          accuracy={peripheralScore + peripheralMisses > 0 
            ? Math.round((peripheralScore / (peripheralScore + peripheralMisses)) * 100) 
            : undefined}
          difficulty={tier === 'beginner' ? 6 : tier === 'advanced' ? 8 : 10}
          streak={peripheralScore}
        />
      }
    >
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[400px] relative">
        {/* Instructions */}
        <div className="absolute top-4 text-center text-sm text-[hsl(var(--tex-vision-text-muted))]">
          {t('texVision.drills.dualTaskVision.instruction', 'Watch center numbers + tap peripheral targets')}
        </div>

        {/* Central task area */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* Center number */}
          <div className="w-20 h-20 rounded-full bg-[hsl(var(--tex-vision-primary))]/50 flex items-center justify-center">
            <span className="text-4xl font-bold text-[hsl(var(--tex-vision-text))]">
              {centralNumber}
            </span>
          </div>

          {/* Peripheral targets */}
          {renderPeripheralTarget('left')}
          {renderPeripheralTarget('right')}
          {renderPeripheralTarget('top')}
          {renderPeripheralTarget('bottom')}
        </div>

        {/* Running total (for central task verification) */}
        <div className="mt-4 text-center">
          <p className="text-xs text-[hsl(var(--tex-vision-text-muted))]">
            {t('texVision.drills.dualTaskVision.runningTotal', 'Running total')}: {countTotal}
          </p>
        </div>

        {/* Scores */}
        <div className="absolute bottom-16 flex gap-8 text-center">
          <div>
            <p className="text-2xl font-bold text-[hsl(var(--tex-vision-success))]">{peripheralScore}</p>
            <p className="text-xs text-[hsl(var(--tex-vision-text-muted))]">
              {t('texVision.drills.dualTaskVision.hits', 'Hits')}
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-400">{peripheralMisses}</p>
            <p className="text-xs text-[hsl(var(--tex-vision-text-muted))]">
              {t('texVision.drills.dualTaskVision.misses', 'Misses')}
            </p>
          </div>
        </div>
      </div>
    </DrillContainer>
  );
}

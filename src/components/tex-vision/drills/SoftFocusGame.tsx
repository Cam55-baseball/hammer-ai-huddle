import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DrillContainer } from '../shared/DrillContainer';
import { DrillTimer } from '../shared/DrillTimer';
import { DrillMetricsDisplay } from '../shared/DrillMetricsDisplay';
import { Eye, Sparkles } from 'lucide-react';
import { DrillResult } from '@/hooks/useTexVisionSession';

interface SoftFocusGameProps {
  tier: string;
  onComplete: (result: Omit<DrillResult, 'drillType' | 'tier'>) => void;
  onExit: () => void;
  isPaused?: boolean;
  onPauseChange?: (paused: boolean) => void;
}

type Phase = 'focus' | 'expand' | 'hold';

export default function SoftFocusGame({ tier, onComplete, onExit, isPaused }: SoftFocusGameProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('focus');
  const [cycleCount, setCycleCount] = useState(0);
  const [breathPhase, setBreathPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [peripheralTaps, setPeripheralTaps] = useState(0);
  const [showPeripheralPrompt, setShowPeripheralPrompt] = useState(false);
  const [peripheralPosition, setPeripheralPosition] = useState<'left' | 'right'>('left');

  const totalCycles = tier === 'beginner' ? 3 : tier === 'advanced' ? 5 : 7;
  const cycleDuration = 20; // seconds per cycle
  const totalDuration = totalCycles * cycleDuration;

  // Breathing cycle: 4s in, 2s hold, 4s out - respects isPaused
  useEffect(() => {
    if (isComplete || isPaused) return;

    const breathCycle = [
      { phase: 'in' as const, duration: 4000 },
      { phase: 'hold' as const, duration: 2000 },
      { phase: 'out' as const, duration: 4000 },
    ];

    let currentIndex = 0;
    
    const advanceBreath = () => {
      currentIndex = (currentIndex + 1) % breathCycle.length;
      setBreathPhase(breathCycle[currentIndex].phase);
    };

    // Run through cycle
    let timeout: NodeJS.Timeout;
    const scheduleNext = () => {
      timeout = setTimeout(() => {
        advanceBreath();
        scheduleNext();
      }, breathCycle[currentIndex].duration);
    };
    
    scheduleNext();

    return () => clearTimeout(timeout);
  }, [isComplete, isPaused]);

  // Cycle progression - update phase based on cycle, respects isPaused
  useEffect(() => {
    if (isComplete || isPaused) return;

    const phaseInterval = setInterval(() => {
      setPhase(prev => {
        if (prev === 'focus') return 'expand';
        if (prev === 'expand') return 'hold';
        return 'focus';
      });
    }, 6000);

    return () => clearInterval(phaseInterval);
  }, [isComplete, isPaused]);

  // Show peripheral awareness prompts every 15-20 seconds - respects isPaused
  useEffect(() => {
    if (isComplete || isPaused) return;

    const showPrompt = () => {
      setPeripheralPosition(Math.random() > 0.5 ? 'left' : 'right');
      setShowPeripheralPrompt(true);
      
      // Auto-hide after 3 seconds if not tapped
      setTimeout(() => {
        setShowPeripheralPrompt(false);
      }, 3000);
    };

    // Initial delay then recurring
    const initialDelay = setTimeout(showPrompt, 8000);
    const interval = setInterval(showPrompt, 15000 + Math.random() * 5000);
    
    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [isComplete, isPaused]);

  const handlePeripheralTap = useCallback(() => {
    if (showPeripheralPrompt) {
      setPeripheralTaps(prev => prev + 1);
      setShowPeripheralPrompt(false);
    }
  }, [showPeripheralPrompt]);

  const handleTimerTick = useCallback((seconds: number) => {
    setElapsedSeconds(seconds);
    const newCycle = Math.floor(seconds / cycleDuration);
    if (newCycle !== cycleCount && newCycle <= totalCycles) {
      setCycleCount(newCycle);
    }
  }, [cycleCount, cycleDuration, totalCycles]);

  const handleTimerComplete = useCallback(() => {
    setIsComplete(true);
    onComplete({
      accuracyPercent: 100,
      reactionTimeMs: undefined,
      difficultyLevel: tier === 'beginner' ? 1 : tier === 'advanced' ? 4 : 7,
      drillMetrics: {
        cyclesCompleted: cycleCount + 1,
        totalDuration: elapsedSeconds,
        peripheralAwareness: peripheralTaps,
      },
    });
  }, [cycleCount, elapsedSeconds, tier, peripheralTaps, onComplete]);

  // Visual scale for breathing animation
  const breathScale = breathPhase === 'in' ? 1.3 : breathPhase === 'hold' ? 1.3 : 1;

  // Ring colors based on phase
  const getRingOpacity = (ringIndex: number) => {
    if (phase === 'focus') {
      return ringIndex === 0 ? 0.8 : 0.2;
    } else if (phase === 'expand') {
      return 0.5 - ringIndex * 0.1;
    } else {
      return 0.6;
    }
  };

  return (
    <DrillContainer
      title={t('texVision.drills.softFocus.title', 'Soft Focus')}
      description={t('texVision.drills.softFocus.description', 'Develop calm awareness')}
      icon={Eye}
      onExit={onExit}
      timer={
        <DrillTimer
          initialSeconds={totalDuration}
          mode="countdown"
          autoStart={true}
          onTick={handleTimerTick}
          onComplete={handleTimerComplete}
        />
      }
      metrics={
        <DrillMetricsDisplay
          difficulty={tier === 'beginner' ? 1 : tier === 'advanced' ? 4 : 7}
          streak={peripheralTaps}
        />
      }
    >
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[350px] relative">
        {/* Phase indicator - header bar, not overlapping circles */}
        <div className="absolute top-4 left-4 flex items-center gap-2 text-sm">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            phase === 'focus' 
              ? 'bg-[hsl(var(--tex-vision-feedback))]/20 text-[hsl(var(--tex-vision-feedback))]'
              : phase === 'expand'
                ? 'bg-[hsl(var(--tex-vision-timing))]/20 text-[hsl(var(--tex-vision-timing))]'
                : 'bg-[hsl(var(--tex-vision-success))]/20 text-[hsl(var(--tex-vision-success))]'
          }`}>
            {phase === 'focus' ? 'Focus' : phase === 'expand' ? 'Expand' : 'Hold'}
          </span>
        </div>

        {/* Breath indicator - icon only, top right */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <Sparkles 
            className={`w-5 h-5 transition-all duration-500 ${
              breathPhase === 'in' 
                ? 'text-[hsl(var(--tex-vision-success))] scale-125' 
                : breathPhase === 'hold'
                  ? 'text-[hsl(var(--tex-vision-timing))] scale-110'
                  : 'text-[hsl(var(--tex-vision-text-muted))] scale-100'
            }`}
          />
        </div>

        {/* Peripheral awareness prompt - left side */}
        {showPeripheralPrompt && peripheralPosition === 'left' && (
          <button
            onClick={handlePeripheralTap}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[hsl(var(--tex-vision-feedback))]/40 animate-pulse"
            style={{ boxShadow: '0 0 20px hsl(var(--tex-vision-feedback) / 0.5)' }}
          />
        )}

        {/* Peripheral awareness prompt - right side */}
        {showPeripheralPrompt && peripheralPosition === 'right' && (
          <button
            onClick={handlePeripheralTap}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[hsl(var(--tex-vision-feedback))]/40 animate-pulse"
            style={{ boxShadow: '0 0 20px hsl(var(--tex-vision-feedback) / 0.5)' }}
          />
        )}

        {/* Concentric rings for peripheral awareness - responsive sizing */}
        <div className="relative flex items-center justify-center w-full max-w-[280px] aspect-square">
          {[0, 1, 2, 3].map((ringIndex) => (
            <div
              key={ringIndex}
              className="absolute rounded-full border-2 border-[hsl(var(--tex-vision-feedback))] transition-all duration-1000"
              style={{
                width: `${(ringIndex + 1) * 25}%`,
                height: `${(ringIndex + 1) * 25}%`,
                opacity: getRingOpacity(ringIndex),
                transform: `scale(${phase === 'expand' || phase === 'hold' ? 1.1 : 1})`,
              }}
            />
          ))}

          {/* Center focus point - breathing animation */}
          <div
            className="w-8 h-8 rounded-full bg-[hsl(var(--tex-vision-feedback))] transition-transform duration-[2000ms] ease-in-out"
            style={{
              transform: `scale(${breathScale})`,
              boxShadow: `0 0 ${breathPhase === 'hold' ? 30 : 15}px hsl(var(--tex-vision-feedback) / 0.6)`,
            }}
          />
        </div>

        {/* Cycle counter - bottom */}
        <div className="absolute bottom-4 text-center">
          <p className="text-sm text-[hsl(var(--tex-vision-text-muted))]">
            {t('texVision.drills.cycle', 'Cycle')} {cycleCount + 1}/{totalCycles}
          </p>
        </div>
      </div>
    </DrillContainer>
  );
}

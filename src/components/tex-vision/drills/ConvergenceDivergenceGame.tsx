import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DrillContainer } from '../shared/DrillContainer';
import { DrillTimer } from '../shared/DrillTimer';
import { DrillMetricsDisplay } from '../shared/DrillMetricsDisplay';
import { Focus } from 'lucide-react';
import { DrillResult } from '@/hooks/useTexVisionSession';

interface ConvergenceDivergenceGameProps {
  tier: string;
  onComplete: (result: Omit<DrillResult, 'drillType' | 'tier'>) => void;
  onExit: () => void;
  isPaused?: boolean;
  onPauseChange?: (paused: boolean) => void;
}

type Phase = 'converge' | 'hold' | 'diverge' | 'rest';

export default function ConvergenceDivergenceGame({ tier, onComplete, onExit, isPaused }: ConvergenceDivergenceGameProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('converge');
  const [dotPosition, setDotPosition] = useState(100); // percentage distance apart
  const [cycleCount, setCycleCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [confirmCount, setConfirmCount] = useState(0);
  const [showConfirmPrompt, setShowConfirmPrompt] = useState(false);

  const totalCycles = tier === 'beginner' ? 5 : tier === 'advanced' ? 8 : 12;
  const phaseDuration = tier === 'beginner' ? 3000 : tier === 'advanced' ? 2500 : 2000;

  useEffect(() => {
    if (isComplete || isPaused) return;

    const phaseSequence: Phase[] = ['converge', 'hold', 'diverge', 'rest'];
    let currentPhaseIndex = phaseSequence.indexOf(phase);

    const interval = setInterval(() => {
      currentPhaseIndex = (currentPhaseIndex + 1) % phaseSequence.length;
      const newPhase = phaseSequence[currentPhaseIndex];
      setPhase(newPhase);

      if (newPhase === 'rest') {
        setCycleCount(prev => prev + 1);
      }
    }, phaseDuration);

    return () => clearInterval(interval);
  }, [phase, isComplete, phaseDuration, isPaused]);

  // Show confirmation prompt during hold phase
  useEffect(() => {
    if (phase === 'hold') {
      const timer = setTimeout(() => {
        setShowConfirmPrompt(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setShowConfirmPrompt(false);
    }
  }, [phase]);

  const handleConfirmMerged = useCallback(() => {
    if (showConfirmPrompt) {
      setConfirmCount(prev => prev + 1);
      setShowConfirmPrompt(false);
    }
  }, [showConfirmPrompt]);

  useEffect(() => {
    if (cycleCount >= totalCycles && !isComplete) {
      setIsComplete(true);
      onComplete({
        accuracyPercent: Math.round((confirmCount / Math.max(cycleCount, 1)) * 100),
        difficultyLevel: tier === 'beginner' ? 2 : tier === 'advanced' ? 5 : 8,
        drillMetrics: {
          cyclesCompleted: cycleCount,
          phaseDuration,
          convergenceConfirmed: confirmCount,
        },
      });
    }
  }, [cycleCount, totalCycles, isComplete, tier, phaseDuration, confirmCount, onComplete]);

  useEffect(() => {
    let targetPosition: number;
    switch (phase) {
      case 'converge':
        targetPosition = 20;
        break;
      case 'hold':
        targetPosition = 20;
        break;
      case 'diverge':
        targetPosition = 100;
        break;
      case 'rest':
        targetPosition = 100;
        break;
    }

    const step = (targetPosition - dotPosition) / 10;
    const animationInterval = setInterval(() => {
      setDotPosition(prev => {
        const next = prev + step;
        if (Math.abs(next - targetPosition) < Math.abs(step)) {
          clearInterval(animationInterval);
          return targetPosition;
        }
        return next;
      });
    }, 50);

    return () => clearInterval(animationInterval);
  }, [phase]);

  const handleTimerComplete = useCallback(() => {
    if (!isComplete) {
      setIsComplete(true);
      onComplete({
        accuracyPercent: Math.round((confirmCount / Math.max(cycleCount, 1)) * 100),
        difficultyLevel: tier === 'beginner' ? 2 : tier === 'advanced' ? 5 : 8,
        drillMetrics: {
          cyclesCompleted: cycleCount,
          convergenceConfirmed: confirmCount,
        },
      });
    }
  }, [isComplete, cycleCount, confirmCount, tier, onComplete]);

  const getPhaseInstruction = () => {
    switch (phase) {
      case 'converge':
        return t('texVision.drills.convergence.converge', 'Focus on the approaching point');
      case 'hold':
        return t('texVision.drills.convergence.hold', 'Hold focus on the close point');
      case 'diverge':
        return t('texVision.drills.convergence.diverge', 'Relax eyes as points separate');
      case 'rest':
        return t('texVision.drills.convergence.rest', 'Rest - look at far point');
    }
  };

  return (
    <DrillContainer
      title={t('texVision.drills.convergence.title', 'Convergence')}
      description={t('texVision.drills.convergence.description', 'Eye alignment training')}
      icon={Focus}
      onExit={onExit}
      timer={
        <DrillTimer
          initialSeconds={totalCycles * ((phaseDuration * 4) / 1000)}
          mode="countdown"
          autoStart={true}
          onComplete={handleTimerComplete}
        />
      }
      metrics={
        <DrillMetricsDisplay
          difficulty={tier === 'beginner' ? 2 : tier === 'advanced' ? 5 : 8}
          streak={confirmCount}
        />
      }
    >
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[400px] relative">
        {/* Convergence visualization */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* Left dot */}
          <div 
            className="absolute w-4 h-4 rounded-full bg-[hsl(var(--tex-vision-feedback))] transition-all duration-500"
            style={{
              left: `calc(50% - ${dotPosition / 2}px)`,
              transform: 'translateX(-50%)',
              boxShadow: phase === 'hold' ? '0 0 15px hsl(var(--tex-vision-feedback) / 0.6)' : undefined,
            }}
          />
          
          {/* Right dot */}
          <div 
            className="absolute w-4 h-4 rounded-full bg-[hsl(var(--tex-vision-feedback))] transition-all duration-500"
            style={{
              left: `calc(50% + ${dotPosition / 2}px)`,
              transform: 'translateX(-50%)',
              boxShadow: phase === 'hold' ? '0 0 15px hsl(var(--tex-vision-feedback) / 0.6)' : undefined,
            }}
          />

          {/* Center guide line */}
          <div className="absolute w-full h-0.5 bg-[hsl(var(--tex-vision-primary-light))]/20" />
          
          {/* Depth indicator */}
          <div 
            className="absolute w-1 bg-[hsl(var(--tex-vision-success))]/30 rounded-full transition-all duration-500"
            style={{
              height: `${100 - dotPosition}%`,
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          />
        </div>

        {/* Confirmation prompt during hold phase */}
        {showConfirmPrompt && (
          <button
            onClick={handleConfirmMerged}
            className="absolute top-20 px-4 py-2 bg-[hsl(var(--tex-vision-success))]/20 border border-[hsl(var(--tex-vision-success))] rounded-lg text-sm text-[hsl(var(--tex-vision-success))] font-medium hover:bg-[hsl(var(--tex-vision-success))]/30 transition-colors animate-pulse"
          >
            {t('texVision.drills.convergence.confirm', 'Tap if you see ONE dot!')}
          </button>
        )}

        {/* Phase indicator */}
        <div className="mt-8 flex gap-2">
          {(['converge', 'hold', 'diverge', 'rest'] as Phase[]).map((p) => (
            <div
              key={p}
              className={`w-3 h-3 rounded-full transition-all duration-150 ${
                phase === p
                  ? 'bg-[hsl(var(--tex-vision-feedback))] scale-125'
                  : 'bg-[hsl(var(--tex-vision-primary-light))]/30'
              }`}
            />
          ))}
        </div>

        {/* Instructions */}
        <div className="mt-6 text-center">
          <p className="text-lg font-medium text-[hsl(var(--tex-vision-text))]">
            {getPhaseInstruction()}
          </p>
          {/* Clear explanation for first cycle */}
          {cycleCount === 0 && phase === 'converge' && (
            <p className="text-xs text-[hsl(var(--tex-vision-feedback))] mt-2 animate-pulse">
              💡 Goal: Cross your eyes slightly until 2 dots merge into 1!
            </p>
          )}
        </div>

        {/* Cycle progress */}
        <div className="absolute top-4 left-4 text-sm text-[hsl(var(--tex-vision-text-muted))]">
          {t('texVision.drills.cycle', 'Cycle')} {cycleCount + 1}/{totalCycles}
        </div>

        {/* Confirmation count with extra info */}
        <div className="absolute top-4 right-4 text-sm">
          <p className="text-[hsl(var(--tex-vision-success))]">
            {t('texVision.drills.convergence.confirmed', 'Confirmed')}: {confirmCount}
          </p>
        </div>

        {/* Bottom instructions */}
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <p className="text-xs text-[hsl(var(--tex-vision-text-muted))]">
            {confirmCount > 0 
              ? `✓ You've confirmed convergence ${confirmCount}x` 
              : 'Tap the button when you see ONE dot'}
          </p>
        </div>
      </div>
    </DrillContainer>
  );
}

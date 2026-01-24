import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DrillContainer } from '../shared/DrillContainer';
import { DrillTimer } from '../shared/DrillTimer';
import { DrillMetricsDisplay } from '../shared/DrillMetricsDisplay';
import { Eye } from 'lucide-react';
import { DrillResult } from '@/hooks/useTexVisionSession';

interface SoftFocusGameProps {
  tier: string;
  onComplete: (result: Omit<DrillResult, 'drillType' | 'tier'>) => void;
  onExit: () => void;
}

export default function SoftFocusGame({ tier, onComplete, onExit }: SoftFocusGameProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'focus' | 'expand' | 'hold'>('focus');
  const [cycleCount, setCycleCount] = useState(0);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  
  const totalCycles = tier === 'beginner' ? 3 : tier === 'advanced' ? 5 : 7;
  const cycleDuration = 20; // seconds per cycle

  // Breathing animation
  useEffect(() => {
    if (isComplete) return;
    
    const breathInterval = setInterval(() => {
      setBreathPhase(prev => {
        if (prev === 'inhale') return 'hold';
        if (prev === 'hold') return 'exhale';
        return 'inhale';
      });
    }, 2000);

    return () => clearInterval(breathInterval);
  }, [isComplete]);

  // Cycle progression
  useEffect(() => {
    if (isComplete) return;

    const phaseInterval = setInterval(() => {
      setPhase(prev => {
        if (prev === 'focus') return 'expand';
        if (prev === 'expand') return 'hold';
        return 'focus';
      });
    }, 6000);

    return () => clearInterval(phaseInterval);
  }, [isComplete]);

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
      accuracyPercent: 100, // Soft focus is about completion, not accuracy
      reactionTimeMs: undefined,
      difficultyLevel: tier === 'beginner' ? 1 : tier === 'advanced' ? 4 : 7,
      drillMetrics: {
        cyclesCompleted: cycleCount + 1,
        totalDuration: elapsedSeconds,
      },
    });
  }, [cycleCount, elapsedSeconds, tier, onComplete]);

  const getPhaseInstruction = () => {
    switch (phase) {
      case 'focus':
        return t('texVision.drills.softFocus.focusCenter', 'Focus softly on the center dot');
      case 'expand':
        return t('texVision.drills.softFocus.expandAwareness', 'Expand awareness to the whole screen');
      case 'hold':
        return t('texVision.drills.softFocus.holdSoft', 'Hold soft gaze, notice periphery');
    }
  };

  const getBreathInstruction = () => {
    switch (breathPhase) {
      case 'inhale':
        return t('texVision.drills.softFocus.inhale', 'Breathe in...');
      case 'hold':
        return t('texVision.drills.softFocus.holdBreath', 'Hold...');
      case 'exhale':
        return t('texVision.drills.softFocus.exhale', 'Breathe out...');
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
          initialSeconds={totalCycles * cycleDuration}
          mode="countdown"
          autoStart={true}
          onTick={handleTimerTick}
          onComplete={handleTimerComplete}
        />
      }
      metrics={
        <DrillMetricsDisplay
          difficulty={tier === 'beginner' ? 1 : tier === 'advanced' ? 4 : 7}
          streak={cycleCount}
        />
      }
    >
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[400px] relative">
        {/* Peripheral awareness rings */}
        <div 
          className={`absolute w-80 h-80 rounded-full border-2 border-[hsl(var(--tex-vision-feedback))]/20 transition-all duration-1000 ${
            phase === 'expand' || phase === 'hold' ? 'scale-110 opacity-100' : 'scale-100 opacity-40'
          }`}
        />
        <div 
          className={`absolute w-60 h-60 rounded-full border-2 border-[hsl(var(--tex-vision-feedback))]/30 transition-all duration-1000 ${
            phase === 'expand' || phase === 'hold' ? 'scale-110 opacity-100' : 'scale-100 opacity-50'
          }`}
        />
        <div 
          className={`absolute w-40 h-40 rounded-full border-2 border-[hsl(var(--tex-vision-feedback))]/40 transition-all duration-1000 ${
            phase === 'expand' ? 'scale-105 opacity-100' : 'scale-100 opacity-60'
          }`}
        />

        {/* Center focus point */}
        <div 
          className={`w-6 h-6 rounded-full bg-[hsl(var(--tex-vision-feedback))] transition-all duration-500 ${
            breathPhase === 'inhale' ? 'scale-125' : breathPhase === 'exhale' ? 'scale-75' : 'scale-100'
          }`}
          style={{
            boxShadow: `0 0 ${phase === 'focus' ? '20px' : '10px'} hsl(var(--tex-vision-feedback) / 0.5)`,
          }}
        />

        {/* Cycle progress - top left */}
        <div className="absolute top-4 left-4 text-sm text-[hsl(var(--tex-vision-text-muted))]">
          {t('texVision.drills.cycle', 'Cycle')} {cycleCount + 1}/{totalCycles}
        </div>

        {/* Instructions - below the visual elements, not overlapping */}
        <div className="absolute bottom-4 left-4 right-4 text-center space-y-1">
          <p className="text-lg font-medium text-[hsl(var(--tex-vision-text))]">
            {getPhaseInstruction()}
          </p>
          <p className="text-sm text-[hsl(var(--tex-vision-text-muted))]">
            {getBreathInstruction()}
          </p>
        </div>
      </div>
    </DrillContainer>
  );
}

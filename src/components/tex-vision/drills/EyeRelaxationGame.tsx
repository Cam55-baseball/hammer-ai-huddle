import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DrillContainer } from '../shared/DrillContainer';
import { DrillTimer } from '../shared/DrillTimer';
import { DrillMetricsDisplay } from '../shared/DrillMetricsDisplay';
import { Moon, Hand, Eye, Sparkles } from 'lucide-react';
import { DrillResult } from '@/hooks/useTexVisionSession';

interface EyeRelaxationGameProps {
  tier: string;
  onComplete: (result: Omit<DrillResult, 'drillType' | 'tier'>) => void;
  onExit: () => void;
}

type Phase = 'palming' | 'breathe' | 'circles' | 'blink' | 'rest';

interface ExerciseStep {
  phase: Phase;
  icon: React.ReactNode;
  title: string;
  instruction: string;
  duration: number;
}

export default function EyeRelaxationGame({ tier, onComplete, onExit }: EyeRelaxationGameProps) {
  const { t } = useTranslation();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepTimeRemaining, setStepTimeRemaining] = useState(0);
  const [breathPhase, setBreathPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [isComplete, setIsComplete] = useState(false);

  const exercises: ExerciseStep[] = [
    {
      phase: 'palming',
      icon: <Hand className="h-12 w-12" />,
      title: t('texVision.drills.eyeRelaxation.palming', 'Palming'),
      instruction: t('texVision.drills.eyeRelaxation.palmingInstr', 'Cup your palms over your closed eyes. See only darkness.'),
      duration: tier === 'beginner' ? 20 : tier === 'advanced' ? 30 : 40,
    },
    {
      phase: 'breathe',
      icon: <Sparkles className="h-12 w-12" />,
      title: t('texVision.drills.eyeRelaxation.breathing', 'Deep Breathing'),
      instruction: t('texVision.drills.eyeRelaxation.breatheInstr', 'Follow the breathing pattern. Eyes can be closed or softly open.'),
      duration: tier === 'beginner' ? 20 : tier === 'advanced' ? 30 : 40,
    },
    {
      phase: 'circles',
      icon: <Eye className="h-12 w-12" />,
      title: t('texVision.drills.eyeRelaxation.eyeCircles', 'Eye Circles'),
      instruction: t('texVision.drills.eyeRelaxation.circlesInstr', 'Slowly roll your eyes in circles. 5 clockwise, then 5 counter-clockwise.'),
      duration: tier === 'beginner' ? 15 : tier === 'advanced' ? 20 : 25,
    },
    {
      phase: 'blink',
      icon: <Eye className="h-12 w-12" />,
      title: t('texVision.drills.eyeRelaxation.rapidBlink', 'Rapid Blinking'),
      instruction: t('texVision.drills.eyeRelaxation.blinkInstr', 'Blink rapidly for 10 seconds, then close eyes and rest.'),
      duration: tier === 'beginner' ? 15 : tier === 'advanced' ? 20 : 25,
    },
    {
      phase: 'rest',
      icon: <Moon className="h-12 w-12" />,
      title: t('texVision.drills.eyeRelaxation.finalRest', 'Final Rest'),
      instruction: t('texVision.drills.eyeRelaxation.restInstr', 'Close your eyes. Let all tension melt away.'),
      duration: tier === 'beginner' ? 15 : tier === 'advanced' ? 20 : 30,
    },
  ];

  const currentStep = exercises[currentStepIndex];
  const totalDuration = exercises.reduce((sum, ex) => sum + ex.duration, 0);

  // Initialize step timer
  useEffect(() => {
    setStepTimeRemaining(currentStep.duration);
  }, [currentStepIndex, currentStep.duration]);

  // Step countdown
  useEffect(() => {
    if (isComplete || stepTimeRemaining <= 0) return;

    const timer = setInterval(() => {
      setStepTimeRemaining(prev => {
        if (prev <= 1) {
          // Move to next step
          if (currentStepIndex < exercises.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
          } else {
            setIsComplete(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [stepTimeRemaining, isComplete, currentStepIndex, exercises.length]);

  // Breathing animation for breathe phase
  useEffect(() => {
    if (currentStep.phase !== 'breathe' || isComplete) return;

    const breathCycle = setInterval(() => {
      setBreathPhase(prev => {
        if (prev === 'in') return 'hold';
        if (prev === 'hold') return 'out';
        return 'in';
      });
    }, 2000);

    return () => clearInterval(breathCycle);
  }, [currentStep.phase, isComplete]);

  // Completion
  useEffect(() => {
    if (isComplete) {
      onComplete({
        accuracyPercent: 100,
        difficultyLevel: tier === 'beginner' ? 1 : tier === 'advanced' ? 3 : 5,
        drillMetrics: {
          exercisesCompleted: exercises.length,
          totalDuration,
        },
      });
    }
  }, [isComplete, exercises.length, totalDuration, tier, onComplete]);

  const handleTimerComplete = useCallback(() => {
    if (!isComplete) {
      setIsComplete(true);
    }
  }, [isComplete]);

  const getBreathInstruction = () => {
    switch (breathPhase) {
      case 'in':
        return t('texVision.drills.eyeRelaxation.breatheIn', 'Breathe in slowly...');
      case 'hold':
        return t('texVision.drills.eyeRelaxation.holdBreath', 'Hold...');
      case 'out':
        return t('texVision.drills.eyeRelaxation.breatheOut', 'Breathe out slowly...');
    }
  };

  return (
    <DrillContainer
      title={t('texVision.drills.eyeRelaxation.title', 'Eye Relaxation')}
      description={t('texVision.drills.eyeRelaxation.description', 'Rest and restore your eyes')}
      icon={Moon}
      onExit={onExit}
      timer={
        <DrillTimer
          initialSeconds={totalDuration}
          mode="countdown"
          autoStart={true}
          onComplete={handleTimerComplete}
        />
      }
      metrics={
        <DrillMetricsDisplay
          difficulty={tier === 'beginner' ? 1 : tier === 'advanced' ? 3 : 5}
          streak={currentStepIndex + 1}
        />
      }
    >
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[400px] relative">
        {/* Step progress */}
        <div className="absolute top-4 flex gap-2">
          {exercises.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentStepIndex
                  ? 'bg-[hsl(var(--tex-vision-feedback))] scale-125'
                  : index < currentStepIndex
                  ? 'bg-[hsl(var(--tex-vision-success))]'
                  : 'bg-[hsl(var(--tex-vision-primary-light))]/30'
              }`}
            />
          ))}
        </div>

        {/* Main content */}
        <div 
          className={`text-[hsl(var(--tex-vision-feedback))] transition-all duration-1000 ${
            currentStep.phase === 'breathe' && breathPhase === 'in' ? 'scale-125' :
            currentStep.phase === 'breathe' && breathPhase === 'out' ? 'scale-75' : 'scale-100'
          }`}
        >
          {currentStep.icon}
        </div>

        <h2 className="text-2xl font-bold text-[hsl(var(--tex-vision-text))] mt-6 mb-2">
          {currentStep.title}
        </h2>

        <p className="text-center text-[hsl(var(--tex-vision-text-muted))] max-w-xs mb-6">
          {currentStep.instruction}
        </p>

        {/* Phase-specific content */}
        {currentStep.phase === 'breathe' && (
          <p className="text-lg text-[hsl(var(--tex-vision-feedback))] font-medium animate-pulse">
            {getBreathInstruction()}
          </p>
        )}

        {/* Step timer */}
        <div className="absolute bottom-16 text-center">
          <p className="text-3xl font-mono text-[hsl(var(--tex-vision-text))]">
            {stepTimeRemaining}s
          </p>
          <p className="text-sm text-[hsl(var(--tex-vision-text-muted))]">
            {t('texVision.drills.eyeRelaxation.remaining', 'remaining')}
          </p>
        </div>

        {/* Step indicator */}
        <div className="absolute top-4 left-4 text-sm text-[hsl(var(--tex-vision-text-muted))]">
          {t('texVision.drills.step', 'Step')} {currentStepIndex + 1}/{exercises.length}
        </div>
      </div>
    </DrillContainer>
  );
}

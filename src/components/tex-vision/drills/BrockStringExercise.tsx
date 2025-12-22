import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DrillContainer } from '../shared/DrillContainer';
import { DrillTimer } from '../shared/DrillTimer';
import { DrillMetricsDisplay } from '../shared/DrillMetricsDisplay';
import { Crosshair, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DrillResult } from '@/hooks/useTexVisionSession';

interface BrockStringExerciseProps {
  tier: string;
  onComplete: (result: Omit<DrillResult, 'drillType' | 'tier'>) => void;
  onExit: () => void;
}

interface Step {
  id: number;
  titleKey: string;
  defaultTitle: string;
  descriptionKey: string;
  defaultDescription: string;
  durationSeconds: number;
  beadFocus: 'near' | 'mid' | 'far';
}

const STEPS: Step[] = [
  {
    id: 1,
    titleKey: 'texVision.drills.brockString.step1.title',
    defaultTitle: 'Setup Position',
    descriptionKey: 'texVision.drills.brockString.step1.description',
    defaultDescription: 'Hold the string at eye level. One end near your nose, the other stretched out.',
    durationSeconds: 15,
    beadFocus: 'mid',
  },
  {
    id: 2,
    titleKey: 'texVision.drills.brockString.step2.title',
    defaultTitle: 'Focus on Far Bead',
    descriptionKey: 'texVision.drills.brockString.step2.description',
    defaultDescription: 'Focus on the farthest bead. You should see two strings forming a V pointing at it.',
    durationSeconds: 30,
    beadFocus: 'far',
  },
  {
    id: 3,
    titleKey: 'texVision.drills.brockString.step3.title',
    defaultTitle: 'Focus on Middle Bead',
    descriptionKey: 'texVision.drills.brockString.step3.description',
    defaultDescription: 'Shift focus to the middle bead. The V should now point at this bead.',
    durationSeconds: 30,
    beadFocus: 'mid',
  },
  {
    id: 4,
    titleKey: 'texVision.drills.brockString.step4.title',
    defaultTitle: 'Focus on Near Bead',
    descriptionKey: 'texVision.drills.brockString.step4.description',
    defaultDescription: 'Focus on the closest bead. Notice how your eyes converge.',
    durationSeconds: 30,
    beadFocus: 'near',
  },
  {
    id: 5,
    titleKey: 'texVision.drills.brockString.step5.title',
    defaultTitle: 'Shift Practice',
    descriptionKey: 'texVision.drills.brockString.step5.description',
    defaultDescription: 'Slowly shift focus between all three beads. Near → Mid → Far → Mid → Near.',
    durationSeconds: 45,
    beadFocus: 'mid',
  },
];

export default function BrockStringExercise({ tier, onComplete, onExit }: BrockStringExerciseProps) {
  const { t } = useTranslation();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepTimeRemaining, setStepTimeRemaining] = useState(STEPS[0].durationSeconds);
  const [isComplete, setIsComplete] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [totalTimeElapsed, setTotalTimeElapsed] = useState(0);

  const currentStep = STEPS[currentStepIndex];
  const totalSteps = STEPS.length;

  // Step timer
  useEffect(() => {
    if (isPaused || isComplete) return;

    const interval = setInterval(() => {
      setStepTimeRemaining(prev => {
        if (prev <= 1) {
          // Move to next step
          if (currentStepIndex < totalSteps - 1) {
            setCurrentStepIndex(i => i + 1);
            return STEPS[currentStepIndex + 1].durationSeconds;
          } else {
            // Exercise complete
            setIsComplete(true);
            onComplete({
              accuracyPercent: 100,
              difficultyLevel: tier === 'beginner' ? 6 : tier === 'advanced' ? 8 : 10,
              drillMetrics: {
                stepsCompleted: totalSteps,
                totalDuration: totalTimeElapsed,
              },
            });
            return 0;
          }
        }
        return prev - 1;
      });
      setTotalTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, isComplete, currentStepIndex, totalSteps, tier, totalTimeElapsed, onComplete]);

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(i => i - 1);
      setStepTimeRemaining(STEPS[currentStepIndex - 1].durationSeconds);
    }
  };

  const handleNextStep = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(i => i + 1);
      setStepTimeRemaining(STEPS[currentStepIndex + 1].durationSeconds);
    }
  };

  const handleTimerComplete = useCallback(() => {
    if (!isComplete) {
      setIsComplete(true);
      onComplete({
        accuracyPercent: Math.round(((currentStepIndex + 1) / totalSteps) * 100),
        difficultyLevel: tier === 'beginner' ? 6 : tier === 'advanced' ? 8 : 10,
        drillMetrics: {
          stepsCompleted: currentStepIndex + 1,
          totalDuration: totalTimeElapsed,
        },
      });
    }
  }, [isComplete, currentStepIndex, totalSteps, tier, totalTimeElapsed, onComplete]);

  const getBeadPositions = () => {
    switch (currentStep.beadFocus) {
      case 'near':
        return { near: 1, mid: 0.5, far: 0.3 };
      case 'mid':
        return { near: 0.5, mid: 1, far: 0.5 };
      case 'far':
        return { near: 0.3, mid: 0.5, far: 1 };
    }
  };

  const beadOpacities = getBeadPositions();

  return (
    <DrillContainer
      title={t('texVision.drills.brockString.title', 'Brock String')}
      description={t('texVision.drills.brockString.description', 'Guided eye alignment')}
      icon={Crosshair}
      onExit={onExit}
      timer={
        <DrillTimer
          initialSeconds={STEPS.reduce((acc, s) => acc + s.durationSeconds, 0)}
          mode="countdown"
          autoStart={true}
          onComplete={handleTimerComplete}
        />
      }
      metrics={
        <DrillMetricsDisplay
          difficulty={tier === 'beginner' ? 6 : tier === 'advanced' ? 8 : 10}
          streak={currentStepIndex + 1}
        />
      }
    >
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[400px]">
        {/* Step progress */}
        <div className="flex gap-2 mb-6">
          {STEPS.map((_, index) => (
            <div
              key={index}
              className={`w-3 h-3 rounded-full transition-all duration-150 ${
                index < currentStepIndex
                  ? 'bg-[hsl(var(--tex-vision-success))]'
                  : index === currentStepIndex
                    ? 'bg-[hsl(var(--tex-vision-feedback))] scale-125'
                    : 'bg-[hsl(var(--tex-vision-primary-light))]/30'
              }`}
            />
          ))}
        </div>

        {/* Brock string visualization */}
        <div className="relative w-80 h-40 mb-8">
          {/* String lines (converging) */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 160">
            <line
              x1="160" y1="0"
              x2="20" y2="140"
              stroke="hsl(var(--tex-vision-primary-light))"
              strokeWidth="2"
              opacity="0.5"
            />
            <line
              x1="160" y1="0"
              x2="300" y2="140"
              stroke="hsl(var(--tex-vision-primary-light))"
              strokeWidth="2"
              opacity="0.5"
            />
          </svg>

          {/* Near bead */}
          <div
            className="absolute w-8 h-8 rounded-full bg-[hsl(var(--tex-vision-feedback))] transition-all duration-300"
            style={{
              bottom: '10%',
              left: '50%',
              transform: 'translateX(-50%)',
              opacity: beadOpacities.near,
              boxShadow: beadOpacities.near === 1 ? '0 0 20px hsl(var(--tex-vision-feedback) / 0.6)' : undefined,
            }}
          />

          {/* Mid bead */}
          <div
            className="absolute w-6 h-6 rounded-full bg-[hsl(var(--tex-vision-success))] transition-all duration-300"
            style={{
              top: '40%',
              left: '50%',
              transform: 'translateX(-50%)',
              opacity: beadOpacities.mid,
              boxShadow: beadOpacities.mid === 1 ? '0 0 20px hsl(var(--tex-vision-success) / 0.6)' : undefined,
            }}
          />

          {/* Far bead */}
          <div
            className="absolute w-4 h-4 rounded-full bg-[hsl(var(--tex-vision-timing))] transition-all duration-300"
            style={{
              top: '10%',
              left: '50%',
              transform: 'translateX(-50%)',
              opacity: beadOpacities.far,
              boxShadow: beadOpacities.far === 1 ? '0 0 20px hsl(var(--tex-vision-timing) / 0.6)' : undefined,
            }}
          />

          {/* Focus point indicator (nose position) */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[hsl(var(--tex-vision-text))]/50" />
        </div>

        {/* Current step info */}
        <div className="text-center max-w-sm mb-6">
          <h3 className="text-lg font-semibold text-[hsl(var(--tex-vision-text))] mb-2">
            {t(currentStep.titleKey, currentStep.defaultTitle)}
          </h3>
          <p className="text-sm text-[hsl(var(--tex-vision-text-muted))]">
            {t(currentStep.descriptionKey, currentStep.defaultDescription)}
          </p>
        </div>

        {/* Step timer */}
        <div className="text-center mb-6">
          <div className="text-3xl font-bold text-[hsl(var(--tex-vision-feedback))]">
            {stepTimeRemaining}s
          </div>
          <div className="text-xs text-[hsl(var(--tex-vision-text-muted))]">
            {t('texVision.drills.brockString.remaining', 'remaining for this step')}
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevStep}
            disabled={currentStepIndex === 0}
            className="border-[hsl(var(--tex-vision-primary-light))]/30 text-[hsl(var(--tex-vision-text))] hover:bg-[hsl(var(--tex-vision-primary))]/50"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {t('common.previous', 'Previous')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPaused(p => !p)}
            className="border-[hsl(var(--tex-vision-primary-light))]/30 text-[hsl(var(--tex-vision-text))] hover:bg-[hsl(var(--tex-vision-primary))]/50"
          >
            {isPaused ? t('common.resume', 'Resume') : t('common.pause', 'Pause')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextStep}
            disabled={currentStepIndex === totalSteps - 1}
            className="border-[hsl(var(--tex-vision-primary-light))]/30 text-[hsl(var(--tex-vision-text))] hover:bg-[hsl(var(--tex-vision-primary))]/50"
          >
            {t('common.next', 'Next')}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Step indicator */}
        <div className="absolute top-4 left-4 text-sm text-[hsl(var(--tex-vision-text-muted))]">
          {t('texVision.drills.step', 'Step')} {currentStepIndex + 1}/{totalSteps}
        </div>
      </div>
    </DrillContainer>
  );
}

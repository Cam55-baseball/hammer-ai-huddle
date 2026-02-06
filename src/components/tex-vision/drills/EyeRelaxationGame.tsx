import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { DrillContainer } from '../shared/DrillContainer';
import { DrillTimer } from '../shared/DrillTimer';
import { DrillMetricsDisplay } from '../shared/DrillMetricsDisplay';
import { Moon, Hand, Eye, Sparkles, ChevronRight, RotateCcw } from 'lucide-react';
import { DrillResult } from '@/hooks/useTexVisionSession';

interface EyeRelaxationGameProps {
  tier: string;
  onComplete: (result: Omit<DrillResult, 'drillType' | 'tier'>) => void;
  onExit: () => void;
  onInteraction?: () => void;
}

type Phase = 'palming' | 'breathe' | 'circles' | 'blink' | 'rest';

interface ExerciseStep {
  phase: Phase;
  icon: typeof Moon;
  title: string;
  duration: number;
}

export default function EyeRelaxationGame({ tier, onComplete, onExit, onInteraction }: EyeRelaxationGameProps) {
  const { t } = useTranslation();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepTimeRemaining, setStepTimeRemaining] = useState(0);
  const [breathPhase, setBreathPhase] = useState<'in' | 'out'>('in');
  const [isComplete, setIsComplete] = useState(false);
  const [circleRotation, setCircleRotation] = useState(0);
  const [showTransition, setShowTransition] = useState(false);
  const [confirmations, setConfirmations] = useState(0);
  const [waitingForConfirm, setWaitingForConfirm] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  
  // Ref for stable completion handler
  const handleCompleteRef = useRef<() => void>();

  const baseDuration = tier === 'beginner' ? 15 : tier === 'advanced' ? 20 : 25;

  // Memoize exercises array - Final Rest gets extended duration for proper relaxation
  const exercises: ExerciseStep[] = useMemo(() => [
    { phase: 'palming', icon: Hand, title: 'Palming', duration: baseDuration },
    { phase: 'breathe', icon: Sparkles, title: 'Deep Breathing', duration: baseDuration },
    { phase: 'circles', icon: RotateCcw, title: 'Eye Circles', duration: baseDuration },
    { phase: 'blink', icon: Eye, title: 'Gentle Blinking', duration: baseDuration - 5 },
    { phase: 'rest', icon: Moon, title: 'Final Rest', duration: baseDuration + 5 }, // Extended for proper relaxation
  ], [baseDuration]);

  const currentStep = exercises[currentStepIndex];
  const totalDuration = exercises.reduce((sum, ex) => sum + ex.duration, 0);

  // Initialize step timer
  useEffect(() => {
    if (currentStepIndex < exercises.length) {
      setStepTimeRemaining(exercises[currentStepIndex].duration);
    }
  }, [currentStepIndex, exercises]);

  // Stable completion handler ref
  useEffect(() => {
    handleCompleteRef.current = () => {
      if (!isComplete && !showComplete) {
        setShowComplete(true);
        setTimeout(() => {
          setIsComplete(true);
          onComplete({
            accuracyPercent: 100,
            difficultyLevel: tier === 'beginner' ? 1 : tier === 'advanced' ? 3 : 5,
            drillMetrics: {
              stepsCompleted: exercises.length,
              confirmations,
            },
          });
        }, 1500);
      }
    };
  }, [isComplete, showComplete, tier, confirmations, onComplete, exercises.length]);

  // Step countdown - triggers completion directly for Final Rest
  useEffect(() => {
    if (isComplete || showComplete || stepTimeRemaining <= 0 || waitingForConfirm) return;

    const timer = setInterval(() => {
      setStepTimeRemaining(prev => {
        if (prev <= 1) {
          // Check if this is the LAST step (Final Rest)
          if (currentStepIndex === exercises.length - 1) {
            // Trigger completion directly - no waiting
            setTimeout(() => {
              handleCompleteRef.current?.();
            }, 0);
          } else {
            // Show transition for non-final steps
            setShowTransition(true);
            setWaitingForConfirm(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [stepTimeRemaining, currentStepIndex, exercises.length, isComplete, showComplete, waitingForConfirm]);

  // Breathing animation
  useEffect(() => {
    if (currentStep?.phase !== 'breathe' || isComplete) return;

    const interval = setInterval(() => {
      setBreathPhase(prev => prev === 'in' ? 'out' : 'in');
    }, 4000);

    return () => clearInterval(interval);
  }, [currentStep?.phase, isComplete]);

  // Eye circles animation
  useEffect(() => {
    if (currentStep?.phase !== 'circles' || isComplete) return;

    const interval = setInterval(() => {
      setCircleRotation(prev => (prev + 5) % 360);
    }, 50);

    return () => clearInterval(interval);
  }, [currentStep?.phase, isComplete]);

  // Manual continue handler - user MUST click to proceed
  const handleContinue = useCallback(() => {
    onInteraction?.(); // Report interaction to parent for validation tracking
    setConfirmations(prev => prev + 1);
    setShowTransition(false);
    setWaitingForConfirm(false);

    if (currentStepIndex < exercises.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  }, [currentStepIndex, exercises.length, onInteraction]);

  // Timer complete fallback (shouldn't be needed but kept for safety)
  const handleTimerComplete = useCallback(() => {
    if (!isComplete && !showComplete) {
      handleCompleteRef.current?.();
    }
  }, [isComplete, showComplete]);


  const CurrentIcon = currentStep?.icon || Moon;
  const nextStep = exercises[currentStepIndex + 1];
  const NextIcon = nextStep?.icon || Moon;

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
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[350px] relative">
        {/* Step info header - not overlapping content */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="text-xs text-[hsl(var(--tex-vision-text-muted))]">
            Step {currentStepIndex + 1}/{exercises.length}
          </span>
          <span className="text-xs text-[hsl(var(--tex-vision-text-muted))]">•</span>
          <span className="text-sm font-medium text-[hsl(var(--tex-vision-text))]">
            {currentStep?.title}
          </span>
        </div>

        {/* Step timer - top right */}
        <div className="absolute top-4 right-4">
          <span className="text-lg font-bold text-[hsl(var(--tex-vision-feedback))]">
            {stepTimeRemaining}s
          </span>
        </div>

        {/* Completion celebration overlay */}
        {showComplete && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[hsl(var(--tex-vision-primary))]/95 z-20 animate-fade-in rounded-lg">
            <div className="text-6xl mb-4">✨</div>
            <p className="text-2xl font-bold text-[hsl(var(--tex-vision-success))]">
              Complete!
            </p>
            <p className="text-lg text-[hsl(var(--tex-vision-text-muted))] mt-2">
              Great relaxation session
            </p>
          </div>
        )}

        {/* Transition overlay - NO auto-advance, user must click */}
        {showTransition && nextStep && !showComplete && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[hsl(var(--tex-vision-primary))]/90 z-10 animate-fade-in rounded-lg">
            <p className="text-lg text-[hsl(var(--tex-vision-text-muted))] mb-2">Next:</p>
            <div className="flex items-center gap-3 mb-6">
              <NextIcon className="w-8 h-8 text-[hsl(var(--tex-vision-feedback))]" />
              <span className="text-2xl font-bold text-[hsl(var(--tex-vision-text))]">
                {nextStep.title}
              </span>
            </div>
            <button
              onClick={handleContinue}
              className="flex items-center gap-2 px-6 py-3 bg-[hsl(var(--tex-vision-feedback))] text-[hsl(var(--tex-vision-primary-dark))] font-bold rounded-lg hover:scale-105 transition-transform"
            >
              Continue <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Main exercise visualization - icon based, no flashing text */}
        <div className="flex flex-col items-center">
          {/* Animated icon based on phase */}
          <div 
            className={`p-8 rounded-full bg-[hsl(var(--tex-vision-feedback))]/20 transition-all duration-700 ${
              currentStep?.phase === 'breathe' 
                ? breathPhase === 'in' ? 'scale-125' : 'scale-100'
                : ''
            }`}
            style={{
              transform: currentStep?.phase === 'circles' 
                ? `rotate(${circleRotation}deg)` 
                : undefined,
            }}
          >
            <CurrentIcon 
              className={`w-16 h-16 text-[hsl(var(--tex-vision-feedback))] transition-all duration-500 ${
                currentStep?.phase === 'blink' ? 'animate-pulse' : ''
              }`}
            />
          </div>

          {/* Visual cue for breathing - expanding ring, not text */}
          {currentStep?.phase === 'breathe' && (
            <div 
              className="absolute w-40 h-40 rounded-full border-2 border-[hsl(var(--tex-vision-feedback))]/30 transition-all [transition-duration:2000ms]"
              style={{
                transform: `scale(${breathPhase === 'in' ? 1.5 : 1})`,
                opacity: breathPhase === 'in' ? 0.8 : 0.3,
              }}
            />
          )}

          {/* Visual cue for circles - rotating dots */}
          {currentStep?.phase === 'circles' && (
            <div className="absolute w-32 h-32">
              <div 
                className="absolute w-3 h-3 rounded-full bg-[hsl(var(--tex-vision-feedback))]"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: `translate(-50%, -50%) rotate(${circleRotation}deg) translateY(-40px)`,
                }}
              />
            </div>
          )}
        </div>

        {/* Step progress indicators - bottom */}
        <div className="absolute bottom-4 flex gap-2">
          {exercises.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                idx < currentStepIndex
                  ? 'bg-[hsl(var(--tex-vision-success))]'
                  : idx === currentStepIndex
                    ? 'bg-[hsl(var(--tex-vision-feedback))] scale-125'
                    : 'bg-[hsl(var(--tex-vision-primary-light))]/30'
              }`}
            />
          ))}
        </div>
      </div>
    </DrillContainer>
  );
}

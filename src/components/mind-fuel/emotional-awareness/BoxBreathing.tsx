import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Play, Pause, RotateCcw, Check } from 'lucide-react';

type BreathPhase = 'inhale' | 'holdIn' | 'exhale' | 'holdOut' | 'idle' | 'complete';

const PHASE_DURATION = 4000; // 4 seconds per phase
const PHASES: BreathPhase[] = ['inhale', 'holdIn', 'exhale', 'holdOut'];

interface BoxBreathingProps {
  onComplete?: (cycles: number) => void;
}

export default function BoxBreathing({ onComplete }: BoxBreathingProps) {
  const { t } = useTranslation();
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<BreathPhase>('idle');
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [moodBefore, setMoodBefore] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  const phaseLabels: Record<BreathPhase, string> = {
    inhale: t('emotionalAwareness.grounding.boxBreathing.inhale', 'Inhale'),
    holdIn: t('emotionalAwareness.grounding.boxBreathing.holdIn', 'Hold'),
    exhale: t('emotionalAwareness.grounding.boxBreathing.exhale', 'Exhale'),
    holdOut: t('emotionalAwareness.grounding.boxBreathing.holdOut', 'Hold'),
    idle: t('emotionalAwareness.grounding.boxBreathing.ready', 'Ready'),
    complete: t('emotionalAwareness.grounding.boxBreathing.complete', 'Complete'),
  };

  const phaseEmojis: Record<BreathPhase, string> = {
    inhale: '🌬️',
    holdIn: '⏸️',
    exhale: '💨',
    holdOut: '⏸️',
    idle: '🧘',
    complete: '✨',
  };

  useEffect(() => {
    if (!isRunning || phase === 'idle' || phase === 'complete') return;

    // Progress animation
    progressRef.current = setInterval(() => {
      setProgress((prev) => Math.min(prev + (100 / (PHASE_DURATION / 50)), 100));
    }, 50);

    // Phase timer
    timerRef.current = setTimeout(() => {
      setProgress(0);
      const nextIndex = (phaseIndex + 1) % PHASES.length;
      
      if (nextIndex === 0) {
        const newCycles = cyclesCompleted + 1;
        setCyclesCompleted(newCycles);
        
        if (newCycles >= 6) {
          setPhase('complete');
          setIsRunning(false);
          saveSession(newCycles);
          onComplete?.(newCycles);
          return;
        }
      }
      
      setPhaseIndex(nextIndex);
      setPhase(PHASES[nextIndex]);
    }, PHASE_DURATION);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [isRunning, phase, phaseIndex, cyclesCompleted, onComplete]);

  const saveSession = async (cycles: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('mindfulness_sessions').insert({
        user_id: user.id,
        session_type: 'box_breathing',
        technique: 'box_breathing_4_4_4_4',
        duration_seconds: cycles * 16, // 4 phases * 4 seconds
        completed: true,
        mood_before: moodBefore,
      });
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  const handleStart = () => {
    setIsRunning(true);
    setPhase('inhale');
    setPhaseIndex(0);
    setProgress(0);
    setCyclesCompleted(0);
    if (moodBefore === null) {
      setMoodBefore(3); // Default mood
    }
  };

  const handlePause = () => {
    setIsRunning(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
  };

  const handleReset = () => {
    setIsRunning(false);
    setPhase('idle');
    setPhaseIndex(0);
    setProgress(0);
    setCyclesCompleted(0);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
  };

  const getBoxStyles = () => {
    const baseSize = 'w-48 h-48 sm:w-64 sm:h-64';
    const baseClasses = 'rounded-2xl transition-all [transition-duration:4000ms] ease-linear flex items-center justify-center';
    
    switch (phase) {
      case 'inhale':
        return cn(baseClasses, baseSize, 'bg-wellness-sky scale-100 animate-pulse');
      case 'holdIn':
        return cn(baseClasses, baseSize, 'bg-wellness-lavender scale-110');
      case 'exhale':
        return cn(baseClasses, baseSize, 'bg-wellness-sage scale-100');
      case 'holdOut':
        return cn(baseClasses, baseSize, 'bg-wellness-cream scale-90');
      case 'complete':
        return cn(baseClasses, baseSize, 'bg-gradient-to-br from-wellness-sage to-wellness-lavender');
      default:
        return cn(baseClasses, baseSize, 'bg-muted border-2 border-dashed border-muted-foreground/30');
    }
  };

  return (
    <Card className="border-wellness-sage/30 bg-gradient-to-br from-wellness-cream/50 to-white">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="text-2xl">📦</span>
          {t('emotionalAwareness.grounding.boxBreathing.title', 'Box Breathing')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('emotionalAwareness.grounding.boxBreathing.description', '4-4-4-4 breathing technique for calm and focus')}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Breathing Box */}
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className={getBoxStyles()}>
            <div className="text-center">
              <span className="text-4xl sm:text-5xl mb-2 block">{phaseEmojis[phase]}</span>
              <span className="text-lg sm:text-xl font-semibold text-foreground">
                {phaseLabels[phase]}
              </span>
              {isRunning && phase !== 'complete' && (
                <div className="mt-2 text-sm text-muted-foreground">
                  {Math.ceil((PHASE_DURATION - (progress / 100) * PHASE_DURATION) / 1000)}s
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {isRunning && phase !== 'complete' && (
            <div className="w-full max-w-xs h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-50 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Cycles Counter */}
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{cyclesCompleted}/6</p>
            <p className="text-sm text-muted-foreground">
              {t('emotionalAwareness.grounding.boxBreathing.cyclesCompleted', 'Cycles completed')}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-3">
          {phase === 'idle' || phase === 'complete' ? (
            <Button onClick={handleStart} className="gap-2">
              <Play className="w-4 h-4" />
              {phase === 'complete' 
                ? t('emotionalAwareness.grounding.startAgain', 'Start Again')
                : t('emotionalAwareness.grounding.start', 'Start')}
            </Button>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={isRunning ? handlePause : handleStart}
                className="gap-2"
              >
                {isRunning ? (
                  <>
                    <Pause className="w-4 h-4" />
                    {t('emotionalAwareness.grounding.pause', 'Pause')}
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    {t('emotionalAwareness.grounding.resume', 'Resume')}
                  </>
                )}
              </Button>
              <Button variant="ghost" onClick={handleReset} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                {t('emotionalAwareness.grounding.reset', 'Reset')}
              </Button>
            </>
          )}
        </div>

        {/* Completion Message */}
        {phase === 'complete' && (
          <div className="bg-wellness-sage/20 rounded-xl p-4 text-center animate-fade-in">
            <Check className="w-8 h-8 mx-auto text-wellness-sage mb-2" />
            <p className="text-sm font-medium">
              {t('emotionalAwareness.grounding.completed', 'Well done! Take a moment to notice how you feel.')}
            </p>
          </div>
        )}

        {/* Tips */}
        <div className="text-xs text-muted-foreground text-center bg-muted/30 rounded-lg p-3">
          <p>{t('emotionalAwareness.grounding.boxBreathing.recommended', 'Recommended: 4-6 cycles for optimal calming effect')}</p>
        </div>
      </CardContent>
    </Card>
  );
}

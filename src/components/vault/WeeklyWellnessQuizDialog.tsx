import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Target, ChevronRight, ChevronLeft, Sparkles, Trophy, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWeeklyWellnessQuiz } from '@/hooks/useWeeklyWellnessQuiz';
import { ConfettiEffect } from '@/components/bounce-back-bay/ConfettiEffect';
import { toast } from 'sonner';

interface WeeklyWellnessQuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

const MOOD_EMOJIS = ['😔', '😕', '😐', '🙂', '😄'];
const STRESS_EMOJIS = ['😌', '🙂', '😐', '😰', '😫'];
const DISCIPLINE_EMOJIS = ['💤', '🚶', '🏃', '💪', '🔥'];

const MOOD_LABELS = ['Low', 'Below Avg', 'Neutral', 'Good', 'Excellent'];
const STRESS_LABELS = ['Very Low', 'Low', 'Moderate', 'High', 'Very High'];
const DISCIPLINE_LABELS = ['Minimal', 'Light', 'Moderate', 'Strong', 'Elite'];

export function WeeklyWellnessQuizDialog({ open, onOpenChange, onComplete }: WeeklyWellnessQuizDialogProps) {
  const { t } = useTranslation();
  const { lastWeekGoals, lastWeekAverages, saveGoals } = useWeeklyWellnessQuiz();
  
  const [step, setStep] = useState(0);
  const [moodTarget, setMoodTarget] = useState(4);
  const [stressTarget, setStressTarget] = useState(2);
  const [disciplineTarget, setDisciplineTarget] = useState(4);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep(0);
      setMoodTarget(lastWeekGoals?.target_mood_level || 4);
      setStressTarget(lastWeekGoals?.target_stress_level || 2);
      setDisciplineTarget(lastWeekGoals?.target_discipline_level || 4);
      setShowSuccess(false);
      setShowConfetti(false);
    }
  }, [open, lastWeekGoals]);

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    const result = await saveGoals({
      mood: moodTarget,
      stress: stressTarget,
      discipline: disciplineTarget,
    });

    if (result.success) {
      setShowConfetti(true);
      setShowSuccess(true);
      toast.success(t('weeklyWellnessQuiz.successToast'));
      setTimeout(() => {
        onOpenChange(false);
        onComplete?.();
      }, 2500);
    } else {
      toast.error(t('weeklyWellnessQuiz.errorToast'));
    }
    setIsSubmitting(false);
  };

  const getComparisonIndicator = (actual: number | null, target: number | null, isStress: boolean = false) => {
    if (actual === null || target === null) return null;
    
    // For stress, lower is better (so we invert the comparison)
    const metGoal = isStress ? actual <= target : actual >= target;
    
    if (metGoal) {
      return (
        <span className="flex items-center gap-1 text-green-400 text-xs font-bold">
          <TrendingUp className="h-3 w-3" />
          {t('weeklyWellnessQuiz.metGoal')}
        </span>
      );
    } else {
      return (
        <span className="flex items-center gap-1 text-amber-400 text-xs font-bold">
          <TrendingDown className="h-3 w-3" />
          {t('weeklyWellnessQuiz.missedGoal')}
        </span>
      );
    }
  };

  const renderSlider = (
    value: number,
    onChange: (val: number) => void,
    emojis: string[],
    labels: string[],
    color: string,
    lastWeekTarget?: number | null,
    lastWeekActual?: number | null,
    isStress: boolean = false
  ) => (
    <div className="space-y-6">
      {/* Current selection display */}
      <div className="flex flex-col items-center gap-2">
        <div className={cn(
          "text-7xl transition-all duration-300 transform",
          "animate-bounce-subtle"
        )}>
          {emojis[value - 1]}
        </div>
        <span className={cn(
          "text-xl font-black uppercase tracking-wider",
          color
        )}>
          {labels[value - 1]}
        </span>
      </div>

      {/* Slider */}
      <div className="relative px-4">
        <Slider
          value={[value]}
          onValueChange={(vals) => onChange(vals[0])}
          min={1}
          max={5}
          step={1}
          className="cursor-pointer"
        />
        <div className="flex justify-between mt-2 px-1">
          {emojis.map((emoji, idx) => (
            <button
              key={idx}
              onClick={() => onChange(idx + 1)}
              className={cn(
                "text-2xl transition-all duration-200 hover:scale-125",
                value === idx + 1 ? "scale-110 opacity-100" : "opacity-40 hover:opacity-70"
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Last week comparison */}
      {lastWeekTarget && (
        <div className="mt-6 p-4 rounded-xl bg-background/30 border border-border/30 space-y-2">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t('weeklyWellnessQuiz.lastWeekResults')}
          </span>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{emojis[lastWeekTarget - 1]}</span>
              <span className="text-sm text-muted-foreground">
                {t('weeklyWellnessQuiz.target')}: {labels[lastWeekTarget - 1]}
              </span>
            </div>
            {lastWeekActual !== null && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground font-medium">
                  {t('weeklyWellnessQuiz.actual')}: {lastWeekActual.toFixed(1)}
                </span>
                {getComparisonIndicator(lastWeekActual, lastWeekTarget, isStress)}
              </div>
            )}
          </div>
        </div>
      )}

      {!lastWeekTarget && (
        <div className={cn(
          "mt-6 p-5 rounded-2xl",
          "bg-gradient-to-br from-primary/10 via-background/95 to-background",
          "border border-primary/20",
          "shadow-lg shadow-primary/5",
          "animate-fade-in"
        )}>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-primary/15 text-primary shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-foreground text-base">
                {t('weeklyWellnessQuiz.firstWeekTitle')}
              </h4>
              <p className="text-sm text-foreground/90">
                {t('weeklyWellnessQuiz.firstWeekMessage')}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {t('weeklyWellnessQuiz.firstWeekEncouragement')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const steps = [
    {
      titleKey: 'weeklyWellnessQuiz.step1Title',
      descriptionKey: 'weeklyWellnessQuiz.step1Description',
      color: 'text-emerald-400',
      bgColor: 'from-emerald-500/30 via-teal-500/20 to-cyan-500/30',
      render: () => renderSlider(
        moodTarget,
        setMoodTarget,
        MOOD_EMOJIS,
        MOOD_LABELS,
        'text-emerald-400',
        lastWeekGoals?.target_mood_level,
        lastWeekAverages.avgMood
      ),
    },
    {
      titleKey: 'weeklyWellnessQuiz.step2Title',
      descriptionKey: 'weeklyWellnessQuiz.step2Description',
      color: 'text-purple-400',
      bgColor: 'from-purple-500/30 via-violet-500/20 to-fuchsia-500/30',
      render: () => renderSlider(
        stressTarget,
        setStressTarget,
        STRESS_EMOJIS,
        STRESS_LABELS,
        'text-purple-400',
        lastWeekGoals?.target_stress_level,
        lastWeekAverages.avgStress,
        true
      ),
    },
    {
      titleKey: 'weeklyWellnessQuiz.step3Title',
      descriptionKey: 'weeklyWellnessQuiz.step3Description',
      color: 'text-amber-400',
      bgColor: 'from-amber-500/30 via-orange-500/20 to-red-500/30',
      render: () => renderSlider(
        disciplineTarget,
        setDisciplineTarget,
        DISCIPLINE_EMOJIS,
        DISCIPLINE_LABELS,
        'text-amber-400',
        lastWeekGoals?.target_discipline_level,
        lastWeekAverages.avgDiscipline
      ),
    },
  ];

  const currentStep = steps[step];

  if (showSuccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md p-0 border-0 bg-transparent max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">{t('weeklyWellnessQuiz.successTitle')}</DialogTitle>
          <DialogDescription className="sr-only">{t('weeklyWellnessQuiz.successMessage')}</DialogDescription>
          {showConfetti && <ConfettiEffect particleCount={100} duration={2500} />}
          <div className="relative bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-cyan-500/20 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-8">
            {/* Animated background orbs */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl animate-pulse" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-cyan-500/20 rounded-full blur-2xl animate-pulse delay-500" />
            </div>

            <div className="relative flex flex-col items-center gap-6 text-center">
              <div className="p-4 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30 animate-bounce-subtle">
                <Trophy className="h-10 w-10 text-white" />
              </div>
              
              <div>
                <h2 className="text-2xl font-black text-foreground mb-2">
                  {t('weeklyWellnessQuiz.successTitle')}
                </h2>
                <p className="text-muted-foreground">
                  {t('weeklyWellnessQuiz.successMessage')}
                </p>
              </div>

              {/* Goals summary */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-background/30 border border-border/30">
                <div className="text-center">
                  <div className="text-2xl">{MOOD_EMOJIS[moodTarget - 1]}</div>
                  <span className="text-xs text-emerald-400 font-bold">{t('weeklyWellnessQuiz.mood')}</span>
                </div>
                <div className="w-px h-8 bg-border/50" />
                <div className="text-center">
                  <div className="text-2xl">{STRESS_EMOJIS[stressTarget - 1]}</div>
                  <span className="text-xs text-purple-400 font-bold">{t('weeklyWellnessQuiz.stress')}</span>
                </div>
                <div className="w-px h-8 bg-border/50" />
                <div className="text-center">
                  <div className="text-2xl">{DISCIPLINE_EMOJIS[disciplineTarget - 1]}</div>
                  <span className="text-xs text-amber-400 font-bold">{t('weeklyWellnessQuiz.discipline')}</span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 border-0 bg-transparent max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">{t('weeklyWellnessQuiz.title')}</DialogTitle>
        <DialogDescription className="sr-only">{t('weeklyWellnessQuiz.subtitle')}</DialogDescription>
        <div className={cn(
          "relative bg-gradient-to-br backdrop-blur-xl border rounded-2xl p-6",
          currentStep.bgColor,
          "border-primary/30"
        )}>
          {/* Animated background orbs */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-primary/10 rounded-full blur-3xl animate-pulse delay-700" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/5 rounded-full blur-2xl animate-pulse delay-300" />
          </div>

          <div className="relative space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-black text-foreground uppercase tracking-tight">
                  {t('weeklyWellnessQuiz.title')}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('weeklyWellnessQuiz.subtitle')}
              </p>
            </div>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    idx === step 
                      ? "w-8 bg-primary shadow-lg shadow-primary/30" 
                      : idx < step 
                        ? "w-2 bg-primary/60" 
                        : "w-2 bg-muted/30"
                  )}
                />
              ))}
            </div>

            {/* Step content */}
            <div className="space-y-4">
              <div className="text-center">
                <h3 className={cn("text-lg font-black uppercase tracking-wider", currentStep.color)}>
                  {t(currentStep.titleKey)}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t(currentStep.descriptionKey)}
                </p>
              </div>

              {currentStep.render()}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-4 pt-4">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={step === 0}
                className={cn(
                  "gap-2 transition-opacity",
                  step === 0 ? "opacity-0 pointer-events-none" : "opacity-100"
                )}
              >
                <ChevronLeft className="h-4 w-4" />
                {t('weeklyWellnessQuiz.back')}
              </Button>

              {step < 2 ? (
                <Button
                  onClick={handleNext}
                  className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                >
                  {t('weeklyWellnessQuiz.next')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={isSubmitting}
                  className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold shadow-lg shadow-emerald-500/30"
                >
                  {isSubmitting ? (
                    <>
                      <Sparkles className="h-4 w-4 animate-spin" />
                      {t('weeklyWellnessQuiz.completing')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      {t('weeklyWellnessQuiz.complete')}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Custom animation styles */}
        <style>{`
          @keyframes bounce-subtle {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
          }
          .animate-bounce-subtle {
            animation: bounce-subtle 2s ease-in-out infinite;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}

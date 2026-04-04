import { CheckCircle2, TrendingUp, Target, Flame, Sparkles } from 'lucide-react';
import { useNutritionFeedback } from '@/hooks/useNutritionFeedback';
import { usePerformanceMode } from '@/hooks/usePerformanceMode';
import type { MealLogData } from './MealLogCard';
import type { NutritionGuidance } from '@/hooks/useNutritionGuidance';
import { cn } from '@/lib/utils';

interface NutritionFeedbackStripProps {
  date: Date;
  meals: MealLogData[];
  guidanceData: NutritionGuidance | undefined;
}

export function NutritionFeedbackStrip({ date, meals, guidanceData }: NutritionFeedbackStripProps) {
  const { config } = usePerformanceMode();
  const feedback = useNutritionFeedback(date, meals, guidanceData, config.rdaMultiplier);

  if (!feedback) return null;

  // CASE D — Zero data: single line only
  if (feedback.zeroData) {
    return (
      <div className="rounded-lg bg-muted/30 px-3 py-2">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Target className="h-3 w-3 shrink-0" />
          {feedback.goal}
        </p>
      </div>
    );
  }

  // CASE C — Streak ≥3: Streak badge + Identity + Goal (3 lines)
  if (feedback.streak >= 3 && feedback.identityFrame) {
    return (
      <div className="rounded-lg bg-muted/30 px-3 py-2 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            <Flame className="h-3 w-3" />
            {feedback.streak}-day streak
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-primary/80 italic">
          <Sparkles className="h-3 w-3 shrink-0" />
          <span>{feedback.identityFrame}</span>
        </div>
        {feedback.goal && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Target className="h-3 w-3 shrink-0 text-amber-500" />
            <span>{feedback.goal}</span>
          </div>
        )}
      </div>
    );
  }

  // CASE A — Reward + Progression + Goal (max 3 lines)
  if (feedback.reward) {
    return (
      <div className="rounded-lg bg-muted/30 px-3 py-2 space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3 w-3 shrink-0" />
          <span className="font-medium">
            +{feedback.reward.deltaPercent}% {feedback.reward.nutrient} → {feedback.reward.outcome}
          </span>
        </div>
        {feedback.progression && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3 shrink-0 text-blue-500" />
            <span>
              {feedback.progression.nutrient}: {feedback.progression.fromPercent}% → {feedback.progression.toPercent}% today
              <span className={cn(
                'ml-1 font-semibold',
                feedback.progression.delta > 10 ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400',
              )}>
                (+{feedback.progression.delta}%)
              </span>
            </span>
          </div>
        )}
        {feedback.goal && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Target className="h-3 w-3 shrink-0 text-amber-500" />
            <span>{feedback.goal}</span>
          </div>
        )}
      </div>
    );
  }

  // CASE B — Nudge + Goal (2 lines)
  if (feedback.nudge || feedback.goal) {
    return (
      <div className="rounded-lg bg-muted/30 px-3 py-2 space-y-1.5">
        {feedback.nudge && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 shrink-0" />
            <span>{feedback.nudge}</span>
          </div>
        )}
        {feedback.goal && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Target className="h-3 w-3 shrink-0 text-amber-500" />
            <span>{feedback.goal}</span>
          </div>
        )}
      </div>
    );
  }

  return null;
}

import { CheckCircle2, TrendingUp, Target, Flame, Sparkles } from 'lucide-react';
import { useNutritionFeedback, type FeedbackData } from '@/hooks/useNutritionFeedback';
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

  // Zero-data: single line only
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

  const hasAnySignal = feedback.reward || feedback.progression || feedback.identityFrame || feedback.nudge || feedback.goal;
  if (!hasAnySignal) return null;

  return (
    <div className="rounded-lg bg-muted/30 px-3 py-2 space-y-1.5">
      {/* Streak badge */}
      {feedback.streak >= 2 && (
        <div className="flex items-center gap-1.5 mb-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            <Flame className="h-3 w-3" />
            {feedback.streak}-day streak
          </span>
        </div>
      )}

      {/* Line 1: Reward OR Nudge */}
      {feedback.reward ? (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3 w-3 shrink-0" />
          <span className="font-medium">
            +{feedback.reward.deltaPercent}% {feedback.reward.nutrient} → {feedback.reward.outcome}
          </span>
        </div>
      ) : feedback.nudge ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 shrink-0" />
          <span>{feedback.nudge}</span>
        </div>
      ) : null}

      {/* Line 2: Progression OR Identity */}
      {feedback.progression ? (
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
      ) : feedback.identityFrame ? (
        <div className="flex items-center gap-1.5 text-[11px] text-primary/80 italic">
          <Sparkles className="h-3 w-3 shrink-0" />
          <span>{feedback.identityFrame}</span>
        </div>
      ) : null}

      {/* Line 3: Goal */}
      {feedback.goal && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Target className="h-3 w-3 shrink-0 text-amber-500" />
          <span>{feedback.goal}</span>
        </div>
      )}
    </div>
  );
}

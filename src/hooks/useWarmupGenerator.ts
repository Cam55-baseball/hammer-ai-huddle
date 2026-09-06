import { useState, useCallback } from 'react';
import { Exercise } from '@/types/customActivity';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { AggregatedGoals } from './useAthleteGoalsAggregated';
import {
  buildWarmup,
  type WarmupContext,
  type LifecycleClass,
} from '@/lib/hammer/prescription/warmupLibrary';

/**
 * Warm-up single-authority rule (Pass B, item 4).
 *
 * `warmupLibrary.ts` is the ONE authority that chooses warm-up drills. The
 * former `generate-warmup` LLM call selected its own competing list with no
 * shared legality, dose or single-leg law — it is retired here. The library
 * composes the sequence; the only thing left for prose is the reasoning line,
 * which is copy, not selection.
 */
const CONTEXT_BY_PICKER: Record<string, WarmupContext> = {
  full_practice: 'in_season_practice',
  game: 'game_day',
  throwing_session: 'throwing_day',
  hitting_session: 'hitting_day',
  strength_workout: 'lift_day',
  speed_training: 'speed_day',
  general_activity: 'default',
};

const CONTEXT_COPY: Record<WarmupContext, string> = {
  game_day: 'Game-day neural primer — wake the system up without spending it.',
  in_season_practice: 'Practice-ready prep — enough to move well, not enough to cost you reps.',
  in_season_default: 'In-season maintenance prep — keep the tissue and the nervous system honest.',
  speed_day: 'Speed-day prep — fast-twitch first, then ground force.',
  lift_day: 'Lift-day prep — joints open, positions rehearsed, then load.',
  throwing_day: 'Throwing-day prep — hips and thoracic spine before the arm does anything.',
  hitting_day: 'Hitting-day prep — rotation and separation before the first swing.',
  offseason_extended: 'Offseason extended prep — the long version, because you have the time.',
  recovery_day: 'Recovery-day flow — circulation and range, no load.',
  travel_day: 'Travel-day prep — mobility and hydration, small footprint.',
  default: 'General prep — full-body sequence in the order the body wants it.',
};

function categoryForRole(role: string): WarmupExercise['category'] {
  if (role === 'arm_care') return 'arm-care';
  if (role === 'mobility' || role === 'fascial') return 'general';
  if (role === 'activation') return 'movement-prep';
  return 'dynamic';
}

interface WarmupExercise {
  id: string;
  name: string;
  type: 'flexibility' | 'cardio' | 'baseball';
  category: 'general' | 'dynamic' | 'movement-prep' | 'arm-care';
  duration?: number;
  sets?: number;
  reps?: number;
  rest?: number;
}

interface WarmupResult {
  warmupExercises: WarmupExercise[];
  reasoning: string;
  estimatedDuration: number;
}

interface GenerateWarmupOptions {
  exercises: Exercise[];
  sport?: 'baseball' | 'softball';
  personalize?: boolean;
  goals?: AggregatedGoals;
  warmupContext?: string;
  /** Athlete's declared equipment inventory — drills are limited to this. */
  equipment?: string[];
  venue?: string | null;
}

export function useWarmupGenerator() {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [warmupResult, setWarmupResult] = useState<WarmupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateWarmup = useCallback(async (options: GenerateWarmupOptions) => {
    const { exercises, warmupContext, equipment, venue } = options;

    // The AI-credit gate is gone with the AI call — this path now composes
    // locally from the warm-up library and costs nothing to run.

    // For a warm-up activity the context picker is the input; everywhere else
    // the builder still needs exercises on the timeline first.
    const isWarmupActivity = warmupContext !== undefined;
    if (exercises.length === 0 && !isWarmupActivity) {
      toast.error(t('workoutBuilder.warmup.addExercisesFirst', 'Add exercises to your workout first'));
      return null;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const context: WarmupContext =
        (warmupContext && CONTEXT_BY_PICKER[warmupContext]) || 'default';
      // Custom-activity builder has no lifecycle signal, so the safest true
      // class is the conservative one — it never over-prescribes.
      const lifecycle: LifecycleClass = 'intermediate';
      const now = new Date();
      const daySeed =
        now.getUTCFullYear() * 366 + now.getUTCMonth() * 31 + now.getUTCDate();

      const built = buildWarmup({
        context,
        lifecycle,
        gameDay: context === 'game_day',
        daySeed,
        equipment: equipment ?? [],
        venue: venue ?? null,
      });

      const warmupExercises: WarmupExercise[] = built.drills.map((d, i) => ({
        id: d.slug || `warmup-${i}`,
        name: d.name,
        type: 'flexibility',
        category: categoryForRole(d.role),
        duration: undefined,
        sets: undefined,
        reps: undefined,
        rest: 0,
      }));

      const result: WarmupResult = {
        warmupExercises,
        reasoning: CONTEXT_COPY[context],
        estimatedDuration: built.estMinutes,
      };

      if (warmupExercises.length === 0) {
        const message = t(
          'workoutBuilder.warmup.empty',
          'No warm-up drills match your equipment yet.',
        );
        setError(message);
        toast.error(message);
        return null;
      }

      setWarmupResult(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to build warmup';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [t]);

  const clearWarmup = useCallback(() => {
    setWarmupResult(null);
    setError(null);
  }, []);

  // Convert warmup exercises to standard Exercise format for timeline
  const convertToExercises = useCallback((warmupExercises: WarmupExercise[]): Exercise[] => {
    return warmupExercises.map((ex, index) => ({
      id: `warmup-${ex.id}-${Date.now()}-${index}`,
      name: ex.name,
      type: ex.type === 'baseball' ? 'baseball' : ex.type === 'cardio' ? 'cardio' : 'flexibility',
      duration: ex.duration,
      sets: ex.sets,
      reps: ex.reps,
      rest: ex.rest || 0,
    }));
  }, []);

  return {
    generateWarmup,
    isGenerating,
    warmupResult,
    error,
    clearWarmup,
    convertToExercises,
  };
}

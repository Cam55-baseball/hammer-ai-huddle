import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  WorkoutRecommendation, 
  WorkoutRecommendationsResponse,
  RecoveryContext,
  ExerciseWithWarning 
} from '@/types/workoutRecommendation';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { filterExercisesForPain } from '@/utils/painExerciseFilter';
import { POOR_RECOVERY_MAX } from '@/lib/readiness/recoveryScale';
import { useHammerAthleteContext } from '@/lib/hammer/context/athleteContext';
import { projectEnvelope, toEdgeFunctionPayload } from '@/lib/hammer/context/decisionFilters';

export interface RecoveryWarning {
  show: boolean;
  severity: 'moderate' | 'high';
  reason: string;
  suggestions: string[];
}

export interface UseWorkoutRecommendationsResult {
  recommendations: WorkoutRecommendation[];
  lighterAlternatives: WorkoutRecommendation[];
  recoveryWarning: RecoveryWarning | null;
  recoveryContext: RecoveryContext | null;
  isLoading: boolean;
  error: string | null;
  generateRecommendations: () => Promise<void>;
  clearRecommendations: () => void;
}

/**
 * Turn the latest check-in into this feature's recovery context.
 * Owner Nov 9 ("no mental measurement"): stress is not read or used here.
 */
export function deriveRecoveryContext(latestQuiz: {
  sleep_quality?: number | null;
  physical_readiness?: number | null;
  perceived_recovery?: number | null;
  pain_location?: unknown;
  pain_scales?: unknown;
}): RecoveryContext {
  const sleepQuality = latestQuiz.sleep_quality ?? null;
  const physicalReadiness = latestQuiz.physical_readiness ?? null;
  const perceivedRecovery = latestQuiz.perceived_recovery ?? null;
  const painAreas = (latestQuiz.pain_location as string[]) || [];
  const painScales = (latestQuiz.pain_scales as Record<string, number> | null) ?? null;

  // Determine if recovery should be suggested
  let suggestRecovery = false;
  let recoveryReason: string | null = null;

  if (sleepQuality !== null && sleepQuality <= 2) {
    suggestRecovery = true;
    recoveryReason = 'Low sleep quality detected';
  } else if (painAreas.length >= 3) {
    suggestRecovery = true;
    recoveryReason = 'Multiple pain areas reported';
  } else if (physicalReadiness !== null && physicalReadiness <= 2) {
    suggestRecovery = true;
    recoveryReason = 'Low physical readiness';
  } else if (perceivedRecovery !== null && perceivedRecovery <= POOR_RECOVERY_MAX) {
    suggestRecovery = true;
    recoveryReason = 'Incomplete recovery from previous training';
  }

  // Check average pain intensity
  if (painScales && Object.keys(painScales).length > 0) {
    const avgPain = Object.values(painScales).reduce((sum, v) => sum + v, 0) / Object.keys(painScales).length;
    if (avgPain >= 7 && !suggestRecovery) {
      suggestRecovery = true;
      recoveryReason = 'High pain intensity detected';
    }
  }

  return {
    sleepQuality,
    physicalReadiness,
    perceivedRecovery,
    painAreas,
    painScales,
    suggestRecovery,
    recoveryReason,
  };
}

type DayCheckInRow = {
  sleep_quality?: number | null;
  physical_readiness?: number | null;
  perceived_recovery?: number | null;
  pain_location?: unknown;
  pain_scales?: unknown;
  created_at?: string | null;
};

/**
 * Owner Nov 10: combine ALL of one day's check-ins. Sleep quality, physical readiness and
 * perceived recovery come from the most recent real answer that day (a blank never
 * overwrites a real answer); pain areas and per-area scales come from any check-in that
 * day, keeping the higher scale when an area repeats.
 */
export function mergeDayCheckIns(rows: readonly DayCheckInRow[]) {
  const ordered = rows
    .map((r, idx) => {
      const t = r.created_at ? Date.parse(r.created_at) : NaN;
      return { r, idx, at: Number.isFinite(t) ? t : -Infinity };
    })
    .sort((a, b) => a.at - b.at || a.idx - b.idx);
  const real = (v: unknown): number | null =>
    v == null || (typeof v === 'string' && v.trim() === '') || !Number.isFinite(Number(v)) ? null : Number(v);
  let sleep_quality: number | null = null;
  let physical_readiness: number | null = null;
  let perceived_recovery: number | null = null;
  const areas: string[] = [];
  const scales: Record<string, number> = {};
  for (const { r } of ordered) {
    sleep_quality = real(r.sleep_quality) ?? sleep_quality;
    physical_readiness = real(r.physical_readiness) ?? physical_readiness;
    perceived_recovery = real(r.perceived_recovery) ?? perceived_recovery;
    for (const a of Array.isArray(r.pain_location) ? (r.pain_location as unknown[]) : []) {
      if (typeof a === 'string' && a && !areas.includes(a)) areas.push(a);
    }
    if (r.pain_scales && typeof r.pain_scales === 'object') {
      for (const [k, v] of Object.entries(r.pain_scales as Record<string, unknown>)) {
        const n = real(v);
        if (n === null) continue;
        scales[k] = k in scales ? Math.max(scales[k], n) : n;
      }
    }
  }
  return {
    sleep_quality,
    physical_readiness,
    perceived_recovery,
    pain_location: areas,
    pain_scales: Object.keys(scales).length > 0 ? scales : null,
  };
}

/**
 * Fetch the most recent check-in day for recovery context (every check-in that day).
 */
async function fetchRecoveryContext(userId: string): Promise<RecoveryContext | null> {
  try {
    const { data: latestQuiz, error } = await supabase
      .from('vault_focus_quizzes')
      .select('entry_date')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[useWorkoutRecommendations] Error fetching check-in data:', error);
      return null;
    }

    if (!latestQuiz) {
      return null;
    }

    const { data: dayRows, error: dayError } = await supabase
      .from('vault_focus_quizzes')
      .select('sleep_quality, pain_location, pain_scales, physical_readiness, perceived_recovery, created_at')
      .eq('user_id', userId)
      .eq('entry_date', latestQuiz.entry_date)
      .order('created_at', { ascending: true });

    if (dayError) {
      console.error('[useWorkoutRecommendations] Error fetching check-in data:', dayError);
      return null;
    }

    if (!dayRows || dayRows.length === 0) {
      return null;
    }

    return deriveRecoveryContext(mergeDayCheckIns(dayRows));
  } catch (err) {
    console.error('[useWorkoutRecommendations] Error in fetchRecoveryContext:', err);
    return null;
  }
}

/**
 * Apply pain-based warnings to exercises
 * "Warn + show anyway" strategy - exercises are shown with warnings, not blocked
 */
function applyPainWarningsToExercises(
  exercises: ExerciseWithWarning[],
  painAreas: string[],
  painScales: Record<string, number> | null
): ExerciseWithWarning[] {
  if (!painAreas.length) return exercises;

  const exerciseNames = exercises.map(ex => ex.name);
  const filterResult = filterExercisesForPain(exerciseNames, painAreas, painScales || undefined);

  return exercises.map(exercise => {
    const warningInfo = filterResult.warned.find(w => w.exercise === exercise.name);
    
    if (warningInfo) {
      return {
        ...exercise,
        painWarning: {
          severity: warningInfo.reason.includes('High pain') ? 'high' : 'moderate',
          message: warningInfo.reason,
          affectedAreas: warningInfo.painAreas.map(area => 
            area.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          ),
        },
      };
    }
    
    return exercise;
  });
}

export function useWorkoutRecommendations(): UseWorkoutRecommendationsResult {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<WorkoutRecommendation[]>([]);
  const [lighterAlternatives, setLighterAlternatives] = useState<WorkoutRecommendation[]>([]);
  const [recoveryWarning, setRecoveryWarning] = useState<RecoveryWarning | null>(null);
  const [recoveryContext, setRecoveryContext] = useState<RecoveryContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // P0-3 (RFL-029): spine envelope forwarded to edge function for context-aware filtering/rerank.
  const athleteCtx = useHammerAthleteContext();

  const generateRecommendations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Fetch recovery context from latest check-in (parallel with activity logs)
      const [recoveryCtx, activityLogsResult] = await Promise.all([
        fetchRecoveryContext(user.id),
        (async () => {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          return supabase
            .from('custom_activity_logs')
            .select(`
              id,
              entry_date,
              completed,
              actual_duration_minutes,
              performance_data,
              template_id,
              custom_activity_templates (
                id,
                title,
                activity_type,
                exercises,
                intensity,
                duration_minutes
              )
            `)
            .eq('user_id', user.id)
            .gte('entry_date', thirtyDaysAgo.toISOString().split('T')[0])
            .order('entry_date', { ascending: false });
        })()
      ]);

      if (activityLogsResult.error) throw activityLogsResult.error;

      setRecoveryContext(recoveryCtx);

      // Call edge function with recovery context + athlete spine projection
      const athletePayload = toEdgeFunctionPayload(projectEnvelope(athleteCtx));
      const { data, error: functionError } = await supabase.functions.invoke('recommend-workout', {
        body: { 
          activityLogs: activityLogsResult.data || [],
          recoveryContext: recoveryCtx,
          athleteContext: athletePayload,
        },
      });

      if (functionError) throw functionError;

      const response = data as WorkoutRecommendationsResponse;

      // Set recovery warning from API response
      if (response.recoveryWarning) {
        setRecoveryWarning(response.recoveryWarning);
      } else {
        setRecoveryWarning(null);
      }

      // Apply client-side pain warnings to exercises ("Warn + show anyway")
      if (response.recommendations) {
        const processedRecommendations = response.recommendations.map(rec => ({
          ...rec,
          exercises: applyPainWarningsToExercises(
            rec.exercises,
            recoveryCtx?.painAreas || [],
            recoveryCtx?.painScales || null
          ),
        }));
        setRecommendations(processedRecommendations);
      } else {
        setRecommendations([]);
      }

      // Process lighter alternatives if provided
      if (response.lighterAlternatives && response.lighterAlternatives.length > 0) {
        const processedAlternatives = response.lighterAlternatives.map(rec => ({
          ...rec,
          exercises: applyPainWarningsToExercises(
            rec.exercises,
            recoveryCtx?.painAreas || [],
            recoveryCtx?.painScales || null
          ),
        }));
        setLighterAlternatives(processedAlternatives);
      } else {
        setLighterAlternatives([]);
      }

    } catch (err) {
      console.error('[useWorkoutRecommendations] Error generating recommendations:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: t('aiRecommendations.error'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [t, toast, athleteCtx]);

  const clearRecommendations = useCallback(() => {
    setRecommendations([]);
    setLighterAlternatives([]);
    setRecoveryWarning(null);
    setRecoveryContext(null);
    setError(null);
  }, []);

  return {
    recommendations,
    lighterAlternatives,
    recoveryWarning,
    recoveryContext,
    isLoading,
    error,
    generateRecommendations,
    clearRecommendations,
  };
}

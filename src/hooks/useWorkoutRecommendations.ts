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
 * Fetch the latest check-in data for recovery context
 */
async function fetchRecoveryContext(userId: string): Promise<RecoveryContext | null> {
  try {
    const { data: latestQuiz, error } = await supabase
      .from('vault_focus_quizzes')
      .select('sleep_quality, stress_level, pain_location, pain_scales, physical_readiness, perceived_recovery')
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

    const sleepQuality = latestQuiz.sleep_quality ?? null;
    const stressLevel = latestQuiz.stress_level ?? null;
    const physicalReadiness = latestQuiz.physical_readiness ?? null;
    const perceivedRecovery = latestQuiz.perceived_recovery ?? null;
    const painAreas = (latestQuiz.pain_location as string[]) || [];
    const painScales = latestQuiz.pain_scales as Record<string, number> | null;

    // Determine if recovery should be suggested
    let suggestRecovery = false;
    let recoveryReason: string | null = null;

    if (sleepQuality !== null && sleepQuality <= 2) {
      suggestRecovery = true;
      recoveryReason = 'Low sleep quality detected';
    } else if (stressLevel !== null && stressLevel >= 4) {
      suggestRecovery = true;
      recoveryReason = 'High stress levels detected';
    } else if (painAreas.length >= 3) {
      suggestRecovery = true;
      recoveryReason = 'Multiple pain areas reported';
    } else if (physicalReadiness !== null && physicalReadiness <= 2) {
      suggestRecovery = true;
      recoveryReason = 'Low physical readiness';
    } else if (perceivedRecovery !== null && perceivedRecovery <= 2) {
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
      stressLevel,
      physicalReadiness,
      perceivedRecovery,
      painAreas,
      painScales,
      suggestRecovery,
      recoveryReason,
    };
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

      // Call edge function with recovery context
      const { data, error: functionError } = await supabase.functions.invoke('recommend-workout', {
        body: { 
          activityLogs: activityLogsResult.data || [],
          recoveryContext: recoveryCtx,
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
  }, [t, toast]);

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

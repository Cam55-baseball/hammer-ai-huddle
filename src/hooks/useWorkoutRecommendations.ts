import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WorkoutRecommendation, WorkoutRecommendationsResponse } from '@/types/workoutRecommendation';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export function useWorkoutRecommendations() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<WorkoutRecommendation[]>([]);
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

      // Fetch recent activity logs (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: activityLogs, error: logsError } = await supabase
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

      if (logsError) throw logsError;

      // Call edge function for AI recommendations
      const { data, error: functionError } = await supabase.functions.invoke('recommend-workout', {
        body: { activityLogs: activityLogs || [] },
      });

      if (functionError) throw functionError;

      if (data?.recommendations) {
        setRecommendations(data.recommendations);
      } else {
        setRecommendations([]);
      }
    } catch (err) {
      console.error('Error generating recommendations:', err);
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
    setError(null);
  }, []);

  return {
    recommendations,
    isLoading,
    error,
    generateRecommendations,
    clearRecommendations,
  };
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function usePerformanceMode() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: performanceMode = false, isLoading } = useQuery({
    queryKey: ['performanceMode', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from('athlete_mpi_settings')
        .select('performance_mode')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as any)?.performance_mode === true;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const { mutateAsync: setPerformanceMode } = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('athlete_mpi_settings')
        .update({ performance_mode: enabled } as any)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performanceMode'] });
      queryClient.invalidateQueries({ queryKey: ['nutritionScore'] });
      queryClient.invalidateQueries({ queryKey: ['nutritionTrends'] });
      queryClient.invalidateQueries({ queryKey: ['deficiencyAlerts'] });
    },
  });

  // Performance mode config
  const config = {
    rdaMultiplier: performanceMode ? 1.25 : 1.0,
    hydrationWeight: performanceMode ? 30 : 20,
    macroWeight: performanceMode ? 25 : 25,
    microWeight: performanceMode ? 35 : 40,
    varietyWeight: performanceMode ? 10 : 15,
    deficiencyThreshold: performanceMode ? 85 : 75,
    macroDeviationPenalty: performanceMode ? 6 : 3,
  };

  return {
    performanceMode,
    isLoading,
    setPerformanceMode,
    config,
  };
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type SeasonStatus = 'in_season' | 'preseason' | 'post_season';

interface SeasonData {
  season_status: SeasonStatus;
  season_start_date: string | null;
  season_end_date: string | null;
}

export function useSeasonStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['season-status', user?.id],
    queryFn: async (): Promise<SeasonData> => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('athlete_mpi_settings')
        .select('season_status, season_start_date, season_end_date')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return {
        season_status: (data?.season_status as SeasonStatus) ?? 'in_season',
        season_start_date: data?.season_start_date ?? null,
        season_end_date: data?.season_end_date ?? null,
      };
    },
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: async (updates: Partial<SeasonData>) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('athlete_mpi_settings')
        .update(updates)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['season-status', user?.id] });
    },
    onError: () => {
      toast.error('Failed to save season status');
    },
  });

  return {
    seasonStatus: query.data?.season_status ?? 'in_season',
    seasonStartDate: query.data?.season_start_date ?? null,
    seasonEndDate: query.data?.season_end_date ?? null,
    isLoading: query.isLoading,
    updateSeasonStatus: mutation.mutate,
  };
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type SeasonStatus = 'in_season' | 'preseason' | 'post_season';

interface SeasonData {
  season_status: SeasonStatus;
  preseason_start_date: string | null;
  preseason_end_date: string | null;
  in_season_start_date: string | null;
  in_season_end_date: string | null;
  post_season_start_date: string | null;
  post_season_end_date: string | null;
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
        .select('season_status, preseason_start_date, preseason_end_date, in_season_start_date, in_season_end_date, post_season_start_date, post_season_end_date')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return {
        season_status: (data?.season_status as SeasonStatus) ?? 'in_season',
        preseason_start_date: data?.preseason_start_date ?? null,
        preseason_end_date: data?.preseason_end_date ?? null,
        in_season_start_date: data?.in_season_start_date ?? null,
        in_season_end_date: data?.in_season_end_date ?? null,
        post_season_start_date: data?.post_season_start_date ?? null,
        post_season_end_date: data?.post_season_end_date ?? null,
      };
    },
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: async (updates: Partial<SeasonData>) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('athlete_mpi_settings')
        .upsert(
          { user_id: user.id, sport: 'baseball', ...updates },
          { onConflict: 'user_id' }
        );
      if (error) throw error;
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['season-status', user?.id] });
      const previous = queryClient.getQueryData<SeasonData>(['season-status', user?.id]);
      queryClient.setQueryData<SeasonData>(['season-status', user?.id], (old) => ({
        season_status: old?.season_status ?? 'in_season',
        preseason_start_date: old?.preseason_start_date ?? null,
        preseason_end_date: old?.preseason_end_date ?? null,
        in_season_start_date: old?.in_season_start_date ?? null,
        in_season_end_date: old?.in_season_end_date ?? null,
        post_season_start_date: old?.post_season_start_date ?? null,
        post_season_end_date: old?.post_season_end_date ?? null,
        ...updates,
      }));
      return { previous };
    },
    onError: (_err, _updates, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['season-status', user?.id], context.previous);
      }
      toast.error('Failed to save season status');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['season-status', user?.id] });
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

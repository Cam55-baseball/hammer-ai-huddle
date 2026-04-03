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
        .select('season_status, preseason_start_date, preseason_end_date, in_season_start_date, in_season_end_date, post_season_start_date, post_season_end_date')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      const status = ((data as any)?.season_status as SeasonStatus) ?? 'in_season';
      // Map current season phase to its date range
      let startDate: string | null = null;
      let endDate: string | null = null;
      if (data) {
        const d = data as any;
        if (status === 'in_season') {
          startDate = d.in_season_start_date;
          endDate = d.in_season_end_date;
        } else if (status === 'preseason') {
          startDate = d.preseason_start_date;
          endDate = d.preseason_end_date;
        } else if (status === 'post_season') {
          startDate = d.post_season_start_date;
          endDate = d.post_season_end_date;
        }
      }
      return {
        season_status: status,
        season_start_date: startDate ?? null,
        season_end_date: endDate ?? null,
      };
    },
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: async (updates: Partial<SeasonData>) => {
      if (!user) throw new Error('Not authenticated');
      // Map generic start/end to season-specific columns
      const dbUpdates: Record<string, any> = {};
      if (updates.season_status) dbUpdates.season_status = updates.season_status;
      // Use current or updated status to determine which date columns to write
      const targetStatus = updates.season_status ?? query.data?.season_status ?? 'in_season';
      if (updates.season_start_date !== undefined) {
        if (targetStatus === 'in_season') dbUpdates.in_season_start_date = updates.season_start_date;
        else if (targetStatus === 'preseason') dbUpdates.preseason_start_date = updates.season_start_date;
        else if (targetStatus === 'post_season') dbUpdates.post_season_start_date = updates.season_start_date;
      }
      if (updates.season_end_date !== undefined) {
        if (targetStatus === 'in_season') dbUpdates.in_season_end_date = updates.season_end_date;
        else if (targetStatus === 'preseason') dbUpdates.preseason_end_date = updates.season_end_date;
        else if (targetStatus === 'post_season') dbUpdates.post_season_end_date = updates.season_end_date;
      }
      const { error } = await supabase
        .from('athlete_mpi_settings')
        .update(dbUpdates)
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

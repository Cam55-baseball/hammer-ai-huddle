import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { getLocalDateString } from '@/utils/dateUtils';

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

type SeasonUpdates = Partial<{
  season_status: SeasonStatus;
  preseason_start_date: string | null;
  preseason_end_date: string | null;
  in_season_start_date: string | null;
  in_season_end_date: string | null;
  post_season_start_date: string | null;
  post_season_end_date: string | null;
}>;

function detectCurrentPhase(data: SeasonData): SeasonStatus | null {
  const today = getLocalDateString();
  const phases: { status: SeasonStatus; start: string | null; end: string | null }[] = [
    { status: 'preseason', start: data.preseason_start_date, end: data.preseason_end_date },
    { status: 'in_season', start: data.in_season_start_date, end: data.in_season_end_date },
    { status: 'post_season', start: data.post_season_start_date, end: data.post_season_end_date },
  ];
  for (const p of phases) {
    if (p.start && p.end && today >= p.start && today <= p.end) return p.status;
  }
  return null;
}

export function useSeasonStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['season-status', user?.id];
  const autoCorrectRef = useRef<string | null>(null);

  const query = useQuery({
    queryKey,
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
    mutationFn: async (updates: SeasonUpdates & { __silent?: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      // Strip internal flag before sending to DB
      const { __silent, ...payload } = updates;
      const { error } = await supabase
        .from('athlete_mpi_settings')
        .update(payload)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<SeasonData>(queryKey);
      const { __silent, ...payload } = updates;
      if (previous) {
        queryClient.setQueryData<SeasonData>(queryKey, { ...previous, ...payload });
      }
      return { previous, silent: !!__silent };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      // Silent failures (e.g. background auto-correct from date detection)
      // must not surface a scary toast — the user did nothing.
      if (!context?.silent) {
        toast.error('Failed to save season status');
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Auto-detect active phase from dates (silent — background correction)
  useEffect(() => {
    if (!query.data) return;
    const detected = detectCurrentPhase(query.data);
    if (detected && detected !== query.data.season_status) {
      const key = JSON.stringify({ detected, stored: query.data.season_status });
      if (autoCorrectRef.current === key) return;
      autoCorrectRef.current = key;
      mutation.mutate({ season_status: detected, __silent: true });
    }
  }, [query.data]);

  return {
    seasonStatus: query.data?.season_status ?? 'in_season',
    preseasonStartDate: query.data?.preseason_start_date ?? null,
    preseasonEndDate: query.data?.preseason_end_date ?? null,
    inSeasonStartDate: query.data?.in_season_start_date ?? null,
    inSeasonEndDate: query.data?.in_season_end_date ?? null,
    postSeasonStartDate: query.data?.post_season_start_date ?? null,
    postSeasonEndDate: query.data?.post_season_end_date ?? null,
    isLoading: query.isLoading,
    updateSeasonStatus: mutation.mutate,
  };
}

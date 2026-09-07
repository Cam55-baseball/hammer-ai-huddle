import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { resolveSeasonPhase, getSeasonProfile, type SeasonPhase } from '@/lib/seasonPhase';

export type SeasonStatus = 'in_season' | 'preseason' | 'post_season';

interface SeasonData {
  season_status: SeasonStatus;
  season_status_manual: boolean;
  preseason_start_date: string | null;
  preseason_end_date: string | null;
  in_season_start_date: string | null;
  in_season_end_date: string | null;
  post_season_start_date: string | null;
  post_season_end_date: string | null;
}

type SeasonUpdates = Partial<{
  season_status: SeasonStatus;
  season_status_manual: boolean;
  preseason_start_date: string | null;
  preseason_end_date: string | null;
  in_season_start_date: string | null;
  in_season_end_date: string | null;
  post_season_start_date: string | null;
  post_season_end_date: string | null;
}>;

/**
 * What the saved season dates imply for today. This is a SUGGESTION only.
 *
 * This used to be written straight back to the athlete's record in the
 * background, which meant anyone who set their phase by hand watched it
 * silently revert. Nothing is written here any more — the disagreement is
 * handed back to the caller so the app can offer the change instead of
 * making it.
 */
function detectCurrentPhase(data: SeasonData): SeasonStatus | null {
  const res = resolveSeasonPhase({ ...data, season_status_manual: false });
  if (res.source !== 'date_window') return null;
  if (res.phase === 'off_season') return null;
  return res.phase as SeasonStatus;
}

export function useSeasonStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['season-status', user?.id];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<SeasonData> => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('athlete_mpi_settings')
        .select('season_status, season_status_manual, preseason_start_date, preseason_end_date, in_season_start_date, in_season_end_date, post_season_start_date, post_season_end_date')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return {
        season_status: (data?.season_status as SeasonStatus) ?? 'in_season',
        season_status_manual: (data as any)?.season_status_manual === true,
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
      const { __silent, ...rest } = updates;
      // A real, user-initiated phase change is the athlete's own answer and is
      // recorded as such, so nothing can quietly overwrite it later.
      const payload =
        rest.season_status !== undefined && rest.season_status_manual === undefined && !__silent
          ? { ...rest, season_status_manual: true, season_status_manual_at: new Date().toISOString() }
          : rest;
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
      // Any surface derived from the stored season phase must refresh so the
      // WK cards / plan header / profile all show the corrected phase in the
      // same paint. Explicit invalidation of the daily prescription cache
      // triggers a regenerate on next mount so cards no longer display a
      // stale "Offseason Q1" alongside a corrected "In Season" header.
      queryClient.invalidateQueries({ queryKey: ['wk-rx'] });
    },
  });

  // The saved dates may disagree with the stored phase. That is surfaced,
  // never applied: see `suggestedPhase` below.
  const suggestedPhase = useMemo(() => {
    if (!query.data) return null;
    const detected = detectCurrentPhase(query.data);
    return detected && detected !== query.data.season_status ? detected : null;
  }, [query.data]);

  const resolution = query.data
    ? resolveSeasonPhase(query.data)
    : { phase: 'in_season' as SeasonPhase, phaseStartedAt: null, daysIntoPhase: null, daysUntilNextPhase: null, source: 'default' as const };
  const profile = getSeasonProfile(resolution.phase);

  return {
    seasonStatus: query.data?.season_status ?? 'in_season',
    resolvedPhase: resolution.phase,
    phaseStartedAt: resolution.phaseStartedAt,
    phaseDaysIn: resolution.daysIntoPhase,
    phaseDaysRemaining: resolution.daysUntilNextPhase,
    phaseSource: resolution.source,
    phaseProfile: profile,
    preseasonStartDate: query.data?.preseason_start_date ?? null,
    preseasonEndDate: query.data?.preseason_end_date ?? null,
    inSeasonStartDate: query.data?.in_season_start_date ?? null,
    inSeasonEndDate: query.data?.in_season_end_date ?? null,
    postSeasonStartDate: query.data?.post_season_start_date ?? null,
    postSeasonEndDate: query.data?.post_season_end_date ?? null,
    isLoading: query.isLoading,
    /** Set by the athlete's own hand — the app must not override it. */
    seasonStatusManual: query.data?.season_status_manual ?? false,
    /** What the saved dates imply for today, when it differs. Offer, never apply. */
    suggestedPhase,
    /** Accept the suggestion. Only ever called from an explicit tap. */
    acceptSuggestedPhase: () => {
      if (suggestedPhase) mutation.mutate({ season_status: suggestedPhase });
    },
    updateSeasonStatus: mutation.mutate,
  };
}

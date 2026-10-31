import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { SessionControl, SessionTarget } from '@/lib/coachRx/sessionControls';

export function useSessionControls(athleteId?: string, from?: string, to?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['session-controls', user?.id, athleteId, from, to], enabled: !!user && !!athleteId,
    staleTime: 30_000, queryFn: async () => {
      if (!athleteId) return [];
      let q = supabase.from('coach_session_controls').select('*').eq('athlete_id', athleteId).order('created_at');
      if (from) q = q.gte('plan_date', from);
      if (to) q = q.lte('plan_date', to);
      const { data, error } = await q;
      if (error) throw error;
      // A dated decision cannot spill into a later sport switch.
      const context = await supabase.from('athlete_context').select('sport_primary').eq('user_id', athleteId).maybeSingle();
      if (context.error) throw context.error;
      return (data ?? []).filter(c => c.sport === context.data?.sport_primary) as SessionControl[];
    } });
  const invalidate = async () => {
    for (const key of ['session-controls','coach-player-week','hammer-daily-tasks','wk-rx','coach-discipline','team-discipline','coach-rx-manage']) await qc.invalidateQueries({queryKey:[key]});
  };
  const mutation = useMutation({mutationFn:async (input: { ids: string[] } | { date: string; sport: string; targets: SessionTarget[]; mode: 'allow' | 'remove'; reason: string }) => {
    const response = 'ids' in input
      ? await supabase.rpc('player_allowed_skip', { p_ids: input.ids })
      : await supabase.rpc('coach_session_control_write', { p_athlete: athleteId ?? '', p_date: input.date, p_sport: input.sport, p_targets: input.targets as unknown as import('@/integrations/supabase/types').Json, p_mode: input.mode, p_reason: input.reason });
    if (response.error) throw response.error;
    const result = response.data as {applied?: boolean};
    if (!result?.applied) throw new Error('Nothing was saved');
  },onSuccess:async()=>{await invalidate();toast.success('Saved for this session only.');},onError:(e)=>toast.error(e instanceof Error ? e.message : 'Could not save this decision')});
  return {...query, controls:query.data ?? [], save:mutation.mutateAsync, saving:mutation.isPending};
}
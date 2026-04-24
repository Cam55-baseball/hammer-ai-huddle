import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type HammerOverallState = 'prime' | 'ready' | 'caution' | 'recover';
export type MotorState = 'acquisition' | 'consolidation' | 'retention';

export interface HammerStateSnapshot {
  id: string;
  user_id: string;
  computed_at: string;
  arousal_score: number | null;
  arousal_inputs: any;
  recovery_score: number | null;
  recovery_inputs: any;
  motor_state: MotorState | null;
  motor_inputs: any;
  cognitive_load: number | null;
  cognitive_inputs: any;
  dopamine_load: number | null;
  dopamine_inputs: any;
  overall_state: HammerOverallState;
  schema_version?: number;
}

const STATE_META: Record<HammerOverallState, { label: string; color: string; tone: string }> = {
  prime:   { label: 'Prime',   color: 'bg-emerald-500',  tone: 'text-emerald-500' },
  ready:   { label: 'Ready',   color: 'bg-sky-500',      tone: 'text-sky-500' },
  caution: { label: 'Caution', color: 'bg-amber-500',    tone: 'text-amber-500' },
  recover: { label: 'Recover', color: 'bg-rose-500',     tone: 'text-rose-500' },
};

/**
 * Latest Hammer State snapshot for the current user with realtime updates.
 */
export function useHammerState() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['hammer-state', user?.id],
    queryFn: async (): Promise<HammerStateSnapshot | null> => {
      if (!user) return null;
      const { data, error } = await (supabase as any)
        .from('hammer_state_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .order('computed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.warn('[useHammerState] fetch failed', error);
        return null;
      }
      return (data as HammerStateSnapshot) ?? null;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`hammer-state-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'hammer_state_snapshots', filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ['hammer-state', user.id] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, qc]);

  const overall = (query.data?.overall_state ?? 'ready') as HammerOverallState;
  const meta = STATE_META[overall];

  return {
    snapshot: query.data ?? null,
    loading: query.isLoading,
    overallState: overall,
    color: meta.color,
    tone: meta.tone,
    label: meta.label,
  };
}

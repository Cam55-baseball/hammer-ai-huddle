import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type IdentityTier = 'elite' | 'locked_in' | 'consistent' | 'building' | 'slipping';

export interface IdentitySnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  consistency_score: number;
  logged_days: number;
  missed_days: number;
  injury_hold_days: number;
  performance_streak: number;
  discipline_streak: number;
  nn_miss_count_7d: number;
  identity_tier: IdentityTier;
  damping_multiplier: number;
}

const TIER_META: Record<IdentityTier, { label: string; tone: string; ring: string; bg: string; chip: string }> = {
  elite:      { label: 'ELITE',      tone: 'text-fuchsia-900', ring: 'ring-fuchsia-400', bg: 'from-fuchsia-100 to-violet-100', chip: 'bg-fuchsia-200 text-fuchsia-900 border-fuchsia-400' },
  locked_in:  { label: 'LOCKED IN',  tone: 'text-emerald-900', ring: 'ring-emerald-400', bg: 'from-emerald-100 to-teal-100',   chip: 'bg-emerald-200 text-emerald-900 border-emerald-400' },
  consistent: { label: 'CONSISTENT', tone: 'text-sky-900',     ring: 'ring-sky-400',     bg: 'from-sky-100 to-blue-100',       chip: 'bg-sky-200 text-sky-900 border-sky-400' },
  building:   { label: 'BUILDING',   tone: 'text-amber-900',   ring: 'ring-amber-400',   bg: 'from-amber-100 to-orange-100',   chip: 'bg-amber-200 text-amber-900 border-amber-400' },
  slipping:   { label: 'SLIPPING',   tone: 'text-rose-900',    ring: 'ring-rose-400',    bg: 'from-rose-100 to-red-100',       chip: 'bg-rose-200 text-rose-900 border-rose-400' },
};

export function useIdentityState() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['identity-state', user?.id],
    queryFn: async (): Promise<IdentitySnapshot | null> => {
      if (!user) return null;
      const { data, error } = await (supabase as any)
        .from('user_consistency_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.warn('[useIdentityState] fetch failed', error);
        return null;
      }
      return (data as IdentitySnapshot) ?? null;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`identity-state-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_consistency_snapshots', filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ['identity-state', user.id] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, qc]);

  const tier: IdentityTier = (query.data?.identity_tier ?? 'building') as IdentityTier;
  const meta = TIER_META[tier];

  return {
    snapshot: query.data ?? null,
    loading: query.isLoading,
    tier,
    label: meta.label,
    tone: meta.tone,
    ring: meta.ring,
    bg: meta.bg,
    chip: meta.chip,
  };
}

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
  elite:      { label: 'ELITE',      tone: 'text-fuchsia-50', ring: 'ring-fuchsia-400/70', bg: 'from-fuchsia-900 to-violet-950',  chip: 'bg-fuchsia-500/40 text-fuchsia-50 border-fuchsia-300/70' },
  locked_in:  { label: 'LOCKED IN',  tone: 'text-emerald-50', ring: 'ring-emerald-400/70', bg: 'from-emerald-900 to-teal-950',    chip: 'bg-emerald-500/40 text-emerald-50 border-emerald-300/70' },
  consistent: { label: 'CONSISTENT', tone: 'text-sky-50',     ring: 'ring-sky-400/70',     bg: 'from-sky-900 to-blue-950',        chip: 'bg-sky-500/40 text-sky-50 border-sky-300/70' },
  building:   { label: 'BUILDING',   tone: 'text-amber-50',   ring: 'ring-amber-400/70',   bg: 'from-amber-900 to-orange-950',    chip: 'bg-amber-500/40 text-amber-50 border-amber-300/70' },
  slipping:   { label: 'SLIPPING',   tone: 'text-rose-50',    ring: 'ring-rose-400/70',    bg: 'from-rose-900 to-red-950',        chip: 'bg-rose-500/40 text-rose-50 border-rose-300/70' },
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

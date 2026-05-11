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

interface TierMeta {
  label: string;
  tone: string;
  ring: string;
  bg: string;
  chip: string;
  accent: string;
  scoreText: string;
  glow: string;
  pill: string;
  pulse: boolean;
}

const DARK_SURFACE = 'from-slate-900 via-slate-950 to-black';

const TIER_META: Record<IdentityTier, TierMeta> = {
  elite: {
    label: 'ELITE', tone: 'text-white', ring: 'ring-fuchsia-500/40', bg: DARK_SURFACE,
    chip: 'bg-white/5 text-slate-100 border-white/10',
    accent: 'bg-fuchsia-400', scoreText: 'text-fuchsia-400',
    glow: 'shadow-[0_0_60px_-12px_rgba(232,121,249,0.6)]',
    pill: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40',
    pulse: true,
  },
  locked_in: {
    label: 'LOCKED IN', tone: 'text-white', ring: 'ring-emerald-500/40', bg: DARK_SURFACE,
    chip: 'bg-white/5 text-slate-100 border-white/10',
    accent: 'bg-emerald-400', scoreText: 'text-emerald-400',
    glow: 'shadow-[0_0_60px_-12px_rgba(52,211,153,0.6)]',
    pill: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    pulse: true,
  },
  consistent: {
    label: 'CONSISTENT', tone: 'text-white', ring: 'ring-sky-500/40', bg: DARK_SURFACE,
    chip: 'bg-white/5 text-slate-100 border-white/10',
    accent: 'bg-sky-400', scoreText: 'text-sky-400',
    glow: 'shadow-[0_0_50px_-14px_rgba(56,189,248,0.45)]',
    pill: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
    pulse: false,
  },
  building: {
    label: 'BUILDING', tone: 'text-white', ring: 'ring-amber-500/40', bg: DARK_SURFACE,
    chip: 'bg-white/5 text-slate-100 border-white/10',
    accent: 'bg-amber-400', scoreText: 'text-amber-400',
    glow: 'shadow-[0_0_50px_-14px_rgba(251,191,36,0.45)]',
    pill: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    pulse: false,
  },
  slipping: {
    label: 'SLIPPING', tone: 'text-white', ring: 'ring-rose-500/40', bg: DARK_SURFACE,
    chip: 'bg-white/5 text-slate-100 border-white/10',
    accent: 'bg-rose-400', scoreText: 'text-rose-400',
    glow: 'shadow-[0_0_50px_-14px_rgba(251,113,133,0.45)]',
    pill: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
    pulse: false,
  },
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
    accent: meta.accent,
    scoreText: meta.scoreText,
    glow: meta.glow,
    pill: meta.pill,
    pulse: meta.pulse,
  };
}

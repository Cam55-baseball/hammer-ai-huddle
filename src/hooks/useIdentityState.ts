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

// Calm runtime palette: surface stays neutral (bg-card), tier color is
// expressed only by the score text + a thin left accent + a small pill.
const NEUTRAL_CHIP = 'bg-muted/60 text-foreground border-border';
const NEUTRAL_RING = 'ring-border';
const NEUTRAL_TONE = 'text-foreground';

const TIER_META: Record<IdentityTier, TierMeta> = {
  elite: {
    label: 'ELITE', tone: NEUTRAL_TONE, ring: NEUTRAL_RING, bg: '',
    chip: NEUTRAL_CHIP,
    accent: 'bg-fuchsia-500', scoreText: 'text-fuchsia-600 dark:text-fuchsia-400',
    glow: '',
    pill: 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/25',
    pulse: false,
  },
  locked_in: {
    label: 'LOCKED IN', tone: NEUTRAL_TONE, ring: NEUTRAL_RING, bg: '',
    chip: NEUTRAL_CHIP,
    accent: 'bg-emerald-500', scoreText: 'text-emerald-600 dark:text-emerald-400',
    glow: '',
    pill: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
    pulse: false,
  },
  consistent: {
    label: 'CONSISTENT', tone: NEUTRAL_TONE, ring: NEUTRAL_RING, bg: '',
    chip: NEUTRAL_CHIP,
    accent: 'bg-sky-500', scoreText: 'text-sky-600 dark:text-sky-400',
    glow: '',
    pill: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25',
    pulse: false,
  },
  building: {
    label: 'BUILDING', tone: NEUTRAL_TONE, ring: NEUTRAL_RING, bg: '',
    chip: NEUTRAL_CHIP,
    accent: 'bg-amber-500', scoreText: 'text-amber-600 dark:text-amber-400',
    glow: '',
    pill: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
    pulse: false,
  },
  slipping: {
    label: 'SLIPPING', tone: NEUTRAL_TONE, ring: NEUTRAL_RING, bg: '',
    chip: NEUTRAL_CHIP,
    accent: 'bg-rose-500', scoreText: 'text-rose-600 dark:text-rose-400',
    glow: '',
    pill: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25',
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

  const focusSentence = FOCUS_SENTENCES[tier];
  const recoveryStatus = deriveRecoveryStatus(query.data);

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
    focusSentence,
    recoveryStatus,
  };
}

const FOCUS_SENTENCES: Record<IdentityTier, string> = {
  elite: 'Hold the line. Recovery is your edge.',
  locked_in: 'Stay sharp. Consistency is compounding.',
  consistent: 'Keep showing up. Small wins stack.',
  building: 'Stack consistent days. Momentum is forming.',
  slipping: 'Reset gently. One honest day at a time.',
};

export type RecoveryStatus = {
  label: 'Recovering Well' | 'Needs More Recovery' | 'Stable';
  tone: 'emerald' | 'rose' | 'sky';
};

function deriveRecoveryStatus(snap: IdentitySnapshot | null | undefined): RecoveryStatus {
  const nnMiss = snap?.nn_miss_count_7d ?? 0;
  const discStreak = snap?.discipline_streak ?? 0;
  if (nnMiss >= 3) return { label: 'Needs More Recovery', tone: 'rose' };
  if (nnMiss === 0 && discStreak >= 3) return { label: 'Recovering Well', tone: 'emerald' };
  return { label: 'Stable', tone: 'sky' };
}


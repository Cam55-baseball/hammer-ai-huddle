import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDayState } from '@/hooks/useDayState';
import { useIdentityState } from '@/hooks/useIdentityState';
import { fetchNNProgressToday } from '@/lib/nnProgress';

export type DailyOutcomeStatus =
  | 'STANDARD MET'
  | 'STANDARD NOT MET'
  | 'RECOVERY DAY'
  | 'SKIP REGISTERED';

export type StreakImpact = 'up' | 'held' | 'broken';

export interface DailyOutcome {
  status: DailyOutcomeStatus;
  standardMet: boolean;
  nnCompleted: number;
  nnTotal: number;
  dayType: 'standard' | 'rest' | 'skip' | 'push';
  streakImpact: StreakImpact;
  summary: string;
  loading: boolean;
}

const SUMMARY: Record<DailyOutcomeStatus, string> = {
  'STANDARD MET': 'You protected your standard.',
  'STANDARD NOT MET': 'You missed required work.',
  'RECOVERY DAY': 'Recovery applied correctly.',
  'SKIP REGISTERED': 'You skipped the day. No standard applied.',
};

/**
 * Authoritative daily outcome — single source of truth.
 * Pure derivation from existing day state, NN logs, and snapshots.
 * No DB writes. No new tables. Updates in <1s via realtime.
 */
export function useDailyOutcome(): DailyOutcome {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { dayType } = useDayState();
  const { snapshot } = useIdentityState();
  const [prevStreak, setPrevStreak] = useState<number | null>(null);

  // NN counts + any-activity-logged for today
  const nn = useQuery({
    queryKey: ['daily-outcome-nn', user?.id],
    queryFn: async () => {
      if (!user) return { done: 0, total: 0, anyActivityLogged: false };
      return fetchNNProgressToday(user.id);
    },
    enabled: !!user,
    staleTime: 15_000,
  });

  // Realtime invalidation for all sources that affect outcome
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`daily-outcome-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'custom_activity_logs', filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ['daily-outcome-nn', user.id] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'custom_activity_templates', filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ['daily-outcome-nn', user.id] })
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);

  // Track previous streak to detect direction change
  useEffect(() => {
    if (!snapshot) return;
    setPrevStreak((current) => {
      // First observation: initialize but don't claim "up" or "broken"
      if (current === null) return snapshot.performance_streak;
      return current;
    });
  }, [snapshot?.id]);

  const nnCompleted = nn.data?.done ?? 0;
  const nnTotal = nn.data?.total ?? 0;
  const anyActivityLogged = nn.data?.anyActivityLogged ?? false;

  // ── Outcome decision (deterministic) ───────────────────
  let status: DailyOutcomeStatus;
  let standardMet: boolean;
  if (dayType === 'rest') {
    status = 'RECOVERY DAY';
    standardMet = true;
  } else if (dayType === 'skip') {
    status = 'SKIP REGISTERED';
    standardMet = false;
  } else if (nnTotal > 0) {
    standardMet = nnCompleted === nnTotal;
    status = standardMet ? 'STANDARD MET' : 'STANDARD NOT MET';
  } else {
    standardMet = anyActivityLogged;
    status = standardMet ? 'STANDARD MET' : 'STANDARD NOT MET';
  }

  // ── Streak impact ──────────────────────────────────────
  let streakImpact: StreakImpact = 'held';
  const cur = snapshot?.performance_streak ?? 0;
  if (dayType === 'rest') {
    streakImpact = 'held';
  } else if (dayType === 'skip') {
    streakImpact = 'broken';
  } else if (prevStreak !== null) {
    if (cur > prevStreak) streakImpact = 'up';
    else if (cur === 0 && prevStreak > 0) streakImpact = 'broken';
    else streakImpact = 'held';
  } else {
    // No prior reference — infer from absolute state
    if (!standardMet && cur === 0) streakImpact = 'broken';
    else if (standardMet && cur > 0) streakImpact = 'held';
    else streakImpact = 'held';
  }

  return {
    status,
    standardMet,
    nnCompleted,
    nnTotal,
    dayType,
    streakImpact,
    summary: SUMMARY[status],
    loading: nn.isLoading,
  };
}

// ⚠ SINGLE SOURCE OF TRUTH for daily outcome (Phase 10.5 Authority Lock).
// Do NOT create parallel "daily summary" / "outcome card" / "day recap" derivers.
// All UI surfaces that show today's verdict MUST consume this hook.
// Counters MUST come from src/lib/nnProgress.ts (the only NN counter).
// The evaluator edge function does NOT write outcome state — it scores behavior only.
//
// Edge cases handled here:
//   • Case A: User has 0 NNs        → falls back to anyActivityLogged.
//                                     "Remaining" UI hidden because nnTotal === 0.
//   • Case B: New user (no logs)    → STANDARD NOT MET, "You missed required work."
//   • Case C: Rest day (with or w/o NN) → RECOVERY DAY, standardMet = true.
//
// Race-condition protection: a 300 ms trailing debounce commits the derived
// outcome only after NN counts, dayType, and the snapshot have all settled,
// preventing visual flicker (e.g. NOT MET → MET → NOT MET) when realtime
// updates arrive in separate frames.

import { useEffect, useRef, useState } from 'react';
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
  anyActivityLogged: boolean;
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

const COMMIT_DEBOUNCE_MS = 300;

function deriveOutcome(args: {
  dayType: 'standard' | 'rest' | 'skip' | 'push';
  nnCompleted: number;
  nnTotal: number;
  anyActivityLogged: boolean;
  curStreak: number;
  prevStreak: number | null;
}): Omit<DailyOutcome, 'loading'> {
  const { dayType, nnCompleted, nnTotal, anyActivityLogged, curStreak, prevStreak } = args;

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

  let streakImpact: StreakImpact = 'held';
  if (dayType === 'rest') {
    streakImpact = 'held';
  } else if (dayType === 'skip') {
    streakImpact = 'broken';
  } else if (prevStreak !== null) {
    if (curStreak > prevStreak) streakImpact = 'up';
    else if (curStreak === 0 && prevStreak > 0) streakImpact = 'broken';
    else streakImpact = 'held';
  } else {
    if (!standardMet && curStreak === 0) streakImpact = 'broken';
    else streakImpact = 'held';
  }

  return {
    status,
    standardMet,
    nnCompleted,
    nnTotal,
    anyActivityLogged,
    dayType,
    streakImpact,
    summary: SUMMARY[status],
  };
}

/**
 * Authoritative daily outcome — single source of truth.
 * Pure derivation from existing day state, NN logs, and snapshots.
 * No DB writes. No new tables. Updates with a 300 ms commit debounce
 * to prevent flicker as multiple realtime sources settle.
 */
export function useDailyOutcome(): DailyOutcome {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { dayType } = useDayState();
  const { snapshot } = useIdentityState();
  const prevStreakRef = useRef<number | null>(null);

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

  // Track previous streak for direction inference (init on first observation)
  useEffect(() => {
    if (!snapshot) return;
    if (prevStreakRef.current === null) {
      prevStreakRef.current = snapshot.performance_streak;
    }
  }, [snapshot?.id]);

  // ── Phase 10.5 — debounced commit (race-condition guard) ─────────────
  const initialState: DailyOutcome = {
    status: 'STANDARD NOT MET',
    standardMet: false,
    nnCompleted: 0,
    nnTotal: 0,
    anyActivityLogged: false,
    dayType: 'standard',
    streakImpact: 'held',
    summary: SUMMARY['STANDARD NOT MET'],
    loading: true,
  };
  const [committed, setCommitted] = useState<DailyOutcome>(initialState);

  const nnCompleted = nn.data?.done ?? 0;
  const nnTotal = nn.data?.total ?? 0;
  const anyActivityLogged = nn.data?.anyActivityLogged ?? false;
  const curStreak = snapshot?.performance_streak ?? 0;
  const allReady = !nn.isLoading;

  useEffect(() => {
    if (!allReady) return;
    const next = deriveOutcome({
      dayType,
      nnCompleted,
      nnTotal,
      anyActivityLogged,
      curStreak,
      prevStreak: prevStreakRef.current,
    });
    const t = setTimeout(() => {
      setCommitted((prev) => {
        const same =
          prev.status === next.status &&
          prev.standardMet === next.standardMet &&
          prev.nnCompleted === next.nnCompleted &&
          prev.nnTotal === next.nnTotal &&
          prev.dayType === next.dayType &&
          prev.streakImpact === next.streakImpact;
        if (same && !prev.loading) return prev;
        if (import.meta.env.DEV && prev.status !== next.status) {
          console.log('[HM-OUTCOME]', prev.status, '→', next.status, {
            nnCompleted: next.nnCompleted,
            nnTotal: next.nnTotal,
            dayType: next.dayType,
          });
        }
        return { ...next, loading: false };
      });
    }, COMMIT_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [allReady, dayType, nnCompleted, nnTotal, anyActivityLogged, curStreak]);

  return committed;
}

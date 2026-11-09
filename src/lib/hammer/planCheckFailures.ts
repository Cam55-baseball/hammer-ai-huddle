/**
 * Owner Nov 3 (Option A): failed plan lookups are never shown to players.
 * Each failure (after the app's quiet retries) is logged for the owner's
 * Training Intelligence page instead.
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PlanCheckKey = 'analysis_findings' | 'drill_choice' | 'practice_history' | 'measurement_save';

export const PLAN_CHECK_LABELS: Record<PlanCheckKey, string> = {
  analysis_findings: 'Analysis-findings check',
  drill_choice: 'Drill-choice check',
  practice_history: 'Practice-history check',
  // Release 0: a measurement that could not be saved to the ledger after retries (never pushed).
  measurement_save: 'Measurement save',
};

/** Retries before a lookup counts as failed ("once or twice"). */
export const PLAN_CHECK_RETRIES = 2;

export type PlanCheckFailureRow = { user_id: string; check_key: string; created_at: string; error: string | null };

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 500);
  if (typeof error === 'string') return error.slice(0, 500);
  try { return JSON.stringify(error).slice(0, 500); } catch { return 'Unknown error'; }
}

/** Never throws; logging must not affect the player's plan. */
export async function logPlanCheckFailure(
  check: PlanCheckKey, error: unknown,
  client: { from: (t: string) => { insert: (row: unknown) => PromiseLike<unknown> } } = supabase as never,
): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) return false;
    await client.from('plan_check_failures').insert({ user_id: userId, check_key: check, error: errorText(error) });
    return true;
  } catch { return false; }
}

/** Logs once per distinct failure while mounted. */
export function usePlanCheckFailureLog(check: PlanCheckKey, error: unknown) {
  const last = useRef<unknown>(null);
  useEffect(() => {
    if (!error || last.current === error) return;
    last.current = error;
    void logPlanCheckFailure(check, error);
  }, [check, error]);
}

export type PlanCheckSummary = { check: PlanCheckKey; label: string; todayPlayers: number; weekFailures: number; byDay: Record<string, number>; line: string; repeated: boolean };

/** Plain-word owner summary: players today, failures per day over the window. */
export function summarizePlanCheckFailures(rows: PlanCheckFailureRow[], today: string): PlanCheckSummary[] {
  return (Object.keys(PLAN_CHECK_LABELS) as PlanCheckKey[]).map(check => {
    const mine = rows.filter(r => r.check_key === check);
    const byDay: Record<string, number> = {};
    for (const r of mine) { const d = r.created_at.slice(0, 10); byDay[d] = (byDay[d] ?? 0) + 1; }
    const todayPlayers = new Set(mine.filter(r => r.created_at.slice(0, 10) === today).map(r => r.user_id)).size;
    const label = PLAN_CHECK_LABELS[check];
    const daysWithFailures = Object.keys(byDay).length;
    return {
      check, label, todayPlayers, weekFailures: mine.length, byDay,
      line: `${label} failed for ${todayPlayers} player${todayPlayers === 1 ? '' : 's'} today (${mine.length} failure${mine.length === 1 ? '' : 's'} in the last 7 days)`,
      repeated: daysWithFailures >= 3 || mine.length >= 10,
    };
  });
}

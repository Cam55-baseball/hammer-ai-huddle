// ⚠ The ONLY allowed NN-completion counter for "today" derivations
// (Phase 10.5 Integrity Lock). Game Plan, Daily Outcome, and Nightly
// Check-In all route through this. Do NOT add parallel queries that
// count today's NN completions elsewhere — they will drift.

import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

/**
 * Shared helper: count today's NN completions for a user.
 * Single source of truth for NN progress numbers — used by
 * the Game Plan progress strip and the Daily Outcome hook so
 * the two cannot drift apart.
 */
export async function fetchNNProgressToday(userId: string): Promise<{
  done: number;
  total: number;
  anyActivityLogged: boolean;
}> {
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // 1. NN templates (active)
  const { data: nn } = await (supabase as any)
    .from('custom_activity_templates')
    .select('id')
    .eq('user_id', userId)
    .eq('is_non_negotiable', true)
    .is('deleted_at', null);
  const nnIds: string[] = (nn ?? []).map((t: any) => t.id);

  // 2. All of today's logs (one query — covers both NN counts and any-logged check)
  const { data: logs } = await (supabase as any)
    .from('custom_activity_logs')
    .select('template_id, completion_state')
    .eq('user_id', userId)
    .eq('entry_date', todayStr);

  const allLogs = logs ?? [];
  const anyActivityLogged = allLogs.length > 0;

  if (nnIds.length === 0) {
    if (import.meta.env.DEV) console.log('[HM-NN]', { done: 0, total: 0, anyActivityLogged });
    return { done: 0, total: 0, anyActivityLogged };
  }

  const nnSet = new Set(nnIds);
  const done = new Set<string>(
    allLogs
      .filter((l: any) => l.completion_state === 'completed' && nnSet.has(l.template_id))
      .map((l: any) => l.template_id)
  );

  const result = { done: done.size, total: nnIds.length, anyActivityLogged };
  if (import.meta.env.DEV) console.log('[HM-NN]', result);
  return result;
}

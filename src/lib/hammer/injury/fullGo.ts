import type { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { rebuildAfterChange } from '@/lib/hammer/rebuildAfterChange';
import { getTodayDate } from '@/utils/dateUtils';
import { addInjuryCheck, type InjuryCheck } from '../../../../supabase/functions/_shared/health/fullGo';

export type FullGoResult = { kind: 'cleared' | 'parent_requested' | 'parent_pending' | 'no_parent' | 'not_active' | 'failed'; message: string };

const label = (area: string) => area.charAt(0).toUpperCase() + area.slice(1);

async function refresh(qc: QueryClient) {
  await Promise.all(['athlete-context', 'hammer-daily-plan', 'hammer-state', 'injury-history', 'composed-week'].map(k => qc.invalidateQueries({ queryKey: [k] })));
}

/** Runs only after the player's second Confirm. Adults clear; under-18 asks the parent. */
export async function requestFullGo(area: string, qc: QueryClient): Promise<FullGoResult> {
  const { data, error } = await supabase.functions.invoke('injury-full-go', { body: { action: 'clear', area, origin: window.location.origin } });
  if (error || !data?.status) return { kind: 'failed', message: "Couldn't save that. Nothing was changed. Try again." };
  if (data.status === 'cleared') {
    const rebuilt = await rebuildAfterChange(`Your ${area} is marked healed and full go`, getTodayDate());
    await refresh(qc);
    return { kind: 'cleared', message: rebuilt.message };
  }
  await refresh(qc);
  if (data.status === 'parent_requested') return { kind: 'parent_requested', message: `We sent your parent a message to confirm your ${area} is healed. Your ${area} limits stay until they confirm.` };
  if (data.status === 'parent_pending') return { kind: 'parent_pending', message: `Waiting for your parent to confirm your ${area} is healed.` };
  if (data.status === 'no_parent') return { kind: 'no_parent', message: `A parent needs to confirm this, but we don't have their email yet. Nothing was changed.` };
  if (data.status === 'email_failed') return { kind: 'failed', message: `We couldn't reach your parent. Nothing was changed. Try again later.` };
  return { kind: 'not_active', message: `${label(area)} is not an active injury, so nothing changed.` };
}

/** After a parent confirms, the player's own session rebuilds the week once. */
export async function finishParentClear(userId: string, history: unknown[], qc: QueryClient): Promise<string | null> {
  const pending = history.filter((e: any) => e?.recovery_status === 'healed' && e?.rebuild_pending === true);
  if (!pending.length) return null;
  const areas = [...new Set(pending.map((e: any) => String(e.region)))];
  const rebuilt = await rebuildAfterChange(`Your parent confirmed your ${areas.join(' and ')} ${areas.length > 1 ? 'are' : 'is'} healed`, getTodayDate());
  const next = history.map((e: any) => e?.rebuild_pending ? (({ rebuild_pending: _p, ...rest }) => rest)(e) : e);
  if (rebuilt.ok) await supabase.from('athlete_context').update({ injury_history: next as never }).eq('user_id', userId);
  await refresh(qc);
  return rebuilt.message;
}

/** Saves the daily injury check answers onto the player's own active entries. */
export async function saveInjuryChecks(userId: string, checks: Array<{ area: string } & InjuryCheck>): Promise<void> {
  if (!checks.length) return;
  const cur = await supabase.from('athlete_context').select('injury_history').eq('user_id', userId).maybeSingle();
  if (cur.error) throw cur.error;
  let history: unknown[] = Array.isArray(cur.data?.injury_history) ? cur.data!.injury_history as unknown[] : [];
  for (const c of checks) history = addInjuryCheck(history, c.area, { date: c.date, pain: c.pain, function: c.function });
  const up = await supabase.from('athlete_context').update({ injury_history: history as never }).eq('user_id', userId).select('user_id').single();
  if (up.error) throw up.error;
}

import { supabase } from '@/integrations/supabase/client';
import { isoShift } from '../../../supabase/functions/_shared/wic/schedule/timeline';

/** Same authenticated day-lock adjustment path as Today. Never replaces marked work. */
export async function rebuildAfterChange(reason: string, today: string, effectiveDate?: string) {
  const firstDate = effectiveDate && effectiveDate > today ? effectiveDate : today;
  const key = `saved-change:${crypto.randomUUID()}`;
  const failed: string[] = [];
  for (let offset = 0; offset < 7; offset++) {
    const date = isoShift(firstDate, offset);
    try {
      const { data, error } = await supabase.functions.invoke('wk-generate-daily', {
        body: { plan_date: date, change_reason: 'player_request', change_text: reason, change_key: `${key}:${date}` },
      });
      if (error || data?.ok !== true) failed.push(date);
    } catch { failed.push(date); }
  }
  return { ok: failed.length === 0, failed, message: failed.length
    ? `${reason} — saved, but ${failed.length} day${failed.length === 1 ? '' : 's'} could not be rebuilt. Try rebuilding again.`
    : `${reason} — your plan was rebuilt for ${firstDate === today ? 'today and the next 6 days' : `${firstDate} and the next 6 days`}.` };
}
import { supabase } from '@/integrations/supabase/client';
import { isoShift } from '../../../supabase/functions/_shared/wic/schedule/timeline';
import {readComposedWeek}from './readComposedWeek';
import { weekRuleBreaks, datesToRebuild, blockedReason } from './weekRuleRepair';

/** Same authenticated day-lock adjustment path as Today. Never replaces marked work. */
// Rebuilds run one at a time: overlapping 7-day rebuilds make the day-lock report "Day changed".
let queue: Promise<unknown> = Promise.resolve();
export function rebuildAfterChange(reason: string, today: string, effectiveDate?: string) {
  const run = queue.then(() => rebuildOnce(reason, today, effectiveDate));
  queue = run.catch(() => undefined);
  return run;
}

async function rebuildOnce(reason: string, today: string, effectiveDate?: string) {
  const firstDate = effectiveDate && effectiveDate > today ? effectiveDate : today;
  const key = `saved-change:${crypto.randomUUID()}`;
  const failed: string[] = [];
  let sport:'baseball'|'softball'|null=null;
  let userId:string|null=null;
  let boughtBunting=false;
  let missingInputs=false;
  const kept: string[] = [];
  // Owner Nov 2: missing details never stop a rebuild; the server decides.
  // Seven changeable dates: a day whose marked work is kept is replaced by the next date, so the week check stays a full seven.
  for (let offset = 0; offset < 7 + kept.length && offset < 14; offset++) {
    const date = isoShift(firstDate, offset);
    try {
      const { data, error } = await supabase.functions.invoke('wk-generate-daily', {
        body: { plan_date: date, compose_sport_day: true, change_reason: 'player_request', change_text: reason, change_key: `${key}:${date}` },
      });
      if (error) {
        const conflict = await (error as { context?: Response }).context?.clone?.().json?.().catch(() => null);
        if ((conflict?.error === 'adjust_failed' && conflict?.message === 'Day changed; rebuild from fresh saved work') || conflict?.error === 'Sport day changed; rebuild from fresh saved work') {
          // One fresh server reread under the same lock; never bypass a safety or protected-work refusal.
          const retry = await supabase.functions.invoke('wk-generate-daily', {body:{plan_date:date,compose_sport_day:true,change_reason:'player_request',change_text:reason,change_key:`${key}:${date}:fresh`}});
          if (!retry.error && retry.data?.ok===true && retry.data?.composed===true && retry.data?.degraded!==true) {
            if(retry.data.sport==='baseball'||retry.data.sport==='softball'){sport=retry.data.sport;userId=typeof retry.data.user_id==='string'?retry.data.user_id:null;boughtBunting=retry.data.bunting_entitled===true;}
            continue;
          }
        }
      }
      if (error) {
        const body = await (error as { context?: Response }).context?.clone?.().json?.().catch(() => null);
        // Server refused to replace work the player already chose or marked: kept by design, not a failure to retry.
        if (body?.error === 'adjust_failed' && /protected/i.test(String(body?.message ?? ''))) { kept.push(date); continue; }
        // Before Start there is no plan to rebuild; the Start gate stays on the server. The answer is saved.
        if (body?.error === 'not_started') return { ok: true, notStarted: true, failed: [], kept: [], weekIssues: [], missingInputs: false, message: `${reason} — saved. Your plan builds when you tap Start.` };
        if (body?.error === 'initial_inputs_missing') { missingInputs = true; for (let rest = offset; rest < 7; rest++) failed.push(isoShift(firstDate, rest)); break; }
      }
      if (error || data?.ok !== true || data?.composed !== true || data?.degraded === true) failed.push(date);
      else if(data.sport==='baseball'||data.sport==='softball'){sport=data.sport;userId=typeof data.user_id==='string'?data.user_id:null;boughtBunting=data.bunting_entitled===true;}
    } catch { failed.push(date); }
  }
  let weekIssues:string[]=[];
  if(!failed.length){
    if(!sport||!userId)weekIssues=['saved_week_identity_unconfirmed'];
    else try {const start=kept.length&&kept.every((d,i)=>d===isoShift(firstDate,i))?isoShift(firstDate,kept.length):firstDate;weekIssues=(await readComposedWeek(userId,start,isoShift(start,6),sport,boughtBunting)).issues;}catch{weekIssues=['saved_week_readback_unavailable'];}
  }
  const keptNote = kept.length ? kept.includes(today)
    ? ' Today keeps the work you already logged; your change starts tomorrow.'
    : ` ${kept.length} day${kept.length === 1 ? '' : 's'} kept the work you already marked done.` : '';
  return { ok: failed.length === 0&&!weekIssues.length, failed, kept, weekIssues, missingInputs, message: (missingInputs
    ? `${reason} — saved. Your week can't be rebuilt until you finish your missing starting details.`
    : failed.length
    ? `${reason} — saved, but ${failed.length} day${failed.length === 1 ? '' : 's'} could not be rebuilt. Try rebuilding again.`
    : weekIssues.length?`${reason} — saved days were rebuilt, but your weekly minimums could not be confirmed. Equipment, injury and schedule limits still apply.`
      : kept.length ? `${reason} — your plan was rebuilt for the next 7 days.`
      : `${reason} — your plan was rebuilt for ${firstDate === today ? 'today and the next 6 days' : `${firstDate} and the next 6 days`}.`) + (failed.length || missingInputs ? '' : keptNote) };
}
/**
 * Owner Nov 1 round 2 (item 2): saved future days whose season is wrong are rebuilt
 * through the same day-lock change path. The server lists only unlogged, unmarked
 * dates, and the change path still refuses protected work.
 */
export async function rebuildWrongSeasonDays(today: string): Promise<{ checked: boolean; rebuilt: string[]; failed: string[] }> {
  const { data, error } = await supabase.functions.invoke('wk-generate-daily', { body: { plan_date: today, stale_season_sweep: true } });
  if (error || data?.ok !== true || !Array.isArray(data?.stale_dates)) return { checked: false, rebuilt: [], failed: [] };
  const rebuilt: string[] = []; const failed: string[] = [];
  for (const date of data.stale_dates as string[]) {
    const r = await supabase.functions.invoke('wk-generate-daily', {
      body: { plan_date: date, compose_sport_day: true, change_reason: 'player_request', change_text: 'Your season for this day changed, so Hammer rebuilt it.', change_key: `season-fix:${date}:${today}` },
    });
    if (r.error || r.data?.ok !== true) failed.push(date); else rebuilt.push(date);
  }
  return { checked: true, rebuilt, failed };
}

/**
 * Owner Nov 1 (round 2 item 4): rebuild a saved week that breaks the rest-day or
 * weekly-minimum rules through the real builder; never only flag it. Logged or
 * marked dates are never touched. If the rebuild can't fix it, it is blocked
 * with a plain reason.
 */
export async function repairSavedWeek(today: string): Promise<{ checked: boolean; rebuilt: string[]; failed: string[]; blocked: string | null }> {
  const none = { checked: false, rebuilt: [] as string[], failed: [] as string[], blocked: null as string | null };
  const { data, error } = await supabase.functions.invoke('wk-generate-daily', { body: { plan_date: today, week_rule_sweep: true } });
  if (error || data?.ok !== true || typeof data?.user_id !== 'string' || (data.sport !== 'baseball' && data.sport !== 'softball')) return none;
  const last = isoShift(today, 6);
  const read = () => readComposedWeek(data.user_id, today, last, data.sport, data.bunting_entitled === true);
  let breaks: string[];
  try { breaks = weekRuleBreaks((await read()).issues); } catch { return none; }
  if (!breaks.length) return { ...none, checked: true };
  const window = Array.from({ length: 7 }, (_, i) => isoShift(today, i));
  const rebuilt: string[] = []; const failed: string[] = [];
  for (const date of datesToRebuild(window, new Set<string>(data.protected_dates ?? []))) {
    const r = await supabase.functions.invoke('wk-generate-daily', {
      body: { plan_date: date, compose_sport_day: true, change_reason: 'player_request', change_text: 'Your week was missing a rest day or a weekly minimum, so Hammer rebuilt it.', change_key: `week-fix:${date}:${today}` },
    });
    if (r.error || r.data?.ok !== true) failed.push(date); else rebuilt.push(date);
  }
  let after: string[];
  try { after = weekRuleBreaks((await read()).issues); } catch { return { checked: true, rebuilt, failed, blocked: null }; }
  return { checked: true, rebuilt, failed, blocked: after.length ? blockedReason(after) : null };
}

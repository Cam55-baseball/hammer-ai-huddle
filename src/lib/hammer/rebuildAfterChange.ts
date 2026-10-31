import { supabase } from '@/integrations/supabase/client';
import { isoShift } from '../../../supabase/functions/_shared/wic/schedule/timeline';
import {readComposedWeek}from './readComposedWeek';

/** Same authenticated day-lock adjustment path as Today. Never replaces marked work. */
export async function rebuildAfterChange(reason: string, today: string, effectiveDate?: string) {
  const firstDate = effectiveDate && effectiveDate > today ? effectiveDate : today;
  const key = `saved-change:${crypto.randomUUID()}`;
  const failed: string[] = [];
  let sport:'baseball'|'softball'|null=null;
  let userId:string|null=null;
  let boughtBunting=false;
  let missingInputs=false;
  const kept: string[] = [];
  // Seven changeable dates: a day whose marked work is kept is replaced by the next date, so the week check stays a full seven.
  for (let offset = 0; offset < 7 + kept.length && offset < 14; offset++) {
    const date = isoShift(firstDate, offset);
    try {
      const { data, error } = await supabase.functions.invoke('wk-generate-daily', {
        body: { plan_date: date, compose_sport_day: true, change_reason: 'player_request', change_text: reason, change_key: `${key}:${date}` },
      });
      if (error) {
        const conflict = await (error as { context?: Response }).context?.clone?.().json?.().catch(() => null);
        if (conflict?.error === 'adjust_failed' && conflict?.message === 'Day changed; rebuild from fresh saved work') {
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
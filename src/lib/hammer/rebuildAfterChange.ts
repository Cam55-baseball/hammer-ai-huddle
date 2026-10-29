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
  for (let offset = 0; offset < 7; offset++) {
    const date = isoShift(firstDate, offset);
    try {
      const { data, error } = await supabase.functions.invoke('wk-generate-daily', {
        body: { plan_date: date, compose_sport_day: true, change_reason: 'player_request', change_text: reason, change_key: `${key}:${date}` },
      });
      if (error || data?.ok !== true || data?.composed !== true || data?.degraded === true) failed.push(date);
      else if(data.sport==='baseball'||data.sport==='softball'){sport=data.sport;userId=typeof data.user_id==='string'?data.user_id:null;boughtBunting=data.bunting_entitled===true;}
    } catch { failed.push(date); }
  }
  let weekIssues:string[]=[];
  if(!failed.length){
    if(!sport||!userId)weekIssues=['saved_week_identity_unconfirmed'];
    else try {weekIssues=(await readComposedWeek(userId,firstDate,isoShift(firstDate,6),sport,boughtBunting)).issues;}catch{weekIssues=['saved_week_readback_unavailable'];}
  }
  return { ok: failed.length === 0&&!weekIssues.length, failed, weekIssues, message: failed.length
    ? `${reason} — saved, but ${failed.length} day${failed.length === 1 ? '' : 's'} could not be rebuilt. Try rebuilding again.`
    : weekIssues.length?`${reason} — saved days were rebuilt, but your weekly minimums could not be confirmed. Equipment, injury and schedule limits still apply.`
      : `${reason} — your plan was rebuilt for ${firstDate === today ? 'today and the next 6 days' : `${firstDate} and the next 6 days`}.` };
}
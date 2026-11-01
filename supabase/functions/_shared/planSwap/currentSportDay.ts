import { composeSportDay } from '../composeSportDay.ts';
import { resolveOutingFacts } from '../wic/pitching/outingFacts.ts';
import { isoShift, dayEffect, seasonWithTimeline } from '../wic/schedule/timeline.ts';
import { resolvePhaseState } from '../phaseState.ts';
import { wholePlanRest } from '../wic/schedule/planDayScope.ts';
import { unavailableTrainingDate } from '../wic/schedule/availability.ts';
import { mapPhysio } from '../health/physioMapping.ts';

/** Fresh self-scoped candidate; never saves/rebuilds marked work. Swap still commits
 * through its existing atomic day lock and compares the original saved item. */
export async function currentSportDay(db:any,uid:string,date:string,sport:'baseball'|'softball',equipment:string[],missing:string[]) {
  const [settings,outings,availability,profile,context,season,timeline,readiness,cns,heights]=await Promise.all([
    db.from('pitcher_schedule_settings').select('*').eq('user_id',uid).maybeSingle(),
    db.from('pitcher_outings').select('*').eq('user_id',uid).or(`planned_date.gte.${isoShift(date,-21)},actual_date.gte.${isoShift(date,-21)}`).limit(200),
    db.from('pitcher_availability').select('date,available').eq('user_id',uid).gte('date',isoShift(date,-1)).lte('date',isoShift(date,2)).limit(50),
    db.from('profiles').select('date_of_birth').eq('id',uid).maybeSingle(),
    db.from('athlete_context').select('season_phase,injury_history,weekly_availability_days').eq('user_id',uid).maybeSingle(),
    db.from('athlete_mpi_settings').select('*').eq('user_id',uid).maybeSingle(),
    db.from('schedule_timeline_entries').select('*').eq('user_id',uid).gte('end_date',isoShift(date,-7)).lte('start_date',isoShift(date,7)).limit(200),
    db.from('athlete_daily_log').select('readiness').eq('user_id',uid).eq('entry_date',date).maybeSingle(),
    db.from('wk_cns_ledger').select('units_spent').eq('user_id',uid).eq('ledger_date',date).maybeSingle(),
    db.from('athlete_height_checks').select('measured_on,inches').eq('user_id',uid).lte('measured_on',date).order('measured_on').limit(200),
  ]);
  for(const r of [settings,outings,availability,profile,context,season,timeline,readiness,cns,heights])if(r.error)throw r.error;
  if((outings.data??[]).length>=200||(timeline.data??[]).length>=200||(heights.data??[]).length>=200)throw new Error('Complete current pitching context unavailable');
  const phase=resolvePhaseState({settings:seasonWithTimeline({...season.data,season_status:season.data?.season_status??context.data?.season_phase},timeline.data??[],date),date,heights:(heights.data??[]).map((h:any)=>({date:h.measured_on,inches:Number(h.inches)}))});
  const effect=dayEffect(timeline.data??[],date);
  const facts=resolveOutingFacts({planDate:date,settings:settings.data,outings:outings.data??[],availability:availability.data??[]});
  const physio=mapPhysio({injuries:context.data?.injury_history,today:date});
  return composeSportDay(db,{userId:uid,date,sport,phase:phase.sub_block,
    rest:wholePlanRest(date,effect.hold)||unavailableTrainingDate(date,context.data?.weekly_availability_days),
    equipment,alwaysMissingGear:missing,injuries:physio.activeAreas,birthday:profile.data?.date_of_birth??null,
    outingFacts:facts.hasSchedule?facts:null,posture:effect.games.length?'game':'normal',gameTomorrow:dayEffect(timeline.data??[],isoShift(date,1)).games.length>0,
    warmupStages:{},readiness:readiness.data?.readiness??null,phaseStartedAt:null,cns:cns.data?.units_spent??0,physio,
    availabilityDays:context.data?.weekly_availability_days??null});
}
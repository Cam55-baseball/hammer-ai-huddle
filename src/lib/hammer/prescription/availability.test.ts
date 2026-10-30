import { expect, it } from 'vitest';
import { availableTrainingDays, unavailableTrainingDate } from '../../../../supabase/functions/_shared/wic/schedule/availability';
import { resolveWeeklyTemplate, applyMicrocycle, projectWeeklyRoadmap } from './weeklyMicrocycle';
import type { AthleteContextProjection } from '../context/decisionFilters';
import { buildHammerDailyPlan } from './dailyPlan';
import { NORMAL_SIGNAL } from './scheduleContext';
import type { ContextVariable, HammerAthleteContext } from '../context/contextProjection';
it('six available days preserve Monday through Saturday and Sunday rest', () => {
  expect(availableTrainingDays(6)).toEqual([1,2,3,4,5,6]);
  expect(unavailableTrainingDate('2026-11-01', 6)).toBe(true);
});
it('four available days reshape the week without increasing training days', () => {
  expect(availableTrainingDays(4)).toEqual([1,2,3,5]);
  expect(unavailableTrainingDate('2026-10-29', 4)).toBe(true);
  expect(unavailableTrainingDate('2026-10-30', 4)).toBe(false);
});
it('unknown availability preserves six days without inventing a smaller week', () => {
  expect(availableTrainingDays(null)).toHaveLength(6);
});
for (const date of ['2026-10-31','2026-11-05']) it(`softball four-day week preserves ${date} rest even in pre-game taper`, () => {
  const values={sport_primary:'softball',position_primary:'P',lifecycle_band:'u18',season_phase:'in',weekly_availability_days:4,equipment_effective:['bat','tee','net','field','glove','ball'],injury_history:[]};
  const variables=Object.entries(values).map(([key,value]):ContextVariable=>({key,value,label:key,domain:'identity',source:'test',confidence:'high',missing:false,lastUpdated:null,lineage:{owner:'test',source:'test',rawConfidence:'high'}}));
  const ctx:HammerAthleteContext={variables,missing:[],missingCount:0,isLoading:false,envelope:null,get<T>(key:string){return variables.find(v=>v.key===key) as ContextVariable<T>|undefined;}};
  const plan=buildHammerDailyPlan(ctx,{...NORMAL_SIGNAL,postureToday:'taper',isGameTomorrow:true},null,null,undefined,new Date(`${date}T12:00:00`),{subscriptionModules:['softball_golden2way']});
  expect(plan.sanity).toEqual({ok:true,issues:[]});
  expect(plan.blocks.filter(b=>b.status==='ready'&&!['warmup','recovery','fueling','game_iq'].includes(b.modality))).toEqual([]);
});
it('in-season four-day skill overflow and roadmap never reopen unavailable dates', () => {
  const template = resolveWeeklyTemplate({seasonPhase:'in', lifecycleBand:'adult', liftingAgeYears:2, weeklyAvailabilityDays:4} as AthleteContextProjection);
  const targets={hitting:3,defense:4,throwing:5,baserunning:1};
  const thursday=applyMicrocycle(template,new Date(2026,9,29),targets);
  expect(thursday.perModality.hitting.scheduled).toBe(false);
  expect(thursday.perModality.defense.scheduled).toBe(false);
  const roadmap=projectWeeklyRoadmap(template,new Date(2026,9,29),targets);
  expect(roadmap.filter(d=>!d.restDay).map(d=>d.dow)).toEqual([1,2,3,5]);
  expect(thursday.skillDays.defense).toHaveLength(4);
  expect(thursday.skillDays.hitting).toHaveLength(3);
});
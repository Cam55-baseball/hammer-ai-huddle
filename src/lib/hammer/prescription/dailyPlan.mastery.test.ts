import {describe,it,expect} from 'vitest';
import {buildHammerDailyPlan} from './dailyPlan';
import {NORMAL_SIGNAL} from './scheduleContext';
import type {HammerAthleteContext,ContextVariable} from '../context/athleteContext';
describe('actual builder weekly mastery connection',()=>{
 for(const sport of ['baseball','softball'])it(`${sport}: judged defense leads existing weekly priority without changing lifts`,()=>{
  const values={sport_primary:sport,position_primary:'SS',lifecycle_band:'adult',season_phase:'off',lifting_age_years:0.5,weekly_availability_days:6,injury_history:[],equipment_effective:['glove','baseball','softball','safe_field_space','bat','tee'],category_goals:{version:1,updatedAt:'2026-10-26',goals:['hitting','fielding','throwing','speed','power'].map((category,i)=>({category,rank:i+1,intent:null}))}};
  const variables=Object.entries(values).map(([key,value])=>({key,value})) as ContextVariable[];
  const ctx={variables,get:(key:string)=>variables.find(v=>v.key===key),missing:[],missingCount:0,isLoading:false,envelope:null} as HammerAthleteContext;
  const today=new Date(2026,9,26);const base=buildHammerDailyPlan(ctx,NORMAL_SIGNAL,null,null,undefined,today);
  const focused=buildHammerDailyPlan(ctx,NORMAL_SIGNAL,null,null,undefined,today,{masteryFocus:{observedFocus:'defense',sourceIds:['coach-grade'],reason:'Defense is the weakest judged pillar',leftPowerStealEmphasis:false}});
  expect(focused.blocks.find(b=>b.modality==='strength')).toEqual(base.blocks.find(b=>b.modality==='strength'));
  expect(focused.weeklyTemplate.priorityDayOrder?.defense).toHaveLength(3);
  expect(base.weeklyTemplate.priorityDayOrder?.defense).not.toEqual(focused.weeklyTemplate.priorityDayOrder?.defense);
  expect(focused.weeklyTemplate.perModality.strength).toEqual(base.weeklyTemplate.perModality.strength);
  expect(ctx.get('category_goals')?.value).toEqual(values.category_goals);
 });
});
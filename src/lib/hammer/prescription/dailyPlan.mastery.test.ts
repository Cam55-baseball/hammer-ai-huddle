import {describe,it,expect} from 'vitest';
import {buildHammerDailyPlan} from './dailyPlan';
import {NORMAL_SIGNAL} from './scheduleContext';
import type {HammerAthleteContext,ContextVariable} from '../context/athleteContext';
describe('actual builder weekly mastery connection',()=>{
 for(const sport of ['baseball','softball'])it(`${sport}: judged defense leads existing weekly priority without changing lifts`,()=>{
  const values={sport_primary:sport,position_primary:'SS',lifecycle_band:'adult',season_phase:'off',lifting_age_years:0.5,weekly_availability_days:6,injury_history:[],equipment_effective:['field','glove','ball','gamer_bat','tee'],category_goals:{version:1,updatedAt:'2026-10-26',goals:['hitting','fielding','throwing','speed','power'].map((category,i)=>({category,rank:i+1,intent:null}))}};
  const variables=Object.entries(values).map(([key,value])=>({key,value})) as ContextVariable[];
  const ctx={variables,get:(key:string)=>variables.find(v=>v.key===key),missing:[],missingCount:0,isLoading:false,envelope:null} as HammerAthleteContext;
  const today=new Date(2026,9,26);const base=buildHammerDailyPlan(ctx,NORMAL_SIGNAL,null,null,undefined,today);
  const focused=buildHammerDailyPlan(ctx,NORMAL_SIGNAL,null,null,undefined,today,{masteryFocus:{observedFocus:'defense',sourceIds:['coach-grade'],reason:'Defense is the weakest judged pillar',leftPowerStealEmphasis:false}});
  expect(focused.blocks.find(b=>b.modality==='strength')).toEqual(base.blocks.find(b=>b.modality==='strength'));
  const defense=focused.blocks.find(b=>b.modality==='defense');
  expect(defense?.because?.some(reason=>reason.startsWith('Fielding is your top goal.'))).toBe(true);
  expect(base.blocks.find(b=>b.modality==='defense')?.because?.some(reason=>reason.startsWith('Fielding is your top goal.'))??false).toBe(false);
  expect(focused.weeklyRoadmap.map(d=>d.restDay)).toEqual(base.weeklyRoadmap.map(d=>d.restDay));
  expect(focused.weeklyRoadmap.flatMap(d=>d.modalities).length).toBeLessThanOrEqual(base.weeklyRoadmap.flatMap(d=>d.modalities).length);
  expect(focused.weeklyTemplate.perModality.strength).toEqual(base.weeklyTemplate.perModality.strength);
  expect(ctx.get('category_goals')?.value).toEqual(values.category_goals);
 });
});
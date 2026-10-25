import {describe,expect,it} from 'vitest';
import {applyBuntingPlan,type BuntCatalogItem} from './buntingPlan';
import {buildHammerDailyPlan,type PrescribedBlock} from './dailyPlan';
import type {HammerAthleteContext,ContextVariable} from '../context/athleteContext';
import {BUNT_TYPES,BUNT_WORDING,type BuntingFacts} from '../../../../supabase/functions/_shared/wic/buntingProgram';
const catalog:BuntCatalogItem[]=(['R','L'] as const).flatMap(side=>BUNT_TYPES.map(type=>({slug:`bunt_${side.toLowerCase()}_${type}`,name:BUNT_WORDING[side][type],cue:BUNT_WORDING[side][type],is_active:true,dosage_unit:'attempts',equipment_requirements:['bat','ball','field'],equipment:[],equipment_alternatives:[],sport_scope:'both',min_age_years:0,season_eligibility:['off_season','os_q1'],visible_to:null})));
const block={modality:'hitting',status:'ready',phase:'skill',drills:[{name:'Prep',stage:'prep',dosage:'10 swings'},{name:'Skill',stage:'drills',dosage:'20 swings'},{name:'Execution',stage:'full_go',dosage:'15 swings'}],because:[],gamePlanTemplate:null} as unknown as PrescribedBlock;
const facts:BuntingFacts={sport:'baseball',modules:['baseball_5tool'],bats:'R',legalWeekdays:[1,4,6],restDay:false,gameDay:false};
const options={weekday:1,weekIndex:0,owned:['bat','ball','field'],age:18,phase:'off_season',catalog};
describe('bounded bunting in actual hitting slots',()=>{
 it('replaces five swings with five attempts, preserves prep/execution and total work',()=>{
  const next=applyBuntingPlan([block],facts,options)[0];
  expect(next.drills[0]).toEqual(block.drills[0]);expect(next.drills[next.drills.length-1]).toEqual(block.drills[block.drills.length-1]);
  expect(next.drills.find(d=>d.bunt)?.bunt?.attempts).toBe(5);
  expect(next.drills.reduce((n,d)=>n+Number(d.dosage.split(' ')[0]),0)).toBe(45);
 });
 it.each([{...facts,restDay:true},{...facts,gameDay:true},{...facts,modules:['softball_5tool']}])('does not add bunts when safety or sport access disallows it',f=>{expect(applyBuntingPlan([block],f,options)).toEqual([block]);});
 it('requires active catalog, known age, saved gear and a sufficient existing dose',()=>{
  for(const override of [{age:null},{owned:['bat']},{catalog:catalog.map(c=>({...c,is_active:false}))},{phase:'post_season'}])expect(applyBuntingPlan([block],facts,{...options,...override})).toEqual([block]);
  expect(applyBuntingPlan([{...block,drills:[{name:'Low dose',stage:'drills',dosage:'4 swings'}]}],facts,options)[0].drills).toHaveLength(1);
 });
 for(const sport of ['baseball','softball'] as const)for(const tier of ['5tool','golden2way'])for(const bats of ['R','L','S'] as const)it(`actual builder eight weeks: ${sport}/${tier}/${bats}`,()=>{
  const vars=Object.entries({sport_primary:sport,position_primary:'SS',bats_hand:bats,lifecycle_band:'adult',season_phase:'off',lifting_age_years:2,weekly_availability_days:6,injury_history:[],equipment_effective:['bat','ball','field','tee','glove']}).map(([key,value])=>({key,value,missing:false,confidence:'high'}) as ContextVariable);
  const ctx={variables:vars,missing:[],missingCount:0,isLoading:false,envelope:null,get:(key:string)=>vars.find(v=>v.key===key)} as HammerAthleteContext;
  let sessions=0;
  for(let week=0;week<8;week++)for(let day=0;day<7;day++){
   const date=new Date(2026,9,26+week*7+day);const plan=buildHammerDailyPlan(ctx,undefined,null,null,undefined,date,{subscriptionModules:[`${sport}_${tier}`],bunting:{evidence:{outcomes:[],battingGames:[],sourceIds:[]},catalog,phase:'off_season',age:18}});
   const bunts=plan.blocks.flatMap(b=>b.drills.filter(d=>d.bunt));
   if(plan.weeklyRoadmap.find(d=>d.isToday)?.restDay)expect(bunts).toEqual([]);
   if(bunts.length)sessions++;
   for(const d of bunts){expect(d.bunt?.attempts).toBeGreaterThanOrEqual(5);expect(d.bunt?.attempts).toBeLessThanOrEqual(20);if(bats==='S'&&d.bunt?.side==='L')expect(d.bunt.type).not.toBe('push');}
  }
  expect(sessions).toBe(16);
 });
});
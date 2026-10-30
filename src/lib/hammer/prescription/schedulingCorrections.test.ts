import { describe, expect, it } from 'vitest';
import { buildHammerDailyPlan } from './dailyPlan';
import { contextFromEnvelope } from '../context/contextProjection';
import { BUNT_TYPES, BUNT_WORDING } from '../../../../supabase/functions/_shared/wic/buntingProgram';
import { planningGear } from '../../../../supabase/functions/_shared/planSwap/planningGear';
import { guardArmDrills, eassArmEvent, windmillPlanningDrills } from './pitchingDay';
import { subscriptionSchedule } from './subscriptionSchedule';
import type { BuntCatalogItem } from './buntingPlan';
import type { EassDrill } from './eassLibrary';
import {NORMAL_SIGNAL} from './scheduleContext';
const catalog:BuntCatalogItem[]=(['R','L'] as const).flatMap(side=>BUNT_TYPES.map(type=>({slug:`bunt_${side.toLowerCase()}_${type}`,name:BUNT_WORDING[side][type],cue:BUNT_WORDING[side][type],is_active:true,dosage_unit:'attempts',equipment_requirements:['bat','ball','field'],equipment:[],equipment_alternatives:[],sport_scope:'both',min_age_years:0,season_eligibility:['os_q1','os_q2','os_q3','os_q4','in_season'],visible_to:null})));
const ctx=(sport:string,extra:Record<string,unknown>={})=>contextFromEnvelope(Object.fromEntries(Object.entries({sport_primary:sport,position_primary:'SS',bats_hand:'R',age_years:20,lifecycle_band:'adult',lifting_age_years:4,weekly_availability_days:6,season_phase:'off',injury_history:[],equipment_effective:null,...extra}).map(([key,value])=>[key,{value,source:'test',owner:'athlete',confidence:'high',missing:false,last_updated:null}])));
describe('owner scheduling corrections A B C F G',()=>{
 for(const sport of ['baseball','softball'] as const)it(`${sport} six-game week meets purchased ready skill floors`,()=>{
  const counts:Record<string,number>={};
  for(let n=0;n<7;n++){
   const date=new Date(2026,10,16+n);
   const plan=buildHammerDailyPlan(ctx(sport,{season_phase:'in'}),{...NORMAL_SIGNAL,postureToday:'game',rationale:'TEST six-game week'},null,null,undefined,date,{subscriptionModules:[`${sport}_5tool`],armHistory:{rows:[]},bunting:{gameWeekdays:[1,2,3,4,5,6],evidence:{battingGames:[],outcomes:[],sourceIds:[]},catalog,age:20,phase:'in_season'}});
   const ready=plan.blocks.filter(b=>b.status==='ready'&&b.drills.length);
   if(date.getDay()===0){expect(ready.some(b=>['hitting','defense','baserunning','throwing'].includes(b.modality))).toBe(false);continue;}
   for(const category of ['hitting','defense','baserunning'])if(ready.some(b=>b.modality===category))counts[category]=(counts[category]??0)+1;
   if(ready.some(b=>b.drills.some(d=>d.bunt))){counts.bunting=(counts.bunting??0)+1;expect(ready.flatMap(b=>b.drills).filter(d=>d.bunt).every(d=>d.bunt?.attempts===5)).toBe(true);}
  }
  expect(counts.hitting).toBeGreaterThanOrEqual(3);expect(counts.defense).toBeGreaterThanOrEqual(4);expect(counts.baserunning).toBeGreaterThanOrEqual(1);expect(counts.bunting).toBeGreaterThanOrEqual(2);
 });
 it('legacy active all-skill subscription retains defense, bunting and pitching',()=>{expect(subscriptionSchedule(['hitting','pitching','throwing'],'baseball')).toMatchObject({hasPitching:true,hasHitting:true,hasDefense:true,hasBaserunning:true,hasBunting:true,pitcherOnly:false});});
 for(const sport of ['baseball','softball'] as const)for(const tier of ['pitcher','5tool','golden2way'] as const)it(`${sport}/${tier}: purchased floors with unknown gear across eight weeks`,()=>{
  for(let week=0;week<8;week++){
   const counts:Record<string,number>={};let rest=0;
   for(let dow=0;dow<7;dow++){
    const date=new Date(2026,5,1+week*7+dow);
    const phase=week<4?'os_q2':'in_season';
    const plan=buildHammerDailyPlan(ctx(sport,{season_phase:week<4?'off':'in'}),undefined,null,null,undefined,date,{subscriptionModules:[`${sport}_${tier}`],armHistory:{rows:[]},bunting:{evidence:{battingGames:[],outcomes:[],sourceIds:[]},catalog,age:20,phase}});
    expect(plan.sanity?.ok).toBe(true);
    const ready=plan.blocks.filter(b=>b.status==='ready'&&b.drills.length);
    if(date.getDay()===0){rest++;expect(ready.some(b=>['pitching','hitting','defense','baserunning','throwing'].includes(b.modality))).toBe(false);continue;}
    for(const b of ready)counts[b.modality]=(counts[b.modality]??0)+1;
    if(ready.some(b=>b.drills.some(d=>d.bunt)))counts.bunting=(counts.bunting??0)+1;
    if(tier==='pitcher')expect(plan.blocks.some(b=>['hitting','baserunning'].includes(b.modality))).toBe(false);
    if(tier==='5tool')expect(plan.blocks.some(b=>b.modality==='pitching')).toBe(false);
    else expect(ready.some(b=>b.modality==='pitching')).toBe(true);
   }
   expect(rest).toBe(1);expect(counts.defense).toBeGreaterThanOrEqual(4);
   if(tier!=='pitcher'){expect(counts.hitting).toBeGreaterThanOrEqual(3);expect(counts.baserunning).toBeGreaterThanOrEqual(1);expect(counts.bunting).toBeGreaterThanOrEqual(2);}
   else expect(counts.bunting??0).toBe(0);
  }
 });
 it('unknown gear is available but explicit Always missing rejects complete alternative groups',()=>{
  expect(planningGear([],[])).toEqual(expect.arrayContaining(['glove','ball','field','tee']));
  expect(planningGear([],['glove','bands'])).not.toContain('glove');
  expect(planningGear([],['bands'])).not.toContain('bands');
 });
 const pitch:EassDrill={name:'Bullpen',category:'position_skill',intensity:'high',stage:'full_go',dosage:'30 pitches',cue:'command',overloadClass:'regulation'};
 const prep:EassDrill={name:'Prep',category:'band_prep',intensity:'prep',dosage:'2x12',cue:'easy'};
 it('shared two-way budget includes position throws before pitching',()=>{
  expect(guardArmDrills([prep,pitch],{date:'2026-06-03',sport:'baseball',role:'two_way',age:26,level:'pro',history:{rows:[{entry_date:'2026-06-03',source:'position',throw_type:'position_throws',count:100,status:'done'}]}})).toEqual([prep]);
 });
 it('existing Pitch Smart rest debt blocks every throwing dose, never prep',()=>{
  expect(guardArmDrills([prep,pitch],{date:'2026-06-03',sport:'baseball',role:'pitcher',age:16,level:'high_school',history:{rows:[{entry_date:'2026-06-02',source:'pitching',throw_type:'mound_pitch',count:76,status:'done'}]}})).toEqual([prep]);
 });
 it('unavailable arm history never becomes a fresh arm',()=>{
  expect(guardArmDrills([prep,pitch],{date:'2026-06-03',sport:'softball',role:'pitcher',age:20,level:'college',history:{rows:[],unavailable:true}})).toEqual([prep]);
 });
 it('softball pitching uses canonical windmill rows, not baseball plyos',()=>{
 const rows=windmillPlanningDrills({date:'2026-06-03',phase:'os_q2',age:20,readiness:80,armPain:false,equipment:['softball','bands'],history:{rows:[]}});
 expect(rows.some(d=>d.slug==='wm_fastball_spots')).toBe(true);
 expect(rows.every(d=>d.slug?.startsWith('wm_'))).toBe(true);
 expect(windmillPlanningDrills({date:'2026-06-03',phase:'os_q2',age:20,readiness:80,armPain:true,equipment:['softball'],history:{rows:[]}})).toEqual([]);
 });
 it('pitcher fielding remains low-taxing and adds no throws',()=>{
 const plan=buildHammerDailyPlan(ctx('baseball'),undefined,null,null,undefined,new Date(2026,5,3),{subscriptionModules:['baseball_pitcher'],armHistory:{rows:[]}});
 const defense=plan.blocks.find(b=>b.modality==='defense');
 expect(defense?.status).toBe('ready');
 expect(defense?.drills.some(d=>d.stage==='full_go')).toBe(false);
 });
 it('declared quantities count pitches separately from warm-up throws',()=>{expect(eassArmEvent(pitch)?.count).toBe(30);expect(eassArmEvent(pitch)?.kind).toBe('pitch');});
});
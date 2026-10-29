import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { buildHammerDailyPlan } from './dailyPlan';
import { contextFromEnvelope } from '../context/contextProjection';
import { NORMAL_SIGNAL, type ScheduleSignal } from './scheduleContext';

// Deliberate TEST schedule inputs, not claims of hosted games or completed work.
const SCHEDULES = {
  baseball: { pro: [1,2,3,4,5,6], college: [2,4,5,6], high_school: [2,4,6], youth: [3,6] },
  softball: { pro: [2,4,5,6], college: [1,2,4,5,6], high_school: [2,4,6], youth: [3,6] },
} as const;
const report: Record<string, unknown> = {};
describe('D/H real shared builder with explicit TEST game weeks',()=>{
 for(const sport of ['baseball','softball'] as const)for(const program of ['pitcher','5tool','golden2way'] as const)for(const level of ['pro','college','high_school','youth'] as const){
  it(`${sport}/${program}/${level}: four game weeks preserve prep, rest and access`,()=>{
   const samples:unknown[]=[];
   for(let offset=0;offset<28;offset++){
    const date=new Date(2026,5,1+offset);const dow=date.getDay();const game=(SCHEDULES[sport][level] as readonly number[]).includes(dow);
    const signal:ScheduleSignal={...NORMAL_SIGNAL,postureToday:game?'game':'normal',isGameToday:game,todayKinds:game?['game']:[],eventLabel:game?'TEST scheduled game':null,rationale:game?'TEST scheduled game — save your work for the game.':''};
    const age=level==='youth'?11:level==='high_school'?16:level==='college'?20:26;
    const envelope=Object.fromEntries(Object.entries({sport_primary:sport,position_primary:program==='5tool'?'SS':'P',bats_hand:'R',age_years:age,weekly_availability_days:6,season_phase:'in',lifecycle_band:age<13?'u12':age<18?'u18':'adult',lifting_age_years:age<13?0:2,injury_history:[],equipment_effective:null}).map(([key,value])=>[key,{value,source:'TEST game input',owner:'athlete',missing:false,confidence:'high',last_updated:null}]));
    const plan=buildHammerDailyPlan(contextFromEnvelope(envelope),signal,null,null,undefined,date,{subscriptionModules:[`${sport}_${program}`],resolvedSeasonPhase:'in',armHistory:{rows:[]}});
    if(dow===0)expect(plan.blocks.filter(b=>b.status==='ready'&&['hitting','pitching','defense','baserunning','throwing'].includes(b.modality))).toEqual([]);
    if(game){
     const defense=plan.blocks.find(b=>b.modality==='defense');
     expect(defense?.gameDayPrimer).toBe(true);
     expect(defense?.drills.some(d=>d.stage==='full_go')).toBe(false);
     expect(defense?.durationMin).toBeLessThanOrEqual(10);
     expect(plan.blocks.filter(b=>['speed','strength','baserunning'].includes(b.modality)&&b.status==='ready')).toEqual([]);
     expect(plan.blocks.flatMap(b=>b.drills).some(d=>d.bunt)).toBe(false);
    }
    if(program==='pitcher')expect(plan.blocks.some(b=>['hitting','baserunning'].includes(b.modality))).toBe(false);
    if(program==='5tool')expect(plan.blocks.some(b=>b.modality==='pitching')).toBe(false);
    samples.push({date:date.toISOString().slice(0,10),game,cards:plan.blocks.filter(b=>b.status==='ready'&&b.drills.length).map(b=>({modality:b.modality,title:b.title,phase:b.phase,drills:b.drills.map(d=>({name:d.name,dose:d.dosage,stage:d.stage}))}))});
   }
   report[`${sport}/${program}/${level}`]=samples;
   writeFileSync('/tmp/scheduling-game-shared.json',JSON.stringify(report,null,2));
  });
 }
});
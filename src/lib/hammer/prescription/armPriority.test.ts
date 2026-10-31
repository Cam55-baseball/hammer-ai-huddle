import {describe,it,expect} from 'vitest';
import {finalArmGuard,NO_THROWING_REASON} from './finalArmGuard';
import {withWarmupThrows,type DrillStep} from './dailyPlan';
import {parseRoleMessage,scheduleRoleFor} from '../pitching/pitcherRoleAnswers';

const ev=(count:number,kind:'pitch'|'practice'='practice')=>({kind,count,intent:'high' as const,estimated:false});
const warm={name:'Regulation warm-up toss (5oz)',armEvent:ev(20,'practice')};
const pitch={name:'Bullpen',armCard:'pitching',armEvent:ev(30,'pitch')};
const pos={name:'Crow-hop throw',armCard:'throwing',armEvent:ev(30)};
const input=(limitPitching=false)=>({sport:'baseball' as const,role:'two_way' as const,age:17,date:'2026-11-18',history:{rows:[{entry_date:'2026-11-18',source:'pitching',count:0,status:'done'}]},limitPitching});

describe('Owner Oct 31 arm-budget priority',()=>{
 const room=(r:number)=>({...input(),history:{rows:[{entry_date:'2026-11-17',source:'pitching',count:0,status:'done'}]}});
 it('keeps warm-up throws first and cuts position throws before pitching',()=>{
  // find a budget where only warm-up + one activity fits by inflating counts
  const big={...pos,armEvent:ev(500)};
  const out=finalArmGuard([{status:'ready',modality:'pitching',drills:[warm,pitch]},{status:'ready',modality:'throwing',drills:[big]}],room(0));
  expect(out[0].drills.map(d=>d.name)).toEqual([warm.name,pitch.name]);
  expect(out[1].drills).toEqual([]);
  expect(out[1].because?.join(' ')).toMatch(/Position throws were cut first/);
 });
 it('cuts pitching first when the player asked to limit pitching',()=>{
  const big={...pitch,armEvent:ev(500,'pitch')};
  const out=finalArmGuard([{status:'ready',modality:'pitching',drills:[warm,big]},{status:'ready',modality:'throwing',drills:[pos]}],{...room(0),limitPitching:true});
  expect(out[0].drills.map(d=>d.name)).toEqual([warm.name]);
  expect(out[1].drills.map(d=>d.name)).toEqual([pos.name]);
 });
 it('no throwing activity at all when warm-ups plus one activity cannot fit',()=>{
  const out=finalArmGuard([{status:'ready',modality:'pitching',drills:[warm,pitch]},{status:'ready',modality:'throwing',drills:[pos]}],{...input(),history:{rows:[],unavailable:true}} as any);
  expect(out.every(b=>b.status==='suppressed')).toBe(true);
  expect(out[0].drills).toEqual([]);
  expect(out[0].because).toContain(NO_THROWING_REASON);
 });
});

describe('Owner Oct 31 warm-up throws before every throwing card',()=>{
 const w={modality:'warmup',status:'ready',title:'Warm-up',drills:[{name:'Leg swings',dosage:'1 × 10'}] as DrillStep[],steps:[] as string[]};
 it('a defense card with throws gets arm prep and warm-up throws',()=>{
  const d={modality:'defense',status:'ready',title:'Defense — infield',drills:[{name:'Backhand and throw',dosage:'2 × 5',armEvent:ev(10)}] as DrillStep[],steps:[] as string[]};
  const [wu]=withWarmupThrows([w,d]);
  expect(wu.drills.map(x=>x.name)).toContain('Warm-up throws — easy to building');
  expect(wu.drills.map(x=>x.name)).toContain('Arm prep — arm circles and band pull-aparts');
 });
 it('without a ready warm-up, the throwing card itself opens with them',()=>{
  const t={modality:'throwing',status:'ready',title:'Throwing',drills:[{name:'Long toss',dosage:'1 × 20',armEvent:ev(20)}] as DrillStep[],steps:[] as string[]};
  const [card]=withWarmupThrows([t]);
  expect(card.drills[0].name).toMatch(/^Arm prep/);
  expect(card.drills[1].name).toMatch(/^Warm-up throws/);
 });
});

describe('role answers',()=>{
 it('map onto the existing schedule roles',()=>{
  expect(scheduleRoleFor('starter')).toBe('starter');
  expect(scheduleRoleFor('bullpen')).toBe('reliever');
  expect(scheduleRoleFor('closer')).toBe('reliever');
 });
 it('parse Tell Hammers words',()=>{
  expect(parseRoleMessage("I'm the closer now")).toEqual({pitching_role:'closer'});
  expect(parseRoleMessage('please limit my pitching')).toEqual({limit_pitching:true});
  expect(parseRoleMessage("stop limiting my pitching")).toEqual({limit_pitching:false});
  expect(parseRoleMessage("I'm mainly a position player")).toEqual({primary_focus:'position'});
  expect(parseRoleMessage('games cancelled Friday')).toBeNull();
 });
});

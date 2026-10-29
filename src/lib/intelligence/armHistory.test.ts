import {describe,it,expect}from 'vitest';
import {projectArmHistory}from './armHistory';
const velocity=(id:string,date:string,position='infield',value=80)=>({id,date,position,value,sport:'baseball',metric:'throw_velo_mph',unit:'mph',source:'Radar'});
describe('dated compatible arm history',()=>{
 it('retains every dated velocity by position without pairing human grades',()=>{
  const h=projectArmHistory({throwing:[velocity('b','2026-10-22'),velocity('a','2026-10-01'),velocity('c','2026-10-23','outfield',85)],humanGrades:[{id:'g',date:'2026-09-04',sport:'baseball',position:'SS',source:'coach_evaluated',evaluator:'coach',arm:65}]},'baseball');
  expect(h.map(p=>[p.id,p.date,p.position,p.value])).toEqual([['g','2026-09-04','SS',65],['a','2026-10-01','infield',80],['b','2026-10-22','infield',80],['c','2026-10-23','outfield',85]]);
 });
 it('keeps pop time separate from exchange time and retains both actual dates',()=>{
  const r={id:'p',date:'2026-10-10T13:00:00Z',sport:'softball',metric:'pop_time_sec',value:2.1,unit:'sec',source:'manual_entry'};
  expect(projectArmHistory({catching:[r,{...r,id:'q',date:'2026-10-20',value:2},{...r,id:'x',metric:'exchange_time'}]},'softball').map(p=>[p.date,p.value,p.unit])).toEqual([['2026-10-10',2.1,'seconds'],['2026-10-20',2,'seconds']]);
 });
 it('never invents dates or reassociates wrong-sport, unknown-position, missing or invalid values',()=>{
  const r=velocity('a','2026-10-01');
  expect(projectArmHistory({throwing:[{...r,date:null},{...r,date:'2026-02-30'},{...r,sport:'softball'},{...r,sport:null},{...r,position:null},{...r,value:NaN},{...r,missing:'not measured'}]},'baseball')).toEqual([]);
 });
 it('retains coach and scout grades only with their own evaluator, position and date',()=>{
  const r={id:'g',date:'2026-09-04',sport:'baseball',position:'SS',source:'coach_evaluated',evaluator:'coach',arm:65};
  const h=projectArmHistory({humanGrades:[r,{...r,id:'s',date:'2026-10-04',source:'scout_evaluated',arm:70},{...r,id:'self',source:'self_reported'},{...r,id:'nodate',date:''},{...r,id:'nopos',position:''},{...r,id:'invalid',arm:63}]},'baseball');
  expect(h.map(p=>[p.id,p.date,p.source,p.value])).toEqual([['g','2026-09-04','coach_evaluated',65],['s','2026-10-04','scout_evaluated',70]]);
 });
 it('deduplicates identical joins and drops conflicting same-record observations',()=>{
  const r=velocity('a','2026-10-01');expect(projectArmHistory({throwing:[r,r]},'baseball')).toHaveLength(1);
  expect(projectArmHistory({throwing:[r,{...r,value:90},r]},'baseball')).toEqual([]);
 });
});
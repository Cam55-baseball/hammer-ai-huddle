import {describe,it,expect} from 'vitest';
import {finalArmGuard} from './finalArmGuard';
const pitch={name:'pitch',armEvent:{kind:'pitch' as const,count:40,intent:'high' as const,estimated:false}};
const position={name:'position',armEvent:{kind:'practice' as const,count:60,intent:'high' as const,estimated:false}};
describe('final shared arm budget',()=>{
 it('two cards cannot each spend the same remaining room',()=>{
  const result=finalArmGuard([{status:'ready',drills:[pitch]},{status:'ready',drills:[position]}],{sport:'softball',role:'two_way',age:17,date:'2026-11-18',history:{rows:[]}});
  expect(result[0].drills).toEqual([pitch]);expect(result[1].drills).toEqual([]);
 });
 it('the actual 40-pitch game reserves room before any card',()=>{
  const result=finalArmGuard([{status:'ready',drills:[pitch]}],{sport:'softball',role:'two_way',age:17,date:'2026-11-18',history:{rows:[{entry_date:'2026-11-18',source:'pitching',count:40,status:'done'}]}});
  expect(result[0].drills).toEqual([]);
 });
});
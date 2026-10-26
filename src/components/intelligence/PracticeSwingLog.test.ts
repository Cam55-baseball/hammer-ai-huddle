import {describe,expect,it} from 'vitest';
import {toSession} from './PracticeSwingLog';
import {weightedPracticeWhiff} from '../../../supabase/functions/_shared/wic/practiceDifficulty';
const r=(o:any)=>({id:'x',practice_date:'2026-10-26',pitch_mph:null,release_ft:null,pitch_mix:null,swings:10,whiffs:5,...o});
describe('practice log rows use owner weights',()=>{
 it('tee 1.0, live 0.3, softball machine 60 mph @43ft fastballs = 0.6',()=>{
  const s=weightedPracticeWhiff([r({practice_type:'tee'}),r({practice_type:'live_ab'})].map(x=>toSession(x,'baseball')));
  expect(s.rate).toBeCloseTo((5*1+5*.3)/20);expect(s.overridesGameIdentity).toBe(false);
  const m=weightedPracticeWhiff([toSession(r({practice_type:'machine',pitch_mph:60,release_ft:43,pitch_mix:'fastballs'}),'softball')]);
  expect(m.rate).toBeCloseTo(.3);
 });
 it('machine without mix is skipped, never guessed',()=>{
  const s=weightedPracticeWhiff([toSession(r({practice_type:'machine',pitch_mph:70,release_ft:50}),'baseball')]);
  expect(s.rate).toBeNull();expect(s.skipped).toBe(1);
 });
});

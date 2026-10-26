import {describe,it,expect} from 'vitest';
import {masteryLevelFor} from './masteryProjection';
import {BASEBALL_COMPETITION_LEVELS} from '@/data/baseball/competitionLevels';
import {SOFTBALL_COMPETITION_LEVELS} from '@/data/softball/competitionLevels';
import {pitchingIdentity} from '../../../supabase/functions/_shared/wic/masteryPitching';
describe('level → standards map (owner Oct 26)',()=>{
 for(const [sport,list] of [['baseball',BASEBALL_COMPETITION_LEVELS],['softball',SOFTBALL_COMPETITION_LEVELS]] as const)
  it(`${sport}: every saved level maps except unanswered academy`,()=>{const unmapped=list.map(l=>l.key).filter(k=>masteryLevelFor(k)===null);expect(unmapped.filter(k=>k!=='academy')).toEqual([]);});
 it('owner-named keys',()=>{for(const k of ['rookie','low_a','high_a','aa','aaa','winter_ball','foreign_league','free_agent','wpf','npf','indie_pro','mlb','ausl','academy_pro'])expect(masteryLevelFor(k)).toBe('pro');
  for(const k of ['cape_cod','summer_generic','juco','d1'])expect(masteryLevelFor(k)).toBe('college');
  for(const k of ['hs_varsity','hs_jv'])expect(masteryLevelFor(k)).toBe('high_school');
  for(const k of ['middle_school','little_league','travel','rec','academy_youth'])expect(masteryLevelFor(k)).toBe('youth');
  expect(masteryLevelFor('academy')).toBeNull();});
 it('pitching pillar uses starting standards, no separate cutoffs',()=>{const p=(k:number)=>Array.from({length:100},(_,i)=>({id:`p${i}`,opportunity:i+1,outcome:i<k?'K':'out'}));const g=(k:number)=>[{id:'g',date:'2026-10-25',battersFaced:null,complete:true,pitches:p(k)}];
  expect(pitchingIdentity(g(31),{} as never,undefined,'baseball','pro').status).toBe('Elite');
  expect(pitchingIdentity(g(29),{} as never,undefined,'baseball','pro').status).toBe('Building');
  expect(pitchingIdentity(g(31),{} as never,undefined,'baseball',null).reason).not.toMatch(/cutoffs are not set/);});
});

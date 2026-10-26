import {describe,expect,it} from 'vitest';
import {developmentStrategy,chosenGoalPillar,type StrategyPillarFact} from '../../../supabase/functions/_shared/wic/goals/developmentStrategy';
import {masteryGoalWeights} from '@/lib/hammer/prescription/masteryFocus';
import {isSafeForMinor} from '../../../supabase/functions/_shared/wic/goals/naturalFirst';
const goals={version:1,goals:[{category:'speed',rank:1},{category:'hitting',rank:2,intent:'power_hitting'},{category:'fielding',rank:3}]} as never;
const f=(pillar:StrategyPillarFact['pillar'],status:string,grade:number|null,progress:number|null):StrategyPillarFact=>({pillar,status,grade,progress,sourceIds:status==='Need more data'?[]:[`${pillar}-src`]});
describe('development strategy',()=>{
 it('maps top saved goal to a pillar',()=>{
  expect(chosenGoalPillar([{category:'hitting',intent:'power_hitting',rank:1}])).toBe('power');
  expect(chosenGoalPillar([{category:'fielding',rank:2},{category:'speed',rank:1}])).toBe('speed');
  expect(chosenGoalPillar([])).toBeNull();
 });
 it('power cusp + speed goal secures power first with a 30% goal share',()=>{
  const s=developmentStrategy({chosen:'speed',age:17,pillars:[f('power','Building',null,0.85),f('speed','Building',45,45/65)]});
  expect(s.mode).toBe('secure_natural');expect(s.primary).toBe('power');expect(s.goalShare).toBe(0.3);expect(s.sourceIds).toEqual(['power-src']);
  expect(s.nutrition.join(' ')).toMatch(/protein/);expect(s.nutrition.every(isSafeForMinor)).toBe(true);expect(s.nutrition.join(' ')).toMatch(/parent or professional/);
 });
 it('nothing close → goal-first, no overlay',()=>{
  const s=developmentStrategy({chosen:'speed',age:20,pillars:[f('power','Building',null,0.4),f('defense','Building',40,40/65)]});
  expect(s.mode).toBe('goal_first');expect(s.primary).toBe('speed');expect(s.sourceIds).toEqual([]);
 });
 it('unjudged pillars are never assumed near',()=>{
  const s=developmentStrategy({chosen:'speed',age:20,pillars:[f('defense','Need more data',null,null)]});
  expect(s.mode).toBe('goal_first');
 });
 it('8-week simulation: strategy changes plan order, then goal leads with elite maintenance',()=>{
  const defenseByWeek=[55,55,60,60,60,65,65,65];
  const tops=defenseByWeek.map(g=>{
   const s=developmentStrategy({chosen:'speed',age:16,pillars:[f('defense',g>=65?'Elite':'Building',g,g/65),f('speed','Building',40,40/65)]});
   const focus=s.mode==='secure_natural'?{observedFocus:s.primary,sourceIds:s.sourceIds,reason:s.reason,leftPowerStealEmphasis:false}:undefined;
   return {top:masteryGoalWeights(goals,focus)!.goals[0].category,mode:s.mode,maintain:s.maintain};
  });
  expect(tops.slice(0,5).every(t=>t.top==='fielding'&&t.mode==='secure_natural')).toBe(true);
  expect(tops.slice(5).every(t=>t.top==='speed'&&t.mode==='goal_first'&&t.maintain.includes('defense'))).toBe(true);
 });
 it('heavier slow player on the power cusp goes power first',()=>{
  const s=developmentStrategy({chosen:'speed',age:22,bodyMassTrend:'heavier',pillars:[f('defense','Building',60,60/65),f('power','Building',null,0.9),f('speed','Building',35,35/65)]});
  expect(s.primary).toBe('power');
 });
});

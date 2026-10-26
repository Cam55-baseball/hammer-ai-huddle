import {describe,it,expect} from 'vitest';
import {masteryPlanGuidance,masterySavedGuidance} from '../../../supabase/functions/_shared/wic/masteryPlanContext';
describe('canonical identity-to-saved-plan guidance',()=>{
 const context={guidance:{observedFocus:'contact',sourceIds:['ab-100','pitch-100'],reason:'Contact is the weakest judged pillar.',leftPowerStealEmphasis:false}};
 it('accepts only judged, sourced focus; unknown cannot author guidance',()=>{
  expect(masteryPlanGuidance(context)?.observedFocus).toBe('contact');
  expect(masteryPlanGuidance({status:'Need more data'})).toBeUndefined();
  expect(masteryPlanGuidance({guidance:{...context.guidance,sourceIds:[]}})).toBeUndefined();
  expect(masteryPlanGuidance({guidance:{...context.guidance,observedFocus:'pitching'}})).toBeUndefined();
 });
 it('new saved work retains source and never changes dose or prior payload',()=>{
  const rows=[{sets:3,reps:5,why_payload:{phase:'in_season'}}];
  masterySavedGuidance(rows,masteryPlanGuidance(context),false);
  expect(rows[0].sets).toBe(3);expect(rows[0].reps).toBe(5);
  expect(rows[0].why_payload).toMatchObject({phase:'in_season',mastery_focus:{sourceIds:['ab-100','pitch-100'],observedFocus:'contact'}});
 });
 it('saved days are byte-identical, even when the identity changed',()=>{
  const rows=[{sets:3,reps:5,why_payload:{phase:'in_season'}}];const before=JSON.stringify(rows);
  masterySavedGuidance(rows,masteryPlanGuidance(context),true);expect(JSON.stringify(rows)).toBe(before);
 });
});
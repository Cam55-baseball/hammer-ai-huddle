import {describe,it,expect} from 'vitest';
import {selectConditioning} from '../../../supabase/functions/_shared/wic/conditioning/selectConditioning';
import {floorConditioningSlugs,isRunningConditioning} from '../../../supabase/functions/_shared/wic/conditioning/weeklyFloor';
import {rowKinds} from '../../../supabase/functions/_shared/wic/schedule/finalCheck';
import {validate} from '../../../supabase/functions/_shared/wic/validator';
describe('owner easy-running floors',()=>{
 for(const sport of ['baseball','softball'] as const)it(`${sport} lower readiness uses a sport-specific easy run`,()=>{
  const slug=sport==='baseball'?'easy_base_jog_bb':'easy_base_jog_sb';
  expect(floorConditioningSlugs({sport,isPitcher:true,lowReadiness:true})).toEqual([slug]);
  const selected=selectConditioning({sport,position:'SS',phase:'in_season',isTournamentDay:false,hoursToNearestGame:20,pitcherStartedYesterday:false,returningAfterGap:false,dialDownReasons:['running_readiness']});
  expect(selected.slugs).toEqual([slug]);expect(isRunningConditioning(selected.slugs)).toBe(true);
  expect(rowKinds({slot:'conditioning',movement_slug:slug},{conditioning_category:'aerobic_base',movement_velocity:'submax'})).toEqual([]);
 });
 it('bike and walk never count as running and hard runs retain spacing',()=>{
  expect(isRunningConditioning(['rc_easy_flush','rc_long_reach_walk'])).toBe(false);
  expect(rowKinds({slot:'conditioning',movement_slug:'bases_home_2nd'},{conditioning_category:'aerobic_base'})).toEqual(['hard_run']);
 });
 for(const slug of ['easy_base_jog_bb','easy_base_jog_sb']) it(`${slug} passes the game-day slot check`,()=>{
  const report=validate({phase:'in_season',isGameDay:true,prescriptions:[{slot:'conditioning',sequence_role:'conditioning',movement_slug:slug,movement_name:slug,sets:1,reps:null,duration_seconds:540}]});
  expect(report.ok).toBe(true);
  expect(report.issues.filter(i=>i.code==='game_day_forbidden_slot')).toEqual([]);
 });
 for(const slug of ['bases_home_2nd','repeat_43ft_sb','unknown_easy_jog']) it(`${slug} remains forbidden as game-day conditioning`,()=>{
  const report=validate({phase:'in_season',isGameDay:true,prescriptions:[{slot:'conditioning',sequence_role:'conditioning',movement_slug:slug,movement_name:slug,sets:1,reps:null}]});
  expect(report.issues).toContainEqual(expect.objectContaining({code:'game_day_forbidden_slot',severity:'fatal',slug}));
 });
 it('an easy-jog name cannot authorize a lift on game day',()=>{
  const report=validate({phase:'in_season',isGameDay:true,prescriptions:[{slot:'lift',sequence_role:'trunk_primer',movement_slug:'easy_base_jog_bb',movement_name:'Easy jog',sets:1,reps:null}]});
  expect(report.issues).toContainEqual(expect.objectContaining({code:'game_day_forbidden_slot',severity:'fatal'}));
 });
});
import {describe,it,expect} from 'vitest';
import {selectConditioning} from '../../../supabase/functions/_shared/wic/conditioning/selectConditioning';
import {floorConditioningSlugs,isRunningConditioning} from '../../../supabase/functions/_shared/wic/conditioning/weeklyFloor';
import {rowKinds} from '../../../supabase/functions/_shared/wic/schedule/finalCheck';
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
});
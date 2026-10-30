import {describe,it,expect} from 'vitest';
import {activeRestrictedAreas,restrictedConditioningReason} from '../../../supabase/functions/_shared/wic/conditioning/restrictedConditioning';
import {isRunningConditioning,conditioningFloorDue} from '../../../supabase/functions/_shared/wic/conditioning/weeklyFloor';
describe('restriction-safe conditioning',()=>{
 it('explicit active ankle restriction blocks running without diagnosing text',()=>{
  expect(activeRestrictedAreas([{region:'ankle',severity:'managing'},{note:'ankle fracture'},{region:'shoulder',recovery_status:'healed',severity:'moderate'}])).toEqual(['ankle']);
  expect(restrictedConditioningReason(['ankle'])).not.toBeNull();expect(restrictedConditioningReason(['shoulder'])).toBeNull();
 });
 it('bike/walk flush and fielding never certify running',()=>{expect(isRunningConditioning(['rc_easy_flush','mi_turn_at_2b'])).toBe(false);expect(isRunningConditioning(['bases_home_2nd'])).toBe(true);});
 it('two qualifying sessions fulfill the weekly floor',()=>{expect(conditioningFloorDue({planDate:'2026-11-07',priorRunningDates:['2026-11-02','2026-11-04']})).toMatchObject({needed:0,due:false,done:2});});
 it('moves the two floor opportunities onto the only non-game dates instead of waiting until blocked Friday',()=>{
  const blockedDates=['2026-11-03','2026-11-05','2026-11-06','2026-11-07'];
  expect(conditioningFloorDue({planDate:'2026-11-02',priorRunningDates:[],blockedDates})).toMatchObject({due:true,remaining:2,needed:2});
  expect(conditioningFloorDue({planDate:'2026-11-04',priorRunningDates:['2026-11-02'],blockedDates})).toMatchObject({due:true,remaining:1,needed:1});
  expect(conditioningFloorDue({planDate:'2026-11-03',priorRunningDates:[],blockedDates})).toMatchObject({due:false});
 });
});
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
});
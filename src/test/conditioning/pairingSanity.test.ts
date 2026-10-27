import {describe,expect,it} from 'vitest';
import {certifyConditioning} from '../../../supabase/functions/_shared/wic/conditioning/sessionBuilder';
const catalog=[{slug:'rc_breathing_reset',name:'Slow Breathing Reset',conditioning_category:'recovery_flush'}, {slug:'medicine_ball_overhead_throw',name:'Medicine Ball Overhead Throw',conditioning_category:'alactic_power'}];
const rx=(slug:string)=>({slot:'conditioning',movement_slug:slug,movement_name:slug,sequence_order:1});
describe('recovery pairing sanity',()=>{
  it('rejects Slow Breathing Reset paired with an all-out overhead med-ball throw',()=>{
    const result=certifyConditioning({prescriptions:catalog.map(c=>rx(c.slug)),catalog,template:{seasonPhase:'offseason'},templateId:'cond.recovery_flush'});
    expect(result.fatal).toContainEqual(expect.objectContaining({code:'cond_incompatible_recovery',slug:'medicine_ball_overhead_throw'}));
    expect(result.validationStatus).toBe('failed');
  });
  it('accepts a breathing-only recovery card',()=>{
    expect(certifyConditioning({prescriptions:[rx('rc_breathing_reset')],catalog,template:{seasonPhase:'offseason'},templateId:'cond.recovery_flush'}).validationStatus).toBe('passed');
  });
});
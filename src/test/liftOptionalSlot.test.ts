import {describe,it,expect} from 'vitest';
import {optionalCompoundAvailable} from '../../supabase/functions/_shared/wic/lift/optionalSlot';
describe('optional robustness single compound slots',()=>{
 for(const category of ['compound_lower','compound_upper_push','compound_upper_pull'])it(`${category} cannot duplicate mandatory work`,()=>expect(optionalCompoundAvailable(category,[category])).toBe(false));
 it('noncompound robustness remains available',()=>expect(optionalCompoundAvailable('arm_care',['arm_care'])).toBe(true));
 it('unfilled compound remains available',()=>expect(optionalCompoundAvailable('compound_upper_pull',['compound_lower'])).toBe(true));
});
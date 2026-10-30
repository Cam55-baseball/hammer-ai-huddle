import {describe,it,expect} from 'vitest';
import {optionalCompoundAvailable,removeDuplicateCompounds} from '../../supabase/functions/_shared/wic/lift/optionalSlot';
describe('optional robustness single compound slots',()=>{
 for(const category of ['compound_lower','compound_upper_push','compound_upper_pull'])it(`${category} cannot duplicate mandatory work`,()=>expect(optionalCompoundAvailable(category,[category])).toBe(false));
 it('noncompound robustness remains available',()=>expect(optionalCompoundAvailable('arm_care',['arm_care'])).toBe(true));
 it('unfilled compound remains available',()=>expect(optionalCompoundAvailable('compound_upper_pull',['compound_lower'])).toBe(true));
 it('step-down convergence removes the later compound, not the first dose',()=>{
  const first={slot:'lift',category:'compound_upper_pull',sets:3};const later={slot:'lift',category:'compound_upper_pull',sets:1};
  const result=removeDuplicateCompounds([first,later],r=>r.category);
  expect(result.rows).toEqual([first]);expect(result.removed).toEqual([later]);
 });
});
import { describe,it,expect } from 'vitest';
import { editCategory, validateEditedExercises } from '../../../supabase/functions/_shared/coach/dayEdit';
import { prescriptionMode } from '../../../supabase/functions/_shared/coach/prescriptionActions';
import { checkPrescriptionReplace } from '../../../supabase/functions/_shared/coach/prescriptionSafety';
describe('dated coach card edit contract',()=>{
  it('uses the existing safety handler and defense category',()=>{expect(prescriptionMode('edit_day')).toBe('edit_day');expect(editCategory('defense')).toBe('fielding');expect(editCategory('game')).toBeNull();});
  it('retains exact entered sets/reps/time/order/notes without estimating free text',()=>{const items=[{name:'B',sets:2,duration:30,notes:'First'},{name:'A',sets:3,reps:8}];expect(validateEditedExercises(items)).toBeNull();expect(items.map(e=>e.name)).toEqual(['B','A']);expect(items[0]).toMatchObject({sets:2,duration:30,notes:'First'});});
  it('requires a nonempty replacement; removal uses the dated removal control',()=>{expect(validateEditedExercises([])).not.toBeNull();});
  it('rejects unknown dose and negative repetitions',()=>{expect(validateEditedExercises([{name:'Drill',notes:'A few reps'}])).not.toBeNull();expect(validateEditedExercises([{name:'Drill',sets:1,reps:-2}])).not.toBeNull();});
  it('never allows edits to bypass the existing rest restriction',()=>{expect(checkPrescriptionReplace({category:'lift',date:'2026-10-31',intensity:'light',throwing:false,isRestDay:true,gameOnDate:false,gameNextDay:false,inSeason:false,nextThrowDate:null,injuryMode:false,hasCard:true}).verdict).toBe('alongside_only');});
});
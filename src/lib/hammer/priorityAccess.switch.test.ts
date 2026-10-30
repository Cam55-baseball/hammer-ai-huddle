import {expect,it} from 'vitest';
import {priorityAccess} from './priorityAccess';
it('baseball-only paid skills cannot authorize a Both softball switch',()=>{
  expect(priorityAccess(['baseball_hitting','baseball_pitching','baseball_throwing'],'softball')).toEqual({hasPitching:false,hasHitting:false,hasThrowing:false});
});
it('explicit softball paid skills authorize their own sport only',()=>{
  expect(priorityAccess(['softball_hitting','softball_throwing'],'softball')).toEqual({hasPitching:false,hasHitting:true,hasThrowing:true});
});
import {describe,expect,it} from 'vitest';
import {projectMasterySources} from './masteryProjection';
describe('level to standards mapping',()=>{
 it.each(['indie_pro','INDIE_PRO','mlb','milb','ausl','pro'])('%s uses pro standards',(level)=>{
  for(const sport of ['baseball','softball'] as const)expect(projectMasterySources({context:{level}},sport,null).level).toBe('pro');
 });
 it('an unmapped level is never guessed',()=>{expect(projectMasterySources({context:{level:'academy'}},'baseball',null).level).toBeNull();});
});

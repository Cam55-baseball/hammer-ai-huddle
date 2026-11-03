import {describe,it,expect} from 'vitest';
import {startingLevels,planningPrimaryFocus} from '../../../supabase/functions/_shared/wic/progression/startingPoint';
import {planStartsFrom} from '@/hooks/useStartingPoint';
describe('owner Nov2 conservative missing answers',()=>{
 it.each(['baseball','softball'] as const)('%s Golden without pick defaults to position only',sport=>{expect(planningPrimaryFocus(sport,[`${sport}_golden2way`],null)).toBe('position');expect(planningPrimaryFocus(sport,[`${sport}_golden2way`],'pitcher')).toBe('pitcher');});
 it.each(['baseball','softball'] as const)('%s missing areas start gently',sport=>{const l=startingLevels(sport,'golden2way',{},300);expect(l.throwsPerWeek).toBe(159);expect(l.swingsPerSession).toBe(6);expect(l.defenseRepsPerSession).toBe(6);expect(l.sprintYards).toBe(40);expect(l.buildUpsFirstWeeks).toBe(2);expect(l.lifting).toBe('foundation');expect(l.jumps).toBe('easiest');expect(l.pitching?.flatGroundFirst).toBe(true);expect(l.teeFirst).toBe(true);expect(l.buntRepsPerSide).toBe(5);});
 it('partial answers do not remove conservative caps',()=>{const p=planStartsFrom('baseball',['baseball_5tool'],{last_trained:'Right now'}, {},300);expect(p.targets.speed).toBe(40);expect(p.levels?.lifting).toBe('foundation');expect(p.levels?.jumps).toBe('easiest');});
});

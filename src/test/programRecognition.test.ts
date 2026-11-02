import { describe, expect, it } from 'vitest';
import { programOf, normalizeProgramModules } from '../../supabase/functions/_shared/programAccess';
import { questionsFor, golden2wayRoleMissing } from '../../supabase/functions/_shared/wic/progression/startingPoint';
import { pitcherYardRuleApplies } from '../../supabase/functions/_shared/wic/conditioning/yards';
import { getActiveTier } from '../utils/tierAccess';

describe('owner-approved tier and legacy program recognition', () => {
  for (const sport of ['baseball', 'softball'] as const) {
    const patterns = [
      [['pitching'], 'pitcher'], [['pitcher'], 'pitcher'],
      [['hitting'], '5tool'], [['throwing'], '5tool'], [['hitting', 'throwing'], '5tool'], [['5tool'], '5tool'],
      [['pitching', 'hitting'], 'golden2way'], [['pitching', 'hitting', 'throwing'], 'golden2way'], [['golden2way'], 'golden2way'],
    ] as const;
    for (const [keys, expected] of patterns) for (const prefixed of [true, false]) {
      it(`${sport} ${prefixed ? 'prefixed' : 'legacy plain'} ${keys.join('+')}`, () => {
        const modules = keys.map(k => prefixed ? `${sport}_${k}` : k);
        expect(programOf(sport, modules)).toBe(expected);
        expect(getActiveTier(modules, sport)).toBe(expected);
        const normalized = normalizeProgramModules(modules, sport);
        expect(normalized).toContain(`${sport}_${expected}`);
        expect(programOf(sport, normalized)).toBe(expected);
        expect(questionsFor(sport, expected).some(q => q.category === 'pitching')).toBe(expected !== '5tool');
        expect(pitcherYardRuleApplies(sport, modules, 'pitcher')).toBe(expected !== '5tool');
        expect(pitcherYardRuleApplies(sport, modules, 'position')).toBe(expected === 'pitcher');
        expect(golden2wayRoleMissing(sport, modules, null)).toBe(expected === 'golden2way');
      });
    }
  }
  it('preserves independent programs for multiple sports', () => {
    const modules = ['baseball_pitching', 'softball_hitting', 'softball_throwing'];
    expect(programOf('baseball', modules, 'baseball')).toBe('pitcher');
    expect(programOf('softball', modules, 'baseball')).toBe('5tool');
    expect(normalizeProgramModules(modules, 'baseball')).toContain('softball_5tool');
  });
  it('unprefixed skills belong only to primary sport', () => {
    expect(programOf('baseball', ['hitting','pitching'], 'softball')).toBeNull();
    expect(normalizeProgramModules(['hitting','pitching'], 'softball')).not.toContain('baseball_golden2way');
    expect(normalizeProgramModules(['hitting','pitching'], 'softball')).toContain('softball_golden2way');
    expect(programOf('baseball', normalizeProgramModules(['hitting','pitching'], 'softball'))).toBeNull();
  });
  it('another sport and unknown modules grant no program', () => {
    expect(programOf('baseball', ['softball_pitching'])).toBeNull();
    expect(programOf('baseball', ['not_hitting', 'free'])).toBeNull();
  });
});
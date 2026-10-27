import { describe, expect, it } from 'vitest';
import { SKILL_AREAS, validDrillRoleTags } from './drillRoleTags';

describe('owner routine tags', () => {
  it.each(SKILL_AREAS)('accepts routine/fix-it/preparation tags for %s', skill_area => {
    for (const routine_role of ['routine', 'fix_it', 'prep']) expect(validDrillRoleTags({ skill_area, routine_role })).toBe(true);
  });
  it('rejects efficacy claims as a role', () => {
    expect(validDrillRoleTags({ skill_area: 'hitting', routine_role: 'proven' })).toBe(false);
  });
  it('keeps weighted and overspeed tags separate and bat-speed-only', () => {
    expect(validDrillRoleTags({ skill_area: 'bat_speed', bat_speed_kind: 'weighted' })).toBe(true);
    expect(validDrillRoleTags({ skill_area: 'bat_speed', bat_speed_kind: 'overspeed' })).toBe(true);
    expect(validDrillRoleTags({ skill_area: 'pitching', bat_speed_kind: 'overspeed' })).toBe(false);
  });
});
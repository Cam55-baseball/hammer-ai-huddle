import { describe, expect, it } from 'vitest';
import { validatePlanSanity, validatePlanWeek } from './planSanity';
describe('thin-plan rejection', () => {
  it('rejects breathing-only training', () => expect(validatePlanSanity({ restDay: false, work: [{ category: 'lift', slug: 'rc_breathing_reset' }] }).issues).toEqual(['training_day_without_session']));
  it('rejects a primer without a real session', () => expect(validatePlanSanity({ restDay: false, work: [{ category: 'hitting', primer: true }] }).issues).toContain('primer_without_session'));
  it('rejects a saved phase different from its card', () => expect(validatePlanSanity({ restDay: false, phase: 'in', work: [{ category: 'hitting', phase: 'off' }] }).issues).toContain('season_mismatch'));
  it('rejects a missing card category', () => expect(validatePlanSanity({ restDay: false, expectedCategories: ['defense'], work: [{ category: 'hitting' }] }).issues).toContain('missing_category:defense'));
  it('accepts genuine Sunday recovery and keeps explicit safety exclusions', () => {
    expect(validatePlanSanity({ restDay: true, work: [{ category: 'recovery', slug: 'rc_breathing_reset' }] }).ok).toBe(true);
    expect(validatePlanSanity({ restDay: false, work: [{ category: 'hitting' }], expectedCategories: ['defense'], exclusions: ['defense'] }).ok).toBe(true);
  });
  for (const [category, minimum] of Object.entries({ hitting: 3, defense: 4, baserunning: 1, conditioning: 2, bunting: 2 })) {
    it(`rejects a week missing ${category} ${minimum}`, () => {
      const days = Array.from({ length: 7 }, (_, i) => ({ restDay: i === 6, work: i < minimum - 1 ? [{ category }] : [{ category: 'other_session' }] }));
      expect(validatePlanWeek(days, { [category]: minimum }).issues).toContain(`weekly_minimum:${category}:${minimum - 1}/${minimum}`);
    });
  }
});
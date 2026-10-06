import { describe, it, expect } from 'vitest';
import { liftingPlanCopy } from './liftingPlanCopy';
import { athleteNoticeCopy } from './athleteNoticeCopy';

describe('planned lifting is not completed lifting', () => {
  it('labels the count as planned dates with unconfirmed completion', () => {
    expect(liftingPlanCopy('7 lifts already this week — today stays lighter.')).toBe("7 days with lifting planned in the previous 7 days. Completion isn't confirmed; today's work stays lighter.");
  });
  it('does not call a scheduled Monday a completed lift', () => {
    expect(liftingPlanCopy('Your last lift was Monday — we keep full rest days between lifts.')).toContain('last planned lifting day was Monday');
  });
  it('leaves unrelated explanations alone', () => {
    expect(liftingPlanCopy('Next heavy day: Thursday.')).toBeNull();
  });
  it('uses the same honest copy for movement-card notices', () => {
    const detail = '7 lifts already this week — today stays lighter.';
    expect(athleteNoticeCopy({ reason: 'tissue_cost', detail })).toBe(liftingPlanCopy(detail));
  });
});
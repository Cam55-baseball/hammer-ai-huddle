import { describe, it, expect } from 'vitest';
import { liftingPlanCopy } from './liftingPlanCopy';
import { athleteNoticeCopy } from './athleteNoticeCopy';

describe('planned lifting is not completed lifting', () => {
  it('labels an all-confirmed count as checked-off sessions', () => {
    expect(liftingPlanCopy('7 lifts already this week — today stays lighter.')).toBe(
      '7 lifting sessions checked off in the previous 7 days — today stays lighter.'
    );
  });
  it('passes the split planned/checked-off count through unchanged', () => {
    const detail = '3 lifting days planned this week, 1 checked off — today stays lighter.';
    expect(liftingPlanCopy(detail)).toBeNull();
  });
  it('lets the confirmed last-lift line speak for itself', () => {
    expect(liftingPlanCopy('Your last lift was Monday — we keep full rest days between lifts.')).toBeNull();
  });
  it('lets the planned last-lift line speak for itself', () => {
    expect(liftingPlanCopy('Your last planned lift was Monday — we keep full rest days between lifts.')).toBeNull();
  });
  it('does not call a scheduled Monday a completed lift', () => {
    expect(liftingPlanCopy('Your last lift was Monday — we keep full rest days between lifts.')).not.toContain('checked off');
  });
  it('leaves unrelated explanations alone', () => {
    expect(liftingPlanCopy('Next heavy day: Thursday.')).toBeNull();
  });
  it('uses the same honest copy for movement-card notices', () => {
    const detail = '7 lifts already this week — today stays lighter.';
    expect(athleteNoticeCopy({ reason: 'tissue_cost', detail })).toBe(liftingPlanCopy(detail));
  });
});

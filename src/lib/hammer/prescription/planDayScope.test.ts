import { describe, expect, it } from 'vitest';
import { savedWholePlanRest, wholePlanRest } from '../../../../supabase/functions/_shared/wic/schedule/planDayScope';
describe('whole-day rest never inherits lift spacing', () => {
  it('Thursday lift spacing does not remove the six-day skill session', () => {
    expect(savedWholePlanRest('2026-10-29', [{ why_payload: { rest_day: { allowed_class: 'none' }, training_context: { day_type: 'recovery_day' } } }])).toBe(false);
  });
  it('Sunday remains soft recovery only', () => expect(wholePlanRest('2026-11-01')).toBe(true));
  it('an explicit HOLD preserves whole-day rest on Thursday', () => {
    expect(wholePlanRest('2026-10-29', true)).toBe(true);
    expect(savedWholePlanRest('2026-10-29', [{ why_payload: { full_plan_rest: true } }])).toBe(true);
  });
});
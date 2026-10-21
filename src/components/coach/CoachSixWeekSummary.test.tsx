import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoachSixWeekSummary } from './CoachSixWeekSummary';
import * as projection from '@/lib/coach/sixWeekPlanSummary';
import type { SavedCoachPlan } from '@/lib/coach/planHistory';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const plans: SavedCoachPlan[] = [{ state: 'ok', sport: 'baseball', plan_date: '2026-10-21', blocks: [] }];
describe('staged coach summary read-state boundary', () => {
  it('never projects cached athlete records while this read is loading or failed', () => {
    const project = vi.spyOn(projection, 'sixWeekPlanSummary');
    const { rerender } = render(<CoachSixWeekSummary plans={plans} sport="baseball" today="2026-10-21" state="loading" />);
    expect(project).not.toHaveBeenCalled();
    rerender(<CoachSixWeekSummary plans={plans} sport="baseball" today="2026-10-21" state="error" />);
    expect(project).not.toHaveBeenCalled();
    rerender(<CoachSixWeekSummary plans={plans} sport="baseball" today="2026-10-21" state="ready" />);
    expect(project).toHaveBeenCalledExactlyOnceWith(plans, 'baseball', '2026-10-21');
  });
});
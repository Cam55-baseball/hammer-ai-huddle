import { describe, expect, it } from 'vitest';
import { liftFrequencyWindow } from '../../supabase/functions/_shared/wic/watch/liftWindow';
describe('lift warning calendar bounds', () => {
  it('seven days cannot count eight dates or future plans', () => {
    expect(liftFrequencyWindow(['2026-10-20','2026-10-21','2026-10-22','2026-10-23','2026-10-24','2026-10-25','2026-10-26','2026-10-27','2026-10-28'], '2026-10-27')).toEqual({liftsLast7Days:7,daysSinceLastLift:0});
  });
  it('multiple exercises on a date count as one planned lift day', () => {
    expect(liftFrequencyWindow(['2026-10-25','2026-10-25'], '2026-10-27')).toEqual({liftsLast7Days:1,daysSinceLastLift:2});
  });
  it('future-only and invalid histories cannot author past activity', () => {
    expect(liftFrequencyWindow(['invalid','2026-10-28'], '2026-10-27')).toEqual({liftsLast7Days:0,daysSinceLastLift:null});
  });
});
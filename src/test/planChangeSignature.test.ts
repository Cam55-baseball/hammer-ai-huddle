import { expect, it } from 'vitest';
import { planChangeSignature } from '../../supabase/functions/_shared/planChangeSignature';
it('the same movement must update when its season changes', () => {
  const row = { movement_slug: 'wost_tennis_ball_self_rally', phase: 'os_q1', sets: 1, reps: 5 };
  expect(planChangeSignature([row])).not.toBe(planChangeSignature([{ ...row, phase: 'in_season' }]));
});
it('identical prescribed rows do not become new work just from order', () => {
  const a = { movement_slug: 'a', phase: 'in_season', sets: 1, reps: 5 };
  const b = { movement_slug: 'b', phase: 'in_season', sets: 2, reps: 6 };
  expect(planChangeSignature([a,b])).toBe(planChangeSignature([b,a]));
});
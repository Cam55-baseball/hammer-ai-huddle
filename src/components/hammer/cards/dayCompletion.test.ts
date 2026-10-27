import { describe, expect, it } from 'vitest';
import { dayFullyDone } from './dayCompletion';
const checks = { morning: true, night: true, preLift: true, requiresPreLift: true };
describe('full day includes saved check-ins', () => {
  it('skipped morning check-in blocks fully done despite all work recorded', () => {
    expect(dayFullyDone([{done: 3, total: 3}], {...checks, morning: false})).toBe(false);
  });
  it('skipped night check-in blocks fully done', () => {
    expect(dayFullyDone([{done: 3, total: 3}], {...checks, night: false})).toBe(false);
  });
  it('lift work requires its pre-lift check-in', () => {
    expect(dayFullyDone([{done: 3, total: 3}], {...checks, preLift: false})).toBe(false);
    expect(dayFullyDone([{done: 3, total: 3}], {...checks, preLift: false, requiresPreLift: false})).toBe(true);
  });
  it('empty or partial work cannot complete a day', () => {
    expect(dayFullyDone([], checks)).toBe(false);
    expect(dayFullyDone([{done: 2, total: 3}], checks)).toBe(false);
    expect(dayFullyDone([{done: 3, total: 3}], checks)).toBe(true);
  });
});
import { describe, expect, it } from 'vitest';
import { movementRescreenDue } from './movementRescreen';
describe('12-week movement re-screen', () => {
  it('becomes due on calendar day 84, not before', () => {
    expect(movementRescreenDue('2026-06-01T12:00:00', '2026-08-23')).toBe(false);
    expect(movementRescreenDue('2026-06-01T12:00:00', '2026-08-24')).toBe(true);
  });
  it('never invents due history from missing, invalid or future dates', () => {
    expect(movementRescreenDue(null, '2026-08-24')).toBe(false);
    expect(movementRescreenDue('invalid', '2026-08-24')).toBe(false);
    expect(movementRescreenDue('2027-06-01T12:00:00', '2026-08-24')).toBe(false);
  });
});
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
  it('rejects an impossible saved calendar date instead of moving it into March', () => {
    expect(movementRescreenDue('2026-02-30T12:00:00', '2026-05-25')).toBe(false);
  });
  it('rejects an impossible device date instead of manufacturing elapsed days', () => {
    expect(movementRescreenDue('2026-06-01T12:00:00', '2026-09-31')).toBe(false);
  });
  it('accepts a real leap day and preserves the day-84 boundary', () => {
    expect(movementRescreenDue('2024-02-29T12:00:00', '2024-05-22')).toBe(false);
    expect(movementRescreenDue('2024-02-29T12:00:00', '2024-05-23')).toBe(true);
    expect(movementRescreenDue('2026-02-29T12:00:00', '2026-06-01')).toBe(false);
  });
});
import { describe, expect, it } from 'vitest';
import { composedDayRequest } from './composedDayRequest';

describe('first-Start saved day', () => {
  it('requests the same composed server save as later week changes', () => {
    expect(composedDayRequest('2026-10-30')).toEqual({
      plan_date: '2026-10-30', compose_sport_day: true,
    });
  });
});
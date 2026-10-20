import { describe, expect, it } from 'vitest';
import { promptDue, promptDaysPast, gamePromptVisibility } from './promptDueRules';

describe('canonical prompt dates', () => {
  it('42-day performance lock stays closed through day 41 and opens on day 42', () => {
    expect(promptDue('2026-12-01', true, '2026-11-30')).toBe(false);
    expect(promptDue('2026-12-01', true, '2026-12-01')).toBe(true);
  });
  it('112-day S2 lock stays closed through day 111', () => {
    expect(promptDue('2027-02-09', true, '2027-02-08')).toBe(false);
    expect(promptDue('2027-02-09', true, '2027-02-09')).toBe(true);
  });
  it('missing baseline is due; saved baseline without a date never invents one', () => {
    expect(promptDue(null, false, '2026-10-20')).toBe(true);
    expect(promptDue(null, true, '2026-10-20')).toBe(false);
    expect(promptDue('invalid', true, '2026-10-20')).toBe(false);
  });
  it('calendar due dates and overdue days have no timezone-hour dependency', () => {
    expect(promptDue('2026-10-20', true, '2026-10-20')).toBe(true);
    expect(promptDaysPast('2026-10-20', '2026-10-24')).toBe(4);
    expect(promptDaysPast('2026-10-24', '2026-10-20')).toBe(0);
  });
  for (const sport of ['baseball', 'softball']) for (const tier of ['5tool', 'pitcher', 'golden2way']) {
    it(`${sport} ${tier}: eight weeks of games, logged suppression and once-only next-day follow-up`, () => {
      let gameDays = 0;
      let followups = 0;
      for (let day = 0; day < 56; day++) {
        const scheduled = day % 7 === 0;
        const yesterday = day % 7 === 1;
        const input = { todayScheduled: scheduled, todayLogged: false, yesterdayScheduled: yesterday, yesterdayLogged: false, yesterdayAsked: false };
        const shown = gamePromptVisibility(input);
        expect(shown).toEqual({ today: scheduled, yesterday });
        expect(gamePromptVisibility({ ...input, todayLogged: true, yesterdayLogged: true })).toEqual({ today: false, yesterday: false });
        expect(gamePromptVisibility({ ...input, yesterdayAsked: true }).yesterday).toBe(false);
        if (shown.today) gameDays++;
        if (shown.yesterday) followups++;
      }
      expect(gameDays).toBe(8); expect(followups).toBe(8);
    });
  }
  it('eight-week test matrix never inserts an extra vision test or performance test', () => {
    const dueDays: number[] = [];
    for (let day = 0; day < 56; day++) {
      const d = new Date('2026-10-20T12:00:00Z'); d.setUTCDate(d.getUTCDate() + day);
      const today = d.toISOString().slice(0, 10);
      if (promptDue('2026-12-01', true, today)) dueDays.push(day);
      expect(promptDue('2027-02-09', true, today)).toBe(false);
    }
    expect(dueDays).toEqual(Array.from({ length: 14 }, (_, i) => i + 42));
  });
});
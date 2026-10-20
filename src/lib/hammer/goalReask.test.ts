import { describe, expect, it } from "vitest";
import { goalReaskDue, goalCalendarDate } from "./goalReask";

describe("12-week goal re-ask", () => {
  it("asks on day 84, not day 83", () => {
    expect(goalReaskDue({ today: "2027-01-11", lastConfirmedAt: "2026-10-20T12:00:00Z", hasGoals: true })).toBe(false);
    expect(goalReaskDue({ today: "2027-01-12", lastConfirmedAt: "2026-10-20T12:00:00Z", hasGoals: true })).toBe(true);
  });
  it("no goals or never confirmed → ask now", () => {
    expect(goalReaskDue({ today: "2026-10-20", lastConfirmedAt: null, hasGoals: true })).toBe(true);
    expect(goalReaskDue({ today: "2026-10-20", lastConfirmedAt: "2026-10-19", hasGoals: false })).toBe(true);
  });
  it("bad date never nags", () => {
    expect(goalReaskDue({ today: "2026-10-20", lastConfirmedAt: "nope", hasGoals: true })).toBe(false);
  });
  it('day 84 starts on the calendar day even when confirmation was late at night', () => {
    const saved = new Date(2026, 9, 20, 23, 59, 59);
    expect(goalReaskDue({ today: '2027-01-11', lastConfirmedAt: saved.toISOString(), hasGoals: true })).toBe(false);
    expect(goalReaskDue({ today: '2027-01-12', lastConfirmedAt: saved.toISOString(), hasGoals: true })).toBe(true);
  });
  it('uses the device calendar date, including local late-night hours', () => {
    expect(goalCalendarDate(new Date(2026, 9, 20, 23, 59))).toBe('2026-10-20');
  });
  it('invalid or rolled calendar days and future confirmations never become due', () => {
    for (const today of ['2026-02-30', '2026-13-01', '2026-10-20extra', 'bad']) {
      expect(goalReaskDue({ today, lastConfirmedAt: null, hasGoals: false })).toBe(false);
    }
    expect(goalReaskDue({ today: '2026-10-20', lastConfirmedAt: '2026-02-30T12:00:00Z', hasGoals: true })).toBe(false);
    expect(goalReaskDue({ today: '2026-10-20', lastConfirmedAt: '2026-10-21T12:00:00Z', hasGoals: true })).toBe(false);
  });
  it("one ask per 12 weeks over a year when the player answers each time", () => {
    let last = "2026-10-20T12:00:00Z"; let asks = 0;
    for (let d = 1; d <= 365; d++) {
      const t = new Date(Date.parse("2026-10-20T12:00:00Z") + d * 86_400_000).toISOString();
      if (goalReaskDue({ today: t.slice(0, 10), lastConfirmedAt: last, hasGoals: true })) { asks++; last = t; }
    }
    expect(asks).toBe(4);
  });
});

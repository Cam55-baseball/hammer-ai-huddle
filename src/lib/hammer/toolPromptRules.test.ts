import { describe, expect, it } from "vitest";
import { delaycamDue, royalTimingDue } from "./toolPromptRules";

const iso = (n: number) => { const d = new Date("2026-10-20T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

function run(due: (uses: string[], today: string) => boolean, days = 56) {
  const uses: string[] = [];
  for (let n = 0; n < days; n++) if (due(uses, iso(n))) uses.push(iso(n));
  return uses;
}

describe("Royal timing: every 2–3 weeks", () => {
  it("8 weeks of hitting days, doing it each time → every 14 days (4 times)", () => {
    const uses = run((u, t) => royalTimingDue({ enabled: true, today: t, skillToday: true, uses: u }));
    expect(uses).toEqual([iso(0), iso(14), iso(28), iso(42)]);
  });
  it("only on a hitting day; off switch; bad date fails closed", () => {
    expect(royalTimingDue({ enabled: true, today: iso(0), skillToday: false, uses: [] })).toBe(false);
    expect(royalTimingDue({ enabled: false, today: iso(0), skillToday: true, uses: [] })).toBe(false);
    expect(royalTimingDue({ enabled: true, today: iso(30), skillToday: true, uses: ["bad"] })).toBe(false);
  });
  it("skipped prompt keeps showing until done (by day 21 at latest it's already due)", () => {
    expect(royalTimingDue({ enabled: true, today: iso(20), skillToday: true, uses: [iso(0)] })).toBe(true);
    expect(royalTimingDue({ enabled: true, today: iso(13), skillToday: true, uses: [iso(0)] })).toBe(false);
  });
});

describe("Delaycam: 2–3/week for mechanics players, at least 1/week otherwise", () => {
  const base = { enabled: true, skillToday: true, majorMechanicalFlag: false, mechanicsGoal: false, offSeason: false };
  const perWeek = (uses: string[]) => Array.from({ length: 8 }, (_, w) => uses.filter((u) => u >= iso(w * 7) && u < iso(w * 7 + 7)).length);
  it("everyone else: once a week", () => {
    const uses = run((u, t) => delaycamDue({ ...base, today: t, uses: u }));
    for (const n of perWeek(uses)) expect(n).toBe(1);
  });
  for (const k of ["majorMechanicalFlag", "mechanicsGoal", "offSeason"] as const) {
    it(`${k}: 2–3 times every week, never two days in a row`, () => {
      const uses = run((u, t) => delaycamDue({ ...base, [k]: true, today: t, uses: u }));
      for (const n of perWeek(uses)) { expect(n).toBeGreaterThanOrEqual(2); expect(n).toBeLessThanOrEqual(3); }
      for (let i = 1; i < uses.length; i++) expect(Date.parse(uses[i]) - Date.parse(uses[i - 1])).toBeGreaterThan(86_400_000);
    });
  }
  it("no hitting today → no prompt", () => {
    expect(delaycamDue({ ...base, skillToday: false, today: iso(0), uses: [] })).toBe(false);
  });
});

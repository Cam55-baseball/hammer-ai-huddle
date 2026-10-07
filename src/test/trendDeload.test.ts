import { describe, it, expect } from "vitest";
import { trendDeload, lighterSets, type TrendInput } from "../../supabase/functions/_shared/wic/lift/trendDeload";

const DAY = 86_400_000;
const d = (base: string, n: number) => new Date(Date.parse(`${base}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const MON = "2026-11-02"; // Monday

/** Simulate 4 weeks of an off-season athlete lifting Mon/Wed/Fri. */
function season(opts: { hardLast2w: number; liftTrend: "up" | "flat"; readinessDrop: boolean; pain?: boolean }): TrendInput {
  const sessions = [], readiness = [], lifts = [];
  let hard = 0;
  for (let i = -28; i < 0; i++) {
    const date = d(MON, i);
    const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (dow === 1 || dow === 3 || dow === 5) {
      const recent = i >= -14;
      const rpe = recent && hard < opts.hardLast2w ? (hard++, 8.5) : 6.5;
      sessions.push({ date, rpe });
      const w = i < -14 ? 200 + (i + 28) : opts.liftTrend === "up" ? 220 + (i + 14) * 2 : 210;
      lifts.push({ date, verifiedMax: w });
    }
    readiness.push({ date, score: opts.readinessDrop && i >= -7 ? 5.5 : 7.5 });
  }
  return { weekStart: MON, phase: "offseason_q2", sessions, readiness, painFlagDates: opts.pain ? [d(MON, -3)] : [], lifts, htDeloadThisWeek: false, htDeloadLastWeek: false };
}

describe("Round 9 — lighter week brought forward by trends (simulations)", () => {
  it("Pattern A: hard ratings + flat lifts + falling readiness → lighter week, sets × 0.6, plain reason", () => {
    const r = trendDeload(season({ hardLast2w: 4, liftTrend: "flat", readinessDrop: true }));
    expect(r.apply).toBe(true);
    expect(r.setsMul).toBe(0.6);
    expect(r.reason).toMatch(/Lighter week/);
    expect([4, 5].map(lighterSets)).toEqual([2, 3]);
  });
  it("Pattern B: hard ratings with rising lifts and steady readiness → keep building", () => {
    const r = trendDeload(season({ hardLast2w: 5, liftTrend: "up", readinessDrop: false }));
    expect(r.apply).toBe(false);
    expect(r.signals.hardSessions).toBeGreaterThanOrEqual(3);
    expect(r.signals.liftFlatOrDown).toBe(false);
  });
  it("only 2 hard sessions never triggers, even with flat lifts", () => {
    expect(trendDeload(season({ hardLast2w: 2, liftTrend: "flat", readinessDrop: true })).apply).toBe(false);
  });
  it("a new pain flag alone (with 3+ hard sessions) triggers", () => {
    expect(trendDeload(season({ hardLast2w: 3, liftTrend: "up", readinessDrop: false, pain: true })).apply).toBe(true);
  });
  it("never stacks on HT's deload, and in-season stays on HT's rules", () => {
    const base = season({ hardLast2w: 4, liftTrend: "flat", readinessDrop: true });
    expect(trendDeload({ ...base, htDeloadThisWeek: true }).apply).toBe(false);
    expect(trendDeload({ ...base, htDeloadLastWeek: true }).apply).toBe(false);
    expect(trendDeload({ ...base, phase: "in_season" }).apply).toBe(false);
  });
  it("never two trend weeks in a row", () => {
    // Keep the hard streak going into the lighter week → next Monday still fires but is blocked.
    const s = season({ hardLast2w: 6, liftTrend: "flat", readinessDrop: true });
    const next = { ...s, weekStart: d(MON, 7), sessions: [...s.sessions, ...[0, 2, 4].map((n) => ({ date: d(MON, n), rpe: 9 }))],
      readiness: [...s.readiness, ...[0, 1, 2, 3, 4, 5, 6].map((n) => ({ date: d(MON, n), score: 5 }))] };
    expect(trendDeload(s).apply).toBe(true);
    const r = trendDeload(next);
    expect(r.apply).toBe(false);
    expect(r.signals.skipped).toBe("trend_deload_last_week");
  });
  it("no verified lift numbers → lift signal unknown, not assumed flat", () => {
    const s = season({ hardLast2w: 4, liftTrend: "flat", readinessDrop: false });
    expect(trendDeload({ ...s, lifts: [] }).apply).toBe(false);
  });
});

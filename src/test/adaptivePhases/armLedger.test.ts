// Throwing Coverage v1 (amendment v1.4) — docs/wic/throwing-coverage-and-polish-v1.md
import { describe, it, expect } from "vitest";
import {
  armBudget, throwingProfile, windmillCheck, windmillPreferredRest, tournamentStatus, tournamentRecoveryDays, highIntentPositionAllowed,
  estimateThrows, ledgerDay, pitchSmartDailyMax, fieldDistances, positionWork, POSITION_LADDER, PITCHER_CATCHER_FLAG, ARM_DEFAULTS,
  type ThrowAthlete, type ThrowRole, type Sport,
} from "../../../supabase/functions/_shared/wic/phases/armLedger";
import { rampLength } from "../../../supabase/functions/_shared/wic/phases/rampLaw";
import { DEMO_ATHLETES, buildDemo } from "@/lib/hammer/presentationDemo";

const types: [string, Sport, ThrowRole][] = [
  ["baseball position player", "baseball", "position"], ["baseball pitcher", "baseball", "pitcher"], ["baseball two-way", "baseball", "two_way"],
  ["catcher", "baseball", "catcher"], ["softball position player", "softball", "position"], ["softball windmill pitcher", "softball", "pitcher"],
  ["softball two-way", "softball", "two_way"], ["softball pitcher-catcher", "softball", "pitcher_catcher"],
];

describe("v1.4 §2 — every throwing athlete has all six values, consistent", () => {
  for (const [name, sport, role] of types) for (const age of [13, 16, 20, 27]) it(`${name}, age ${age}`, () => {
    const a: ThrowAthlete = { sport, role, age };
    const p = throwingProfile(a, { seasonState: "in_season", phase: "P4" }, { daysOff: 12, dayIndex: 2 });
    expect(p.seasonState).toBe("in_season");
    expect(p.phase).toBe("P4");
    expect(p.ramp.active).toBe(true);
    expect(p.dailyBudget).toBeGreaterThan(0);
    expect(p.weeklyBudget).toBeGreaterThanOrEqual(p.dailyBudget);
    expect(p.recovery.text.length).toBeGreaterThan(10);
    const pitching = role === "pitcher" || role === "two_way" || role === "pitcher_catcher";
    expect(p.ramp.timeline).toBe(pitching ? "pitcher" : "position");
    expect(p.ramp.days).toBe(rampLength("throwing", 12, { age, isPitcher: pitching, growthMode: age <= 15, painLast90: {}, firstTime: {}, eliteClean: false }).days);
    expect(p.recovery.kind).toBe(pitching ? (sport === "baseball" ? "pitch_smart_rest" : "windmill_rest") : "position_next_day");
    if (role === "two_way" || role === "pitcher_catcher") {
      const pit = armBudget({ sport, role: "pitcher", age }), pos = armBudget({ sport, role: role === "pitcher_catcher" ? "catcher" : "position", age });
      expect(p.dailyBudget).toBeLessThanOrEqual(Math.min(pit.daily, pos.daily));
      expect(p.weeklyBudget).toBeLessThanOrEqual(Math.min(pit.weekly, pos.weekly));
    }
    expect(p.flag).toBe(role === "pitcher_catcher" ? PITCHER_CATCHER_FLAG : null);
  });
});

describe("v1.4 §1 — throwing rules", () => {
  it("baseball pitchers keep Pitch Smart daily maximums", () => {
    expect([8, 10, 12, 16, 18, 22].map(pitchSmartDailyMax)).toEqual([50, 75, 85, 95, 105, 120]);
    expect(armBudget({ sport: "baseball", role: "pitcher", age: 16 }).daily).toBe(95);
  });
  it("windmill counts are never taken from baseball tables", () => {
    for (const age of [12, 16, 24]) expect(armBudget({ sport: "softball", role: "pitcher", age }).daily).toBe(140);
  });
  it("unlogged throws are estimated and marked; catcher throw-downs count as high intent", () => {
    const c = estimateThrows({ sport: "softball", role: "catcher", age: 16 }, "practice");
    expect(c.every((e) => e.estimated)).toBe(true);
    expect(c.find((e) => e.kind === "throwdown")?.intent).toBe("high");
    expect(ledgerDay({ sport: "softball", role: "catcher", age: 16 }, c).estimated).toBe(true);
    expect(fieldDistances("softball", 16).toSecond).toBe(84);
    expect(positionWork("softball", "catcher", "catcher")[0]).toMatch(/84 ft/);
    expect(POSITION_LADDER).toEqual(["distance", "volume", "intent", "position_work"]);
    expect(fieldDistances("baseball", 11).bases).toBeLessThan(fieldDistances("baseball", 16).bases);
  });
  it("windmill: 100 a game, 140 a day, 3 days in a row, youth innings and rest", () => {
    const w = ARM_DEFAULTS.windmill;
    expect(windmillCheck(20, [], "2026-10-05", { pitches: 90, innings: 7, gamePitches: [90] })).toEqual([]);
    expect(windmillCheck(20, [], "2026-10-05", { pitches: 90, innings: 7, gamePitches: [101] }).join()).toMatch(/100/);
    expect(windmillCheck(20, [], "2026-10-05", { pitches: 141, innings: 7 }).join()).toMatch(/140/);
    const three = ["2026-10-02", "2026-10-03", "2026-10-04"].map((date) => ({ date, pitches: 60, innings: 4 }));
    expect(windmillCheck(20, three, "2026-10-05", { pitches: 40, innings: 3 }).join()).toMatch(/in a row/);
    expect(windmillCheck(13, [], "2026-10-05", { pitches: 120, innings: 13 }).join()).toMatch(/12 innings/);
    expect(windmillCheck(13, [{ date: "2026-10-04", pitches: 100, innings: 7 }], "2026-10-05", { pitches: 20, innings: 1 }).join()).toMatch(/Rest day/);
    expect(windmillPreferredRest("2026-10-02", "2026-10-05")).toBe(true);
    expect(windmillPreferredRest("2026-10-04", "2026-10-05")).toBe(false);
    expect(w.restBetweenOutings).toBe(2);
  });
  it("tournament mode: weekend budget, warning, recovery sized to what was thrown", () => {
    expect(tournamentStatus(3, 100).state).toBe("ok");
    expect(tournamentStatus(3, 352).state).toBe("approaching");
    expect(tournamentStatus(3, 420).state).toBe("reached");
    expect(tournamentRecoveryDays(100)).toBeLessThan(tournamentRecoveryDays(400));
  });
  it("two-way: no high-intent position throwing the day before, of, or after a start", () => {
    const a: ThrowAthlete = { sport: "baseball", role: "two_way", age: 17 };
    expect([-1, 0, 1].map((d) => highIntentPositionAllowed(a, d))).toEqual([false, false, false]);
    expect(highIntentPositionAllowed(a, 2)).toBe(true);
    expect(highIntentPositionAllowed({ ...a, role: "position" }, 0)).toBe(true);
  });
});

describe("v1.4 §3 — demo athletes", () => {
  it("covers the room and each shows plan, phase, why, a ramp or budget, and re-plans live", () => {
    expect(DEMO_ATHLETES).toHaveLength(8);
    for (const d of DEMO_ATHLETES) {
      const v = buildDemo(d);
      expect(v.plan.phase).toBeTruthy();
      expect(v.plan.why.length).toBeGreaterThan(20);
      expect(v.plan.disciplines.length).toBeGreaterThan(0);
      for (const x of v.plan.disciplines) expect(x.phase).toBe(v.plan.phase);
      expect(v.throwing.dailyBudget).toBeGreaterThan(0);
      const moved = buildDemo(d, 21);
      expect(JSON.stringify(moved.plan)).not.toBe(JSON.stringify(v.plan));
    }
    expect(DEMO_ATHLETES.filter((d) => (buildDemo(d).plan.ramps ?? []).length > 0).length).toBeGreaterThanOrEqual(5);
    expect(buildDemo(DEMO_ATHLETES.find((d) => d.id === "dausl")!).tournament?.state).toBe("approaching");
  });
});

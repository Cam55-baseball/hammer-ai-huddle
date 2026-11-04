/**
 * LOCKED BY OWNER NOV 4 — need-based low-impact warm-up (not age-based).
 * Do not loosen these without a new written owner decision.
 */
import { afterEach, describe, expect, it } from "vitest";
import { WARMUP_LIBRARY, buildWarmup, warmupCoverageIssues, lifecycleFor, LOW_IMPACT_EXCLUDED, type WarmupContext } from "@/lib/hammer/prescription/warmupLibrary";
import { backfillFitTags, fitTagsFor, fits, resolvePlayerFit, setWarmupFitOverrides } from "@/lib/hammer/prescription/warmupFit";
import { lowImpactMode, type LowImpactFacts } from "../../supabase/functions/_shared/wic/warmup/lowImpactMode";
import { isLoadSpike } from "../../supabase/functions/_shared/readiness/runningReadiness";

afterEach(() => setWarmupFitOverrides(null));

const day = (n: number) => new Date(Date.parse("2026-03-02T12:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);
const CONTEXTS: WarmupContext[] = ["default", "speed_day", "lift_day", "throwing_day", "hitting_day", "in_season_practice", "offseason_extended"];
const base = (today: string, extra: Partial<LowImpactFacts> = {}): LowImpactFacts => ({ today, checkins: [], seasonPhase: "off", ...extra });
const green = (d: string) => ({ date: d, readiness: 0.8, painAreas: [] as string[] });
const red = (d: string) => ({ date: d, readiness: 0.2, painAreas: [] as string[] });

describe("locked by owner Nov 4: under-13s are not age-restricted to low impact", () => {
  it("beginner and youth items fit under-13s in every role", () => {
    const u13 = resolvePlayerFit({ competitionLevel: "12u", ageYears: 11 });
    for (const d of WARMUP_LIBRARY.filter((x) => x.minLifecycle === "beginner" || x.minLifecycle === "youth"))
      expect(fits(fitTagsFor(d), u13), d.slug).toBe(true);
    expect(backfillFitTags("beginner", "ladder_quickness").ageBands).toContain("u13");
    expect(backfillFitTags("beginner", "cars").levels).toEqual(["youth", "high_school", "college", "pro"]);
  });
  it("intermediate stays HS/college/pro 13+; advanced stays college/pro 18+", () => {
    expect(backfillFitTags("intermediate", "x")).toEqual({ levels: ["high_school", "college", "pro"], ageBands: ["13_17", "18_plus"] });
    expect(backfillFitTags("advanced", "x")).toEqual({ levels: ["college", "pro"], ageBands: ["18_plus"] });
    expect(fitTagsFor(WARMUP_LIBRARY.find((d) => d.slug === "wu_snap_jump")!)).toEqual({ levels: ["college", "pro"], ageBands: ["18_plus"] });
  });
  it("a healthy under-13 with no trigger is NOT in low-impact mode", () => {
    expect(lowImpactMode(base(day(10), { checkins: [green(day(9))] })).active).toBe(false);
  });
});

describe("locked by owner Nov 4: each trigger turns the mode on and clears", () => {
  it("(a) Never / 6+ months on until the first green week", () => {
    for (const a of ["Never", "6+ months ago"]) expect(lowImpactMode(base(day(3), { lastTrained: a })).triggers).toContain("just_starting");
    expect(lowImpactMode(base(day(3), { lastTrained: "2–6 months ago" })).active).toBe(false);
    const wk = [green(day(1)), green(day(3)), green(day(5))];
    expect(lowImpactMode(base(day(8), { lastTrained: "Never", checkins: wk })).active).toBe(false);
    expect(lowImpactMode(base(day(8), { lastTrained: "Never", checkins: [green(day(1)), red(day(3)), green(day(5))] })).active).toBe(true);
    expect(lowImpactMode(base(day(8), { lastTrained: "Never", hasTrainingHistory: true })).active).toBe(false);
    expect(lowImpactMode(base(day(3), { lastTrained: "Never" })).because).toBe("Easier warm-up today — you're just getting started.");
  });
  it("(b) in-season with 3+ low check-ins in 7 days or a load spike; never off-season", () => {
    const lows = [red(day(4)), red(day(6)), red(day(8))];
    expect(lowImpactMode(base(day(9), { seasonPhase: "in", checkins: lows })).triggers).toContain("late_season");
    expect(lowImpactMode(base(day(9), { seasonPhase: "in", checkins: lows.slice(1) })).active).toBe(false);
    expect(lowImpactMode(base(day(12), { seasonPhase: "in", checkins: lows })).active).toBe(false);
    expect(lowImpactMode(base(day(9), { seasonPhase: "in", loadSpike: true })).because).toBe("Easier warm-up today — a tough stretch of your season.");
    expect(lowImpactMode(base(day(9), { seasonPhase: "off", loadSpike: true })).active).toBe(false);
    expect(isLoadSpike(1.3, "in_season")).toBe(true);
    expect(isLoadSpike(1.29, "in_season")).toBe(false);
    expect(isLoadSpike(1.4, "os_q2")).toBe(false);
  });
  it("(c) four weeks after healed, for that area; plus active pain in that area", () => {
    const inj = [{ region: "shoulder", healedAt: day(0), active: false }];
    const on = lowImpactMode(base(day(14), { injuries: inj }));
    expect(on.areas).toEqual(["shoulder"]);
    expect(on.because).toBe("Easier warm-up today — you're 2 weeks back from injury.");
    expect(lowImpactMode(base(day(27), { injuries: inj })).active).toBe(true);
    expect(lowImpactMode(base(day(28), { injuries: inj })).active).toBe(false);
    const pain = lowImpactMode(base(day(40), { injuries: inj, checkins: [{ date: day(40), readiness: 0.8, painAreas: ["Shoulder"] }] }));
    expect(pain.active && pain.areas.includes("shoulder")).toBe(true);
    expect(lowImpactMode(base(day(41), { injuries: inj, checkins: [{ date: day(39), readiness: 0.8, painAreas: ["shoulder"] }] })).active).toBe(false);
    expect(lowImpactMode(base(day(14), { injuries: [{ region: "shoulder", healedAt: day(0), active: true }] })).active).toBe(false);
  });
  it("(d) red check-in today only", () => {
    expect(lowImpactMode(base(day(5), { checkins: [red(day(5))] })).because).toBe("Easier warm-up today — today's check-in.");
    expect(lowImpactMode(base(day(6), { checkins: [red(day(5))] })).active).toBe(false);
  });
});

describe("locked by owner Nov 4: low-impact warm-ups keep full-body coverage", () => {
  it("every training context, every lifecycle: no snap/plyo items, no twitch layer, coverage kept", () => {
    for (const lifecycle of ["youth", "beginner", "intermediate", "advanced", "elite"] as const)
      for (const context of CONTEXTS) for (let seed = 0; seed < 5; seed++) {
        const w = buildWarmup({ context, lifecycle, gameDay: false, daySeed: seed * 17, equipment: ["full_gym"], suppressArmCare: true, lowImpact: { areas: [] } });
        expect(warmupCoverageIssues(w.drills), `${context}/${lifecycle}`).toEqual([]);
        for (const d of w.drills) {
          expect(LOW_IMPACT_EXCLUDED.test(`${d.slug} ${d.name}`), d.slug).toBe(false);
          expect(["ladder_quickness", "single_leg_twitch", "ground_force", "fast_twitch", "neural_priming"]).not.toContain(d.role);
        }
      }
  });
  it("a returning area gets an extra joint-circle slot and coverage stays", () => {
    const w = buildWarmup({ context: "default", lifecycle: "advanced", gameDay: false, daySeed: 2, equipment: ["full_gym"], suppressArmCare: true, lowImpact: { areas: ["shoulder"] } });
    const plain = buildWarmup({ context: "default", lifecycle: "advanced", gameDay: false, daySeed: 2, equipment: ["full_gym"], suppressArmCare: true, lowImpact: { areas: [] } });
    expect(w.drills.filter((d) => d.role === "cars").length).toBeGreaterThan(plain.drills.filter((d) => d.role === "cars").length);
    expect(warmupCoverageIssues(w.drills)).toEqual([]);
  });
});

describe("locked by owner Nov 4: 8-week simulations", () => {
  type Player = { fit: ReturnType<typeof resolvePlayerFit>; lifecycle: ReturnType<typeof lifecycleFor>; facts: (n: number) => LowImpactFacts };
  const advanced = new Set(WARMUP_LIBRARY.filter((d) => d.minLifecycle === "advanced" || d.minLifecycle === "elite").map((d) => d.slug));
  const simulate = (p: Player) => {
    const on: boolean[] = [];
    for (let n = 0; n < 56; n++) {
      if (n % 7 === 6) { on.push(false); continue; } // Sunday rest
      const mode = lowImpactMode(p.facts(n));
      const w = buildWarmup({ context: CONTEXTS[n % CONTEXTS.length], lifecycle: p.lifecycle, gameDay: false, daySeed: n * 31, equipment: ["full_gym"], fit: p.fit, suppressArmCare: true, lowImpact: mode.active ? { areas: mode.areas } : null });
      expect(warmupCoverageIssues(w.drills), `day ${n}`).toEqual([]);
      if (mode.active) for (const d of w.drills) expect(LOW_IMPACT_EXCLUDED.test(`${d.slug} ${d.name}`), d.slug).toBe(false);
      if (p.fit.ageBand !== "18_plus") for (const d of w.drills) expect(advanced.has(d.slug), d.slug).toBe(false);
      on.push(mode.active);
    }
    return on;
  };
  it("youth (under 13, healthy): never forced into low impact", () => {
    const on = simulate({ fit: resolvePlayerFit({ competitionLevel: "12u", ageYears: 11 }), lifecycle: lifecycleFor("u12", null),
      facts: (n) => base(day(n), { checkins: Array.from({ length: n }, (_, i) => green(day(i))), lastTrained: "Right now" }) });
    expect(on.some(Boolean)).toBe(false);
  });
  it("new player: on from day one, off after the first green week", () => {
    const on = simulate({ fit: resolvePlayerFit({ competitionLevel: "high school", ageYears: 15 }), lifecycle: lifecycleFor(null, 0),
      facts: (n) => base(day(n), { lastTrained: "Never", checkins: Array.from({ length: n }, (_, i) => (i < 7 ? red(day(i)) : green(day(i)))) }) });
    expect(on[0]).toBe(true);
    expect(on[5]).toBe(true);
    expect(on.slice(15).some(Boolean)).toBe(false);
  });
  it("late-season pro: on only through the tough stretch", () => {
    const tough = (i: number) => i >= 21 && i <= 27;
    const on = simulate({ fit: resolvePlayerFit({ competitionLevel: "pro", ageYears: 27 }), lifecycle: lifecycleFor(null, 8),
      facts: (n) => base(day(n), { seasonPhase: "in", checkins: Array.from({ length: n + 1 }, (_, i) => (tough(i) ? red(day(i)) : green(day(i)))), loadSpike: n >= 40 && n <= 41 }) });
    expect(on.slice(0, 21).some(Boolean)).toBe(false);
    expect(on[25]).toBe(true);
    expect(on[40] && on[41]).toBe(true);
    expect(on.slice(42).some(Boolean)).toBe(false);
  });
  it("returning from injury: on four weeks after healing, then off", () => {
    const on = simulate({ fit: resolvePlayerFit({ competitionLevel: "college", ageYears: 20 }), lifecycle: lifecycleFor(null, 3),
      facts: (n) => base(day(n), { checkins: [green(day(n))], injuries: [{ region: "knee", healedAt: day(0), active: false }] }) });
    expect(on.slice(0, 28).filter((_, i) => i % 7 !== 6).every(Boolean)).toBe(true);
    expect(on.slice(28).some(Boolean)).toBe(false);
  });
});

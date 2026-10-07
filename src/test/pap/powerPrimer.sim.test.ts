import { describe, it, expect } from "vitest";
import {
  planPowerPrimer, shouldStop, PAP_LIBRARY, type PapInput, type PapRole, type LiftPattern,
} from "../../../supabase/functions/_shared/wic/pap/powerPrimer";

function rng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const ROLES: PapRole[] = ["pitcher", "windmill", "two_way", "hitter", "position", "catcher"];
const AGES = [10, 12, 13, 14, 15, 16, 17, 19, 23];
const PATTERNS: LiftPattern[] = ["hinge", "squat", "lunge", "pull", "press", "other"];
const SEASONS = ["off", "pre", "in", "post"] as const;
const READINESS = ["high", "mixed", "low", "none"] as const;

describe("Power Primer — 8-week simulations", () => {
  it("0 rule violations across every role, sport, age, season and readiness pattern", () => {
    const r = rng(20261007);
    let blocks = 0, realThrowBlocks = 0, violations: string[] = [];
    const v = (m: string) => { if (violations.length < 20) violations.push(m); };
    for (const role of ROLES) for (const age of AGES) for (const season of SEASONS) for (const rp of READINESS) for (const growth of [false, true]) {
      const sport = role === "windmill" ? "softball" : (r() < 0.3 ? "softball" : "baseball");
      let weekReal = 0;
      for (let day = 0; day < 56; day++) {
        if (day % 7 === 0) weekReal = 0;
        if (r() < 0.45) continue; // not a lift day
        const readiness = rp === "none" ? null : rp === "high" ? 70 + r() * 30 : rp === "low" ? 20 + r() * 40 : 30 + r() * 70;
        const startEvery = season === "in" ? 6 : 0;
        const daysUntilStart = (role === "pitcher" || role === "two_way") && startEvery ? (startEvery - (day % startEvery)) % startEvery : null;
        const daysSinceStart = daysUntilStart == null ? null : (day % (startEvery || 1));
        const i: PapInput = {
          sport: sport as any, role, age, growthMode: growth, readiness,
          pain: { arm: r() < 0.08, leg: r() < 0.08, back: r() < 0.06 },
          dayHas: { velocityThrow: r() < 0.3, batSpeed: r() < 0.3, hardRun: r() < 0.3 },
          gameTomorrow: season === "in" ? r() < 0.4 : r() < 0.05,
          daysSinceStart, daysUntilStart,
          realThrowDaysThisWeek: weekReal, realThrowsEnabled: true,
          goals: r() < 0.5 ? ["throwing", "speed"] : ["hitting", "strength"],
          equipment: r() < 0.2 ? null : ["band", "med_ball", "bat", "baseball", "plyo_balls", "trap_bar", "db", "pullup_bar", "light_bat"],
          firstLift: { slug: "lift_x", name: "Lift", pattern: PATTERNS[Math.floor(r() * PATTERNS.length)], heavy: r() < 0.6 },
        };
        const { block } = planPowerPrimer(i);
        if (readiness != null && readiness < 40) { if (block) v("readiness<40 got a block"); continue; }
        if (!block) continue;
        blocks++;
        const a = PAP_LIBRARY.find((x) => x.slug === block.action.slug)!;
        // never double up
        if (block.target === "throw" && i.dayHas.velocityThrow) v("doubled throw");
        if (block.target === "bat_speed" && i.dayHas.batSpeed) v("doubled bat speed");
        if (block.target === "first_step" && i.dayHas.hardRun) v("doubled sprint");
        if (i.dayHas.velocityThrow && i.dayHas.batSpeed && i.dayHas.hardRun && block.target !== "jump") v("all three present but not jump");
        // implements
        if (block.action.oz != null && (block.action.oz > 7 || block.action.oz < 4)) v("implement weight");
        if (block.action.oz != null && block.action.oz >= 6 && age < 13) v("6-7 oz under 13");
        if (a.constrainedOnly) v("constrained 6 oz picked as default");
        // real throws
        if (block.action.real_throw) {
          realThrowBlocks++; weekReal++;
          if (!block.requires_throwing_warmup) v("real throws without warm-up lock");
          if (age < 13) v("under-13 max baseball throws");
          if (sport !== "baseball" || role === "windmill") v("real throws outside baseball");
          if (i.gameTomorrow) v("throws day before game");
          if ((block.max_total_reps ?? 99) > 5) v("more than 5 real throws");
          if (block.action.count_weight !== 1.5) v("count weight not 1.5");
          if (weekReal > 2) v("real throws > 2 days a week");
        } else if (block.target === "throw" && block.action.count_weight !== 0) v("med ball counts non-zero");
        if (block.target === "throw" && (role === "pitcher" || role === "two_way")) {
          if (daysSinceStart === 1 || daysSinceStart === 0) v("throw PAP day after start");
          if (daysUntilStart != null && daysUntilStart <= 2) v("throw PAP within 2 days of start");
        }
        if (block.target === "first_step" && i.gameTomorrow) v("sprints day before game");
        // age / growth / pain
        if ((age < 16 || growth) && block.primer.heavy) v("heavy primer under 16 / growth");
        if (growth && block.target !== "jump") v("growth mode not easy jumps");
        if (i.pain.arm && block.target === "throw") v("arm pain throw PAP");
        if (i.pain.leg && (a.isSprint || block.target === "first_step")) v("leg pain sprint PAP");
        if (i.pain.back && block.primer.heavy && i.firstLift!.pattern === "hinge" && block.primer.source === "lift") v("back pain heavy hinge");
        if (block.target === "throw" && block.primer.source === "lift" && i.firstLift!.pattern === "press") v("press before throwing");
        // caps
        if (a.isSprint && (block.max_sets > 4 || block.action.reps[1] > 3)) v("sprint cap");
        if (a.isSwing && (block.max_sets > 5 || block.action.reps[1] > 5)) v("swing cap");
        if (block.target === "throw" && (block.max_sets > 4 || block.action.reps[1] > 5)) v("throw cap");
        if (block.primer.reps[1] > 3) v("primer > 3 reps");
        if (readiness != null && readiness < 60 && !block.half_volume) v("40-59 not half volume");
        // rest
        if (!block.primer.heavy && (block.rest_s[0] !== 60 || block.rest_s[1] !== 90)) v("light rest");
        if (block.primer.heavy && a.isSprint && block.rest_s[0] < 180) v("heavy→sprint rest");
        if (block.primer.heavy && !a.isSprint && block.rest_s[0] < 120) v("heavy→throw/swing rest");
      }
    }
    expect(violations).toEqual([]);
    expect(blocks).toBeGreaterThan(1000);
    expect(realThrowBlocks).toBeGreaterThan(0);
  });

  it("pitcher with throwing limited falls back to bat speed (no weekly cap)", () => {
    const base: PapInput = {
      sport: "baseball", role: "pitcher", age: 18, growthMode: false, readiness: 80, pain: { arm: true },
      dayHas: { velocityThrow: false, batSpeed: false, hardRun: false }, gameTomorrow: false,
      daysSinceStart: null, daysUntilStart: null, realThrowDaysThisWeek: 0, realThrowsEnabled: true,
      goals: [], equipment: ["bat", "trap_bar"], firstLift: { slug: "trap_bar_deadlift", name: "Trap bar deadlift", pattern: "hinge", heavy: true },
    };
    for (let d = 0; d < 7; d++) expect(planPowerPrimer(base).block?.target).toBe("bat_speed");
  });

  it("primer uses the lift's own first sets when it fits", () => {
    const b = planPowerPrimer({
      sport: "baseball", role: "hitter", age: 19, growthMode: false, readiness: 90, pain: {},
      dayHas: { velocityThrow: false, batSpeed: false, hardRun: false }, gameTomorrow: false,
      daysSinceStart: null, daysUntilStart: null, realThrowDaysThisWeek: 0, realThrowsEnabled: false,
      goals: ["hitting"], equipment: ["bat"], firstLift: { slug: "trap_bar_deadlift", name: "Trap bar deadlift", pattern: "hinge", heavy: true },
    }).block!;
    expect(b.primer.source).toBe("lift");
    expect(b.rest_s).toEqual([120, 180]);
  });

  it("stop rules: 2 in a row 5% below best; sprints 3% slower; caps", () => {
    const tb = { stop: { kind: "throw_swing", drop_pct: 5, in_a_row: 2 } as const, max_sets: 4, max_total_reps: null };
    expect(shouldStop(tb, [70, 71, 67], 3, 3)).toBe(false);
    expect(shouldStop(tb, [70, 71, 67, 67], 4, 4)).toBe(true);
    expect(shouldStop({ ...tb, max_sets: 9 }, [70, 71, 67, 67], 4, 4)).toBe(true);
    expect(shouldStop({ ...tb, max_sets: 9 }, [70, 71, 67, 70], 4, 4)).toBe(false);
    const sp = { stop: { kind: "sprint", drop_pct: 3 } as const, max_sets: 4, max_total_reps: null };
    expect(shouldStop(sp, [1.70, 1.72], 2, 2)).toBe(false);
    expect(shouldStop(sp, [1.70, 1.76], 2, 2)).toBe(true);
    expect(shouldStop({ ...tb, max_sets: 9, max_total_reps: 5 }, [80], 2, 5)).toBe(true);
  });

  it("library never holds a ball over 7 oz or under 4 oz", () => {
    for (const x of PAP_LIBRARY) if (x.oz != null) expect(x.oz >= 4 && x.oz <= 7).toBe(true);
  });
});

import { papAlternatives } from "../../../supabase/functions/_shared/wic/pap/powerPrimer";
describe("Power Primer alternatives", () => {
  it("are same use, same target and never riskier", () => {
    for (const o of PAP_LIBRARY) for (const t of o.targets) for (const c of papAlternatives(o.slug, t)) {
      expect(c.use).toBe(o.use); expect(c.targets).toContain(t);
      if (c.heavy) expect(o.heavy).toBe(true);
      if (c.realThrow) expect(o.realThrow).toBe(true);
      expect(c.minAge).toBeLessThanOrEqual(o.minAge);
      if (c.oz != null) expect(c.oz).toBeLessThanOrEqual(o.oz!);
    }
    expect(papAlternatives("pap_a_mb_overhead", "throw").some((c) => c.realThrow)).toBe(false);
    expect(papAlternatives("pap_p_trap_bar_heavy", "bat_speed").length).toBeGreaterThan(0);
  });
});

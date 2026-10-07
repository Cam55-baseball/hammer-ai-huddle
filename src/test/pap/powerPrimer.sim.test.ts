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
        if (block.action.oz != null && block.action.oz >= 6 && age < 16) v("6-7 oz under 16 (doctrine until owner answers)");
        if (a.constrainedOnly) v("constrained 6 oz picked as default");
        // real throws
        if (block.action.real_throw) {
          realThrowBlocks++; weekReal++;
          if (!block.requires_throwing_warmup) v("real throws without warm-up lock");
          if (age < 13 && block.action.oz !== 4) v("under-13 real throw other than 4 oz");
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

// ---- Owner 2026-10-07: under-13 max-effort 4 oz throws ----
import { papThrowsAllowed } from "../../../supabase/functions/_shared/wic/pap/powerPrimer";
import { PITCH_SMART_BANDS, bandIndex, restDaysFor } from "../../../supabase/functions/_shared/wic/phases/youthThrowing";

describe("Power Primer — under-13 4 oz stress test", () => {
  it("0 Pitch Smart violations, warm-up first, caps and stops hold over 8 weeks", () => {
    const r = rng(13042026);
    const v: string[] = []; const bad = (m: string) => { if (v.length < 20) v.push(m); };
    let realBlocks = 0, throws = 0;
    for (const age of [7, 8, 9, 10, 11, 12]) for (const role of ["pitcher", "two_way", "hitter", "position", "catcher"] as PapRole[]) for (let run = 0; run < 25; run++) {
      const band = PITCH_SMART_BANDS[bandIndex(age)];
      const perDay: number[] = []; let weekReal = 0, year = 0;
      const pitchEvery = role === "pitcher" || role === "two_way" ? 4 + Math.floor(r() * 3) : 0;
      for (let day = 0; day < 56; day++) {
        if (day % 7 === 0) weekReal = 0;
        // game pitching today?
        let today = pitchEvery && day % pitchEvery === 0 ? Math.floor(r() * band.dailyMax * 0.8) : 0;
        if (r() < 0.3) today += Math.floor(r() * 20) * 0.25; // catch/warm-up throws
        // owed rest from earlier days
        let restDay = false;
        for (let d = 0; d < day; d++) if (day - d <= restDaysFor(band, Math.ceil(perDay[d]))) if (perDay[d] > 0 && restDaysFor(band, Math.ceil(perDay[d])) > 0) restDay = true;
        const liftDay = r() < 0.6;
        let added = 0;
        if (liftDay) {
          const readiness = r() < 0.1 ? 20 + r() * 19 : 40 + r() * 60;
          const growth = r() < 0.15, armPain = r() < 0.08, gameTomorrow = r() < 0.15;
          const daysUntilStart = pitchEvery ? (pitchEvery - (day % pitchEvery)) % pitchEvery : null;
          const daysSinceStart = pitchEvery ? day % pitchEvery : null;
          const capRemaining = r() < 0.1 ? Math.floor(r() * 10) : null;
          const i: PapInput = {
            sport: "baseball", role, age, growthMode: growth, readiness, pain: { arm: armPain },
            dayHas: { velocityThrow: false, batSpeed: r() < 0.3, hardRun: r() < 0.3 }, gameTomorrow,
            daysSinceStart, daysUntilStart, realThrowDaysThisWeek: weekReal, realThrowsEnabled: true,
            goals: ["throwing"], equipment: ["plyo_balls", "baseball", "med_ball", "band", "bat"],
            firstLift: { slug: "goblet_squat", name: "Goblet squat", pattern: "squat", heavy: false },
            pitchBudget: { pitchesToday: today, restDay, capRemaining },
          };
          const { block } = planPowerPrimer(i);
          if (block?.action.real_throw) {
            realBlocks++; weekReal++;
            if (block.action.oz !== 4) bad(`u13 real throw ${block.action.oz} oz`);
            if (!block.requires_throwing_warmup) bad("max throws without warm-up lock");
            if (block.action.count_weight !== 1.5) bad("not 1.5");
            if (weekReal > 2) bad("> 2 real-throw days a week");
            if (gameTomorrow) bad("real throws day before game");
            if (growth || armPain || readiness < 40) bad("blocked state got throws");
            if ((role === "pitcher" || role === "two_way") && (daysSinceStart! <= 1 || daysUntilStart! <= 2)) bad("start-day rule");
            const cap = block.max_total_reps!;
            if (cap < 3 || cap > 5) bad(`cap ${cap}`);
            if (restDay) bad("throws on a Pitch Smart rest day");
            // throw until a stop rule fires: random speeds, sometimes a 'Lost snap'
            const vals: number[] = []; let n = 0;
            while (!shouldStop(block, vals, n, n)) { if (r() < 0.05) break; vals.push(45 + r() * 10); n++; }
            if (n > cap) bad("cap broken");
            added = n * 1.5; throws += n;
            if (capRemaining != null && added > capRemaining) bad("yearly/weekly cap passed");
          }
        }
        const total = today + added;
        if (total > band.dailyMax) bad(`daily max ${total}/${band.dailyMax}`);
        if (added && restDaysFor(band, Math.ceil(total)) !== restDaysFor(band, Math.ceil(today))) bad("PAP added a rest day");
        perDay.push(total); year += total;
      }
    }
    expect(v).toEqual([]);
    expect(realBlocks).toBeGreaterThan(100);
    expect(throws).toBeGreaterThan(300);
  });

  it("5 oz baseball and 6–7 oz never under 13; nothing over 7 oz", () => {
    for (const age of [7, 9, 11, 12]) for (const n of [0, 1]) {
      const b = planPowerPrimer({ sport: "baseball", role: "position", age, growthMode: false, readiness: 90, pain: {},
        dayHas: { velocityThrow: false, batSpeed: true, hardRun: true }, gameTomorrow: false, daysSinceStart: null, daysUntilStart: null,
        realThrowDaysThisWeek: n, realThrowsEnabled: true, goals: ["throwing"], equipment: ["plyo_balls", "baseball"],
        firstLift: { slug: "x", name: "x", pattern: "squat", heavy: false } }).block!;
      expect(b.action.real_throw).toBe(true);
      expect(b.action.oz).toBe(4);
    }
    expect(PAP_LIBRARY.every((x) => (x.oz ?? 0) <= 7)).toBe(true);
    expect(papThrowsAllowed(10, { pitchesToday: 0, restDay: true, capRemaining: null }, 5)).toBe(0);
    expect(papThrowsAllowed(10, { pitchesToday: 17, restDay: false, capRemaining: null }, 5)).toBe(2); // 20 → 21 would add a rest day
  });
});

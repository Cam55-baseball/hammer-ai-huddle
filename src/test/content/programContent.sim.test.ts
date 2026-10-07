import { describe, it, expect } from "vitest";
import {
  applyProgramContent, CONTENT_LIBRARY, BATCH_KEYS, itemLegal, type ContentContext, type BatchKey,
} from "../../../supabase/functions/_shared/wic/content/programContent";
import { finalRuleCheck } from "../../../supabase/functions/_shared/wic/schedule/finalCheck";
import { planPowerPrimer, PAP_LIBRARY } from "../../../supabase/functions/_shared/wic/pap/powerPrimer";
import { weightedBallAllowed } from "../../../supabase/functions/_shared/wic/phases/youthThrowing";

function rng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const PHASES = ["os_q1", "os_q2", "os_q3", "os_q4", "pre_season", "in_season", "post_season"];
const MODULES: string[][] = [[], ["baseball_hitting"], ["baseball_pitching"], ["baseball_5tool"], ["baseball_golden2way"], ["softball_pitching"], ["softball_5tool"], ["softball_golden2way"]];
const AGES = [8, 10, 12, 13, 14, 15, 16, 17, 19, 23, null];
const iso = (d: number) => new Date(Date.UTC(2026, 0, 5) + d * 86_400_000).toISOString().slice(0, 10);

function dayRows(r: () => number) {
  const rows: any[] = [];
  if (r() < 0.5) rows.push({ slot: "speed", movement_slug: r() < 0.5 ? "hard_sprint" : "easy_skip", sets: 3, reps: 4, why_payload: {} });
  if (r() < 0.5) rows.push({ slot: "conditioning", movement_slug: r() < 0.5 ? "hard_cond" : "rc_easy_flush", sets: 1, reps: 6, why_payload: {} });
  if (r() < 0.4) rows.push({ slot: "ub_primer", movement_slug: "ub_band", sets: 2, reps: 8, why_payload: {} });
  if (r() < 0.5) ["back_squat", "trap_bar_deadlift", "db_bench_press", "chin_up"].forEach((s) => rows.push({ slot: "lift", sequence_role: "main_compound", movement_slug: s, sets: 4, reps: 5, why_payload: {} }));
  return rows;
}

describe("Step 8 content batches — 8-week simulations", () => {
  it("0 violations across every subscription, sport, role, age, season and completion pattern", () => {
    const r = rng(20261008);
    const enabled = Object.fromEntries(BATCH_KEYS.map((k) => [k, true])) as Record<BatchKey, boolean>;
    const bad: string[] = [];
    const used = new Map<string, number>();
    let cases = 0;
    for (const modules of MODULES) for (const age of AGES) for (const phase of PHASES) for (const growth of [false, true]) for (const pitcher of [false, true]) {
      const sport = modules.some((m) => m.startsWith("softball")) ? "softball" : "baseball";
      let speed = 0, bfWeek = -1;
      for (let d = 0; d < 56; d++) {
        const rows = dayRows(r);
        const before = JSON.stringify(rows.map((x) => [x.slot, x.movement_slug, x.sets, x.reps]));
        const startEvery = 5;
        const ctx: ContentContext = {
          planDate: iso(d), phase, sport: sport as any, modules, isPitcher: pitcher, age, growthMode: growth,
          pain: { arm: r() < 0.08, leg: r() < 0.08, back: r() < 0.05 },
          equipment: r() < 0.3 ? null : r() < 0.5 ? [] : ["band", "baseball"],
          gameToday: r() < 0.15, gameTomorrow: r() < 0.15,
          startToday: pitcher && d % startEvery === 0, startYesterday: pitcher && d % startEvery === 1, startTomorrow: pitcher && d % startEvery === 4,
          speedSessionsBefore: speed, u13ThrowBlock: age != null && age < 13 && r() < 0.3,
          barefootThisWeek: bfWeek === Math.floor(d / 7), enabled,
          isHardRow: (x) => /hard/.test(String(x.movement_slug)), liftPatternOf: (x) => String(x.movement_slug),
        };
        const res = applyProgramContent(rows, ctx);
        cases++;
        const after = JSON.stringify(res.rows.map((x: any) => [x.slot, x.movement_slug, x.sets, x.reps]));
        if (before !== after) bad.push("changed card/dose");
        const perSlot = new Map<string, number>();
        res.rows.forEach((x: any) => {
          const pc = x.why_payload?.program_content; if (!pc) return;
          const it = CONTENT_LIBRARY.find((c) => c.slug === pc.slug)!;
          used.set(it.batch, (used.get(it.batch) ?? 0) + 1);
          const why = itemLegal(it, x, ctx); if (why) bad.push(`${it.slug} illegal: ${why}`);
          if (it.hard && !/hard/.test(x.movement_slug)) bad.push(`${it.slug} harder than slot`);
          if (it.hard && (ctx.gameTomorrow || ctx.gameToday)) bad.push(`${it.slug} near game`);
          if (age != null && age < it.minAge) bad.push(`${it.slug} under age`);
          if (it.batch === "content_heat_factory" && (sport !== "baseball" || ctx.startToday || ctx.startTomorrow)) bad.push("heat factory wrong day/sport");
          if (/oz|weighted|plyo_ball/.test(it.slug + it.equipment.join())) bad.push("weighted ball in content");
          if (it.kind === "drill") perSlot.set(x.slot, (perSlot.get(x.slot) ?? 0) + 1);
          if (it.slug === "bf_readiness_check") { if (bfWeek === Math.floor(d / 7)) bad.push("barefoot twice a week"); bfWeek = Math.floor(d / 7); }
        });
        for (const [s, n] of perSlot) if (n > 1) bad.push(`two options on ${s}`);
        if (rows.some((x) => x.slot === "speed") && r() < 0.8) speed++; // completion pattern
      }
    }
    expect(bad.slice(0, 10)).toEqual([]);
    expect(cases).toBeGreaterThan(50_000);
    for (const b of BATCH_KEYS) expect(used.get(b) ?? 0, b).toBeGreaterThan(0);
  });

  it("ball-weight law: 4 oz any age, 6–7 oz 16+, weighted never under 16, nothing over 7 oz", () => {
    expect(PAP_LIBRARY.every((p: any) => p.oz == null || p.oz <= 7)).toBe(true);
    expect(PAP_LIBRARY.filter((p: any) => p.oz != null && p.oz >= 6).every((p: any) => p.minAge >= 16)).toBe(true);
    expect(PAP_LIBRARY.find((p: any) => p.oz === 4)!.minAge).toBe(0);
    expect(PAP_LIBRARY.find((p: any) => p.slug === "pap_p_overload_bat")!.minAge).toBe(16);
    expect(weightedBallAllowed(15)).toBe(false);
    expect(weightedBallAllowed(16)).toBe(true);
    expect(weightedBallAllowed(null)).toBe(false);
    const cat = new Map<string, any>([
      ["plyo_ball_6oz_rocker", { slug: "plyo_ball_6oz_rocker", equipment: ["plyo_ball"] }],
      ["plyo_ball_4oz_pivot", { slug: "plyo_ball_4oz_pivot", equipment: ["plyo_ball"] }],
      ["weighted_ball_9oz", { slug: "weighted_ball_9oz", equipment: ["weighted_ball"] }],
    ]);
    const rows = [...cat.keys()].map((s) => ({ slot: "ub_primer", movement_slug: s }));
    for (const age of [9, 12, 13, 15, 16, 19, null]) {
      const out = finalRuleCheck(rows as any, { planDate: "2026-01-10", phase: "os_q2", age, priorLiftDates: [], restDaysBetweenLifts: null, weeklyLiftMax: null, liftRemoved: false, catalog: cat });
      const kept = out.rows.map((x: any) => x.movement_slug);
      expect(kept.includes("weighted_ball_9oz")).toBe(false);
      expect(kept.includes("plyo_ball_4oz_pivot")).toBe(true);
      expect(kept.includes("plyo_ball_6oz_rocker")).toBe(age != null && age >= 16);
    }
    void planPowerPrimer;
  });
});

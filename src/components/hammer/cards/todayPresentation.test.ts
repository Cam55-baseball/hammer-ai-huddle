import { describe, it, expect } from "vitest";
import { prescribedToday, visiblePlanCard, splitBaserunning, groupPhysicalBaserunning, splitBunting } from "./todayPresentation";
import { rulesForCard } from "./CardRules";
import type { PrescribedBlock } from "@/lib/hammer/prescription/dailyPlan";
import { buildHammerDailyPlan } from "@/lib/hammer/prescription/dailyPlan";
import type { HammerAthleteContext } from "@/lib/hammer/context/athleteContext";
import { NORMAL_SIGNAL } from "@/lib/hammer/prescription/scheduleContext";

const block = (status: PrescribedBlock["status"] = "ready") => ({
  modality: "baserunning", status, title: "Baserunning IQ", route: "/practice?module=baserunning",
  why: "Decision practice", roadmapReason: "Today's work", phase: "skill", steps: [], cues: [], stopRules: [], durationMin: 15,
  ctaLabel: "Open", missing: [], missingContextKeys: [], gamePlanTemplate: null,
  drills: [{ name: "Lead + secondary footwork", dosage: "10 reps" }, { name: "Pickoff reads", dosage: "8 reps" }, { name: "Tag-up scenarios", dosage: "5 reps" }],
} as PrescribedBlock);

describe("Today presentation — no prescription bleed", () => {
  it('separates bunts in both sports without changing hitting task identities or volume', () => {
    for (const sport of ['baseball', 'softball']) {
      const swing = { name: 'Tee swings', slug: `${sport}-tee`, dosage: '10 swings' };
      const bunt = { name: 'Sacrifice bunt', slug: `${sport}-bunt`, dosage: '7 attempts', bunt: { side: 'L' as const, type: 'sac_3b' as const, attempts: 7, sourceAttempts: 10, sourceSuccesses: 5 } };
      const original = { ...block(), modality: 'hitting', drills: [swing, bunt] } as PrescribedBlock;
      const before = JSON.stringify(original);
      const parts = splitBunting([original]);
      expect(parts).toHaveLength(2);
      expect(parts.map(part => part.modality)).toEqual(['hitting', 'hitting']);
      expect(parts[0].drills[0]).toBe(swing);
      expect(parts[1].drills[0]).toBe(bunt);
      expect(parts.flatMap(part => part.drills)).toHaveLength(2);
      expect(parts[1].drills[0].dosage).toBe('7 attempts');
      expect(JSON.stringify(original)).toBe(before);
    }
  });
  it('keeps equipment confirmation visible without granting training or completion', () => {
    const waiting = { ...block('awaiting-input'), drills: [] };
    expect(visiblePlanCard(waiting)).toBe(true);
    expect(prescribedToday(waiting)).toBe(false);
    expect(visiblePlanCard(block('suppressed'))).toBe(false);
    expect(visiblePlanCard(block('off-day'))).toBe(false);
  });
  it("preserves actual eight-week builder prescriptions across sports, phases and eligibility", () => {
    for (const sport of ["baseball", "softball"]) {
      for (const phase of ["in", "off", "pre"]) {
        for (const eligible of [false, true]) {
          const values: Record<string, unknown> = { sport_primary: sport, season_phase: phase, position_primary: "SS", lifecycle_band: "u18", lifting_age_years: 2, weekly_availability_days: 6, injury_history: [] };
          const context = { variables: [], missing: [], missingCount: 0, isLoading: false, envelope: null,
            get: (key: string) => ({ key, value: values[key], missing: values[key] == null, source: "test", confidence: "high" }),
          } as unknown as HammerAthleteContext;
          for (let day = 0; day < 56; day++) {
            const plan = buildHammerDailyPlan(context, NORMAL_SIGNAL, null, null, undefined, new Date(2026, 5, 1 + day));
            const before = JSON.stringify(plan);
            const split = splitBaserunning(plan.blocks);
            const grouped = groupPhysicalBaserunning(split.physical, eligible);
            const displayed = [...split.mental, ...grouped.speed, ...grouped.conditioning].flatMap(b => b.drills);
            const original = plan.blocks.filter(b => b.modality === "baserunning" && prescribedToday(b)).flatMap(b => b.drills);
            expect(displayed).toHaveLength(original.length);
            original.forEach(d => expect(displayed.filter(x => x === d)).toHaveLength(1));
            expect(JSON.stringify(plan)).toBe(before);
          }
        }
      }
    }
  });
  it("shows only real prescribed work", () => {
    for (const status of ["off-day", "suppressed", "awaiting-input"] as const) expect(prescribedToday(block(status))).toBe(false);
    expect(prescribedToday(block())).toBe(true);
  });
  it("partitions eight weeks without changing dose, instructions or original objects", () => {
    for (let day = 0; day < 56; day++) {
      const original = block(); const before = JSON.stringify(original);
      const split = splitBaserunning([original]);
      const all = [...split.mental, ...split.physical].flatMap(b => b.drills);
      expect(all).toHaveLength(original.drills.length);
      original.drills.forEach(d => expect(all.filter(item => item === d)).toHaveLength(1));
      expect(JSON.stringify(original)).toBe(before);
      expect(split.mental[0].route).toBe("/practice?module=baserunning");
      expect(split.mental[0].drills.every(d => !/footwork/i.test(d.name))).toBe(true);
    }
  });
  it("does not leak lift or bat rules into running cards", () => {
    const speed = rulesForCard("Speed", ["baseball_5tool"]);
    expect(speed.join(" ")).not.toMatch(/bat|lift/i);
    expect(speed.join(" ")).toMatch(/steal attempt/i);
    expect(rulesForCard("Speed", ["baseball_pitcher"]).join(" ")).not.toMatch(/steal/i);
    expect(rulesForCard("Lift", []).join(" ")).not.toMatch(/steal|bat/i);
  });
  it("keeps running scenarios physical and partitions explicit steal drills without duplication", () => {
    for (let day = 0; day < 56; day++) {
      for (const eligible of [false, true]) {
        const fixture = block();
        const original = { ...fixture, drills: [...fixture.drills, { name: "Base Stealer sprint", dosage: "3 reps; full rest" }] };
        const before = JSON.stringify(original);
        const split = splitBaserunning([original]);
        const grouped = groupPhysicalBaserunning(split.physical, eligible);
        const drills = [...split.mental, ...grouped.speed, ...grouped.conditioning].flatMap(b => b.drills);
        original.drills.forEach(d => expect(drills.filter(x => x === d)).toHaveLength(1));
        expect(grouped.speed.length).toBe(eligible ? 1 : 0);
        expect(split.physical[0].drills.some(d => /scenarios/i.test(d.name))).toBe(true);
        expect(JSON.stringify(original)).toBe(before);
      }
    }
  });
});
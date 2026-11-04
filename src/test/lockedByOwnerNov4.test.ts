/**
 * LOCKED BY OWNER NOV 4 — invariant tests. Do not loosen, skip or rewrite these to make
 * a change pass; a failure here means a locked owner rule regressed.
 */
import { describe, expect, it } from "vitest";
import { planningProgramModules, normalizeProgramModules, programOf } from "../../supabase/functions/_shared/programAccess";
import { placeThrowsByRole, throwKind } from "@/lib/hammer/prescription/throwPlacement";
import { buildWarmup, fullBodyTemplate, warmupCoverageIssues, WARMUP_MIN_ARM_PREP, WARMUP_MIN_HITTING_PREP, type WarmupContext } from "@/lib/hammer/prescription/warmupLibrary";
import { buildHammerDailyPlan } from "@/lib/hammer/prescription/dailyPlan";
import { NORMAL_SIGNAL } from "@/lib/hammer/prescription/scheduleContext";
import type { ContextVariable, HammerAthleteContext } from "@/lib/hammer/context/athleteContext";

const OWNER = "95de827d-7418-460b-8b79-267bf79bdca4";
const ALL = ["hitting", "pitching", "throwing"];
const ARM_UNIT = /arm units?|arm budget|arm-unit/i;

describe("locked by owner Nov 4 — (1) owner-only 5Tool planning rule", () => {
  for (const sport of ["baseball", "softball"]) {
    it(`locked by owner Nov 4: owner account plans as 5Tool position player in ${sport}`, () => {
      const m = planningProgramModules(OWNER, ALL, sport);
      expect(programOf(sport, m, sport)).toBe("5tool");
      expect(m.some((k) => /pitch|golden2way/.test(k))).toBe(false);
    });
  }
  it("locked by owner Nov 4: owner keeps full access (access judge unchanged)", () => {
    expect(programOf("baseball", normalizeProgramModules(ALL, "baseball"))).toBe("golden2way");
  });
  it("locked by owner Nov 4: no other account is affected (near-miss IDs included)", () => {
    const others = [null, undefined, "", OWNER.toUpperCase(), ` ${OWNER}`, `${OWNER} `, OWNER.slice(0, 8), OWNER.replace(/4$/, "5"), "00000000-0000-0000-0000-000000000000"];
    for (const id of others) for (const sport of ["baseball", "softball"]) {
      expect(planningProgramModules(id as string, ALL, sport)).toEqual(normalizeProgramModules(ALL, sport));
    }
  });
});

const toSteps = (d: readonly { name: string }[]) => d.map((x) => x.name);
const posDay = () => [
  { modality: "warmup", status: "ready", title: "Warm-up", steps: [], drills: [{ name: "Tissue prep 1" }, { name: "Warm-up throws — easy to building", dosage: "10 throws", cue: "Log these on your Throwing card." }] },
  { modality: "throwing", status: "ready", title: "Throwing — position work within your shared arm budget", steps: [], drills: [
    { name: "Long-toss extension", dosage: "~15 throws" },
    { name: "Regulation extension toss", dosage: "to 90ft x 12 throws" },
    { name: "Routine ground-ball throw", dosage: "20 throws" },
    { name: "Relay throw", dosage: "2 x 5" },
  ] },
  { modality: "defense", status: "ready", title: "Defense — SS", steps: [], drills: [{ name: "Deep-hole throw", dosage: "5 reps" }] },
];

describe("locked by owner Nov 4 — (2) position-player throwing placement", () => {
  const out = placeThrowsByRole(posDay(), { pitcher: false, toSteps });
  const w = out.find((b) => b.modality === "warmup")!;
  const d = out.find((b) => b.modality === "defense")!;
  it("locked by owner Nov 4: no standalone Throwing card for position players", () => {
    expect(out.some((b) => b.modality === "throwing")).toBe(false);
  });
  it("locked by owner Nov 4: warm-up throws → catch play is the LAST warm-up section", () => {
    const kinds = w.drills.map((x) => (x as { throwSection?: boolean }).throwSection ? throwKind(x as never) : null);
    const first = kinds.findIndex((k) => k !== null);
    expect(first).toBeGreaterThan(0);
    expect(kinds.slice(first).every((k) => k !== null)).toBe(true);
    const order = kinds.slice(first).map((k) => ({ arm_care: 0, warmup: 1, catch_play: 2, long_toss: 3, position: 4 })[k!]);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(kinds).toContain("warmup");
    expect(kinds).toContain("catch_play");
    expect(kinds).not.toContain("position");
  });
  it("locked by owner Nov 4: position throws only on Defense, each with a throw count", () => {
    expect(d.drills.map((x) => x.name)).toEqual(["Deep-hole throw", "Routine ground-ball throw", "Relay throw"]);
    for (const x of d.drills) expect(x.dosage ?? "").toMatch(/\d+ throws/);
    for (const x of w.drills.filter((x) => (x as { throwSection?: boolean }).throwSection)) expect(x.dosage ?? "").toMatch(/\d+ throws/);
  });
  it("locked by owner Nov 4: no arm-unit text in titles, steps or doses", () => {
    expect(JSON.stringify(out.map((b) => [b.title, b.steps, b.drills.map((x) => [x.name, x.dosage, x.cue])]))).not.toMatch(ARM_UNIT);
  });

  function ctx(values: Record<string, unknown>): HammerAthleteContext {
    const variables = Object.entries(values).map(([key, value]): ContextVariable => ({ key, value, label: key, domain: "identity", source: "test", confidence: "high", missing: false, lastUpdated: null, lineage: { owner: "test", source: "test", rawConfidence: "high" } }));
    return { variables, missing: [], missingCount: 0, isLoading: false, envelope: null, get<T>(key: string) { return variables.find((r) => r.key === key) as ContextVariable<T> | undefined; } };
  }
  const gear = ["field", "glove", "ball", "bands", "partner", "mound", "circle", "catcher", "plate", "net", "bucket"];
  for (const sport of ["baseball", "softball"] as const) for (const [tier, focus] of [["5tool", null], ["golden2way", "position"]] as const) {
    it(`locked by owner Nov 4: real builder ${sport} ${tier} position player — two weeks hold the placement`, () => {
      for (let i = 0; i < 14; i++) {
        const plan = buildHammerDailyPlan(ctx({ sport_primary: sport, position_primary: "SS", season_phase: "off", age_years: 20, lifecycle_band: "college", lifting_age_years: 2, development_priorities: ["throwing"], weekly_availability_days: 6, injury_history: [], equipment_effective: gear }), NORMAL_SIGNAL, null, null, undefined, new Date(2026, 5, 1 + i),
          { subscriptionModules: [`${sport}_${tier}`], ...(focus ? { pitcherOutings: { primaryFocus: focus } as never } : {}) });
        expect(plan.blocks.some((b) => b.modality === "throwing" && b.status === "ready")).toBe(false);
        expect(JSON.stringify(plan.blocks.map((b) => [b.title, b.steps, b.drills.map((x) => [x.name, x.dosage])]))).not.toMatch(ARM_UNIT);
        const wu = plan.blocks.find((b) => b.modality === "warmup" && b.status === "ready");
        const flags = (wu?.drills ?? []).map((x) => !!(x as { throwSection?: boolean }).throwSection);
        const first = flags.indexOf(true);
        if (first >= 0) expect(flags.slice(first).every(Boolean)).toBe(true);
      }
    });
  }
});

describe("locked by owner Nov 4 — (3) full-body warm-up rule", () => {
  const TRAINING: WarmupContext[] = ["game_day", "in_season_practice", "in_season_default", "speed_day", "lift_day", "throwing_day", "hitting_day", "offseason_extended", "travel_day", "default"];
  it("locked by owner Nov 4: minimums are 2 arm-prep and 2 hitting-readiness", () => {
    expect(WARMUP_MIN_ARM_PREP).toBe(2);
    expect(WARMUP_MIN_HITTING_PREP).toBe(2);
  });
  for (const c of TRAINING) it(`locked by owner Nov 4: ${c} template has tissue prep, mobility, activation, movement prep, ≥2 arm-prep, ≥2 hitting-readiness`, () => {
    const t = fullBodyTemplate(c);
    for (const role of ["tissue_prep", "mobility_joint", "activation", "movement_bridge"] as const) expect(t).toContain(role);
    expect(t.filter((r) => r === "arm_prep").length).toBeGreaterThanOrEqual(2);
    expect(t.filter((r) => r === "hitting_prep").length).toBeGreaterThanOrEqual(2);
  });
  it("locked by owner Nov 4: the validator flags a warm-up missing any coverage", () => {
    expect(warmupCoverageIssues([{ role: "tissue_prep" }, { role: "arm_prep" }, { role: "hitting_prep" }])).toEqual(expect.arrayContaining(["warmup_arm_prep_short:1", "warmup_hitting_prep_short:1"]));
    expect(warmupCoverageIssues([])).toEqual(expect.arrayContaining(["warmup_no_tissue_prep", "warmup_no_lower", "warmup_no_hip_core", "warmup_no_upper"]));
  });
  for (const injuryRegions of [[], ["shoulder"], ["elbow", "shoulder"], ["hip", "back"], ["knee", "ankle"]]) {
    it(`locked by owner Nov 4: built warm-ups stay full-body with injuries [${injuryRegions.join(",")}] (swapped, never dropped)`, () => {
      for (const context of TRAINING) for (let daySeed = 0; daySeed < 7; daySeed++) {
        const built = buildWarmup({ context, lifecycle: "intermediate", gameDay: context === "game_day", daySeed, injuryRegions, equipment: ["bands", "tennis_ball", "med_ball"] });
        expect(warmupCoverageIssues(built.drills)).toEqual([]);
        for (const role of ["tissue_prep", "mobility_joint", "activation", "movement_bridge"]) expect(built.drills.some((d) => d.role === role)).toBe(true);
      }
    });
  }
});

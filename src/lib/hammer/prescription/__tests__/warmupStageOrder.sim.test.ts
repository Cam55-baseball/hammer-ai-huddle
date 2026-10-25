import { describe, it, expect, afterEach } from "vitest";
import { buildWarmup, resolveWarmupContext, type LifecycleClass, type WarmupContext } from "../warmupLibrary";
import { sortByWarmupStage, stageFor, setWarmupStageOverrides, BUILD_UP_STAGE, WARMUP_STAGES } from "../warmupStages";
import { validateExercise, type VaultExercise } from "@/lib/vault/validateExercise";

const CONTEXTS: WarmupContext[] = [
  "game_day", "in_season_practice", "in_season_default", "speed_day", "lift_day",
  "throwing_day", "hitting_day", "offseason_extended", "recovery_day", "travel_day", "default",
];
const AGE_BANDS: LifecycleClass[] = ["youth", "beginner", "intermediate", "advanced", "elite"];
const ROLES = [{ isThrower: true, pos: "P" }, { isThrower: true, pos: "C" }, { isThrower: false, pos: "IF" }, { isThrower: false, pos: "OF" }];
const KITS: Array<string[]> = [[], ["full_gym", "tennis_ball", "bat"], ["field"], ["bands"]];

afterEach(() => setWarmupStageOverrides(null));

describe("warm-up stage order — 8-week simulation", () => {
  it("every warm-up is in non-decreasing stage order, tissue prep first, same movements as before", () => {
    let warmups = 0;
    const breaks: string[] = [];
    for (const context of CONTEXTS) for (const lifecycle of AGE_BANDS) for (const sport of ["baseball", "softball"] as const)
      for (const role of ROLES) for (let day = 0; day < 56; day++) {
        const args = {
          context, lifecycle, gameDay: context === "game_day", daySeed: day, sport, isThrower: role.isThrower,
          equipment: KITS[day % KITS.length], suppressArmCare: role.isThrower && day % 3 === 0,
          suppressTwitch: day % 7 === 6, injuryRegions: day % 11 === 0 ? ["knee"] : [],
        };
        const before = buildWarmup({ ...args, orderByStage: false });
        const after = buildWarmup(args);
        warmups++;
        const id = `${context}/${lifecycle}/${sport}/${role.pos}/d${day}`;
        // identical choice
        expect([...after.drills.map((d) => d.slug)].sort(), id).toEqual([...before.drills.map((d) => d.slug)].sort());
        expect(after.drills.map((d) => d.dosage).sort(), id).toEqual(before.drills.map((d) => d.dosage).sort());
        // tissue prep first, rolling then rhythm
        if (context !== "recovery_day" && (after.drills[0]?.slug !== "wu_tissue_prep_roll_and_rhythm" || after.drills[1]?.slug !== "wu_tissue_prep_rhythmic_shake")) breaks.push(`${id}: tissue prep not first`);
        const stages = after.drills.map((d) => stageFor(d.slug, d.role)!);
        for (let i = 1; i < stages.length; i++) if (stages[i] < stages[i - 1]) breaks.push(`${id}: stage ${stages[i]} after ${stages[i - 1]}`);
        // build-ups before any max-intent effort
        const lastBuild = stages.lastIndexOf(BUILD_UP_STAGE);
        const firstMax = stages.findIndex((s) => s > BUILD_UP_STAGE);
        if (lastBuild !== -1 && firstMax !== -1 && firstMax < lastBuild) breaks.push(`${id}: max intent before build-up`);
      }
    expect(breaks).toEqual([]);
    expect(warmups).toBe(CONTEXTS.length * AGE_BANDS.length * 2 * ROLES.length * 56);
  });

  it("season types resolve to contexts that all pass", () => {
    for (const seasonPhase of ["off", "pre", "in", "post", null] as const) {
      const ctx = resolveWarmupContext({ seasonPhase, isGameDay: false, isPracticeDay: true, isTravelDay: false, isRecoveryDay: false });
      expect(CONTEXTS).toContain(ctx);
    }
  });

  it("owner tags reorder within the hard rules", () => {
    // owner tries to put a max-intent sprint before build-ups, and a mobility drill at stage 0
    setWarmupStageOverrides({ wu_falling_start: { stage: 2, order: null }, wu_worlds_greatest_stretch: { stage: 0, order: null } });
    expect(stageFor("wu_falling_start", "fast_twitch")).toBe(BUILD_UP_STAGE + 1);
    expect(stageFor("wu_worlds_greatest_stretch", "mobility_joint")).toBe(1);
    expect(stageFor("wu_tissue_prep_rhythmic_shake", "tissue_prep")).toBe(0);
    // order within stage
    setWarmupStageOverrides({ b: { stage: 3, order: 1 } });
    const items = [{ s: "wu_tissue_prep_roll_and_rhythm", r: "tissue_prep" }, { s: "a", r: "mobility_joint" }, { s: "b", r: "mobility_joint" }];
    expect(sortByWarmupStage(items, (x) => x.s, (x) => x.r).map((x) => x.s)).toEqual(["wu_tissue_prep_roll_and_rhythm", "b", "a"]);
  });

  it("the breath primer never splits tissue prep", () => {
    const items = ["wu_tissue_prep_roll_and_rhythm", "hpi-breath-primer", "wu_tissue_prep_rhythmic_shake", "wu_hip_cars"];
    expect(sortByWarmupStage(items, (x) => x)).toEqual(["wu_tissue_prep_roll_and_rhythm", "wu_tissue_prep_rhythmic_shake", "hpi-breath-primer", "wu_hip_cars"]);
  });

  it("has a plain name and warmth line for every stage, not capped at 0–5", () => {
    expect(WARMUP_STAGES.length).toBeGreaterThan(6);
    for (const s of WARMUP_STAGES) { expect(s.name.length).toBeGreaterThan(3); expect(s.warmth.length).toBeGreaterThan(20); }
  });

  it("the Vault validator blocks a warm-up movement without a stage", () => {
    const base: VaultExercise = {
      slug: "wu_test", name: "Test reach", how_to_one_rep: "One rep is one reach.", cue: "reach", stop_if: "pain",
      measure_type: "reps", default_sets: 1, default_reps: 5, equipment: ["none"], card_type: "warmup",
      sports: ["baseball"], season_phases: ["in_season"], min_age: 8, rest_rule: "none",
    };
    expect(validateExercise(base)).toContain("Pick a warm-up stage (every warm-up movement needs one).");
    expect(validateExercise({ ...base, warmup_stage: 3 })).toEqual([]);
    expect(validateExercise({ ...base, warmup_stage: 3, warmup_stage_order: 0 })).toContain("Order within stage must be a whole number from 1.");
    expect(validateExercise({ ...base, card_type: "lift" })).toEqual([]);
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { WARMUP_LIBRARY, buildWarmup, warmupCoverageIssues, lifecycleFor, type WarmupContext } from "../warmupLibrary";
import { backfillFitTags, fitTagsFor, fits, resolvePlayerFit, setWarmupFitOverrides, LOW_IMPACT_ROLES } from "../warmupFit";
import { eligibleFor } from "@/lib/prescription/ownerPlanDrills";
import type { OwnerDrillRow } from "@/lib/prescription/ownerDrills";

afterEach(() => setWarmupFitOverrides(null));

const CONTEXTS: WarmupContext[] = ["default", "speed_day", "lift_day", "throwing_day", "hitting_day", "in_season_practice", "offseason_extended"];
const youth = resolvePlayerFit({ competitionLevel: "12u", ageYears: 11 });
const pro = resolvePlayerFit({ competitionLevel: "pro", ageYears: 26 });

describe("backfill from minLifecycle (owner Part D rule 3)", () => {
  it("youth items fit every level and age", () => {
    for (const d of WARMUP_LIBRARY.filter((x) => x.minLifecycle === "youth"))
      expect(fitTagsFor(d)).toEqual({ levels: ["youth", "high_school", "college", "pro"], ageBands: ["u13", "13_17", "18_plus"] });
  });
  it("beginner items: HS/college/pro 13+, under-13s only for low-impact roles", () => {
    for (const d of WARMUP_LIBRARY.filter((x) => x.minLifecycle === "beginner")) {
      const t = fitTagsFor(d);
      expect(t.levels).toEqual(expect.arrayContaining(["high_school", "college", "pro"]));
      expect(t.ageBands).toEqual(expect.arrayContaining(["13_17", "18_plus"]));
      expect(t.ageBands.includes("u13")).toBe(LOW_IMPACT_ROLES.has(d.role));
    }
    expect(LOW_IMPACT_ROLES.has("mobility_joint") && LOW_IMPACT_ROLES.has("activation") && LOW_IMPACT_ROLES.has("tissue_prep")).toBe(true);
    expect(LOW_IMPACT_ROLES.has("fast_twitch")).toBe(false);
  });
  it("intermediate items: HS/college/pro, 13+", () => {
    expect(backfillFitTags("intermediate", "mobility_joint")).toEqual({ levels: ["high_school", "college", "pro"], ageBands: ["13_17", "18_plus"] });
  });
  it("advanced items (snap jumps, heavy plyos): college and pro, 18+", () => {
    const snap = WARMUP_LIBRARY.find((d) => d.slug === "wu_snap_jump")!;
    expect(fitTagsFor(snap)).toEqual({ levels: ["college", "pro"], ageBands: ["18_plus"] });
  });
});

describe("player with no level saved (owner rule 4)", () => {
  it("uses age, then high school", () => {
    expect(resolvePlayerFit({ ageYears: 11 })).toEqual({ level: "youth", ageBand: "u13" });
    expect(resolvePlayerFit({ ageYears: 15 })).toEqual({ level: "high_school", ageBand: "13_17" });
    expect(resolvePlayerFit({})).toEqual({ level: "high_school", ageBand: "13_17" });
    expect(resolvePlayerFit({ competitionLevel: "D1", ageYears: 20 })).toEqual({ level: "college", ageBand: "18_plus" });
  });
});

describe("8-week simulation: under-13 youth vs pro", () => {
  const run = (fit: typeof youth, lifecycle: ReturnType<typeof lifecycleFor>) => {
    const slugs = new Set<string>();
    for (let day = 0; day < 56; day++) {
      if (day % 7 === 6) continue; // rest day
      const w = buildWarmup({ context: CONTEXTS[day % CONTEXTS.length], lifecycle, gameDay: false, daySeed: day * 31, equipment: ["full_gym"], fit, suppressArmCare: true });
      expect(warmupCoverageIssues(w.drills)).toEqual([]);
      for (const d of w.drills) {
        const lib = WARMUP_LIBRARY.find((x) => x.slug === d.slug);
        if (!lib) continue; // owner tissue-prep block
        const fallback = w.diagnostics.some((g) => g.code === "level_fallback" && g.to === d.slug);
        if (!fallback) expect(fits(fitTagsFor(lib), fit), `${d.slug} for ${fit.level}`).toBe(true);
        slugs.add(d.slug);
      }
    }
    return slugs;
  };
  it("each gets only items that fit, keeps full-body coverage, and the warm-ups differ", () => {
    const y = run(youth, lifecycleFor("u12", null));
    const p = run(pro, lifecycleFor(null, 8));
    const advanced = WARMUP_LIBRARY.filter((d) => d.minLifecycle === "advanced" || d.minLifecycle === "elite").map((d) => d.slug);
    expect(advanced.some((s) => y.has(s))).toBe(false);
    expect([...p].some((s) => !y.has(s))).toBe(true);
  });
});

describe("fallback: nothing tagged fits a slot", () => {
  it("picks the nearest easier item and keeps coverage", () => {
    const map: Record<string, { levels: string[]; ageBands: string[] }> = {};
    for (const d of WARMUP_LIBRARY.filter((x) => x.role === "arm_prep")) map[d.slug] = { levels: ["pro"], ageBands: ["18_plus"] };
    setWarmupFitOverrides(map);
    const w = buildWarmup({ context: "default", lifecycle: "youth", gameDay: false, daySeed: 3, equipment: ["full_gym"], fit: youth, suppressArmCare: true });
    expect(w.drills.filter((d) => d.role === "arm_prep").length).toBeGreaterThanOrEqual(2);
    expect(w.diagnostics.some((g) => g.code === "level_fallback" && g.role === "arm_prep")).toBe(true);
    expect(warmupCoverageIssues(w.drills)).toEqual([]);
  });
});

describe("owner Skill-drill-builder warm-ups", () => {
  const row = (fit_levels: string[], fit_age_bands: string[]): OwnerDrillRow => ({
    id: "x", overrides_drill_id: null, placements: ["hammers_today:warmup"], sports: ["baseball"], name: "Owner warm-up", fault_keys: [], phase: null, level: null,
    dosage: "2 x 10", setup: "s", steps: ["a"], cue: "c", feel: null, feel_wrong: null, common_mistake: null, equipment: [], video_url: null,
    fit_levels, fit_age_bands, active: true, pinned: false, created_at: "",
  });
  it("only fit players get a tagged item; untagged legacy items fit everyone", () => {
    expect(eligibleFor(row(["pro"], ["18_plus"]), ["hammers_today:warmup"], { sport: "baseball", fit: youth })).toBe(false);
    expect(eligibleFor(row(["pro"], ["18_plus"]), ["hammers_today:warmup"], { sport: "baseball", fit: pro })).toBe(true);
    expect(eligibleFor(row([], []), ["hammers_today:warmup"], { sport: "baseball", fit: youth })).toBe(true);
  });
});

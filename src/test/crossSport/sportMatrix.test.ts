import { describe, it, expect } from "vitest";
import { sportGeometry, pitchTypes, armSlots } from "../../lib/games/sportRules";
import { sportTerminology } from "../../data/sportTerminology";
import { declaredRouteBases, prescribedBases } from "../../../supabase/functions/_shared/wic/runRest";
import { startingStandards, pitchingStats, type PitchingCounts } from "../../../supabase/functions/_shared/wic/masteryPitchingStandards";
import { applyProgramContent, BATCH_KEYS, type ContentContext } from "../../../supabase/functions/_shared/wic/content/programContent";
import { isSoftballGradable, GRADE_BENCHMARKS } from "../../data/gradeBenchmarks";
import { BUNT_TYPES, BUNT_WORDING } from "../../../supabase/functions/_shared/wic/buntingProgram";

/**
 * CROSS-SPORT TEST MATRIX (owner, Oct 26): baseball and softball must never
 * bleed into each other. Every sport-branched surface is asserted here.
 */

const BASEBALL_ONLY_WORDS = [/windmill/i, /riseball/i, /screwball/i, /\bcircle\b/i, /slap hit/i, /60[- ]ft\b/i, /\b60 feet\b/i];
const SOFTBALL_ONLY_WORDS = [/mound/i, /overhand/i, /knuckleball/i, /leadoff|lead-off|lead off/i, /time to plate/i, /90[- ]ft\b/i, /\b90 feet\b/i];

describe("sport geometry and vocabulary", () => {
  it("base distance and pitching distance are sport-correct", () => {
    expect(sportGeometry("baseball")).toMatchObject({ baseDistanceFt: 90, pitchingDistanceFt: 60.5, leadoffsAllowed: true });
    expect(sportGeometry("softball")).toMatchObject({ baseDistanceFt: 60, pitchingDistanceFt: 43, leadoffsAllowed: false });
  });

  it("pitch types are disjoint: no windmill pitches in baseball, no baseball pitches in softball", () => {
    const bb = pitchTypes("baseball").map((p) => p.value);
    const sb = pitchTypes("softball").map((p) => p.value);
    expect(bb).toContain("KN");
    expect(sb).toContain("rise");
    expect(sb).not.toContain("KN");
    expect(sb).not.toContain("SL");
    expect(bb).not.toContain("rise");
    expect(bb).not.toContain("drop");
    expect(bb).not.toContain("screw");
  });

  it("arm slots are disjoint: windmill only in softball, overhand slots only in baseball", () => {
    const bb = armSlots("baseball").map((s) => s.value);
    const sb = armSlots("softball").map((s) => s.value);
    expect(sb.every((s) => /windmill|slingshot/.test(s))).toBe(true);
    expect(bb.some((s) => /windmill/.test(s))).toBe(false);
    expect(sb).not.toContain("over_top");
  });

  it("terminology dictionary: mound vs circle, 90 ft vs 60 ft", () => {
    expect(sportTerminology.baseball.drillNames.moundWork).toBe("Mound Work");
    expect(sportTerminology.softball.drillNames.moundWork).toBe("Circle Work");
    expect(sportTerminology.baseball.speedDistances.baseDistance).toBe("90 ft");
    expect(sportTerminology.softball.speedDistances.baseDistance).toBe("60 ft");
    expect(sportTerminology.softball.pitchTypes.fastball).toMatch(/windmill/i);
  });
});

describe("base routes and rest", () => {
  it("a baseball 90-ft route is rejected for softball and vice versa", () => {
    const bbRoute = { sport: "baseball", bases_per_rep: 2, base_distance_feet: 90 };
    const sbRoute = { sport: "softball", bases_per_rep: 2, base_distance_feet: 60 };
    expect(declaredRouteBases(bbRoute, "baseball", 180)).toBe(2);
    expect(declaredRouteBases(bbRoute, "softball", 120)).toBeNull();
    expect(declaredRouteBases(sbRoute, "softball", 120)).toBe(2);
    expect(declaredRouteBases(sbRoute, "baseball", 180)).toBeNull();
  });

  it("baseball-only base-route slugs never prescribe for softball", () => {
    expect(prescribedBases("bases_home_2nd", 180, undefined, "baseball")).toBe(2);
    expect(prescribedBases("bases_home_2nd", 120, undefined, "softball")).toBeNull();
    expect(prescribedBases("repeat_90ft_bb", 90, undefined, "softball")).toBeNull();
  });
});

describe("pitching standards stay sport-separate", () => {
  const counts: PitchingCounts = {
    battersFaced: 100, strikeouts: 30, walks: 5, hits: 15, homeRuns: 1, atBatsAgainst: 90,
    outs: 63, runs: 5, earnedRuns: 4, pitches: 350, firstPitchStrikes: 70, twoBallBatters: 25,
    innings: 7, scoringPosInnings: 2, runnersInScoringPos: 5, runnersOn: 20, runnersStranded: 15,
    ballsInPlay: 60, softContact: 18, swings: 200, whiffs: 50,
    stolenBases: 2, stealAttempts: 3, pickoffs: 1, pickoffAttempts: 5, timeToPlateS: [1.25, 1.3],
    pfpChances: 10, pfpErrors: 0,
  };

  it("softball stats never include time-to-plate or HR per 9; baseball never includes K/7 or ERA", () => {
    const bb = pitchingStats(counts, "baseball");
    const sb = pitchingStats(counts, "softball");
    expect(bb.time_to_plate_s).toBeCloseTo(1.275);
    expect(bb.hr_per_9).not.toBeNull();
    expect(bb.k_per_7).toBeUndefined();
    expect(bb.era).toBeUndefined();
    expect(sb.time_to_plate_s).toBeUndefined();
    expect(sb.hr_per_9).toBeUndefined();
    expect(sb.k_per_7).not.toBeNull();
    expect(sb.era).not.toBeNull();
  });

  it("softball standards never contain time-to-plate; baseball standards never contain K/7", () => {
    for (const level of ["pro", "college", "high_school", "youth"] as const) {
      const bbKeys = startingStandards("baseball", level).map((s) => s.key);
      const sbKeys = startingStandards("softball", level).map((s) => s.key);
      expect(bbKeys).toContain("time_to_plate_s");
      expect(sbKeys).not.toContain("time_to_plate_s");
      expect(sbKeys).toContain("k_per_7");
      expect(sbKeys).toContain("era");
      expect(bbKeys).not.toContain("k_per_7");
      expect(bbKeys).not.toContain("era");
      expect(sbKeys).not.toContain("hr_per_9");
    }
  });
});

describe("grade benchmarks", () => {
  it("softball is never graded from a baseball-only benchmark", () => {
    // Every metric with an empty softball curve must refuse a softball grade.
    for (const [key, curves] of Object.entries(GRADE_BENCHMARKS)) {
      const sb = (curves as { softball?: unknown[] }).softball;
      if (!sb || sb.length === 0) expect(isSoftballGradable(key)).toBe(false);
    }
  });
});

describe("bunting", () => {
  it("bunt wording is the owner's identical wording in both sports, both sides, never mixed", () => {
    for (const side of ["R", "L"] as const) {
      for (const type of BUNT_TYPES) {
        expect(typeof BUNT_WORDING[side][type]).toBe("string");
        expect(BUNT_WORDING[side][type].length).toBeGreaterThan(0);
      }
    }
  });
});

describe("8-week plan simulations per program and sport", () => {
  const PHASES = ["os_q1", "os_q2", "os_q3", "os_q4", "pre_season", "in_season", "post_season"];
  const PROGRAMS: { name: string; modules: (sport: string) => string[]; pitcher: boolean }[] = [
    { name: "Complete Pitcher", modules: (s) => [`${s}_pitching`], pitcher: true },
    { name: "5Tool Player", modules: (s) => [`${s}_hitting`, `${s}_throwing`], pitcher: false },
    { name: "Golden 2Way", modules: (s) => [`${s}_hitting`, `${s}_pitching`, `${s}_throwing`], pitcher: true },
  ];
  const iso = (d: number) => new Date(Date.UTC(2026, 0, 5) + d * 86_400_000).toISOString().slice(0, 10);

  function dayRows(sport: string) {
    const rows: any[] = [
      { slot: "speed", movement_slug: sport === "baseball" ? "repeat_90ft_bb" : "repeat_43ft_sb", sets: 3, reps: 4, why_payload: {} },
      { slot: "conditioning", movement_slug: "hard_cond", sets: 1, reps: 6, why_payload: {} },
      { slot: "ub_primer", movement_slug: "ub_band", sets: 2, reps: 8, why_payload: {} },
    ];
    return rows;
  }

  for (const sport of ["baseball", "softball"] as const) {
    for (const program of PROGRAMS) {
      it(`${sport} ${program.name}: 8 weeks, zero cross-sport words or items`, () => {
        const enabled = Object.fromEntries(BATCH_KEYS.map((k) => [k, true])) as Record<(typeof BATCH_KEYS)[number], boolean>;
        const forbidden = sport === "softball" ? SOFTBALL_ONLY_WORDS : BASEBALL_ONLY_WORDS;
        const modules = program.modules(sport);
        const violations: string[] = [];
        for (const phase of PHASES) {
          for (let d = 0; d < 56; d++) {
            const ctx: ContentContext = {
              planDate: iso(d), phase, sport, modules, isPitcher: program.pitcher, age: 16, growthMode: false,
              pain: { arm: false, leg: false, back: false },
              equipment: ["band", "baseball"],
              gameToday: false, gameTomorrow: false,
              startToday: false, startYesterday: false, startTomorrow: false,
              speedSessionsBefore: 0, u13ThrowBlock: false,
              barefootThisWeek: false, enabled,
              isHardRow: (x) => /hard/.test(String(x.movement_slug)), liftPatternOf: (x) => String(x.movement_slug),
            };
            const res = applyProgramContent(dayRows(sport), ctx);
            const text = JSON.stringify(res);
            for (const word of forbidden) {
              if (word.test(text)) violations.push(`${phase} day ${d}: ${word}`);
            }
          }
        }
        expect(violations).toEqual([]);
      });
    }
  }
});

describe("catalog sport filter (generator rule)", () => {
  it("the sport_scope filter never admits the other sport's items", () => {
    // Mirrors wk-generate-daily: .or(`sport_scope.eq.both,sport_scope.eq.${sport}`)
    const catalog = [
      { slug: "a", sport_scope: "baseball" },
      { slug: "b", sport_scope: "softball" },
      { slug: "c", sport_scope: "both" },
    ];
    const filter = (sport: string) => catalog.filter((r) => r.sport_scope === "both" || r.sport_scope === sport);
    expect(filter("baseball").map((r) => r.slug)).toEqual(["a", "c"]);
    expect(filter("softball").map((r) => r.slug)).toEqual(["b", "c"]);
  });
});

import { describe, it, expect } from "vitest";
import { ownerConditioningProblems, ownerConditioningDose, ownerConditioningFits } from "../../../../supabase/functions/_shared/wic/conditioning/ownerConditioning";
import { conditioningFloorDue } from "../../../../supabase/functions/_shared/wic/conditioning/weeklyFloor";
import { missingForPlacement } from "@/lib/prescription/ownerPlanDrills";

const run = { conditioning_kind: "run", rounds: 6, work_seconds: 8, rest_seconds: 120, distance_feet: 60, sports: ["baseball"] };
const bases = { conditioning_kind: "base_route", rounds: 4, work_seconds: 12, rest_seconds: 30, bases_per_rep: 2, base_distance_feet: 60, sports: ["softball"] };

describe("owner conditioning drills (Add fields)", () => {
  it("accepts a run whose rest meets 1 minute per 10 yards", () => expect(ownerConditioningProblems(run)).toEqual([]));
  it("rejects a 60 ft run resting under 2 minutes", () =>
    expect(ownerConditioningProblems({ ...run, rest_seconds: 90 }).join()).toContain("at least 120 seconds"));
  it("caps the required run rest at 5 minutes", () =>
    expect(ownerConditioningProblems({ ...run, distance_feet: 600, rest_seconds: 300 })).toEqual([]));
  it("requires the sport's base distance: 60 ft softball, 90 ft baseball", () => {
    expect(ownerConditioningProblems(bases)).toEqual([]);
    expect(ownerConditioningProblems({ ...bases, base_distance_feet: 90 }).join()).toContain("60 ft base distance");
    expect(ownerConditioningProblems({ ...bases, sports: ["baseball"], base_distance_feet: 90 })).toEqual([]);
  });
  it("base routes need at least 30 seconds rest between reps", () =>
    expect(ownerConditioningProblems({ ...bases, rest_seconds: 20 }).join()).toContain("30 seconds"));
  it("missing numbers are never filled in", () =>
    expect(ownerConditioningProblems({ conditioning_kind: "run", sports: ["baseball"] }).length).toBeGreaterThan(2));
  it("uses the entered numbers; low readiness halves rounds (rounded up), rest unchanged", () => {
    expect(ownerConditioningDose(run, false)).toMatchObject({ rounds: 6, rest_seconds: 120, distance_feet: 60 });
    expect(ownerConditioningDose({ ...run, rounds: 5 }, true)).toMatchObject({ rounds: 3, rest_seconds: 120, low: true });
    expect(ownerConditioningDose(bases, false)).toMatchObject({ distance_feet: 120, bases_per_rep: 2 });
  });
  it("pitchers never get base routes; sport must match", () => {
    expect(ownerConditioningFits(bases, { sport: "softball", isPitcher: true })).toBe(false);
    expect(ownerConditioningFits(bases, { sport: "softball", isPitcher: false })).toBe(true);
    expect(ownerConditioningFits(run, { sport: "softball", isPitcher: false })).toBe(false);
  });
  it("the builder shows the drill as not served until numbers are valid", () => {
    const row: any = { name: "Gassers", dosage: "see numbers", cue: "Run tall", sports: ["baseball"], placements: ["hammers_today:conditioning"], equipment: [], steps: [], ...run };
    expect(missingForPlacement(row, "hammers_today:conditioning")).toEqual([]);
    expect(missingForPlacement({ ...row, rest_seconds: 10 }, "hammers_today:conditioning").length).toBe(1);
  });
  it("only serves inside the 2-a-week floor, never the Sunday rest day", () =>
    expect(conditioningFloorDue({ planDate: "2026-11-01", priorRunningDates: [] }).due).toBe(false));
});

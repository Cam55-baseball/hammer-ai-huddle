import { describe, expect, it } from "vitest";
import { careMeasureProblems, careDosage, ownerCareDrill, setOwnerPlanDrills, missingForPlacement } from "@/lib/prescription/ownerPlanDrills";
import { bullpenBeforeStartCard, type StartFollowup } from "@/lib/intelligence/bullpenBeforeStart";

const row = (o: any) => ({ id: o.id, active: true, placements: o.placements, sports: ["baseball"], name: o.name, dosage: "", cue: "Slow breaths", equipment: [], steps: [], fault_keys: [], phase: null, level: null, setup: "", video_url: null, pinned: false, created_by: null, created_at: "", updated_at: "", overrides_drill_id: null, ...o });

describe("owner tissue care and focus routine tags", () => {
  it("needs a measure", () => {
    expect(careMeasureProblems({ care_measure: null } as any)).toHaveLength(1);
    expect(careMeasureProblems({ care_measure: "time", work_seconds: 0 } as any)).toEqual(["a time (minutes)"]);
    expect(careMeasureProblems({ care_measure: "rounds", rounds: 3 } as any)).toEqual([]);
    expect(careMeasureProblems({ care_measure: "check_off" } as any)).toEqual([]);
    expect(careDosage({ care_measure: "time", work_seconds: 600 } as any)).toBe("10 min");
    expect(careDosage({ care_measure: "check_off" } as any)).toBe("Check off when done");
  });

  it("focus routines are non-physical", () => {
    expect(missingForPlacement(row({ id: "a", name: "x", placements: ["hammers_today:focus_routine"], care_measure: "check_off", dosage: "d", equipment: ["band"] }), "hammers_today:focus_routine"))
      .toContain("no equipment (focus routines are non-physical)");
  });

  it("picks by tag and Programs", () => {
    setOwnerPlanDrills([
      row({ id: "t1", name: "Calf tissue care", dosage: "both legs", placements: ["hammers_today:tissue_care"], care_measure: "time", work_seconds: 300, conditioning_programs: ["pitcher"] }),
      row({ id: "f1", name: "Owner focus", dosage: "5 reps", placements: ["hammers_today:focus_routine"], care_measure: "rounds", rounds: 5 }),
    ] as any);
    expect(ownerCareDrill("hammers_today:tissue_care", { sport: "baseball", modules: ["baseball_5tool"] })).toBeNull();
    expect(ownerCareDrill("hammers_today:tissue_care", { sport: "baseball", modules: ["baseball_pitcher"] })?.id).toBe("t1");
    expect(ownerCareDrill("hammers_today:focus_routine", { sport: "baseball", modules: [] })?.id).toBe("f1");
    expect(ownerCareDrill("hammers_today:focus_routine", { sport: "softball", modules: [] })).toBeNull();
    setOwnerPlanDrills([]);
  });
});

const f = (d: string, o: Partial<StartFollowup> = {}): StartFollowup => ({ start_date: d, start_thrown: true, start_pitch_count: 80, ledger_pitches: null, days_completed_next3: 3, conditioning_reps_next3: 0, conditioning_avg_effort_next3: null, health: null, ...o });

describe("bullpen before start insight", () => {
  it("hidden with nothing tracked", () => {
    expect(bullpenBeforeStartCard({ health_shared: true, tracked: [], other_starts: [] }, [], "player").show).toBe(false);
  });
  it("says Need more data until there's enough", () => {
    const c = bullpenBeforeStartCard({ health_shared: true, tracked: [f("2026-10-02")], other_starts: [f("2026-10-09"), f("2026-10-16")] }, [], "player");
    expect(c.show).toBe(true);
    expect(c.howSure).toBe("need_more_data");
  });
  it("compares without naming a cause", () => {
    const c = bullpenBeforeStartCard({ health_shared: false, tracked: [f("2026-10-02", { start_pitch_count: 70 }), f("2026-10-09", { start_pitch_count: 72 })], other_starts: [f("2026-10-16"), f("2026-10-23")] }, [], "coach");
    expect(c.howSure).toBe("hunch");
    expect(c.weSee).toContain("about 71 pitches");
    expect(c.because).toContain("doesn't show what caused");
    expect(c.because).toContain("Check-in answers aren't available here");
  });
  it("advises against pre-start bullpens when results trend worse", () => {
    const worse = { start_pitch_count: 60, days_completed_next3: 1 };
    const c = bullpenBeforeStartCard({ health_shared: false, tracked: [f("2026-10-02", worse), f("2026-10-09", worse)], other_starts: [f("2026-10-16"), f("2026-10-23")] }, [], "player");
    expect(c.doThis).toContain("Skip bullpens the day before a start");
    expect(c.howSure).toBe("hunch");
  });
  it("keeps the normal advice when only one measure is worse", () => {
    const c = bullpenBeforeStartCard({ health_shared: false, tracked: [f("2026-10-02", { start_pitch_count: 60 }), f("2026-10-09", { start_pitch_count: 60 })], other_starts: [f("2026-10-16"), f("2026-10-23")] }, [], "player");
    expect(c.doThis).not.toContain("Skip bullpens");
  });
});

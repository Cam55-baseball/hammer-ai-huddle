import { describe, it, expect, afterEach } from "vitest";
import { buildEassPrescription, type EassContext } from "@/lib/hammer/prescription/eassLibrary";
import { setOwnerPlanDrills } from "./ownerPlanDrills";
import { ownerThrowingProblems, THROWING_SLOT } from "./ownerThrowingDrills";

const drill = (o: Record<string, unknown> = {}) => ({
  id: "own-cp-1", name: "Owner catch play", active: true, placements: [THROWING_SLOT], sports: ["baseball"],
  cue: "Smooth", dosage: "", steps: [], equipment: [], fault_keys: [], overrides_drill_id: null, pinned: false,
  throw_steps: [{ ft: 45, throws: 8 }, { ft: 60, throws: 8 }, { ft: 90, throws: 8 }], throw_intent: "catch_light", throw_flight: "arc",
  throw_pulldowns: false, throw_contexts: ["catch_play"], throw_role_fit: ["position"],
  fit_levels: ["youth", "high_school", "college", "pro"], fit_age_bands: ["u13", "13_17", "18_plus"], ...o,
});
const ctx = (o: Partial<EassContext> = {}): EassContext => ({
  sport: "baseball", position: "infield", seasonPhase: "off", ageYears: 17, trainingAgeYears: 2, injuryRegions: [], armSore: false,
  isGameDay: false, isThrowingDay: true, isRecoveryDay: false, readinessScore: 0.9, catchPlay: { rawPosition: "SS", trainingDayIndex: 0 }, ...o,
});
const names = (c: EassContext) => buildEassPrescription(c).drills.map((d) => d.name);
afterEach(() => setOwnerPlanDrills([]));

describe("locked by owner Nov 5: owner throwing drills", () => {
  it("an owner catch-play drill appears for a matching position player on a throwing day", () => {
    setOwnerPlanDrills([drill() as never]);
    const n = names(ctx());
    expect(n.some((x) => x.startsWith("Owner catch play — "))).toBe(true);
    expect(n.some((x) => x.startsWith("Catch play — "))).toBe(false);
    const rows = buildEassPrescription(ctx()).drills.filter((d) => d.name.startsWith("Owner catch play"));
    expect(rows.every((d) => /^\d+ft x \d+ throws/.test(d.dosage))).toBe(true);
  });
  it("does not appear for a non-matching player (softball, pitcher-only fit, wrong context, wrong age band)", () => {
    for (const d of [drill({ sports: ["softball"] }), drill({ throw_role_fit: ["pitcher"] }), drill({ throw_contexts: ["long_toss"] }), drill({ fit_age_bands: ["u13"] })]) {
      setOwnerPlanDrills([d as never]);
      expect(names(ctx()).some((x) => x.startsWith("Owner catch play"))).toBe(false);
    }
  });
  it("never adds arm work: more throws or a longer distance than the built-in day keeps the ladder", () => {
    setOwnerPlanDrills([drill({ throw_steps: [{ ft: 45, throws: 50 }, { ft: 60, throws: 50 }] }) as never]);
    expect(names(ctx()).some((x) => x.startsWith("Owner catch play"))).toBe(false);
    setOwnerPlanDrills([drill({ throw_steps: [{ ft: 300, throws: 5 }] }) as never]);
    expect(names(ctx()).some((x) => x.startsWith("Owner catch play"))).toBe(false);
  });
  it("is switched off and incomplete drills never prescribe", () => {
    setOwnerPlanDrills([drill({ active: false }) as never]);
    expect(names(ctx()).some((x) => x.startsWith("Owner catch play"))).toBe(false);
    expect(ownerThrowingProblems(drill({ throw_steps: [], throw_intent: null }) as never)).toEqual(expect.arrayContaining(["at least one step (distance + throws)", "intent"]));
  });
});

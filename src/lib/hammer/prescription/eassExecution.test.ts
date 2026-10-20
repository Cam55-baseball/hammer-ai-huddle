import { describe, expect, it } from "vitest";
import { buildEassPrescription, type EassContext } from "./eassLibrary";

const base: EassContext = { sport: "baseball", position: "pitcher", seasonPhase: "in", ageYears: 16, trainingAgeYears: 2,
  injuryRegions: [], armSore: false, isGameDay: false, isThrowingDay: true, isRecoveryDay: false, readinessScore: 0.8 };
const pen = (c: Partial<EassContext>) => buildEassPrescription({ ...base, ...c }).drills.find((d) => d.name.startsWith("Full-go"));

describe("execution: pitching bullpen is full-go with counts, same pitch amounts", () => {
  it("baseball in-season: 20 pitches, counts + intent + logging", () => {
    const d = pen({});
    expect(d?.dosage).toBe("20 pitches to a target at 75%");
    expect(d?.cue).toContain("every pitch with intent");
    expect(d?.cue).toContain("write down your pitch count");
  });
  it("softball off-season: 30 pitches", () => {
    expect(pen({ sport: "softball", seasonPhase: "off" })?.dosage).toBe("30 pitches building spin efficiency");
  });
  it("game day / sore arm never gets a full-go bullpen", () => {
    expect(pen({ isGameDay: true })).toBeUndefined();
    expect(pen({ armSore: true })).toBeUndefined();
  });
});

import { describe, it, expect } from "vitest";
import { scorecard, trialsCsv, type LabMetric, type LabTrial } from "@/lib/validationLab/gates";

const cmj: LabMetric = { metric_key: "cmj_height_cm", unit: "cm", required_fps: 240, physical_min: 5, physical_max: 110, gt_tolerance: 2 };
const trial = (i: number, o: Partial<LabTrial> = {}): LabTrial => ({
  device_name: "Hawkin force plate", device_value: 40 + (i % 5), app_value: 40 + (i % 5) + (i % 2 ? 0.3 : -0.3),
  measured_fps: 240, detected: true, consistency_group: i < 3 ? "same-jump" : null, app_build: "1.0 (11)", ...o,
});
const twenty = Array.from({ length: 20 }, (_, i) => trial(i));

describe("Validation Lab five gates", () => {
  it("all five pass → ready to open", () => {
    const s = scorecard(cmj, twenty.map((t, i) => (i < 3 ? { ...t, app_value: 41.0 + i * 0.2 } : t)));
    expect(s.gates.map((g) => g.pass)).toEqual([true, true, true, true, true]);
    expect(s.ready).toBe(true);
  });

  it("G1 fails when any trial is below the required counted fps or has no counted fps", () => {
    expect(scorecard(cmj, [...twenty.slice(1), trial(0, { measured_fps: 120 })]).gates[0].pass).toBe(false);
    expect(scorecard(cmj, [...twenty.slice(1), trial(0, { measured_fps: null })]).gates[0].pass).toBe(false);
  });

  it("G2 needs 95% detected; G3 rejects a physically impossible value", () => {
    const missed = twenty.map((t, i) => (i < 2 ? { ...t, detected: false } : t));
    expect(scorecard(cmj, missed).gates[1].pass).toBe(false);
    expect(scorecard(cmj, [...twenty.slice(1), trial(0, { app_value: 140 })]).gates[2].pass).toBe(false);
  });

  it("G4 needs 20 paired trials and limits of agreement inside the tolerance", () => {
    expect(scorecard(cmj, twenty.slice(0, 19)).gates[3].pass).toBe(false);
    const biased = twenty.map((t) => ({ ...t, app_value: (t.device_value ?? 0) + 2.5 }));
    const s = scorecard(cmj, biased);
    expect(s.gates[3].pass).toBe(false);
    expect(s.bias).toBeCloseTo(2.5, 6);
  });

  it("G5: the same input three times must agree within the tolerance; no repeat group fails", () => {
    const spread = twenty.map((t, i) => (i < 3 ? { ...t, app_value: [40, 43, 41][i] } : t));
    expect(scorecard(cmj, spread).gates[4].pass).toBe(false);
    expect(scorecard(cmj, twenty.map((t) => ({ ...t, consistency_group: null }))).gates[4].pass).toBe(false);
  });

  it("CSV export has one row per trial with the difference", () => {
    const csv = trialsCsv(cmj, [trial(1)]).trim().split("\n");
    expect(csv).toHaveLength(2);
    expect(csv[1]).toContain("0.3");
  });
});

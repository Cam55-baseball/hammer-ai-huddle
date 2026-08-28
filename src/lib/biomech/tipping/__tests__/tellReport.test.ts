import { describe, expect, it } from "vitest";
import {
  buildTellReport,
  describeFinding,
  DEFAULT_TELL_CONFIG,
  TIPPING_DETECTION_ENABLED,
  type PitchObservation,
} from "../tellReport";

/**
 * Synthetic pitcher: energy angle genuinely differs by pitch type
 * (fastball ~10°, curveball ~20°), shoulder tilt genuinely does not
 * (both hover around 30° with the same wobble).
 */
function makeObservations(): PitchObservation[] {
  const fastball = [9.5, 10.2, 9.8, 10.5, 10.0];
  const curveball = [19.6, 20.4, 20.1, 19.9, 20.2];
  const tiltFb = [29.5, 30.4, 30.1, 29.8, 30.2];
  const tiltCb = [30.2, 29.6, 30.3, 29.9, 30.0];

  const rows: PitchObservation[] = [];
  fastball.forEach((v, i) =>
    rows.push({
      pitch_id: `fb-${i}`,
      pitch_type: "fastball",
      metrics: { energy_angle_deg: v, shoulder_tilt_deg: tiltFb[i] },
    }),
  );
  curveball.forEach((v, i) =>
    rows.push({
      pitch_id: `cb-${i}`,
      pitch_type: "curveball",
      metrics: { energy_angle_deg: v, shoulder_tilt_deg: tiltCb[i] },
    }),
  );
  return rows;
}

describe("tipping tell report", () => {
  it("stays behind the kill switch", () => {
    expect(TIPPING_DETECTION_ENABLED).toBe(false);
  });

  it("flags a metric that genuinely differs by pitch type", () => {
    const report = buildTellReport("p1", makeObservations());
    const energy = report.findings.find((f) => f.metric === "energy_angle_deg")!;
    expect(energy.verdict).toBe("likely_tell");
    expect(energy.separation_ratio!).toBeGreaterThan(DEFAULT_TELL_CONFIG.separation_threshold);
    expect(energy.max_mean_gap!).toBeGreaterThan(9);
    expect(report.likely_tells).toContain("energy_angle_deg");
  });

  it("does not flag a metric that is the same across pitch types", () => {
    const report = buildTellReport("p1", makeObservations());
    const tilt = report.findings.find((f) => f.metric === "shoulder_tilt_deg")!;
    expect(tilt.verdict).toBe("no_tell");
    expect(tilt.separation_ratio!).toBeLessThan(DEFAULT_TELL_CONFIG.separation_threshold);
    expect(report.likely_tells).not.toContain("shoulder_tilt_deg");
  });

  it("returns indeterminate rather than a verdict when only one pitch type exists", () => {
    const rows = makeObservations().filter((o) => o.pitch_type === "fastball");
    const report = buildTellReport("p1", rows);
    const energy = report.findings.find((f) => f.metric === "energy_angle_deg")!;
    expect(energy.verdict).toBe("indeterminate");
    expect(energy.reason).toBe("not_enough_pitch_types");
    expect(energy.separation_ratio).toBeNull();
  });

  it("returns indeterminate when a type has too few pitches", () => {
    const rows = makeObservations().filter(
      (o) => o.pitch_type === "fastball" || o.pitch_id === "cb-0",
    );
    const report = buildTellReport("p1", rows);
    const energy = report.findings.find((f) => f.metric === "energy_angle_deg")!;
    expect(energy.verdict).toBe("indeterminate");
    expect(energy.reason).toBe("not_enough_pitches_per_type");
  });

  it("drops missing values instead of imputing them", () => {
    const rows = makeObservations().map((o, i) =>
      i === 0 ? { ...o, metrics: { ...o.metrics, energy_angle_deg: null } } : o,
    );
    const report = buildTellReport("p1", rows);
    const energy = report.findings.find((f) => f.metric === "energy_angle_deg")!;
    expect(energy.pitches_dropped_missing).toBe(1);
    expect(energy.pitches_used).toBe(9);
  });

  it("refuses an infinite ratio when there is no within-type variation", () => {
    const rows: PitchObservation[] = [
      ...[0, 1, 2].map((i) => ({
        pitch_id: `fb-${i}`,
        pitch_type: "fastball",
        metrics: { energy_angle_deg: 10, shoulder_tilt_deg: 30 },
      })),
      ...[0, 1, 2].map((i) => ({
        pitch_id: `cb-${i}`,
        pitch_type: "curveball",
        metrics: { energy_angle_deg: 20, shoulder_tilt_deg: 30 },
      })),
    ];
    const report = buildTellReport("p1", rows);
    for (const f of report.findings) {
      expect(f.verdict).toBe("indeterminate");
      expect(f.reason).toBe("no_within_type_variation");
      expect(f.separation_ratio).toBeNull();
    }
  });

  it("describes findings without certainty language", () => {
    const report = buildTellReport("p1", makeObservations());
    const lines = report.findings.map(describeFinding);
    expect(lines.join(" ")).toContain("likely tell");
    expect(lines.join(" ")).toContain("no tell");
  });
});

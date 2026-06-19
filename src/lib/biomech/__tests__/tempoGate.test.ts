import { describe, expect, it } from "vitest";
import { evaluateTempoGate } from "../gates/tempoGate";
import { computeTempoSec } from "../metrics/tempoSec";
import { generateTempoCalibrationCertificate } from "../calibration/tempoCalibration";
import { runTempoValidationHarness } from "../validation/tempoHarness";

describe("Phase 26 — tempo production gate", () => {
  it("emits 'missing' when metric is missing", async () => {
    const metric = computeTempoSec({
      peak_leg_lift_frame_index: null,
      front_foot_strike_frame_index: 90,
      fps_true: 60,
    });
    const cert = await generateTempoCalibrationCertificate(
      await runTempoValidationHarness([]),
    );
    const g = evaluateTempoGate(metric, cert);
    expect(g.decision).toBe("missing");
    expect(g.reason).toBe("metric_missing");
  });

  it("emits 'block' when value present but calibration absent", async () => {
    const metric = computeTempoSec({
      peak_leg_lift_frame_index: 30,
      front_foot_strike_frame_index: 90,
      fps_true: 60,
    });
    const cert = await generateTempoCalibrationCertificate(
      await runTempoValidationHarness([]),
    );
    const g = evaluateTempoGate(metric, cert);
    expect(g.decision).toBe("block");
    expect(g.reason).toBe("uncalibrated");
  });

  it("emits 'pass' / 'fail' against threshold once calibrated", async () => {
    const pairs = Array.from({ length: 30 }, (_, i) => ({
      clip_id: `c${String(i).padStart(4, "0")}`,
      predicted_sec: 1.0,
      ground_truth_sec: 1.0,
    }));
    const cert = await generateTempoCalibrationCertificate(
      await runTempoValidationHarness(pairs),
    );

    const pass = computeTempoSec({
      peak_leg_lift_frame_index: 0,
      front_foot_strike_frame_index: 60,
      fps_true: 60,
    }); // 1.0s
    const fail = computeTempoSec({
      peak_leg_lift_frame_index: 0,
      front_foot_strike_frame_index: 90,
      fps_true: 60,
    }); // 1.5s

    expect(evaluateTempoGate(pass, cert).decision).toBe("pass");
    expect(evaluateTempoGate(fail, cert).decision).toBe("fail");
  });
});

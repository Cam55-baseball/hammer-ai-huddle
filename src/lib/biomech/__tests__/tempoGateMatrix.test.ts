import { describe, it, expect } from "vitest";
import { evaluateTempoGateMatrix } from "../gates/tempoGateMatrix";

const pipeline_inputs = {
  video_sha256_hex: "c".repeat(64),
  fps_true: 60,
  landing_time_sec: null,
  direction_sign: 1 as const,
  calibration_h_px: 1080,
  pose_frames: [],
};

describe("evaluateTempoGateMatrix", () => {
  it("passes determinism, replay-equivalence and missingness-fidelity gates today", async () => {
    const r = await evaluateTempoGateMatrix({
      pipeline_inputs,
      validation_pairs: [],
    });
    expect(r.gates.determinism.outcome).toBe("pass");
    expect(r.gates.replay_equivalence.outcome).toBe("pass");
    expect(r.gates.missingness_fidelity.outcome).toBe("pass");
  });

  it("blocks validation, calibration and confidence-calibration gates over an empty corpus", async () => {
    const r = await evaluateTempoGateMatrix({
      pipeline_inputs,
      validation_pairs: [],
    });
    expect(r.gates.validation.outcome).toBe("block");
    expect(r.gates.validation.reason).toBe("no_corpus");
    expect(r.gates.calibration.outcome).toBe("block");
    expect(r.gates.confidence_calibration.outcome).toBe("block");
    expect(r.all_pass).toBe(false);
    expect(r.blocking_gates).toContain("validation");
    expect(r.blocking_gates).toContain("calibration");
    expect(r.blocking_gates).toContain("confidence_calibration");
  });

  it("value gate decision is `missing` when D-POSE stub propagates missingness", async () => {
    const r = await evaluateTempoGateMatrix({
      pipeline_inputs,
      validation_pairs: [],
    });
    expect(r.value_gate.decision).toBe("missing");
  });

  it("all_pass is statically false at Phase 27 (no honest path to true)", async () => {
    const r = await evaluateTempoGateMatrix({
      pipeline_inputs,
      validation_pairs: [],
    });
    expect(r.all_pass).toBe(false);
  });
});

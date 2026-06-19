import { describe, it, expect } from "vitest";
import { tempoEvidenceToTileState } from "../reportCard/tempoTileAdapter";
import { evaluateTempoGateMatrix } from "../gates/tempoGateMatrix";
import { runTempoPipeline } from "../pipeline/tempoPipeline";

const pipeline_inputs = {
  video_sha256_hex: "d".repeat(64),
  fps_true: 60,
  landing_time_sec: null,
  direction_sign: 1 as const,
  calibration_h_px: 1080,
  pose_frames: [],
};

describe("tempoEvidenceToTileState", () => {
  it("maps stub-blocked evidence to a `missing` tile carrying the canonical reason", async () => {
    const pipe = await runTempoPipeline(pipeline_inputs);
    const matrix = await evaluateTempoGateMatrix({
      pipeline_inputs,
      validation_pairs: [],
    });
    const tile = tempoEvidenceToTileState({
      evidence: pipe.evidence,
      gate_matrix: matrix,
    });
    expect(tile.status).toBe("missing");
    expect(typeof tile.missing_reason).toBe("string");
    // Pose model is stubbed → at minimum a canonical missingness reason surfaces.
    expect(tile.missing_reason?.length ?? 0).toBeGreaterThan(0);
  });

  it("never fabricates a confidence number", async () => {
    const pipe = await runTempoPipeline(pipeline_inputs);
    const matrix = await evaluateTempoGateMatrix({
      pipeline_inputs,
      validation_pairs: [],
    });
    const tile = tempoEvidenceToTileState({
      evidence: pipe.evidence,
      gate_matrix: matrix,
    });
    expect(tile.confidence).toBeUndefined();
  });
});

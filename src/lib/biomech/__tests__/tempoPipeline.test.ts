import { describe, it, expect } from "vitest";
import { runTempoPipeline } from "../pipeline/tempoPipeline";
import { MISSINGNESS_REASONS } from "../metrics/missingness";

const baseInputs = {
  video_sha256_hex: "a".repeat(64),
  fps_true: 60,
  landing_time_sec: null,
  direction_sign: 1 as const,
  calibration_h_px: 1080,
  pose_frames: [],
};

describe("runTempoPipeline", () => {
  // D-POSE is no longer stubbed — LANDMARK_MODEL_VERSION now binds the real
  // MediaPipe BlazePose build, so POSE_MODEL_IS_STUB can never be emitted. With
  // no pose frames the honest reason is POSE_NOT_DETECTED. The end-to-end
  // guarantee under test is unchanged: no anchor, no value, reason preserved.
  it("emits canonical pose missingness end-to-end when no pose frames are detected", async () => {
    const r = await runTempoPipeline(baseInputs);
    expect(r.metric.value).toBeNull();
    expect(r.metric.missingness?.missing_reason).toBe(
      MISSINGNESS_REASONS.PEAK_LEG_LIFT_MISSING,
    );
    expect(r.evidence.anchors.peak_leg_lift.missingness?.missing_reason).toBe(
      MISSINGNESS_REASONS.POSE_NOT_DETECTED,
    );
    expect(r.evidence.anchors.front_foot_strike.missingness?.missing_reason).toBe(
      MISSINGNESS_REASONS.FRONT_FOOT_FIRST_CONTACT_MISSING,
    );
  });

  it("produces byte-identical evidence_sha256 across two runs with identical inputs", async () => {
    const a = await runTempoPipeline(baseInputs);
    const b = await runTempoPipeline(baseInputs);
    expect(a.evidence.evidence_sha256_hex).toBe(b.evidence.evidence_sha256_hex);
    expect(a.evidence.cache_fingerprint_hex).toBe(b.evidence.cache_fingerprint_hex);
  });

  it("changes evidence_sha256 when inputs change (no spurious stability)", async () => {
    const a = await runTempoPipeline(baseInputs);
    const b = await runTempoPipeline({ ...baseInputs, fps_true: 30 });
    expect(a.evidence.evidence_sha256_hex).not.toBe(
      b.evidence.evidence_sha256_hex,
    );
  });
});

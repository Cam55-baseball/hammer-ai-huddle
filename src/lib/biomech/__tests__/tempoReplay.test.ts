import { describe, it, expect } from "vitest";
import { runTempoReplayEquivalenceHarness } from "../replay/tempoReplay";

const inputs = {
  video_sha256_hex: "b".repeat(64),
  fps_true: 120,
  landing_time_sec: 0.5,
  direction_sign: -1 as const,
  calibration_h_px: 720,
  pose_frames: [],
};

describe("runTempoReplayEquivalenceHarness", () => {
  it("reports equivalent when the deterministic pipeline is deterministic", async () => {
    const r = await runTempoReplayEquivalenceHarness(inputs);
    expect(r.status).toBe("equivalent");
    expect(r.divergence_field).toBeNull();
    expect(r.evidence_sha256_hex_a).toBe(r.evidence_sha256_hex_b);
    expect(r.cache_fingerprint_hex).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns exactly two runs", async () => {
    const r = await runTempoReplayEquivalenceHarness(inputs);
    expect(r.run_count).toBe(2);
  });
});

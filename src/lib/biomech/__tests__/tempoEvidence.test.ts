import { describe, expect, it } from "vitest";
import { buildTempoEvidence } from "../evidence/tempoEvidence";
import { computeTempoSec } from "../metrics/tempoSec";
import { findPeakLegLiftFrame } from "../anchors/peakLegLift";
import { findFrontFootStrikeFrame } from "../anchors/frontFootStrike";

describe("Phase 26 — tempo evidence artifact", () => {
  const baseInputs = {
    video_sha256_hex: "a".repeat(64),
    fps_true: 60,
    landing_time_sec: 1.2,
    direction_sign: 1 as const,
    calibration_h_px: 612.5,
  };

  it("is byte-identical across repeated builds (D-6 replay stability)", async () => {
    const peak = findPeakLegLiftFrame([]);
    const strike = findFrontFootStrikeFrame([]);
    const metric = computeTempoSec({
      peak_leg_lift_frame_index: 30,
      front_foot_strike_frame_index: 90,
      fps_true: 60,
    });

    const artifacts = await Promise.all(
      Array.from({ length: 5 }, () =>
        buildTempoEvidence({
          ...baseInputs,
          peak_leg_lift: peak,
          front_foot_strike: strike,
          metric,
        }),
      ),
    );
    const hashes = new Set(artifacts.map((a) => a.evidence_sha256_hex));
    expect(hashes.size).toBe(1);
  });

  it("changes evidence hash when any input changes", async () => {
    const peak = findPeakLegLiftFrame([]);
    const strike = findFrontFootStrikeFrame([]);
    const m1 = computeTempoSec({
      peak_leg_lift_frame_index: 30,
      front_foot_strike_frame_index: 90,
      fps_true: 60,
    });
    const m2 = computeTempoSec({
      peak_leg_lift_frame_index: 30,
      front_foot_strike_frame_index: 91,
      fps_true: 60,
    });
    const a1 = await buildTempoEvidence({
      ...baseInputs,
      peak_leg_lift: peak,
      front_foot_strike: strike,
      metric: m1,
    });
    const a2 = await buildTempoEvidence({
      ...baseInputs,
      peak_leg_lift: peak,
      front_foot_strike: strike,
      metric: m2,
    });
    expect(a1.evidence_sha256_hex).not.toBe(a2.evidence_sha256_hex);
  });

  it("binds engine_version and cache_fingerprint into the artifact", async () => {
    const peak = findPeakLegLiftFrame([]);
    const strike = findFrontFootStrikeFrame([]);
    const metric = computeTempoSec({
      peak_leg_lift_frame_index: 30,
      front_foot_strike_frame_index: 90,
      fps_true: 60,
    });
    const a = await buildTempoEvidence({
      ...baseInputs,
      peak_leg_lift: peak,
      front_foot_strike: strike,
      metric,
    });
    expect(a.engine_version.landmark_model).toMatch(/^blazepose_full@/);
    expect(a.engine_version.detector).toMatch(/^events@/);
    expect(a.engine_version.metric_engine).toMatch(/^metrics@/);
    expect(a.cache_fingerprint_hex).toMatch(/^[0-9a-f]{64}$/);
    expect(a.evidence_sha256_hex).toMatch(/^[0-9a-f]{64}$/);
  });
});

import { describe, expect, it } from "vitest";
import { computeTempoSec } from "../metrics/tempoSec";

describe("Phase 26 — tempo_sec metric engine", () => {
  it("computes (strike − lift) / fps_true deterministically", () => {
    const r = computeTempoSec({
      peak_leg_lift_frame_index: 30,
      front_foot_strike_frame_index: 90,
      fps_true: 60,
    });
    expect(r.value).toBe(1.0);
    expect(r.unit).toBe("seconds");
    expect(r.missingness).toBeNull();
    expect(r.confidence.status).toBe("uncalibrated");
    expect(r.confidence.value).toBeNull();
    expect(r.lineage.delta_frames).toBe(60);
  });

  it("is byte-identical across repeated calls", () => {
    const inputs = {
      peak_leg_lift_frame_index: 33,
      front_foot_strike_frame_index: 92,
      fps_true: 59.94,
    } as const;
    const runs = Array.from({ length: 10 }, () => computeTempoSec(inputs));
    const set = new Set(runs.map((r) => JSON.stringify(r)));
    expect(set.size).toBe(1);
  });

  it("emits canonical missingness when peak leg lift absent", () => {
    const r = computeTempoSec({
      peak_leg_lift_frame_index: null,
      front_foot_strike_frame_index: 90,
      fps_true: 60,
    });
    expect(r.value).toBeNull();
    expect(r.missingness?.missing_reason).toBe("peak_leg_lift_missing");
    expect(r.confidence.status).toBe("missing");
  });

  it("emits canonical missingness when front-foot strike absent", () => {
    const r = computeTempoSec({
      peak_leg_lift_frame_index: 30,
      front_foot_strike_frame_index: null,
      fps_true: 60,
    });
    expect(r.missingness?.missing_reason).toBe("front_foot_first_contact_missing");
  });

  it("emits insufficient_temporal_resolution when fps_true invalid", () => {
    const r = computeTempoSec({
      peak_leg_lift_frame_index: 30,
      front_foot_strike_frame_index: 90,
      fps_true: 0,
    });
    expect(r.missingness?.missing_reason).toBe(
      "insufficient_temporal_resolution",
    );
  });

  it("emits missingness when delta is non-positive (structurally impossible)", () => {
    const r = computeTempoSec({
      peak_leg_lift_frame_index: 90,
      front_foot_strike_frame_index: 90,
      fps_true: 60,
    });
    expect(r.value).toBeNull();
    expect(r.missingness).not.toBeNull();
  });

  it("never fabricates confidence", () => {
    const r = computeTempoSec({
      peak_leg_lift_frame_index: 0,
      front_foot_strike_frame_index: 60,
      fps_true: 60,
    });
    expect(r.confidence.value).toBeNull();
    expect(r.confidence.certificate_hash).toBeNull();
  });
});

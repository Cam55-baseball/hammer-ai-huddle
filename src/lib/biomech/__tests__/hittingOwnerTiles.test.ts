import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { decodeLandmarkSeriesText, type LandmarkSeries } from "../pose/landmarkSeriesFormat";
import { runHittingOwnerTiles, HIP_DEADBAND_DEG } from "../metrics/hittingOwnerTiles";
import { rearThighAngleDeg } from "../anchors/poseKinematics";

const load = (n: string): LandmarkSeries => decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "fixtures", n))).toString("utf8"));
const still = load("still-subject-15d75bc9.ndjson.gz");
const swing = load("motion-hitting-edf45130.ndjson.gz");
// Two real 24 fps owner uploads (2026-09-27 01:42:27 and 01:59:21), pose on every frame.
const clipA = load("swing-24fps-914cf54c.ndjson.gz");
const clipB = load("swing-24fps-9d2e117e.ndjson.gz");

describe("tiles 19 + 20 — still clip must be missing", () => {
  for (const side of ["L", "R", null] as const) {
    for (const athlete_height_in of [70, null]) {
      it(`side=${side} height=${athlete_height_in}`, () => {
        const r = runHittingOwnerTiles(still, { side, athlete_height_in });
        expect(r.tile19.missingness).not.toBeNull();
        expect(r.tile19.verdict).toBeNull();
        expect(r.tile20.missingness).not.toBeNull();
        expect(r.tile20.verdict).toBeNull();
        expect(r.anchors.d_coil.frame_index).toBeNull();
        expect(r.anchors.front_foot_plant?.frame_index ?? null).toBeNull();
      });
    }
  }

  // KNOWN GAP, recorded not hidden: the 3.0° deadband was sized on the hip-LINE
  // angle. The D-COIL proxy (rear thigh angle) is a different signal; on the
  // still clip its range is 2.53° (left) but 3.35° (right) — ABOVE the deadband.
  it("records the proxy's still-clip range against the 3.0° deadband", () => {
    const range = (rear: "left" | "right") => {
      const v = still.frames.map((f) => rearThighAngleDeg(still, f, rear, 1)).filter((x): x is number => x != null);
      expect(v.length).toBeGreaterThan(300);
      return Math.max(...v) - Math.min(...v);
    };
    expect(range("left")).toBeLessThan(HIP_DEADBAND_DEG);
    expect(range("right")).toBeCloseTo(3.35, 1);
    expect(range("right")).toBeGreaterThan(HIP_DEADBAND_DEG);
  });
});

describe("tiles 19 + 20 — unreliable-track swing clip", () => {
  it("is deterministic across three runs and refuses with a stated reason", () => {
    for (const side of ["L", "R"] as const) {
      const runs = [0, 1, 2].map(() => JSON.stringify(runHittingOwnerTiles(swing, { side, athlete_height_in: 70 })));
      expect(new Set(runs).size).toBe(1);
      const r = runHittingOwnerTiles(swing, { side, athlete_height_in: 70 });
      // Fixture header: subject_track_reliable=false (76 of 185 frames lost).
      for (const t of [r.tile19, r.tile20]) {
        expect(t.verdict).toBeNull();
        expect(t.missingness).not.toBeNull();
      }
    }
  });
});

describe("24 fps real clips — ordinary phone rate is not a refusal", () => {
  it("clip 914cf54c filed Left: plant found after the lift, both tiles return values", () => {
    const r = runHittingOwnerTiles(clipA, { side: "L", athlete_height_in: 70 });
    expect(r.direction_sign).toBe(-1);
    expect(r.anchors.peak_leg_lift?.frame_index).toBe(177);
    expect(r.anchors.front_foot_plant?.frame_index).toBe(184);
    expect(r.anchors.front_foot_plant?.anchor_uncertainty_ms).toBeCloseTo(41.6667, 3);
    expect(r.anchors.p4_start.frame_index).toBe(188);
    expect(r.tile19.missingness).toBeNull();
    expect(r.tile19.verdict).not.toBeNull();
    expect(r.tile20.missingness).toBeNull();
    expect(r.tile20.verdict).not.toBeNull();
  });
  it("a tile that still refuses keeps the anchor's real reason", () => {
    const r = runHittingOwnerTiles(clipB, { side: "L", athlete_height_in: 70 });
    expect(r.tile19.lineage.reason).toBe("hand_load_apex_missing");
    expect((r.tile19.lineage.upstream_diagnostics as { reason: string }).reason).toBe("no_confirmed_rear_extremum");
  });
  it("unknown side never picks a foot", () => {
    const r = runHittingOwnerTiles(clipA, { side: null, athlete_height_in: 70 });
    expect(r.anchors.front_foot_plant).toBeNull();
    expect(r.tile19.verdict).toBeNull();
  });
  it("is byte-identical across runs", () => {
    const a = JSON.stringify(runHittingOwnerTiles(clipA, { side: "L", athlete_height_in: 70 }));
    expect(JSON.stringify(runHittingOwnerTiles(clipA, { side: "L", athlete_height_in: 70 }))).toBe(a);
  });
  // REFERENCE RESULTS — owner confirmed both clips are LEFT-handed (2026-09-27).
  it("clip 914cf54c Left: owner-confirmed reference values", () => {
    const r = runHittingOwnerTiles(clipA, { side: "L", athlete_height_in: 70 });
    expect(r.tile19.verdict).toBe("fail");
    expect(r.tile19.channels.midline_crossed_19a.value).toBe(true);
    expect(r.tile19.channels.forward_in_19b.value).toBeCloseTo(5.329, 4);
    expect(r.tile19.channels.forward_in_19b.ci_low_in).toBeCloseTo(4.3478, 4);
    expect(r.tile19.channels.forward_in_19b.ci_high_in).toBeCloseTo(6.2978, 4);
    expect(r.tile19.channels.angle_from_vertical_deg_19c.value).toBeCloseTo(37.5742, 4);
    expect(r.tile20.verdict).toBe("fail");
    expect(r.tile20.outputs.held_or_increased_20a.value).toBe(false);
    expect(r.tile20.outputs.end_of_p3_vs_floor_deg_20b.value).toBeCloseTo(5.6301, 4);
    expect(r.tile20.outputs.first_drop_20c.value).toEqual({ frame_index: 131, preceded_p4: true });
    expect(r.tile20.lineage.floor_deg).toBeCloseTo(-4.7668, 4);
  });
  it("clip 9d2e117e Left: refuses tiles with its real reason (reference)", () => {
    const r = runHittingOwnerTiles(clipB, { side: "L", athlete_height_in: 70 });
    expect(r.tile19.verdict).toBeNull();
    expect(r.tile20.verdict).toBeNull();
  });
});

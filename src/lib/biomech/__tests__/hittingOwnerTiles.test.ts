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

describe("tiles 19 + 20 — still clip must be missing", () => {
  for (const direction_sign of [1, -1, null] as const) {
    for (const athlete_height_in of [70, null]) {
      it(`dir=${direction_sign} height=${athlete_height_in}`, () => {
        const r = runHittingOwnerTiles(still, { direction_sign, athlete_height_in });
        expect(r.tile19.missingness).not.toBeNull();
        expect(r.tile19.verdict).toBeNull();
        expect(r.tile20.missingness).not.toBeNull();
        expect(r.tile20.verdict).toBeNull();
        expect(r.anchors.d_coil.frame_index).toBeNull();
      });
    }
  }

  it("the 3.0° deadband covers the proxy's own still-clip range", () => {
    for (const rear of ["left", "right"] as const) {
      const v = still.frames.map((f) => rearThighAngleDeg(still, f, rear, 1)).filter((x): x is number => x != null);
      expect(v.length).toBeGreaterThan(300);
      expect(Math.max(...v) - Math.min(...v)).toBeLessThan(HIP_DEADBAND_DEG);
    }
  });
});

describe("tiles 19 + 20 — swing clip", () => {
  it("is deterministic across three runs and refuses with a stated reason", () => {
    for (const direction_sign of [1, -1] as const) {
      const runs = [0, 1, 2].map(() => JSON.stringify(runHittingOwnerTiles(swing, { direction_sign, athlete_height_in: 70 })));
      expect(new Set(runs).size).toBe(1);
      const r = runHittingOwnerTiles(swing, { direction_sign, athlete_height_in: 70 });
      // Fixture header: subject_track_reliable=false (76 of 185 frames lost).
      for (const t of [r.tile19, r.tile20]) {
        expect(t.verdict).toBeNull();
        expect(t.missingness?.missing_reason).toBe("pose_not_detected");
      }
    }
  });
});

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { decodeLandmarkSeriesText } from "../pose/landmarkSeriesFormat";
import { detectStanceLock } from "../anchors/stanceLock";
import { fuseShoulderOpen, shoulderSignals, SHOULDER_FUSION_FLOORS as F } from "../metrics/shoulderOpenFusion";
import { median } from "../anchors/poseKinematics";

const still = decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "fixtures", "still-subject-15d75bc9.ndjson.gz"))).toString("utf8"));
const lock = detectStanceLock(still, { before_frame: 1e9 });

describe("shoulder fusion on the still clip", () => {
  it("never produces a fail (two agreeing opening votes) on any frame, either side", () => {
    for (const [side, dir] of [["R", 1], ["L", -1]] as const)
      for (let k = 1; k < still.frames.length - 1; k++) expect(fuseShoulderOpen(still, lock, k, dir, side).verdict).not.toBe("fail");
  });
  it("floors match the measured p99 (width, offset)", () => {
    const w = still.frames.map((f) => shoulderSignals(still, f, lock, 1, "R").width).filter((v): v is number => v != null);
    const b = median(w)!; const d = w.map((v) => Math.abs(v - b)).sort((a, c) => a - c);
    expect(d[Math.round(0.99 * (d.length - 1))]).toBeLessThanOrEqual(F.width_pct);
  });
  it("far-shoulder visibility is saturated (excluded signal)", () => {
    const v = still.frames.filter((f) => f.pose_detected).map((f) => Math.min(f.visibility[11], f.visibility[12]));
    expect(Math.min(...v)).toBeGreaterThan(0.99);
  });
  it("deterministic", () => {
    expect(JSON.stringify(fuseShoulderOpen(still, lock, 100, 1, "R"))).toBe(JSON.stringify(fuseShoulderOpen(still, lock, 100, 1, "R")));
  });
});

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { decodeLandmarkSeriesText } from "../pose/landmarkSeriesFormat";
import { runHittingPoseTiles } from "../metrics/hittingPoseTiles";
import { detectCameraView, checkCameraRequirement } from "../camera/cameraView";
import { runPitchingTiles, ENERGY_ANGLE_ORIGIN } from "../metrics/pitchingTiles";

const load = (n: string) => decodeLandmarkSeriesText(gunzipSync(readFileSync(join(__dirname, "fixtures", n))).toString("utf8"));
const still = load("still-subject-15d75bc9.ndjson.gz");
const clipA = load("swing-24fps-914cf54c.ndjson.gz");
const clipB = load("swing-24fps-9d2e117e.ndjson.gz");

describe("camera view", () => {
  it("side-on fixtures read side_on; 9d2e117e is undetermined", () => {
    expect(detectCameraView(still).view).toBe("side_on");
    expect(detectCameraView(clipA).view).toBe("side_on");
    expect(detectCameraView(clipB).view).toBeNull();
  });
  it("mismatch refuses with an actionable message; undetermined proceeds", () => {
    expect(checkCameraRequirement("premature_shoulder_open_deg", "side_on").ok).toBe(false);
    expect(checkCameraRequirement("premature_shoulder_open_deg", null).ok).toBe(true);
    expect(checkCameraRequirement("stride_direction", "on_line").detail).toBe("camera_view_mismatch:needs_two_view_pair");
  });
});

describe("hitting pose tiles", () => {
  it("still clip refuses everything", () => {
    for (const side of ["L", "R", null] as const) {
      const r = runHittingPoseTiles(still, { side });
      for (const t of [r.hip_load, r.hands_outside_shoulders_at_landing, r.stride_direction]) { expect(t.value).toBeNull(); expect(t.missingness).not.toBeNull(); }
    }
  });
  it("914cf54c Left — owner-confirmed clip reference values", () => {
    const r = runHittingPoseTiles(clipA, { side: "L" });
    expect(r.hip_load.value).toBe(-12.1211);
    expect(r.hip_load.verdict).toBeNull();
    expect(r.hands_outside_shoulders_at_landing.value).toBe(-2.3543);
    expect(r.hands_outside_shoulders_at_landing.verdict).toBe("pass");
    expect(r.stride_direction.lineage.reason).toBe("camera_view_mismatch:needs_two_view_pair");
  });
  it("deterministic", () => {
    expect(JSON.stringify(runHittingPoseTiles(clipA, { side: "L" }))).toBe(JSON.stringify(runHittingPoseTiles(clipA, { side: "L" })));
  });
});

describe("energy angle origin", () => {
  it("is the back ankle, recorded in lineage", () => {
    expect(ENERGY_ANGLE_ORIGIN).toBe("back_ankle");
    expect(runPitchingTiles(still, { throwing_side: "R" }).energy_angle_deg.lineage.origin).toBe("back_ankle");
  });
});

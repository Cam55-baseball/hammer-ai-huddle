import { describe, expect, it } from "vitest";
import {
  detectAllPoseEvents, detectFinish, detectFirstMove, detectLoadApex, detectP4,
  detectReleasePoseOnly, detectStill, detectSwingStart, isStill,
} from "../anchors/poseEvents";
import { DETECTOR_VERSIONS, isDetectorStubbed } from "../detectorVersions";
import type { LandmarkSeries, LandmarkSeriesFrame } from "../pose/landmarkSeriesFormat";

type P = Record<number, [number, number]>;
function frame(i: number, fps: number, pts: P, hidden: number[] = []): LandmarkSeriesFrame {
  const normalized = new Array(99).fill(0.5);
  const visibility = new Array(33).fill(0.95);
  for (const [k, [x, y]] of Object.entries(pts)) { normalized[+k * 3] = x; normalized[+k * 3 + 1] = y; }
  for (const h of hidden) visibility[h] = 0.1;
  return { frame_index: i, timestamp_seconds: Math.round((i / fps) * 1e6) / 1e6, pose_detected: true, normalized, world: new Array(99).fill(0), visibility };
}
function series(frames: LandmarkSeriesFrame[], fps: number): LandmarkSeries {
  return { header: { format: "ndjson.gz@1", video_sha256_hex: "a".repeat(64), landmark_model_id: "blazepose_full", landmark_model_version: "blazepose_full@0.10.35-mediapipe-tasks-vision", fps_true: fps, fps_source: "measured_rvfc", width: 1080, height: 1920, orientation: "portrait", frame_count: frames.length, window_start_frame: 0, window_end_frame: frames.length - 1, window_start_sec: 0, window_end_sec: frames.length / fps, window_rule: "test", inference_width: 540, inference_height: 960, landmark_count: 33 }, frames };
}
function body(dx: number, dy: number): P {
  const b: P = { 11: [0.45, 0.3], 12: [0.55, 0.3], 13: [0.43, 0.42], 14: [0.57, 0.42], 15: [0.44, 0.52], 16: [0.56, 0.52], 23: [0.47, 0.58], 24: [0.53, 0.58], 25: [0.47, 0.74], 26: [0.53, 0.74], 27: [0.47, 0.9], 28: [0.53, 0.9] };
  for (const k of Object.keys(b)) b[+k] = [b[+k][0] + dx, b[+k][1] + dy];
  return b;
}

/** Pitch: still 0–29, drift 30–89 with a right-arm throw peaking at 70, still after. */
function pitch(fps = 60, hideFrom?: [number, number]): LandmarkSeries {
  const fr: LandmarkSeriesFrame[] = [];
  for (let k = 0; k < 130; k++) {
    const d = k < 30 ? 0 : k < 90 ? 0.008 * (k - 30) : 0.008 * 60;
    const b = body(d, 0);
    {
      const sx = b[12][0], sy = b[12][1];
      const wx = sx + 0.02 + 0.12 * Math.tanh((k - 70) / 3);
      const wy = sy + 0.05;
      const bend = Math.min(0.06, Math.abs(k - 70) * 0.01);
      b[16] = [wx, wy];
      b[14] = [(sx + wx) / 2, (sy + wy) / 2 + bend];
    }
    const hidden = hideFrom && k >= hideFrom[0] && k <= hideFrom[1] ? [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28] : [];
    fr.push(frame(k, fps, b, hidden));
  }
  return series(fr, fps);
}

/** Swing, direction +1: still 0–29, load back 30–50, forward swing 51–70, still after. */
function swing(fps = 60): LandmarkSeries {
  const fr: LandmarkSeriesFrame[] = [];
  for (let k = 0; k < 120; k++) {
    const dy = k < 30 ? 0 : k <= 70 ? 0.006 * (k - 30) : 0.006 * 40;
    const b = body(0, dy);
    const hx = k < 30 ? 0 : k <= 50 ? -0.004 * (k - 30) : k <= 70 ? -0.08 + 0.0008 * (k - 50) ** 2 : -0.08 + 0.0008 * 400;
    b[15] = [b[15][0] + hx, b[15][1]];
    b[16] = [b[16][0] + hx, b[16][1]];
    const ex = k < 57 ? 0 : k <= 70 ? 0.02 * (k - 57) : 0.26;
    b[13] = [b[13][0] + ex, b[13][1]];
    const rot = k < 55 ? 0 : k <= 70 ? 0.01 * (k - 55) : 0.15;
    b[12] = [b[12][0], b[12][1] + rot];
    fr.push(frame(k, fps, b));
  }
  return series(fr, fps);
}

describe("pose-derived anchors", () => {
  it("each built anchor has its own real version; ball release stays stubbed; D-COIL is a real proxy", () => {
    for (const id of ["D-STILL", "D-FIRST-MOVE", "D-RELEASE-POSE", "D-LOAD-APEX", "D-SWING-START", "D-P4", "D-FINISH"] as const) {
      expect(isDetectorStubbed(id)).toBe(false);
    }
    expect(isDetectorStubbed("D-COIL")).toBe(false);
    expect(isDetectorStubbed("D-RELEASE")).toBe(true);
    expect(DETECTOR_VERSIONS["D-BAT"]).toMatch(/-stub$/);
  });

  it("D-STILL / D-FIRST-MOVE find stance and the exit from it", () => {
    const s = pitch();
    const st = detectStill(s);
    expect(st.frame_index).toBeLessThanOrEqual(2);
    const fm = detectFirstMove(s);
    expect(fm.frame_index).toBeGreaterThanOrEqual(29);
    expect(fm.frame_index).toBeLessThanOrEqual(32);
    expect(fm.anchor_uncertainty_ms).toBeCloseTo(16.6667, 3);
    expect(isStill(s, [2, 20])).toBe(true);
    expect(isStill(s, [40, 60])).toBe(false);
  });

  it("D-RELEASE pose-only: ≥2 of 3 signals agree near the arm peak, labelled pose_only", () => {
    const r = detectReleasePoseOnly(pitch(), { throwing_side: "right" });
    expect(r.missingness).toBeNull();
    expect(Math.abs(r.frame_index! - 70)).toBeLessThanOrEqual(2);
    expect(r.diagnostics.tier).toBe("pose_only");
    expect(r.anchor_uncertainty_ms).toBeGreaterThan(0);
  });

  it("D-RELEASE refuses below 60 fps and when the arm is hidden", () => {
    expect(detectReleasePoseOnly(pitch(30), { throwing_side: "right" }).missingness?.missing_reason).toBe("insufficient_temporal_resolution");
    const hidden = detectReleasePoseOnly(pitch(60, [0, 129]), { throwing_side: "right" });
    expect(hidden.frame_index).toBeNull();
  });

  it("D-FIRST-MOVE never guesses through an occlusion", () => {
    const r = detectFirstMove(pitch(60, [29, 33]));
    expect(r.frame_index).toBeNull();
    expect(r.missingness?.missing_reason).toBe("landmark_occluded");
  });

  it("hitting: load apex → swing start → P4 in order, finish after", () => {
    const s = swing();
    const la = detectLoadApex(s, 1);
    expect(Math.abs(la.frame_index! - 50)).toBeLessThanOrEqual(2);
    const ss = detectSwingStart(s, 1, la);
    expect(ss.frame_index!).toBeGreaterThan(la.frame_index!);
    const p4 = detectP4(s, 1, 55);
    expect(p4.frame_index!).toBeGreaterThanOrEqual(57);
    expect(p4.diagnostics.back_elbow).toBe("left");
    const fin = detectFinish(s);
    expect(fin.frame_index!).toBeGreaterThan(70);
  });

  it("direction and plant are never assumed", () => {
    const s = swing();
    expect(detectLoadApex(s, null).missingness?.missing_reason).toBe("anchor_not_detected");
    expect(detectP4(s, 1, null).missingness?.missing_reason).toBe("front_foot_full_plant_missing");
    expect(detectSwingStart(s, null).frame_index).toBeNull();
  });

  it("deterministic: same series → byte-identical anchors", () => {
    const o = { direction_sign: 1 as const, throwing_side: "right" as const, front_foot_full_plant_frame: 55 };
    expect(JSON.stringify(detectAllPoseEvents(swing(), o))).toBe(JSON.stringify(detectAllPoseEvents(swing(), o)));
    expect(JSON.stringify(detectAllPoseEvents(pitch(), o))).toBe(JSON.stringify(detectAllPoseEvents(pitch(), o)));
  });
});

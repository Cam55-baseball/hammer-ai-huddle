import { describe, expect, it } from "vitest";
import { detectFrontFootPlant, PLANT_LANDMARK_INDEX } from "../detectors/dPlant";
import { DETECTOR_VERSIONS, isDetectorStubbed } from "../detectorVersions";
import type { LandmarkSeries, LandmarkSeriesFrame } from "../pose/landmarkSeriesFormat";

const LM_COUNT = 33;

function frame(
  i: number,
  fps: number,
  opts: {
    footY: number;
    hipY?: number;
    vis?: number;
    footX?: number;
    detected?: boolean;
  },
): LandmarkSeriesFrame {
  const normalized = new Array(LM_COUNT * 3).fill(0.5);
  const visibility = new Array(LM_COUNT).fill(opts.vis ?? 0.95);
  const set = (idx: number, x: number, y: number) => {
    normalized[idx * 3] = x;
    normalized[idx * 3 + 1] = y;
  };
  const x = opts.footX ?? 0.5;
  set(PLANT_LANDMARK_INDEX.LEFT_ANKLE, x, opts.footY);
  set(PLANT_LANDMARK_INDEX.LEFT_HEEL, x - 0.01, opts.footY);
  set(PLANT_LANDMARK_INDEX.LEFT_FOOT_INDEX, x + 0.02, opts.footY);
  // Right foot: static, so "auto" picks the moving left foot.
  set(PLANT_LANDMARK_INDEX.RIGHT_ANKLE, 0.4, 0.9);
  set(PLANT_LANDMARK_INDEX.RIGHT_HEEL, 0.39, 0.9);
  set(PLANT_LANDMARK_INDEX.RIGHT_FOOT_INDEX, 0.42, 0.9);
  set(PLANT_LANDMARK_INDEX.LEFT_HIP, 0.45, opts.hipY ?? 0.5);
  set(PLANT_LANDMARK_INDEX.RIGHT_HIP, 0.47, opts.hipY ?? 0.5);
  return {
    frame_index: i,
    timestamp_seconds: Math.round((i / fps) * 1e6) / 1e6,
    pose_detected: opts.detected !== false,
    normalized,
    world: new Array(LM_COUNT * 3).fill(0),
    visibility,
  };
}

function series(frames: LandmarkSeriesFrame[], fps = 60): LandmarkSeries {
  return {
    header: {
      format: "ndjson.gz@1",
      video_sha256_hex: "a".repeat(64),
      landmark_model_id: "blazepose_full",
      landmark_model_version: "blazepose_full@0.10.35-mediapipe-tasks-vision",
      fps_true: fps,
      fps_source: "measured_rvfc",
      width: 1080,
      height: 1920,
      orientation: "portrait",
      frame_count: frames.length,
      window_start_frame: 0,
      window_end_frame: frames.length - 1,
      window_start_sec: 0,
      window_end_sec: frames.length / fps,
      window_rule: "full_clip_native_fps",
      inference_width: 540,
      inference_height: 960,
      landmark_count: LM_COUNT,
    },
    frames,
  };
}

/** Foot lifted, descends, lands, then stays down. */
function strideSeries(fps = 60, opts: { vis?: number; footX?: number } = {}) {
  const frames: LandmarkSeriesFrame[] = [];
  const n = 60;
  for (let i = 0; i < n; i++) {
    let footY: number;
    if (i < 15) footY = 0.70; // lifted, still
    else if (i < 30) footY = 0.70 + ((i - 15) / 15) * 0.20; // descending
    else footY = 0.90; // planted
    const hipY = i < 30 ? 0.50 : 0.52; // mass settling into the foot
    frames.push(frame(i, fps, { footY, hipY, vis: opts.vis, footX: opts.footX }));
  }
  return series(frames, fps);
}

describe("STEP 2 — D-PLANT front-foot plant detector", () => {
  it("D-PLANT carries a real version while its siblings stay stubbed", () => {
    expect(isDetectorStubbed("D-PLANT")).toBe(false);
    expect(isDetectorStubbed("D-RELEASE")).toBe(true);
    expect(isDetectorStubbed("D-BAT")).toBe(true);
    expect(isDetectorStubbed("D-CONTACT")).toBe(true);
    expect(isDetectorStubbed("D-BALL")).toBe(true);
    expect(DETECTOR_VERSIONS["D-PLANT"]).not.toMatch(/-stub$/);
  });

  it("detects first contact and full plant on a clean stride", () => {
    const r = detectFrontFootPlant(strideSeries());
    expect(r.missingness).toBeNull();
    expect(r.front_foot_first_contact).not.toBeNull();
    expect(r.front_foot_full_plant).not.toBeNull();
    // Landing happens at frame 30; smoothing places contact within a few frames.
    expect(r.front_foot_first_contact!.frame_index).toBeGreaterThanOrEqual(28);
    expect(r.front_foot_first_contact!.frame_index).toBeLessThanOrEqual(34);
    expect(r.front_foot_full_plant!.frame_index).toBeGreaterThanOrEqual(
      r.front_foot_first_contact!.frame_index,
    );
    expect(r.front_foot_first_contact!.confidence).toBeGreaterThanOrEqual(0.7);
    expect(r.diagnostics.front_side_used).toBe("left");
  });

  it("is deterministic across repeated runs", () => {
    const s = strideSeries();
    const out = [0, 1, 2].map(() => JSON.stringify(detectFrontFootPlant(s)));
    expect(new Set(out).size).toBe(1);
  });

  it("does not shift the anchor when the clip is padded at the front", () => {
    const s = strideSeries();
    const r1 = detectFrontFootPlant(s);
    const shifted = series(
      s.frames.map((f) => ({ ...f, frame_index: f.frame_index + 100 })),
      60,
    );
    const r2 = detectFrontFootPlant(shifted);
    expect(r2.front_foot_first_contact!.frame_index).toBe(
      r1.front_foot_first_contact!.frame_index + 100,
    );
  });

  it("emits insufficient_temporal_resolution below the fps floor", () => {
    const r = detectFrontFootPlant(strideSeries(24));
    expect(r.front_foot_first_contact).toBeNull();
    expect(r.missingness?.missing_reason).toBe("insufficient_temporal_resolution");
  });

  it("emits landmark_occluded when the foot is mostly not visible", () => {
    const r = detectFrontFootPlant(strideSeries(60, { vis: 0.2 }));
    expect(r.front_foot_first_contact).toBeNull();
    expect(r.missingness?.missing_reason).toBe("landmark_occluded");
  });

  it("emits out_of_frame when the foot leaves the frame", () => {
    const r = detectFrontFootPlant(strideSeries(60, { footX: 0.999 }));
    expect(r.front_foot_first_contact).toBeNull();
    expect(r.missingness?.missing_reason).toBe("out_of_frame");
  });

  it("emits anchor_not_detected when the foot never descends", () => {
    const frames: LandmarkSeriesFrame[] = [];
    for (let i = 0; i < 60; i++) frames.push(frame(i, 60, { footY: 0.9 }));
    const r = detectFrontFootPlant(series(frames));
    expect(r.front_foot_first_contact).toBeNull();
    expect(r.missingness?.missing_reason).toBe("anchor_not_detected");
  });

  it("never returns an interpolated or fractional frame index", () => {
    const r = detectFrontFootPlant(strideSeries());
    expect(Number.isInteger(r.front_foot_first_contact!.frame_index)).toBe(true);
    expect(Number.isInteger(r.front_foot_full_plant!.frame_index)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { runGuardedShoulderTiltPipeline } from "../guardedShoulderTiltPipeline";
import { normalizeDetectionFrames } from "../../detections/detectionFrameSource";
import type { PoseFrameRow } from "../../pose/poseRunner";
import type { BallDetectionFrame } from "@/lib/cv/ball/types";

function landmarks(dyNorm: number) {
  const lm = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 0.9,
  }));
  lm[11] = { x: 0.4, y: 0.5, z: 0, visibility: 0.9 };
  lm[12] = { x: 0.6, y: 0.5 + dyNorm, z: 0, visibility: 0.9 };
  return lm;
}

function row(frame_index: number, dyNorm: number): PoseFrameRow {
  return {
    frame_index,
    timestamp_seconds: frame_index / 30,
    pose_detected: true,
    landmarks: landmarks(dyNorm),
    mean_visibility: 0.9,
  };
}

function ballFrame(i: number, x: number): BallDetectionFrame {
  return {
    frame_index: i,
    timestamp_seconds: i / 30,
    image_width: 1920,
    image_height: 1080,
    predictions: [],
    chosen: { x, y: 500, width: 10, height: 10, confidence: 0.8, class: "baseball" },
  };
}

const flight = [ballFrame(9, 100), ballFrame(10, 700), ballFrame(11, 1300)];

describe("guarded shoulder tilt pipeline", () => {
  const base = {
    release_frame_index: 10,
    frame_width: 1920,
    frame_height: 1080,
    shift_frames: 1 as const,
  };

  it("releases a value when pose is stable and a live pitch is present", () => {
    const out = runGuardedShoulderTiltPipeline({
      ...base,
      pose_rows: [row(9, 0.02), row(10, 0.02), row(11, 0.021)],
      detection_frames: flight,
    });
    expect(out.metric.value).not.toBeNull();
    expect(out.metric.guard).toBeNull();
    expect(out.lineage.neighbour_frame_index).toBe(11);
  });

  it("withholds when no detection frames reach the pose path", () => {
    const out = runGuardedShoulderTiltPipeline({
      ...base,
      pose_rows: [row(10, 0.02), row(11, 0.021)],
      detection_frames: [],
    });
    expect(out.metric.value).toBeNull();
    expect(out.metric.guard).toBe("live_pitch_gate");
    expect(out.metric.lineage.live_pitch.verdict).toBe("indeterminate");
  });

  it("withholds when the neighbour frame has no pose", () => {
    const out = runGuardedShoulderTiltPipeline({
      ...base,
      pose_rows: [row(10, 0.02)],
      detection_frames: flight,
    });
    expect(out.metric.value).toBeNull();
    expect(out.metric.guard).toBe("stability_1_frame_shift");
  });

  it("withholds when tilt moves too much across one frame", () => {
    const out = runGuardedShoulderTiltPipeline({
      ...base,
      pose_rows: [row(10, 0.02), row(11, 0.3)],
      detection_frames: flight,
    });
    expect(out.metric.value).toBeNull();
    expect(out.metric.guard).toBe("stability_1_frame_shift");
    expect(out.metric.lineage.delta_deg).toBeGreaterThan(5);
  });
});

describe("normalizeDetectionFrames", () => {
  it("returns null for absent or unusable payloads, never an empty list", () => {
    expect(normalizeDetectionFrames(null)).toBeNull();
    expect(normalizeDetectionFrames([])).toBeNull();
    expect(normalizeDetectionFrames([{ nope: 1 }])).toBeNull();
  });

  it("normalizes stored hosted detections and sorts by frame index", () => {
    const frames = normalizeDetectionFrames([
      { ...ballFrame(3, 10) },
      { ...ballFrame(1, 5) },
    ]);
    expect(frames?.map((f) => f.frame_index)).toEqual([1, 3]);
    expect(frames?.[0].chosen?.confidence).toBe(0.8);
  });

  it("drops unreadable predictions rather than repairing them", () => {
    const frames = normalizeDetectionFrames([
      {
        frame_index: 1,
        timestamp_seconds: 0,
        image_width: 100,
        image_height: 100,
        predictions: [{ x: "bad" }, { x: 1, y: 2, width: 3, height: 4, confidence: 0.5, class: "baseball" }],
        chosen: null,
      },
    ]);
    expect(frames?.[0].predictions).toHaveLength(1);
    expect(frames?.[0].chosen).toBeNull();
  });
});

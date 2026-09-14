import { describe, expect, it } from "vitest";
import {
  MAX_DENSE_FRAMES,
  classifyDensityTier,
  selectDenseWindow,
} from "../denseLandmarkCapture";
import {
  decodeLandmarkSeriesText,
  encodeLandmarkSeriesText,
  type LandmarkSeries,
} from "../landmarkSeriesFormat";
import { buildLandmarkSeriesPath } from "../landmarkSeriesStorage";

describe("frame-density tiers", () => {
  it("classifies against the canonical spec tiers", () => {
    expect(classifyDensityTier(24)).toBe("below_floor");
    expect(classifyDensityTier(30)).toBe("t_low");
    expect(classifyDensityTier(59.94)).toBe("t_low");
    expect(classifyDensityTier(60)).toBe("t_mid");
    expect(classifyDensityTier(120)).toBe("t_high");
  });
});

describe("dense window selection", () => {
  it("covers the whole clip at native fps when it fits the budget", () => {
    const w = selectDenseWindow(60, 4, null)!;
    expect(w.start_frame).toBe(0);
    expect(w.end_frame).toBe(239);
    expect(w.frame_count).toBe(240);
    expect(w.rule).toBe("full_clip_native_fps");
  });

  it("never samples fewer frames than one per native frame inside the window", () => {
    const w = selectDenseWindow(120, 3, null)!;
    // 3s @120fps = 360 frames, all of them, stride 1.
    expect(w.frame_count).toBe(360);
    expect(w.end_frame - w.start_frame + 1).toBe(w.frame_count);
  });

  it("shrinks the window — not the density — when the clip exceeds the budget", () => {
    const w = selectDenseWindow(120, 30, null)!;
    expect(w.frame_count).toBe(MAX_DENSE_FRAMES);
    expect(w.end_frame - w.start_frame + 1).toBe(MAX_DENSE_FRAMES);
    expect(w.rule).toContain("midpoint_centred");
  });

  it("centres on the landing mark with a 60/40 split", () => {
    const w = selectDenseWindow(120, 30, 10)!;
    const landingFrame = 1200;
    expect(w.start_frame).toBe(landingFrame - Math.floor(MAX_DENSE_FRAMES * 0.6));
    expect(w.frame_count).toBe(MAX_DENSE_FRAMES);
    expect(w.rule).toContain("landing_centred");
  });

  it("clamps into the clip without losing window length", () => {
    const w = selectDenseWindow(120, 30, 0.5)!;
    expect(w.start_frame).toBe(0);
    expect(w.frame_count).toBe(MAX_DENSE_FRAMES);
  });

  it("is deterministic", () => {
    const a = JSON.stringify(selectDenseWindow(59.94, 12, 3.7));
    const b = JSON.stringify(selectDenseWindow(59.94, 12, 3.7));
    expect(a).toBe(b);
  });

  it("returns null on an unusable probe rather than inventing a window", () => {
    expect(selectDenseWindow(0, 5, null)).toBeNull();
    expect(selectDenseWindow(60, 0, null)).toBeNull();
  });
});

function fixtureSeries(): LandmarkSeries {
  return {
    header: {
      format: "ndjson.gz@1",
      video_sha256_hex: "a".repeat(64),
      landmark_model_id: "blazepose_full",
      landmark_model_version: "blazepose_full@0.10.35-mediapipe-tasks-vision",
      fps_true: 59.94,
      fps_source: "measured_rvfc",
      width: 1080,
      height: 1920,
      orientation: "portrait",
      frame_count: 2,
      window_start_frame: 10,
      window_end_frame: 11,
      window_start_sec: 0.166834,
      window_end_sec: 0.183517,
      window_rule: "full_clip_native_fps",
      inference_width: 360,
      inference_height: 640,
      landmark_count: 33,
    },
    frames: [
      {
        frame_index: 10,
        timestamp_seconds: 0.166834,
        pose_detected: true,
        normalized: [0.123456789, 0.5, -0.25],
        world: [0.0123456789, -0.5, 1.25],
        visibility: [0.987654321],
      },
      {
        frame_index: 11,
        timestamp_seconds: 0.183517,
        pose_detected: false,
        normalized: [],
        world: [],
        visibility: [],
      },
    ],
  };
}

describe("landmark series NDJSON format", () => {
  it("round-trips header and frames", () => {
    const s = fixtureSeries();
    const decoded = decodeLandmarkSeriesText(encodeLandmarkSeriesText(s));
    expect(decoded.header).toEqual(s.header);
    expect(decoded.frames).toHaveLength(2);
    expect(decoded.frames[0].frame_index).toBe(10);
    expect(decoded.frames[0].pose_detected).toBe(true);
    expect(decoded.frames[1].pose_detected).toBe(false);
    expect(decoded.frames[1].normalized).toEqual([]);
  });

  it("rounds at fixed precision so the same series is byte-identical", () => {
    const a = encodeLandmarkSeriesText(fixtureSeries());
    const b = encodeLandmarkSeriesText(fixtureSeries());
    expect(a).toBe(b);
    // Precision is capped, not arbitrary float text.
    expect(a).toContain("0.12346");
    expect(a).not.toContain("0.123456789");
  });

  it("emits one line per frame plus a header line", () => {
    const lines = encodeLandmarkSeriesText(fixtureSeries()).trim().split("\n");
    expect(lines).toHaveLength(3);
  });
});

describe("landmark series storage path", () => {
  it("keys by user, video and landmark model version", () => {
    expect(
      buildLandmarkSeriesPath("u1", "v1", "blazepose_full@0.10.35-mediapipe-tasks-vision"),
    ).toBe("u1/v1/blazepose_full@0.10.35-mediapipe-tasks-vision.ndjson.gz");
  });

  it("sanitises anything unexpected in the version string", () => {
    expect(buildLandmarkSeriesPath("u1", "v1", "a/b c")).toBe("u1/v1/a_b_c.ndjson.gz");
  });
});

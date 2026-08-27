import { describe, expect, it } from "vitest";

import {
  ON_DEVICE_BALL_DETECTOR_ENABLED,
  computeLetterbox,
  decodeYoloOutput,
  iou,
  nonMaxSuppression,
  runOnDeviceBallDetection,
  unletterbox,
} from "../onDeviceBallDetector";
import { pickBallPrediction } from "../types";
import { runBallDetectorParity } from "../parity";

describe("on-device ball detector — kill switch", () => {
  it("stays disabled until parity is approved", () => {
    expect(ON_DEVICE_BALL_DETECTOR_ENABLED).toBe(false);
  });

  it("refuses to run while disabled instead of returning empty detections", async () => {
    const run = await runOnDeviceBallDetection([]);
    expect(run.ok).toBe(false);
    if (!run.ok) expect(run.reason).toBe("not_enabled");
  });
});

describe("letterbox geometry", () => {
  it("round-trips a box through letterbox space", () => {
    const t = computeLetterbox(1920, 1080);
    const source = { x: 500, y: 400, width: 40, height: 40 };
    const inModel = {
      x: source.x * t.scale + t.padX,
      y: source.y * t.scale + t.padY,
      width: source.width * t.scale,
      height: source.height * t.scale,
    };
    const back = unletterbox(inModel, t);
    expect(back.x).toBeCloseTo(source.x, 6);
    expect(back.y).toBeCloseTo(source.y, 6);
    expect(back.width).toBeCloseTo(source.width, 6);
  });
});

describe("YOLO decode + NMS", () => {
  const dims = [1, 8, 2] as const; // 4 box rows + 4 classes, 2 anchors

  function head(values: number[][]): Float32Array {
    return Float32Array.from(values.flat());
  }

  it("decodes the highest-scoring class above threshold", () => {
    const t = computeLetterbox(640, 640);
    const data = head([
      [320, 320], // cx
      [200, 200], // cy
      [20, 20], // w
      [20, 20], // h
      [0.01, 0.01], // glove
      [0.02, 0.02], // homeplate
      [0.9, 0.05], // baseball
      [0.01, 0.01], // rubber
    ]);
    const preds = decodeYoloOutput(data, dims as unknown as number[], t, 0.15);
    expect(preds).toHaveLength(1);
    expect(preds[0].class).toBe("baseball");
    expect(preds[0].confidence).toBeCloseTo(0.9, 6);
  });

  it("suppresses overlapping same-class boxes deterministically", () => {
    const a = { x: 100, y: 100, width: 20, height: 20, confidence: 0.9, class: "baseball" };
    const b = { x: 102, y: 101, width: 20, height: 20, confidence: 0.6, class: "baseball" };
    const c = { x: 400, y: 400, width: 20, height: 20, confidence: 0.5, class: "baseball" };
    expect(iou(a, b)).toBeGreaterThan(0.7);
    const kept = nonMaxSuppression([b, a, c], 0.3);
    expect(kept.map((k) => k.confidence)).toEqual([0.9, 0.5]);
  });

  it("picks the ball class over glove/plate detections", () => {
    const chosen = pickBallPrediction([
      { x: 1, y: 1, width: 50, height: 50, confidence: 0.95, class: "glove" },
      { x: 2, y: 2, width: 10, height: 10, confidence: 0.4, class: "baseball" },
    ]);
    expect(chosen?.class).toBe("baseball");
  });
});

describe("parity harness", () => {
  const hosted = [
    {
      frame_index: 0,
      chosen: { x: 100, y: 100, width: 20, height: 20, confidence: 0.8, class: "baseball" },
    },
    { frame_index: 1, chosen: null },
  ];

  const device = (chosen: unknown, frame_index: number) => ({
    frame_index,
    timestamp_seconds: frame_index / 30,
    image_width: 1920,
    image_height: 1080,
    predictions: chosen ? [chosen as never] : [],
    chosen: chosen as never,
  });

  it("reports parity when both sides agree frame-for-frame", () => {
    const report = runBallDetectorParity(hosted, [
      device({ x: 100, y: 100, width: 20, height: 20, confidence: 0.82, class: "baseball" }, 0),
      device(null, 1),
    ]);
    expect(report.verdict).toBe("parity");
    expect(report.matches).toBe(1);
    expect(report.agreed_absent).toBe(1);
  });

  it("flags a box disagreement as divergent", () => {
    const report = runBallDetectorParity(hosted, [
      device({ x: 400, y: 400, width: 20, height: 20, confidence: 0.8, class: "baseball" }, 0),
      device(null, 1),
    ]);
    expect(report.verdict).toBe("divergent");
    expect(report.comparisons[0].verdict).toBe("box_mismatch");
  });

  it("flags a ball the hosted path never saw", () => {
    const report = runBallDetectorParity(hosted, [
      device({ x: 100, y: 100, width: 20, height: 20, confidence: 0.8, class: "baseball" }, 0),
      device({ x: 10, y: 10, width: 8, height: 8, confidence: 0.3, class: "baseball" }, 1),
    ]);
    expect(report.comparisons[1].verdict).toBe("on_device_only");
    expect(report.verdict).toBe("divergent");
  });

  it("never claims parity with no frames", () => {
    expect(runBallDetectorParity([], []).verdict).toBe("insufficient_data");
  });
});

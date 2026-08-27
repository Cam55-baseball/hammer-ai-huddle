/**
 * On-device ball detector (Part 2) — self-contained, flag-gated, unused.
 *
 * Runs the same BaseballCV `ball_tracking_v4` (YOLOv11) weights that the
 * hosted Roboflow path uses, exported to ONNX and served from
 * `/models/ball_tracking_v4.onnx`, through ONNX Runtime Web (WebGPU with a
 * WASM fallback). Licensing: same model, already cleared with the BaseballCV
 * maintainers; this changes only the delivery mechanism.
 *
 * STATUS: NOT LIVE and NOT TRUSTED. `ON_DEVICE_BALL_DETECTOR_ENABLED` stays
 * false until `runBallDetectorParity` shows frame-for-frame agreement with
 * stored hosted detections. Nothing in the app imports this module on a live
 * path; `supabase/functions/pitch-velocity-measure` remains the only detector
 * that produces athlete-visible numbers.
 *
 * Honesty rule: when the model asset is absent or the runtime cannot start,
 * this returns `{ ok: false, reason }`. It never returns an empty prediction
 * set that could be misread as "the ball was not there".
 */

import {
  pickBallPrediction,
  BALL_TRACKING_V4_CLASSES,
  type BallDetectionFrame,
  type BallDetectorRun,
  type BallPrediction,
} from "./types";

/** Kill switch — MUST stay false until parity is demonstrated and approved. */
export const ON_DEVICE_BALL_DETECTOR_ENABLED = false as const;

export const MODEL_ASSET_PATH = "/models/ball_tracking_v4.onnx";

/** Matched to the hosted call: confidence=15 (percent), overlap=30. */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.15;
export const DEFAULT_IOU_THRESHOLD = 0.3;
/** YOLOv11 square input. */
export const INPUT_SIZE = 640;

export interface OnDeviceFrameInput {
  readonly frame_index: number;
  readonly timestamp_seconds: number;
  /** PNG/JPEG data URL, same frames the hosted path stores. */
  readonly dataUrl: string;
  readonly width: number;
  readonly height: number;
}

export interface OnDeviceOptions {
  readonly confidenceThreshold?: number;
  readonly iouThreshold?: number;
  /** Override for tests / alternate deployments. */
  readonly modelAssetPath?: string;
  /** Ignore the kill switch (parity harness only). */
  readonly bypassFlag?: boolean;
}

// ---------------------------------------------------------------------------
// Geometry helpers — pure, deterministic, unit-testable without a runtime.
// ---------------------------------------------------------------------------

export interface LetterboxTransform {
  readonly scale: number;
  readonly padX: number;
  readonly padY: number;
}

/** Aspect-preserving resize into INPUT_SIZE², centered, as YOLO expects. */
export function computeLetterbox(
  width: number,
  height: number,
  target = INPUT_SIZE,
): LetterboxTransform {
  const scale = Math.min(target / width, target / height);
  return {
    scale,
    padX: (target - width * scale) / 2,
    padY: (target - height * scale) / 2,
  };
}

/** Map a box from letterboxed model space back to source-image pixels. */
export function unletterbox(
  box: { x: number; y: number; width: number; height: number },
  t: LetterboxTransform,
): { x: number; y: number; width: number; height: number } {
  return {
    x: (box.x - t.padX) / t.scale,
    y: (box.y - t.padY) / t.scale,
    width: box.width / t.scale,
    height: box.height / t.scale,
  };
}

export function iou(a: BallPrediction, b: BallPrediction): number {
  const ax1 = a.x - a.width / 2;
  const ay1 = a.y - a.height / 2;
  const ax2 = a.x + a.width / 2;
  const ay2 = a.y + a.height / 2;
  const bx1 = b.x - b.width / 2;
  const by1 = b.y - b.height / 2;
  const bx2 = b.x + b.width / 2;
  const by2 = b.y + b.height / 2;
  const iw = Math.max(0, Math.min(ax2, bx2) - Math.max(ax1, bx1));
  const ih = Math.max(0, Math.min(ay2, by2) - Math.max(ay1, by1));
  const inter = iw * ih;
  if (inter <= 0) return 0;
  const union = a.width * a.height + b.width * b.height - inter;
  return union > 0 ? inter / union : 0;
}

/** Class-wise greedy NMS. Deterministic: ties break on lower array index. */
export function nonMaxSuppression(
  predictions: readonly BallPrediction[],
  iouThreshold: number,
): BallPrediction[] {
  const kept: BallPrediction[] = [];
  const ordered = predictions
    .map((p, i) => ({ p, i }))
    .sort((a, b) => b.p.confidence - a.p.confidence || a.i - b.i)
    .map((e) => e.p);
  for (const candidate of ordered) {
    const overlaps = kept.some(
      (k) => k.class === candidate.class && iou(k, candidate) > iouThreshold,
    );
    if (!overlaps) kept.push(candidate);
  }
  return kept;
}

/**
 * Decode a YOLOv11 detection head.
 *
 * Expected layout `[1, 4 + numClasses, numAnchors]` (Ultralytics export):
 * rows 0..3 are cx, cy, w, h in letterboxed pixels; rows 4.. are per-class
 * scores already sigmoid-activated.
 */
export function decodeYoloOutput(
  data: Float32Array | number[],
  dims: readonly number[],
  transform: LetterboxTransform,
  confidenceThreshold: number,
  classNames: readonly string[] = BALL_TRACKING_V4_CLASSES,
): BallPrediction[] {
  if (dims.length !== 3) return [];
  const [, channels, anchors] = dims;
  const numClasses = channels - 4;
  if (numClasses <= 0) return [];

  const out: BallPrediction[] = [];
  for (let a = 0; a < anchors; a++) {
    let bestClass = -1;
    let bestScore = 0;
    for (let c = 0; c < numClasses; c++) {
      const score = data[(4 + c) * anchors + a];
      if (score > bestScore) {
        bestScore = score;
        bestClass = c;
      }
    }
    if (bestClass < 0 || bestScore < confidenceThreshold) continue;
    const mapped = unletterbox(
      {
        x: data[0 * anchors + a],
        y: data[1 * anchors + a],
        width: data[2 * anchors + a],
        height: data[3 * anchors + a],
      },
      transform,
    );
    out.push({
      ...mapped,
      confidence: bestScore,
      class: classNames[bestClass] ?? `class_${bestClass}`,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Runtime
// ---------------------------------------------------------------------------

type OrtModule = typeof import("onnxruntime-web");

let sessionPromise: Promise<{
  ort: OrtModule;
  session: Awaited<ReturnType<OrtModule["InferenceSession"]["create"]>>;
}> | null = null;

async function assetExists(path: string): Promise<boolean> {
  try {
    const res = await fetch(path, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

async function getSession(modelPath: string) {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const ort = await import("onnxruntime-web");
      const session = await ort.InferenceSession.create(modelPath, {
        executionProviders: ["webgpu", "wasm"],
        graphOptimizationLevel: "all",
      });
      return { ort, session };
    })();
  }
  return sessionPromise;
}

/** Test seam: drop the cached session (e.g. after a model swap). */
export function resetOnDeviceBallDetector(): void {
  sessionPromise = null;
}

async function dataUrlToTensorSource(
  dataUrl: string,
): Promise<{ pixels: Uint8ClampedArray; width: number; height: number }> {
  const blob = await (await fetch(dataUrl)).blob();
  const bitmap = await createImageBitmap(blob);
  try {
    const t = computeLetterbox(bitmap.width, bitmap.height);
    const canvas = new OffscreenCanvas(INPUT_SIZE, INPUT_SIZE);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d context unavailable");
    // Grey pad matches Ultralytics letterbox fill (114,114,114).
    ctx.fillStyle = "rgb(114,114,114)";
    ctx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
    ctx.drawImage(
      bitmap,
      t.padX,
      t.padY,
      bitmap.width * t.scale,
      bitmap.height * t.scale,
    );
    const img = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
    return { pixels: img.data, width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close?.();
  }
}

/** RGBA → normalized CHW float tensor data. */
export function toChwFloat32(pixels: Uint8ClampedArray, size = INPUT_SIZE): Float32Array {
  const plane = size * size;
  const out = new Float32Array(plane * 3);
  for (let i = 0; i < plane; i++) {
    out[i] = pixels[i * 4] / 255;
    out[plane + i] = pixels[i * 4 + 1] / 255;
    out[plane * 2 + i] = pixels[i * 4 + 2] / 255;
  }
  return out;
}

/**
 * Run the on-device detector over a set of stored frames.
 *
 * Sequential by design: the MediaPipe pose runner already holds GPU memory on
 * this device, so the two detectors never contend.
 */
export async function runOnDeviceBallDetection(
  frames: readonly OnDeviceFrameInput[],
  options: OnDeviceOptions = {},
): Promise<BallDetectorRun> {
  const modelPath = options.modelAssetPath ?? MODEL_ASSET_PATH;

  if (!ON_DEVICE_BALL_DETECTOR_ENABLED && !options.bypassFlag) {
    return { ok: false, detector: "on_device_onnx", reason: "not_enabled" };
  }

  if (!(await assetExists(modelPath))) {
    return {
      ok: false,
      detector: "on_device_onnx",
      reason: "model_asset_missing",
      detail: modelPath,
    };
  }

  let ort: OrtModule;
  let session: Awaited<ReturnType<OrtModule["InferenceSession"]["create"]>>;
  try {
    ({ ort, session } = await getSession(modelPath));
  } catch (e) {
    resetOnDeviceBallDetector();
    return {
      ok: false,
      detector: "on_device_onnx",
      reason: "runtime_unavailable",
      detail: e instanceof Error ? e.message : String(e),
    };
  }

  const confidenceThreshold =
    options.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
  const iouThreshold = options.iouThreshold ?? DEFAULT_IOU_THRESHOLD;

  const out: BallDetectionFrame[] = [];
  for (const frame of frames) {
    let predictions: BallPrediction[] = [];
    try {
      const { pixels, width, height } = await dataUrlToTensorSource(frame.dataUrl);
      const transform = computeLetterbox(width, height);
      const tensor = new ort.Tensor("float32", toChwFloat32(pixels), [
        1,
        3,
        INPUT_SIZE,
        INPUT_SIZE,
      ]);
      const feeds = { [session.inputNames[0]]: tensor };
      const results = await session.run(feeds);
      const head = results[session.outputNames[0]];
      predictions = nonMaxSuppression(
        decodeYoloOutput(
          head.data as Float32Array,
          head.dims as number[],
          transform,
          confidenceThreshold,
        ),
        iouThreshold,
      );
    } catch (e) {
      return {
        ok: false,
        detector: "on_device_onnx",
        reason: "decode_failed",
        detail: e instanceof Error ? e.message : String(e),
      };
    }

    out.push({
      frame_index: frame.frame_index,
      timestamp_seconds: frame.timestamp_seconds,
      image_width: frame.width,
      image_height: frame.height,
      predictions,
      chosen: pickBallPrediction(predictions),
    });
  }

  return {
    ok: true,
    detector: "on_device_onnx",
    model_asset: modelPath,
    frames: out,
  };
}

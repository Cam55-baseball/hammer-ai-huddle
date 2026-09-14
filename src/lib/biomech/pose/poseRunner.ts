/**
 * Phase 42B — D-POSE Build Authority.
 *
 * First real landmark producer. Client-side MediaPipe Tasks Vision
 * (`PoseLandmarker`) running BlazePose Full. Consumes the same PNG data-URL
 * frames already emitted by `extractKeyFramesDeterministic` and returns one
 * `PoseFrameRow` per input frame. No detector / anchor / metric / report-card
 * logic — that all lives downstream and is consumed unchanged.
 *
 * Browser-only. Uses `document`, `Image`, `OffscreenCanvas` / `ImageBitmap`.
 */

import {
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";

import { LANDMARK_MODEL_VERSION } from "../versions";

export interface PoseRunnerInputFrame {
  readonly frame_index: number;
  readonly timestamp_seconds: number;
  readonly dataUrl: string;
  readonly width: number;
  readonly height: number;
}

export interface PoseLandmarkPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly visibility: number;
}

export interface PoseFrameRow {
  readonly frame_index: number;
  readonly timestamp_seconds: number;
  readonly pose_detected: boolean;
  /** 33 BlazePose landmarks, normalized to [0,1] image coords. Empty if not detected. */
  readonly landmarks: readonly PoseLandmarkPoint[];
  readonly mean_visibility: number;
}

export interface PoseRunnerResult {
  readonly landmark_producer_version: string;
  readonly frames_processed: number;
  readonly frames_with_pose: number;
  readonly mean_visibility: number;
  readonly rows: readonly PoseFrameRow[];
}

const MODEL_ASSET_PATH = "/models/pose_landmarker_full.task";
const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

async function getLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
      return await PoseLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: MODEL_ASSET_PATH,
          delegate: "GPU",
        },
        runningMode: "IMAGE",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputSegmentationMasks: false,
      });
    })();
  }
  return landmarkerPromise;
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

async function dataUrlToBitmap(dataUrl: string): Promise<ImageBitmap> {
  const blob = await (await fetch(dataUrl)).blob();
  return await createImageBitmap(blob);
}

function packLandmark(l: NormalizedLandmark): PoseLandmarkPoint {
  return {
    x: round6(l.x ?? 0),
    y: round6(l.y ?? 0),
    z: round6(l.z ?? 0),
    visibility: round6(l.visibility ?? 0),
  };
}

export async function runPoseInference(
  frames: readonly PoseRunnerInputFrame[],
): Promise<PoseRunnerResult> {
  const landmarker = await getLandmarker();
  const rows: PoseFrameRow[] = [];
  let framesWithPose = 0;
  let visSum = 0;
  let visCount = 0;

  for (const f of frames) {
    const bitmap = await dataUrlToBitmap(f.dataUrl);
    try {
      const result = landmarker.detect(bitmap);
      const first = result.landmarks?.[0];
      if (first && first.length > 0) {
        framesWithPose += 1;
        const packed = first.map(packLandmark);
        const meanVis =
          packed.reduce((s, p) => s + p.visibility, 0) / packed.length;
        visSum += meanVis;
        visCount += 1;
        rows.push({
          frame_index: f.frame_index,
          timestamp_seconds: f.timestamp_seconds,
          pose_detected: true,
          landmarks: packed,
          mean_visibility: round6(meanVis),
        });
      } else {
        rows.push({
          frame_index: f.frame_index,
          timestamp_seconds: f.timestamp_seconds,
          pose_detected: false,
          landmarks: [],
          mean_visibility: 0,
        });
      }
    } finally {
      bitmap.close?.();
    }
  }

  return {
    landmark_producer_version: LANDMARK_MODEL_VERSION,
    frames_processed: frames.length,
    frames_with_pose: framesWithPose,
    mean_visibility: visCount > 0 ? round6(visSum / visCount) : 0,
    rows,
  };
}

/** BlazePose landmark indices used by the existing tempo anchors. */
export const BLAZEPOSE_INDEX = {
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

/**
 * STEP 1 — dense capture support.
 *
 * The dense pass decodes hundreds of frames per clip, so it cannot afford the
 * data-URL → fetch → Blob → ImageBitmap round trip `runPoseInference` uses. It
 * hands the landmarker a canvas directly and asks for BOTH channels:
 * normalized image coords and world (metric, hip-centred) coords, plus
 * per-landmark visibility. Nothing here changes the existing 7-frame path.
 */
export interface DensePoseDetection {
  readonly pose_detected: boolean;
  /** 33 × (x,y,z) normalized image coords, flattened. */
  readonly normalized: number[];
  /** 33 × (x,y,z) world coords in metres, flattened. */
  readonly world: number[];
  /** 33 per-landmark visibility. */
  readonly visibility: number[];
  readonly mean_visibility: number;
}

const EMPTY_DETECTION: DensePoseDetection = {
  pose_detected: false,
  normalized: [],
  world: [],
  visibility: [],
  mean_visibility: 0,
};

export async function getPoseLandmarkerForDenseCapture(): Promise<PoseLandmarker> {
  return await getLandmarker();
}

export function detectDensePose(
  landmarker: PoseLandmarker,
  source: HTMLCanvasElement | ImageBitmap,
): DensePoseDetection {
  const result = landmarker.detect(source as unknown as HTMLCanvasElement);
  const norm = result.landmarks?.[0];
  if (!norm || norm.length === 0) return EMPTY_DETECTION;
  const world = result.worldLandmarks?.[0] ?? [];

  const normalized: number[] = [];
  const visibility: number[] = [];
  for (const l of norm) {
    normalized.push(l.x ?? 0, l.y ?? 0, l.z ?? 0);
    visibility.push(l.visibility ?? 0);
  }
  const worldFlat: number[] = [];
  for (const l of world) {
    worldFlat.push(l.x ?? 0, l.y ?? 0, l.z ?? 0);
  }
  const meanVis =
    visibility.length > 0 ? visibility.reduce((s, v) => s + v, 0) / visibility.length : 0;

  return {
    pose_detected: true,
    normalized,
    world: worldFlat,
    visibility,
    mean_visibility: round6(meanVis),
  };
}

/** Adapt a dense series frame back into the legacy `PoseFrameRow` shape. */
export function densePoseRowToPoseFrameRow(
  frame_index: number,
  timestamp_seconds: number,
  d: {
    pose_detected: boolean;
    normalized: readonly number[];
    visibility: readonly number[];
  },
): PoseFrameRow {
  if (!d.pose_detected || d.visibility.length === 0) {
    return { frame_index, timestamp_seconds, pose_detected: false, landmarks: [], mean_visibility: 0 };
  }
  const landmarks: PoseLandmarkPoint[] = d.visibility.map((v, i) => ({
    x: round6(d.normalized[i * 3] ?? 0),
    y: round6(d.normalized[i * 3 + 1] ?? 0),
    z: round6(d.normalized[i * 3 + 2] ?? 0),
    visibility: round6(v),
  }));
  const meanVis = landmarks.reduce((s, p) => s + p.visibility, 0) / landmarks.length;
  return {
    frame_index,
    timestamp_seconds,
    pose_detected: true,
    landmarks,
    mean_visibility: round6(meanVis),
  };
}

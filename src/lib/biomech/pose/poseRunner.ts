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

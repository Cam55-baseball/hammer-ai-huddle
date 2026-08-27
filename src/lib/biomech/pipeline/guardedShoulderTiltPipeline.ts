/**
 * Pose-path wiring for the guarded `shoulder_tilt_deg`.
 *
 * `computeGuardedShoulderTiltDeg` needs three things the pose path already
 * half-has: the release-frame landmarks, the neighbouring frame's landmarks
 * (for the 1-frame stability re-check), and ball detection frames (for the
 * live-pitch gate). The first two come from `poseRunner` rows; the third had
 * no route into this path at all until `detectionFrameSource` was added.
 *
 * This orchestrator does the selection and nothing else. It never invents a
 * neighbour frame, never substitutes an empty detection list for absent
 * detections, and never converts an unavailable detection source into a pass.
 *
 * NOT LIVE — `MEDIAPIPE_SHOULDER_TILT_ENABLED` still gates the swap and no
 * athlete surface reads this module.
 */

import type { PoseFrameRow } from "../pose/poseRunner";
import {
  computeGuardedShoulderTiltDeg,
  type GuardedShoulderTiltResult,
} from "../metrics/shoulderTiltGuarded";
import {
  loadDetectionFramesForVideo,
  type DetectionFrameSourceResult,
} from "../detections/detectionFrameSource";
import type { BallDetectionFrame } from "@/lib/cv/ball/types";
import type { ShoulderTiltLandmark } from "../metrics/shoulderTiltDeg";

export interface GuardedShoulderTiltPipelineInputs {
  readonly pose_rows: readonly PoseFrameRow[];
  readonly release_frame_index: number | null;
  readonly frame_width: number;
  readonly frame_height: number;
  /** Detection frames, however obtained (stored hosted, or on-device later). */
  readonly detection_frames: readonly BallDetectionFrame[];
  readonly shift_frames?: 1 | -1;
  readonly stability_tolerance_deg?: number;
}

export interface GuardedShoulderTiltPipelineResult {
  readonly metric: GuardedShoulderTiltResult;
  readonly lineage: {
    readonly release_frame_index: number | null;
    readonly neighbour_frame_index: number | null;
    readonly pose_rows_total: number;
    readonly detection_frames_total: number;
  };
}

function landmarksAt(
  rows: readonly PoseFrameRow[],
  frameIndex: number | null,
): readonly ShoulderTiltLandmark[] | null {
  if (frameIndex == null) return null;
  const row = rows.find((r) => r.frame_index === frameIndex);
  if (!row || !row.pose_detected || row.landmarks.length === 0) return null;
  return row.landmarks;
}

/** Pure: pose rows + detection frames → guarded metric. */
export function runGuardedShoulderTiltPipeline(
  inputs: GuardedShoulderTiltPipelineInputs,
): GuardedShoulderTiltPipelineResult {
  const {
    pose_rows,
    release_frame_index,
    frame_width,
    frame_height,
    detection_frames,
    shift_frames = 1,
    stability_tolerance_deg,
  } = inputs;

  const neighbourIndex =
    release_frame_index == null ? null : release_frame_index + shift_frames;

  const metric = computeGuardedShoulderTiltDeg({
    landmarks: landmarksAt(pose_rows, release_frame_index) ?? [],
    shifted_landmarks: landmarksAt(pose_rows, neighbourIndex),
    shift_frames,
    release_frame_index,
    frame_width,
    frame_height,
    detectionFrames: detection_frames,
    stability_tolerance_deg,
  });

  return {
    metric,
    lineage: {
      release_frame_index,
      neighbour_frame_index: neighbourIndex,
      pose_rows_total: pose_rows.length,
      detection_frames_total: detection_frames.length,
    },
  };
}

export interface GuardedShoulderTiltForVideoResult
  extends GuardedShoulderTiltPipelineResult {
  readonly detection_source: DetectionFrameSourceResult;
}

/**
 * I/O variant: resolves the detection frames for a video from what the
 * velocity pipeline already stored, then runs the pure pipeline.
 *
 * When the source is unavailable the frame list stays empty on purpose — the
 * live-pitch gate then returns `indeterminate` ("no_detection_data") and the
 * metric is withheld. Unavailable never becomes "no ball present".
 */
export async function runGuardedShoulderTiltForVideo(
  videoId: string,
  inputs: Omit<GuardedShoulderTiltPipelineInputs, "detection_frames">,
): Promise<GuardedShoulderTiltForVideoResult> {
  const detection_source = await loadDetectionFramesForVideo(videoId);
  const detection_frames = detection_source.ok ? detection_source.frames : [];

  return {
    ...runGuardedShoulderTiltPipeline({ ...inputs, detection_frames }),
    detection_source,
  };
}

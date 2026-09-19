/**
 * STEP 1 — Dense pose capture.  STEP 4 — two-pass window selection.
 *
 * Replaces the 7-frame sample that fed pose inference with a contiguous,
 * native-frame-rate sweep across the movement window. Stride is ALWAYS 1
 * frame: density inside the window is never reduced. When a clip is longer
 * than the per-clip frame budget allows, the WINDOW shrinks — the sampling
 * rate does not.
 *
 * WINDOW SELECTION RULE (v2 — STEP 4)
 *   PASS 1 (scout): SCOUT_SAMPLE_BUDGET sparse samples across the WHOLE clip,
 *     multi-pose + subject lock. Yields the span where the athlete is
 *     confidently present and the region of highest movement inside it.
 *   PASS 2 (dense): window_frames = min(total_frames, budget), centred on the
 *     scouted motion region (60/40 pre-split) and clamped inside the presence
 *     span, then into the clip.
 *   A landing mark is still honoured when the scout confirms the athlete is
 *     present at it; a stale mark is rejected and recorded as rejected.
 *   THERE IS NO MIDPOINT FALLBACK. If the scout finds no confidently locked
 *     subject anywhere, capture fails with canonical missingness rather than
 *     analysing a guessed window. See `scoutPass.ts`.
 *
 *   `selectDenseWindow` below is the retained v1 pure placement (landing or
 *   midpoint). It is no longer on the capture path and must not be used to
 *   choose a window for analysis.
 *
 * fps_true is never read from container metadata — it is passed in from
 * `probeVideoMetadata`, which measures inter-frame deltas with
 * requestVideoFrameCallback.
 *
 * DETERMINISM: frame indices come from integer arithmetic, each frame is
 * reached by an explicit seek to `index / fps_true`, and no wall-clock or
 * random input takes part. Same file + same probe → same scout samples → same
 * window → same landmark series.
 */

import { LANDMARK_MODEL_ID, LANDMARK_MODEL_VERSION } from "../versions";
import { missingness, type MissingnessRecord } from "../metrics/missingness";
import {
  detectDensePoseCandidates,
  getPoseLandmarkerForDenseCapture,
} from "./poseRunner";
import { SubjectTracker, type SubjectLockStats } from "./subjectLock";
import {
  SCOUT_SAMPLE_BUDGET,
  deriveScoutFindings,
  placeDenseWindowFromScout,
  selectScoutFrameIndices,
  type ScoutFindings,
  type ScoutObservation,
  type WindowSource,
} from "./scoutPass";
import type { LandmarkSeries, LandmarkSeriesFrame } from "./landmarkSeriesFormat";

/**
 * Per-clip frame budget. 600 frames is ~20s at 30fps, ~10s at 60fps and ~5s at
 * 120fps — comfortably longer than any swing or delivery — while keeping peak
 * memory and inference time inside what a mid-range phone tolerates.
 */
export const MAX_DENSE_FRAMES = 600;

/** Long edge the frames are decoded at for inference. BlazePose resamples to
 *  256px internally, so anything above this is decode cost with no accuracy
 *  return, and it keeps per-frame canvas work cheap on a phone. */
export const INFERENCE_MAX_EDGE = 640;

const SEEK_TIMEOUT_MS = 8_000;

export type FrameDensityTier = "below_floor" | "t_low" | "t_mid" | "t_high";

export function classifyDensityTier(fps: number): FrameDensityTier {
  if (!Number.isFinite(fps) || fps < 30) return "below_floor";
  if (fps >= 120) return "t_high";
  if (fps >= 60) return "t_mid";
  return "t_low";
}

export interface DenseWindow {
  readonly start_frame: number;
  readonly end_frame: number; // inclusive
  readonly frame_count: number;
  readonly start_sec: number;
  readonly end_sec: number;
  readonly rule: string;
  /** STEP 4 — how the window was chosen. Absent on the retained v1 placement. */
  readonly source?: WindowSource;
}

/**
 * STEP 4 — thrown when the scout pass cannot establish where the athlete is.
 * Carries canonical missingness so callers report a reason, never a guess.
 */
export class WindowSelectionFailure extends Error {
  readonly missingness: MissingnessRecord;
  readonly scout: ScoutFindings;
  constructor(record: MissingnessRecord, scout: ScoutFindings, detail: string) {
    super(`dense capture: window selection failed (${record.missing_reason}) — ${detail}`);
    this.name = "WindowSelectionFailure";
    this.missingness = record;
    this.scout = scout;
  }
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

/** v1 pure window placement. RETAINED FOR REFERENCE AND TESTS ONLY — the
 *  capture path uses the scout-driven placement in `scoutPass.ts`. */
export function selectDenseWindow(
  fps_true: number,
  duration_sec: number,
  landingTimeSec: number | null,
  budget: number = MAX_DENSE_FRAMES,
): DenseWindow | null {
  if (!Number.isFinite(fps_true) || fps_true <= 0) return null;
  if (!Number.isFinite(duration_sec) || duration_sec <= 0) return null;

  const totalFrames = Math.max(1, Math.floor(duration_sec * fps_true));
  const maxIndex = totalFrames - 1;
  const windowFrames = Math.min(totalFrames, Math.max(1, Math.floor(budget)));

  const hasLanding =
    landingTimeSec != null && landingTimeSec > 0 && landingTimeSec < duration_sec;
  const centre = hasLanding
    ? Math.min(maxIndex, Math.max(0, Math.round(landingTimeSec! * fps_true)))
    : Math.round(maxIndex / 2);
  const preRatio = hasLanding ? 0.6 : 0.5;

  let start = centre - Math.floor(windowFrames * preRatio);
  if (start < 0) start = 0;
  let end = start + windowFrames - 1;
  if (end > maxIndex) {
    end = maxIndex;
    start = Math.max(0, end - windowFrames + 1);
  }

  return {
    start_frame: start,
    end_frame: end,
    frame_count: end - start + 1,
    start_sec: round6(start / fps_true),
    end_sec: round6(end / fps_true),
    rule:
      windowFrames >= totalFrames
        ? "full_clip_native_fps"
        : hasLanding
          ? `budget_${windowFrames}_frames_landing_centred_60_40`
          : `budget_${windowFrames}_frames_midpoint_centred_50_50`,
  };
}

export interface DenseCaptureInput {
  readonly videoFile: Blob;
  readonly video_sha256_hex: string;
  readonly fps_true: number;
  readonly duration_sec: number;
  readonly width: number;
  readonly height: number;
  readonly orientation: "portrait" | "landscape" | "square";
  readonly landingTimeSec: number | null;
  readonly budget?: number;
  readonly onProgress?: (done: number, total: number) => void;
}

export interface DenseCaptureResult {
  readonly series: LandmarkSeries;
  readonly window: DenseWindow;
  readonly density_tier: FrameDensityTier;
  readonly frames_processed: number;
  readonly frames_with_pose: number;
  readonly frames_dropped: number;
  readonly mean_visibility: number;
  /** STEP 3 — how the athlete was picked and how well the lock held. */
  readonly subject_lock: SubjectLockStats;
}

function seekTo(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      video.removeEventListener("seeked", onSeeked);
      reject(new Error("seek timeout"));
    }, SEEK_TIMEOUT_MS);
    const onSeeked = () => {
      clearTimeout(timer);
      resolve();
    };
    video.addEventListener("seeked", onSeeked, { once: true });
    video.currentTime = t;
  });
}

export async function captureDenseLandmarkSeries(
  input: DenseCaptureInput,
): Promise<DenseCaptureResult> {
  const window = selectDenseWindow(
    input.fps_true,
    input.duration_sec,
    input.landingTimeSec,
    input.budget ?? MAX_DENSE_FRAMES,
  );
  if (!window) throw new Error("dense capture: unusable probe (fps/duration)");

  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = "anonymous";
  const url = URL.createObjectURL(input.videoFile);
  video.src = url;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("dense capture: canvas 2D context unavailable");

  try {
    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => resolve();
      const onErr = () => reject(new Error("video metadata load failed"));
      video.addEventListener("loadedmetadata", onLoaded, { once: true });
      video.addEventListener("error", onErr, { once: true });
    });

    const srcW = video.videoWidth || input.width;
    const srcH = video.videoHeight || input.height;
    if (!srcW || !srcH) throw new Error("dense capture: video has invalid dimensions");
    const longest = Math.max(srcW, srcH);
    const scale = longest > INFERENCE_MAX_EDGE ? INFERENCE_MAX_EDGE / longest : 1;
    canvas.width = Math.max(1, Math.round(srcW * scale));
    canvas.height = Math.max(1, Math.round(srcH * scale));

    const landmarker = await getPoseLandmarkerForDenseCapture();

    const frames: LandmarkSeriesFrame[] = [];
    let framesWithPose = 0;
    let dropped = 0;
    let visSum = 0;

    const tracker = new SubjectTracker(input.fps_true);
    const total = window.frame_count;
    for (let i = 0; i < total; i++) {
      const frameIndex = window.start_frame + i;
      const t = round6(frameIndex / input.fps_true);
      try {
        await seekTo(video, t);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // STEP 3 — every person in frame, then the locked athlete only.
        const candidates = detectDensePoseCandidates(landmarker, canvas);
        const step = tracker.step(candidates);
        const d = step.candidate_index == null ? null : candidates[step.candidate_index];
        if (d) {
          framesWithPose += 1;
          visSum += d.mean_visibility;
        }
        frames.push({
          frame_index: frameIndex,
          timestamp_seconds: t,
          // A frame where the lock could not be held is UNOBSERVED for the
          // locked subject. It is never filled with a different body.
          pose_detected: d != null,
          normalized: d ? d.normalized : [],
          world: d ? d.world : [],
          visibility: d ? d.visibility : [],
        });
      } catch {
        // A frame that could not be decoded is recorded as an undetected frame
        // rather than skipped — the series stays index-contiguous, and the gap
        // is honestly visible to every downstream reader.
        dropped += 1;
        tracker.step([]);
        frames.push({
          frame_index: frameIndex,
          timestamp_seconds: t,
          pose_detected: false,
          normalized: [],
          world: [],
          visibility: [],
        });
      }
      input.onProgress?.(i + 1, total);
    }

    const lock = tracker.stats();

    const series: LandmarkSeries = {
      header: {
        format: "ndjson.gz@1",
        video_sha256_hex: input.video_sha256_hex,
        landmark_model_id: LANDMARK_MODEL_ID,
        landmark_model_version: LANDMARK_MODEL_VERSION,
        fps_true: input.fps_true,
        fps_source: "measured_rvfc",
        width: srcW,
        height: srcH,
        orientation: input.orientation,
        frame_count: frames.length,
        window_start_frame: window.start_frame,
        window_end_frame: window.end_frame,
        window_start_sec: window.start_sec,
        window_end_sec: window.end_sec,
        window_rule: window.rule,
        inference_width: canvas.width,
        inference_height: canvas.height,
        landmark_count: 33,
        subjects_detected_min: lock.subjects_detected_min,
        subjects_detected_median: lock.subjects_detected_median,
        subjects_detected_max: lock.subjects_detected_max,
        subject_selection_rule: lock.selection_rule,
        subject_locked_on_ordinal: lock.locked_on_ordinal,
        subject_locked_candidate_index: lock.locked_candidate_index,
        subject_frames_locked: lock.frames_locked,
        subject_frames_lost: lock.frames_lost,
        subject_reacquisitions: lock.reacquisitions,
        subject_track_reliable: lock.track_reliable,
      },
      frames,
    };

    return {
      series,
      window,
      density_tier: classifyDensityTier(input.fps_true),
      frames_processed: frames.length,
      frames_with_pose: framesWithPose,
      frames_dropped: dropped,
      mean_visibility:
        framesWithPose > 0 ? round6(visSum / framesWithPose) : 0,
      subject_lock: lock,
    };
  } finally {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* noop */
    }
  }
}

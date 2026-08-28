/**
 * Validation harness — MediaPipe geometry vs. the AI-vision guess, for
 * `energy_angle_deg` and `head_vertical_movement_pct`.
 *
 * The variability audit found the AI-vision versions of these two tiles were
 * not measurements: `energy_angle_deg` returned a constant 20 on every clip it
 * answered, and `head_vertical_movement_pct` never produced a value at all.
 * This harness runs the replacement MediaPipe modules — the real ones from
 * `src/lib/biomech/metrics`, not a reimplementation — over per-frame pose
 * extracted from real pitching clips, and reports the output distribution so
 * the question "does the output actually vary with the input" is answered with
 * data rather than an assurance.
 *
 * It also exercises the two guards on every clip:
 *   - stability under a 1-frame shift of the anchor / window,
 *   - the live-pitch gate (ball-in-flight evidence).
 *
 * Input: JSON produced by the pose-extraction pass, one file per clip:
 *   { video_id, fps, width, height, stride, frames: [{ frame_index,
 *     landmarks: { nose: {x,y,visibility}, ... } | null }] }
 * Coordinates are normalized [0,1], as MediaPipe emits them.
 *
 * Usage:
 *   bun scripts/validation/mediapipeMetricVariability.ts <pose-dir> [out.json]
 *
 * Read-only. Touches no database, no production path, and no feature flag.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  computeGuardedEnergyAngleDeg,
  ENERGY_ANGLE_STABILITY_TOLERANCE_DEG,
} from "../../src/lib/biomech/metrics/energyAngleGuarded";
import {
  computeGuardedHeadVerticalMovementPct,
  HEAD_MOVEMENT_STABILITY_TOLERANCE_PCT,
} from "../../src/lib/biomech/metrics/headVerticalMovementGuarded";
import { computeEnergyAngleDeg } from "../../src/lib/biomech/metrics/energyAngleDeg";
import { computeHeadVerticalMovementPct } from "../../src/lib/biomech/metrics/headVerticalMovementPct";
import type { HeadMovementFrame } from "../../src/lib/biomech/metrics/headVerticalMovementPct";
import type { BallDetectionFrame } from "../../src/lib/cv/ball/types";

// ---------------------------------------------------------------- pose input

const LANDMARK_INDEX: Record<string, number> = {
  nose: 0,
  left_elbow: 13,
  right_elbow: 14,
  left_wrist: 15,
  right_wrist: 16,
  left_shoulder: 11,
  right_shoulder: 12,
  left_hip: 23,
  right_hip: 24,
  left_knee: 25,
  right_knee: 26,
  left_ankle: 27,
  right_ankle: 28,
  left_heel: 29,
  right_heel: 30,
  left_foot_index: 31,
  right_foot_index: 32,
};

interface RawLandmark {
  x: number;
  y: number;
  visibility: number;
}
interface RawFrame {
  frame_index: number;
  landmarks: Record<string, RawLandmark> | null;
}
interface PoseFile {
  video_id: string;
  fps: number;
  width: number;
  height: number;
  stride: number;
  frames: RawFrame[];
}

type Landmark = { x: number; y: number; visibility: number };

/** Expand the sparse named landmarks into the 33-slot BlazePose array. */
function toLandmarkArray(raw: Record<string, RawLandmark> | null): Landmark[] {
  const arr: Landmark[] = Array.from({ length: 33 }, () => ({
    x: 0,
    y: 0,
    visibility: 0,
  }));
  if (!raw) return arr;
  for (const [name, lm] of Object.entries(raw)) {
    const idx = LANDMARK_INDEX[name];
    if (idx == null) continue;
    arr[idx] = { x: lm.x, y: lm.y, visibility: lm.visibility };
  }
  return arr;
}

// -------------------------------------------------------------- anchor logic

/**
 * Peak leg lift = the frame where the lift knee sits highest relative to the
 * hips (smallest knee_y − hip_y, image coords), searched over the first 70% of
 * the clip so a follow-through knee drive can't win. Derived from the pose,
 * matching how the metric module derives the plant side.
 */
function findPeakLegLiftFrame(frames: RawFrame[]): number | null {
  const limit = Math.max(1, Math.floor(frames.length * 0.7));
  let best: { index: number; score: number } | null = null;
  for (let i = 0; i < limit; i++) {
    const lm = frames[i]?.landmarks;
    if (!lm) continue;
    const hipY = (lm.left_hip?.y ?? NaN) + (lm.right_hip?.y ?? NaN);
    if (!Number.isFinite(hipY)) continue;
    const midHipY = hipY / 2;
    const knees = [lm.left_knee, lm.right_knee].filter(
      (k): k is RawLandmark => !!k && k.visibility >= 0.5,
    );
    if (knees.length === 0) continue;
    // Highest knee in the image = smallest y.
    const topKneeY = Math.min(...knees.map((k) => k.y));
    const score = topKneeY - midHipY;
    if (!best || score < best.score) {
      best = { index: frames[i].frame_index, score };
    }
  }
  return best?.index ?? null;
}

/**
 * Release ≈ the frame of maximum throwing-hand extension: the wrist furthest
 * from the mid-hip, searched after peak leg lift. A proxy, and labelled as one
 * in the report — the production path uses the real anchor detector.
 */
function findReleaseFrame(
  frames: RawFrame[],
  afterFrameIndex: number | null,
): number | null {
  let best: { index: number; score: number } | null = null;
  for (const f of frames) {
    if (afterFrameIndex != null && f.frame_index <= afterFrameIndex) continue;
    const lm = f.landmarks;
    if (!lm) continue;
    const hx = ((lm.left_hip?.x ?? NaN) + (lm.right_hip?.x ?? NaN)) / 2;
    const hy = ((lm.left_hip?.y ?? NaN) + (lm.right_hip?.y ?? NaN)) / 2;
    if (!Number.isFinite(hx) || !Number.isFinite(hy)) continue;
    const wrists = [lm.left_wrist, lm.right_wrist].filter(
      (w): w is RawLandmark => !!w && w.visibility >= 0.5,
    );
    if (wrists.length === 0) continue;
    const score = Math.max(
      ...wrists.map((w) => Math.hypot(w.x - hx, w.y - hy)),
    );
    if (!best || score > best.score) best = { index: f.frame_index, score };
  }
  return best?.index ?? null;
}

/**
 * Window start. Default is the first posed frame; pass `--window-seconds N` to
 * start N seconds before the release proxy instead. The default deliberately
 * over-covers so the report shows what a loose window does to the answer.
 */
function findSetupFrame(
  frames: RawFrame[],
  release: number | null,
  windowSeconds: number | null,
  fps: number,
): number | null {
  const first = frames.find((f) => f.landmarks)?.frame_index ?? null;
  if (windowSeconds == null || release == null || !(fps > 0)) return first;
  const start = release - Math.round(windowSeconds * fps);
  return first == null ? start : Math.max(first, start);
}

const WINDOW_SECONDS = (() => {
  const i = process.argv.indexOf("--window-seconds");
  return i > -1 ? Number(process.argv[i + 1]) : null;
})();

function frameAt(frames: RawFrame[], index: number | null): RawFrame | null {
  if (index == null) return null;
  return frames.find((f) => f.frame_index === index) ?? null;
}

// ----------------------------------------------------------- detection input

/**
 * Ball detections are produced by the CV detector at analysis time and are not
 * part of the pose export, so the harness runs the live-pitch gate in two
 * declared conditions rather than pretending to have real detections:
 *
 *   "live"  — synthetic ball-in-flight around the release proxy, i.e. what the
 *             detector emits on a real pitch. Isolates the stability guard.
 *   "drill" — no ball anywhere, i.e. a dry/towel rep.
 *
 * This measures guard behaviour, not detector accuracy. Detector accuracy is a
 * separate, already-reported question (the on-device parity run).
 */
function syntheticFlight(releaseFrame: number | null): BallDetectionFrame[] {
  if (releaseFrame == null) return [];
  return [0, 1, 2, 3].map((n) => ({
    frame_index: releaseFrame + n,
    timestamp_seconds: (releaseFrame + n) / 30,
    image_width: 1920,
    image_height: 1080,
    predictions: [],
    chosen: {
      x: 400 + n * 320,
      y: 500 + n * 22,
      width: 12,
      height: 12,
      confidence: 0.82,
      class: "baseball",
    },
  }));
}

function syntheticDrill(releaseFrame: number | null): BallDetectionFrame[] {
  if (releaseFrame == null) return [];
  return [0, 1, 2, 3, 4].map((n) => ({
    frame_index: releaseFrame + n,
    timestamp_seconds: (releaseFrame + n) / 30,
    image_width: 1920,
    image_height: 1080,
    predictions: [],
    chosen: null,
  }));
}

// ------------------------------------------------------------------ analysis

interface ClipReport {
  video_id: string;
  width: number;
  height: number;
  fps: number;
  posed_frames: number;
  peak_leg_lift_frame: number | null;
  release_frame_proxy: number | null;
  energy_angle: {
    raw: number | null;
    raw_missing: string | null;
    guarded_live: number | null;
    guard_live: string | null;
    guarded_drill_guard: string | null;
    delta_1_frame: number | null;
  };
  head_movement: {
    raw: number | null;
    raw_missing: string | null;
    guarded_live: number | null;
    guard_live: string | null;
    guarded_drill_guard: string | null;
    delta_1_frame: number | null;
    tracked_frames: number;
  };
}

function analyzeClip(pose: PoseFile): ClipReport {
  const frames = pose.frames;
  const posed = frames.filter((f) => f.landmarks);
  const peak = findPeakLegLiftFrame(frames);
  const release = findReleaseFrame(frames, peak);
  const setup = findSetupFrame(frames, release, WINDOW_SECONDS, pose.fps);

  const peakFrame = frameAt(frames, peak);
  const neighbourIndex =
    peak == null ? null : (frames.find((f) => f.frame_index > peak)?.frame_index ?? null);
  const neighbourFrame = frameAt(frames, neighbourIndex);
  const shift = ((neighbourIndex ?? 0) - (peak ?? 0) || 1) as 1 | -1;

  const eaCommon = {
    landmarks: toLandmarkArray(peakFrame?.landmarks ?? null),
    shifted_landmarks: neighbourFrame
      ? toLandmarkArray(neighbourFrame.landmarks)
      : null,
    shift_frames: 1 as const,
    peak_leg_lift_frame_index: peak,
    release_frame_index: release,
    frame_width: pose.width,
    frame_height: pose.height,
  };
  void shift;

  const eaRaw = computeEnergyAngleDeg({
    landmarks: eaCommon.landmarks,
    peak_leg_lift_frame_index: peak,
    frame_width: pose.width,
    frame_height: pose.height,
  });
  const eaLive = computeGuardedEnergyAngleDeg({
    ...eaCommon,
    detectionFrames: syntheticFlight(release),
  });
  const eaDrill = computeGuardedEnergyAngleDeg({
    ...eaCommon,
    detectionFrames: syntheticDrill(release),
  });

  const hmFrames: HeadMovementFrame[] = frames.map((f) => ({
    frame_index: f.frame_index,
    pose_detected: !!f.landmarks,
    landmarks: toLandmarkArray(f.landmarks),
  }));

  const hmCommon = {
    frames: hmFrames,
    start_frame_index: setup,
    release_frame_index: release,
    shift_frames: 1 as const,
    frame_height: pose.height,
  };

  const hmRaw = computeHeadVerticalMovementPct({
    frames: hmFrames,
    start_frame_index: setup,
    release_frame_index: release,
    frame_height: pose.height,
  });
  const hmLive = computeGuardedHeadVerticalMovementPct({
    ...hmCommon,
    detectionFrames: syntheticFlight(release),
  });
  const hmDrill = computeGuardedHeadVerticalMovementPct({
    ...hmCommon,
    detectionFrames: syntheticDrill(release),
  });

  return {
    video_id: pose.video_id,
    width: pose.width,
    height: pose.height,
    fps: Math.round(pose.fps * 100) / 100,
    posed_frames: posed.length,
    peak_leg_lift_frame: peak,
    release_frame_proxy: release,
    energy_angle: {
      raw: eaRaw.value,
      raw_missing: eaRaw.missingness?.missing_reason ?? null,
      guarded_live: eaLive.value,
      guard_live: eaLive.guard,
      guarded_drill_guard: eaDrill.guard,
      delta_1_frame: eaLive.lineage.delta_deg,
    },
    head_movement: {
      raw: hmRaw.value,
      raw_missing: hmRaw.missingness?.missing_reason ?? null,
      guarded_live: hmLive.value,
      guard_live: hmLive.guard,
      guarded_drill_guard: hmDrill.guard,
      delta_1_frame: hmLive.lineage.delta_pct,
      tracked_frames: hmRaw.lineage.tracked_frames,
    },
  };
}

// -------------------------------------------------------------------- report

function stats(values: readonly number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const sd = Math.sqrt(
    sorted.reduce((a, b) => a + (b - mean) ** 2, 0) / sorted.length,
  );
  return {
    n: sorted.length,
    min: round2(sorted[0]),
    p50: round2(sorted[sorted.length >> 1]),
    max: round2(sorted[sorted.length - 1]),
    mean: round2(mean),
    sd: round2(sd),
    distinct: new Set(sorted.map((v) => round2(v))).size,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function main() {
  const dir = process.argv[2];
  const outPath = process.argv[3];
  if (!dir) {
    console.error(
      "usage: bun scripts/validation/mediapipeMetricVariability.ts <pose-dir> [out.json]",
    );
    process.exit(1);
  }

  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  const reports: ClipReport[] = [];
  for (const file of files) {
    const pose = JSON.parse(readFileSync(join(dir, file), "utf8")) as PoseFile;
    reports.push(analyzeClip(pose));
  }

  const eaRaw = reports
    .map((r) => r.energy_angle.raw)
    .filter((v): v is number => v != null);
  const eaGuarded = reports
    .map((r) => r.energy_angle.guarded_live)
    .filter((v): v is number => v != null);
  const hmRaw = reports
    .map((r) => r.head_movement.raw)
    .filter((v): v is number => v != null);
  const hmGuarded = reports
    .map((r) => r.head_movement.guarded_live)
    .filter((v): v is number => v != null);

  const summary = {
    clips: reports.length,
    energy_angle_deg: {
      ungated: stats(eaRaw),
      guarded_live_pitch: stats(eaGuarded),
      stability_tolerance_deg: ENERGY_ANGLE_STABILITY_TOLERANCE_DEG,
      withheld_by_guard: reports.filter((r) => r.energy_angle.guard_live).length,
      guard_breakdown: countBy(
        reports.map((r) => r.energy_angle.guard_live ?? "passed"),
      ),
      drill_condition_all_blocked: reports
        .filter((r) => r.energy_angle.raw != null)
        .every((r) => r.energy_angle.guarded_drill_guard === "live_pitch_gate"),
    },
    head_vertical_movement_pct: {
      ungated: stats(hmRaw),
      guarded_live_pitch: stats(hmGuarded),
      stability_tolerance_pct: HEAD_MOVEMENT_STABILITY_TOLERANCE_PCT,
      withheld_by_guard: reports.filter((r) => r.head_movement.guard_live)
        .length,
      guard_breakdown: countBy(
        reports.map((r) => r.head_movement.guard_live ?? "passed"),
      ),
      drill_condition_all_blocked: reports
        .filter((r) => r.head_movement.raw != null)
        .every((r) => r.head_movement.guarded_drill_guard === "live_pitch_gate"),
    },
  };

  const output = { summary, clips: reports };
  console.log(JSON.stringify(output, null, 2));
  if (outPath) writeFileSync(outPath, JSON.stringify(output, null, 2));
}

function countBy(values: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of values) out[v] = (out[v] ?? 0) + 1;
  return out;
}

main();

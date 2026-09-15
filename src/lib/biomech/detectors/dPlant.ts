/**
 * STEP 2 — D-PLANT, the front-foot plant detector.
 *
 * Spec: `.lovable/canonical-measurement-architecture.md`
 *   - anchors `front_foot_first_contact` and `front_foot_full_plant`
 *   - detector D-PLANT: "ankle/heel y-velocity zero-crossing with
 *     vertical-load gate"
 *   - permitted source: pose. Min confidence 0.7. Fallback: missing.
 *
 * Shape follows `metrics/tempoSec.ts`: pure function, explicit inputs,
 * canonical missingness, never a guess, no model in the value path.
 *
 * INPUT is the PERSISTED landmark series (STEP 1), not a fresh video pass.
 *
 * DETERMINISM: fixed-width smoothing, fixed thresholds, integer frame indices,
 * deterministic tie-breaks (earliest frame wins), all rounding fixed. No RNG,
 * no clock, no model call.
 */

import type { LandmarkSeries, LandmarkSeriesFrame } from "../pose/landmarkSeriesFormat";
import {
  MISSINGNESS_REASONS,
  missingness,
  type MissingnessRecord,
} from "../metrics/missingness";
import { detectorVersion, isDetectorStubbed } from "../detectorVersions";

/* ------------------------------------------------------------------ */
/* BlazePose indices required by D-PLANT                               */
/* ------------------------------------------------------------------ */

export const PLANT_LANDMARK_INDEX = {
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

/* ------------------------------------------------------------------ */
/* Fixed constants — every one of these is part of the version string  */
/* ------------------------------------------------------------------ */

/** Per-landmark visibility below this is treated as not observed. */
const MIN_LANDMARK_VISIBILITY = 0.5;
/** Fraction of window frames that must carry all required foot landmarks. */
const MIN_OBSERVED_FRACTION = 0.6;
/** Normalized-image margin: a foot closer than this to an edge is out of frame. */
const FRAME_EDGE_MARGIN = 0.005;
/**
 * Absolute fps floor (canonical capture envelope: ">=30 fps floor").
 * 29.9 rather than 30.0 so NTSC rates (29.97 / 59.94) are not rejected on a
 * rounding artefact. Anything genuinely below 30 fps still fails.
 */
const FPS_FLOOR = 29.9;
/** T-mid threshold: heel-plant timing is specified at >= 60 fps. */
const FPS_T_MID = 59.9; // NTSC 59.94 counts as T-mid
/** Moving-average half-width, in frames, applied to the foot-y track. */
const SMOOTH_HALF_WIDTH = 2; // 5-tap
/** Quiescence: |velocity| under this fraction of peak descent counts as still. */
const QUIESCENT_FRACTION = 0.15;
/** Foot must sit within this band of its lowest observed y to be "loaded". */
const LOAD_BAND_NORMALIZED = 0.012;
/** Canonical minimum anchor confidence. Below this the anchor is missing. */
export /** A foot cannot move 15% of frame height in one frame; that is a subject switch. */
const SUBJECT_JUMP_NORMALIZED = 0.15;

export const D_PLANT_MIN_CONFIDENCE = 0.7;

export type FrontSide = "left" | "right" | "auto";
export type TemporalTier = "T-low" | "T-mid" | "T-high";

export interface PlantAnchor {
  readonly frame_index: number;
  readonly t_seconds: number;
  readonly confidence: number;
}

export interface DPlantDiagnostics {
  readonly front_side_used: "left" | "right" | null;
  readonly fps_true: number;
  readonly temporal_tier: TemporalTier | null;
  /** Frame index of the contact candidate, present even when the plant fails. */
  readonly first_contact_candidate_frame?: number;
  /** Which stage rejected the anchor, when one did. */
  readonly failure_stage?: string;
  /** One frame interval, in ms. The irreducible uncertainty of any anchor. */
  readonly anchor_uncertainty_ms: number | null;
  readonly frames_in_window: number;
  readonly frames_observed: number;
  readonly observed_fraction: number;
  /**
   * Consecutive-observed-frame steps where the tracked foot jumps further than
   * SUBJECT_JUMP_NORMALIZED of frame height — physically impossible for a foot,
   * so it means the single-subject pose track switched people. Diagnostic only;
   * it does not gate the anchor.
   */
  readonly subject_track_jumps?: number;
  readonly subject_track_jump_fraction?: number;
  readonly min_required_visibility: number;
  readonly peak_descent_frame: number | null;
  readonly peak_descent_velocity_per_sec: number | null;
  readonly noise_sigma_per_sec: number | null;
  readonly confidence_factors: {
    readonly landmark_visibility_factor: number | null;
    readonly anchor_temporal_certainty: number | null;
    readonly numeric_stability_factor: number | null;
    readonly temporal_tier_factor: number | null;
  };
}

export interface DPlantResult {
  readonly front_foot_first_contact: PlantAnchor | null;
  readonly front_foot_full_plant: PlantAnchor | null;
  /** Non-null whenever either anchor is absent. */
  readonly missingness: MissingnessRecord | null;
  readonly detector_id: "D-PLANT";
  readonly detector_version: string;
  readonly landmark_model_version: string;
  readonly diagnostics: DPlantDiagnostics;
}

export interface DPlantOptions {
  /** Which foot is the front (stride) foot. "auto" = larger downward excursion. */
  readonly front_side?: FrontSide;
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}
function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

function emptyDiagnostics(
  fps: number,
  frames: number,
): DPlantDiagnostics {
  return {
    front_side_used: null,
    fps_true: fps,
    temporal_tier: null,
    anchor_uncertainty_ms: null,
    frames_in_window: frames,
    frames_observed: 0,
    observed_fraction: 0,
    min_required_visibility: MIN_LANDMARK_VISIBILITY,
    peak_descent_frame: null,
    peak_descent_velocity_per_sec: null,
    noise_sigma_per_sec: null,
    confidence_factors: {
      landmark_visibility_factor: null,
      anchor_temporal_certainty: null,
      numeric_stability_factor: null,
      temporal_tier_factor: null,
    },
  };
}

function fail(
  reason: (typeof MISSINGNESS_REASONS)[keyof typeof MISSINGNESS_REASONS],
  landmarkModelVersion: string,
  diagnostics: DPlantDiagnostics,
): DPlantResult {
  return {
    front_foot_first_contact: null,
    front_foot_full_plant: null,
    missingness: missingness(reason, "D-PLANT"),
    detector_id: "D-PLANT",
    detector_version: detectorVersion("D-PLANT"),
    landmark_model_version: landmarkModelVersion,
    diagnostics,
  };
}

/** Read one landmark component out of a packed frame row. */
function lm(
  f: LandmarkSeriesFrame,
  index: number,
): { x: number; y: number; vis: number } | null {
  if (!f.pose_detected) return null;
  const base = index * 3;
  const x = f.normalized[base];
  const y = f.normalized[base + 1];
  const vis = f.visibility[index];
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(vis)) return null;
  return { x, y, vis };
}

interface FootSample {
  readonly frame_index: number;
  readonly t: number;
  /** Mean y of ankle+heel+foot_index. Image coords: larger y = lower in frame. */
  readonly y: number;
  readonly min_vis: number;
  readonly out_of_frame: boolean;
}

function footTrack(
  frames: readonly LandmarkSeriesFrame[],
  side: "left" | "right",
): (FootSample | null)[] {
  const ankleIdx = side === "left" ? PLANT_LANDMARK_INDEX.LEFT_ANKLE : PLANT_LANDMARK_INDEX.RIGHT_ANKLE;
  const heelIdx = side === "left" ? PLANT_LANDMARK_INDEX.LEFT_HEEL : PLANT_LANDMARK_INDEX.RIGHT_HEEL;
  const toeIdx = side === "left" ? PLANT_LANDMARK_INDEX.LEFT_FOOT_INDEX : PLANT_LANDMARK_INDEX.RIGHT_FOOT_INDEX;

  return frames.map((f) => {
    const a = lm(f, ankleIdx);
    const h = lm(f, heelIdx);
    const t = lm(f, toeIdx);
    if (!a || !h || !t) return null;
    const minVis = Math.min(a.vis, h.vis, t.vis);
    if (minVis < MIN_LANDMARK_VISIBILITY) return null;
    const pts = [a, h, t];
    const outOfFrame = pts.some(
      (p) =>
        p.x < FRAME_EDGE_MARGIN ||
        p.x > 1 - FRAME_EDGE_MARGIN ||
        p.y < FRAME_EDGE_MARGIN ||
        p.y > 1 - FRAME_EDGE_MARGIN,
    );
    return {
      frame_index: f.frame_index,
      t: f.timestamp_seconds,
      y: (a.y + h.y + t.y) / 3,
      min_vis: minVis,
      out_of_frame: outOfFrame,
    };
  });
}

/** Hip-centre y per frame, used by the vertical-load gate. */
function hipTrack(frames: readonly LandmarkSeriesFrame[]): (number | null)[] {
  return frames.map((f) => {
    const l = lm(f, PLANT_LANDMARK_INDEX.LEFT_HIP);
    const r = lm(f, PLANT_LANDMARK_INDEX.RIGHT_HIP);
    if (!l || !r) return null;
    if (Math.min(l.vis, r.vis) < MIN_LANDMARK_VISIBILITY) return null;
    return (l.y + r.y) / 2;
  });
}

/** Fixed-width moving average over observed samples; gaps stay null. */
function smooth(track: (number | null)[]): (number | null)[] {
  return track.map((v, i) => {
    if (v == null) return null;
    let sum = 0;
    let n = 0;
    for (let k = i - SMOOTH_HALF_WIDTH; k <= i + SMOOTH_HALF_WIDTH; k++) {
      const s = track[k];
      if (k >= 0 && k < track.length && s != null) {
        sum += s;
        n += 1;
      }
    }
    return n === 0 ? null : sum / n;
  });
}

/** Central-difference velocity in normalized-y units per second. */
function velocity(track: (number | null)[], fps: number): (number | null)[] {
  return track.map((_, i) => {
    const prev = track[i - 1];
    const next = track[i + 1];
    if (prev != null && next != null) return ((next - prev) / 2) * fps;
    const cur = track[i];
    if (cur == null) return null;
    if (next != null) return (next - cur) * fps;
    if (prev != null) return (cur - prev) * fps;
    return null;
  });
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

export function detectFrontFootPlant(
  series: LandmarkSeries,
  options: DPlantOptions = {},
): DPlantResult {
  const landmarkModelVersion = series.header.landmark_model_version;
  const frames = series.frames;
  const fps = series.header.fps_true;

  // Per-detector stub gate. D-PLANT is real; siblings remain stubbed and keep
  // short-circuiting through their own modules.
  if (isDetectorStubbed("D-PLANT")) {
    return fail(
      MISSINGNESS_REASONS.ANCHOR_NOT_DETECTED,
      landmarkModelVersion,
      emptyDiagnostics(fps, frames.length),
    );
  }

  if (!Number.isFinite(fps) || fps < FPS_FLOOR || frames.length < 5) {
    return fail(
      MISSINGNESS_REASONS.INSUFFICIENT_TEMPORAL_RESOLUTION,
      landmarkModelVersion,
      emptyDiagnostics(fps, frames.length),
    );
  }

  const tier: TemporalTier = fps >= 120 ? "T-high" : fps >= FPS_T_MID ? "T-mid" : "T-low";
  // The tier does NOT scale anchor confidence. Frame-density tiers govern
  // METRICS whose value is an inter-frame delta; the anchor itself is simply
  // located to +/- one frame. The tier and the resulting per-frame uncertainty
  // are reported in diagnostics so a downstream metric can enforce its own
  // tier requirement (e.g. heel-plant timing needs T-mid).
  const tierFactor = 1;

  // --- front-foot selection -----------------------------------------
  const tracks = {
    left: footTrack(frames, "left"),
    right: footTrack(frames, "right"),
  } as const;

  function excursion(track: (FootSample | null)[]): number {
    const ys = track.filter((s): s is FootSample => s != null).map((s) => s.y);
    if (ys.length < 5) return -1;
    return Math.max(...ys) - Math.min(...ys);
  }

  let side: "left" | "right";
  if (options.front_side === "left" || options.front_side === "right") {
    side = options.front_side;
  } else {
    const el = excursion(tracks.left);
    const er = excursion(tracks.right);
    // Deterministic tie-break: left wins.
    side = er > el ? "right" : "left";
  }

  const track = tracks[side];
  const observed = track.filter((s): s is FootSample => s != null);
  const observedFraction = frames.length === 0 ? 0 : observed.length / frames.length;

  // Subject-identity continuity diagnostic (see DPlantDiagnostics).
  let jumpCount = 0;
  let jumpSteps = 0;
  for (let i = 1; i < track.length; i++) {
    const a = track[i - 1];
    const b = track[i];
    if (a == null || b == null) continue;
    jumpSteps += 1;
    if (Math.abs(b.y - a.y) > SUBJECT_JUMP_NORMALIZED) jumpCount += 1;
  }

  const baseDiag: DPlantDiagnostics = {
    front_side_used: side,
    fps_true: fps,
    temporal_tier: tier,
    anchor_uncertainty_ms: round4(1000 / fps),
    frames_in_window: frames.length,
    frames_observed: observed.length,
    observed_fraction: round4(observedFraction),
    subject_track_jumps: jumpCount,
    subject_track_jump_fraction: round4(jumpSteps > 0 ? jumpCount / jumpSteps : 0),
    min_required_visibility: MIN_LANDMARK_VISIBILITY,
    peak_descent_frame: null,
    peak_descent_velocity_per_sec: null,
    noise_sigma_per_sec: null,
    confidence_factors: {
      landmark_visibility_factor: null,
      anchor_temporal_certainty: null,
      numeric_stability_factor: null,
      temporal_tier_factor: tierFactor,
    },
  };

  if (observedFraction < MIN_OBSERVED_FRACTION || observed.length < 5) {
    return fail(MISSINGNESS_REASONS.LANDMARK_OCCLUDED, landmarkModelVersion, baseDiag);
  }

  if (observed.some((s) => s.out_of_frame)) {
    return fail(MISSINGNESS_REASONS.OUT_OF_FRAME, landmarkModelVersion, baseDiag);
  }

  // --- velocity track ------------------------------------------------
  const ySmooth = smooth(track.map((s) => (s ? s.y : null)));
  const vel = velocity(ySmooth, fps);
  const hipSmooth = smooth(hipTrack(frames));

  // Peak descent: largest positive dy/dt (foot travelling DOWN the image).
  let peakIdx = -1;
  let peakVel = 0;
  for (let i = 0; i < vel.length; i++) {
    const v = vel[i];
    if (v != null && v > peakVel) {
      peakVel = v;
      peakIdx = i;
    }
  }
  if (peakIdx < 0 || peakVel <= 0) {
    return fail(MISSINGNESS_REASONS.ANCHOR_NOT_DETECTED, landmarkModelVersion, baseDiag);
  }

  const absVels = vel.filter((v): v is number => v != null).map(Math.abs);
  const noiseSigma = median(absVels);
  const quiescent = QUIESCENT_FRACTION * peakVel;

  const diagWithVel: DPlantDiagnostics = {
    ...baseDiag,
    peak_descent_frame: track[peakIdx]?.frame_index ?? null,
    peak_descent_velocity_per_sec: round6(peakVel),
    noise_sigma_per_sec: round6(noiseSigma),
  };

  // --- first contact: first zero-crossing at/after peak descent -------
  let contactIdx = -1;
  for (let i = peakIdx + 1; i < vel.length; i++) {
    const v = vel[i];
    if (v == null) continue;
    if (v <= quiescent) {
      contactIdx = i;
      break;
    }
  }
  if (contactIdx < 0) {
    return fail(MISSINGNESS_REASONS.ANCHOR_NOT_DETECTED, landmarkModelVersion, {
      ...diagWithVel,
      failure_stage: "no_zero_crossing_after_peak_descent",
    });
  }

  // --- full plant: quiescence held + vertical-load gate ---------------
  // The plant must follow first contact closely; searching the whole clip lets
  // an unrelated later descent (walk-off, camera drift) define "lowest".
  const holdFrames = Math.max(2, Math.ceil(fps / 20));
  const plantSearchEnd = Math.min(vel.length - 1, contactIdx + Math.ceil(fps * 0.5));
  const contactFrameIndex = track[contactIdx]?.frame_index ?? 0;
  const plantSearchFrameEnd = track[plantSearchEnd]?.frame_index ?? Number.MAX_SAFE_INTEGER;
  const localLows = observed
    .filter((s) => s.frame_index >= contactFrameIndex && s.frame_index <= plantSearchFrameEnd)
    .map((s) => s.y);
  const lowestY = localLows.length > 0 ? Math.max(...localLows) : Number.NEGATIVE_INFINITY;
  const contactHipY = hipSmooth[contactIdx];

  let plantIdx = -1;
  for (let i = contactIdx; i <= plantSearchEnd; i++) {
    let held = true;
    for (let k = i; k < i + holdFrames; k++) {
      const v = vel[k];
      const yk = ySmooth[k];
      if (k >= vel.length || v == null || yk == null) {
        held = false;
        break;
      }
      if (Math.abs(v) > quiescent) {
        held = false;
        break;
      }
      // Vertical-load gate part 1: foot is sitting at its lowest position.
      if (lowestY - yk > LOAD_BAND_NORMALIZED) {
        held = false;
        break;
      }
    }
    if (!held) continue;
    // Vertical-load gate part 2: body mass is at or below its height at first
    // contact — i.e. weight is going INTO the foot, not still riding over it.
    const hipHere = hipSmooth[i];
    if (contactHipY != null && hipHere != null && hipHere < contactHipY - LOAD_BAND_NORMALIZED) {
      continue;
    }
    plantIdx = i;
    break;
  }
  if (plantIdx < 0) {
    return fail(MISSINGNESS_REASONS.ANCHOR_NOT_DETECTED, landmarkModelVersion, {
      ...diagWithVel,
      first_contact_candidate_frame: contactFrameIndex,
      failure_stage: "quiescence_or_load_gate_never_satisfied",
    });
  }

  // --- confidence -----------------------------------------------------
  // A frame with no usable foot landmark anywhere inside the anchor window is
  // an occlusion, not low confidence: the anchor is not observable. Emit the
  // canonical occlusion reason rather than scoring a hole in the data.
  const windowStart = Math.max(0, peakIdx - 2);
  const windowEnd = Math.min(track.length - 1, plantIdx + 2);
  let minVis = 1;
  for (let i = windowStart; i <= windowEnd; i++) {
    const s = track[i];
    if (s == null) {
      return fail(MISSINGNESS_REASONS.LANDMARK_OCCLUDED, landmarkModelVersion, diagWithVel);
    }
    minVis = Math.min(minVis, s.min_vis);
  }


  // Temporal certainty: how many frames around the crossing are ambiguous
  // (|v| already inside the quiescent band) versus the resolution we need.
  let jitter = 0;
  for (let i = contactIdx - 1; i >= peakIdx + 1; i--) {
    const v = vel[i];
    if (v != null && v <= quiescent) jitter += 1;
    else break;
  }
  const requiredResolutionFrames = Math.max(1, Math.round(fps * 0.05)); // 50 ms
  const temporalCertainty = clamp01(1 - jitter / requiredResolutionFrames);

  // Numeric stability: how far the descent stands above the track's noise.
  const numericStability = clamp01(peakVel / (peakVel + 4 * noiseSigma));

  const confidence = round4(
    clamp01(minVis) * temporalCertainty * numericStability * tierFactor,
  );

  const diagnostics: DPlantDiagnostics = {
    ...diagWithVel,
    confidence_factors: {
      landmark_visibility_factor: round4(clamp01(minVis)),
      anchor_temporal_certainty: round4(temporalCertainty),
      numeric_stability_factor: round4(numericStability),
      temporal_tier_factor: tierFactor,
    },
  };

  if (confidence < D_PLANT_MIN_CONFIDENCE) {
    return fail(MISSINGNESS_REASONS.ANCHOR_NOT_DETECTED, landmarkModelVersion, diagnostics);
  }

  const contactSample = track[contactIdx];
  const plantSample = track[plantIdx];
  if (!contactSample || !plantSample) {
    return fail(MISSINGNESS_REASONS.ANCHOR_NOT_DETECTED, landmarkModelVersion, diagnostics);
  }

  return {
    front_foot_first_contact: {
      frame_index: contactSample.frame_index,
      t_seconds: round6(contactSample.t),
      confidence,
    },
    front_foot_full_plant: {
      frame_index: plantSample.frame_index,
      t_seconds: round6(plantSample.t),
      confidence,
    },
    missingness: null,
    detector_id: "D-PLANT",
    detector_version: detectorVersion("D-PLANT"),
    landmark_model_version: landmarkModelVersion,
    diagnostics,
  };
}

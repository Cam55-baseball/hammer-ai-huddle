/**
 * STEP 4 — Two-pass window selection: the SCOUT pass (pure logic).
 *
 * WHY THIS EXISTS
 * The dense window used to be chosen BEFORE any pose was known: centre on
 * `landing_time_sec` when present, else the clip midpoint. On an 18s clip the
 * midpoint is very unlikely to contain the swing, and validation confirmed it —
 * two clips returned pose on 1% and 9% of the analysed frames because the
 * athlete was simply not inside the window.
 *
 * WHAT THIS DOES
 *   PASS 1 (scout): sparse samples across the WHOLE clip, multi-pose + the
 *   existing subject lock, producing (a) the span in which the locked athlete
 *   is confidently present and (b) the region of highest movement inside it.
 *   PASS 2 (dense): the existing contiguous native-rate window, centred on the
 *   scouted motion region and clamped inside the presence span.
 *
 * HONEST FAILURE: if the scout finds no confident locked subject anywhere, the
 * window is NOT guessed. Capture fails with canonical missingness
 * (`pose_not_detected`, emitted by D-POSE).
 *
 * DETERMINISM: integer sample indices, fixed thresholds, explicit tie-breaks
 * (earliest wins). No clock, no RNG in the value path.
 *
 * This module is pure. The decoder-bound runner lives in
 * `denseLandmarkCapture.ts`, which feeds these functions real observations.
 */

import { MISSINGNESS_REASONS, type MissingnessReason } from "../metrics/missingness";

/**
 * Scout budget. 32 samples: enough to resolve a ~0.5s swing inside a 20s clip
 * to within roughly one sample period on either side (20s/32 ≈ 0.63s), while
 * costing well under a third of the dense pass. Below ~20 the motion peak on a
 * long clip becomes a coin flip; above ~40 the added cost buys resolution the
 * dense window (which spans several seconds) cannot use.
 */
export const SCOUT_SAMPLE_BUDGET = 32;

/** A scout sample only counts as "athlete present" at or above this mean
 *  landmark visibility — the same floor the subject lock uses to consider a
 *  candidate lock-worthy. */
export const SCOUT_MIN_MEAN_VISIBILITY = 0.5;

/** Fewer confidently-locked samples than this is not a presence span, it is
 *  noise. Two samples are the minimum from which any motion signal exists. */
export const SCOUT_MIN_PRESENT_SAMPLES = 2;

/** Landmarks the motion signal reads: mid-hip, both wrists, both ankles. Cheap,
 *  already present, and the parts that actually move in a swing or delivery. */
const LEFT_HIP = 23;
const RIGHT_HIP = 24;
const MOTION_POINTS = [15, 16, 27, 28] as const; // wrists, ankles

/** Moving-sum width over per-interval motion, in intervals. Three keeps a
 *  single noisy sample from deciding the window. */
const MOTION_SMOOTHING = 3;

export type WindowSource =
  | "landing_mark"
  | "scout_motion"
  | "landing_mark_rejected_scout_motion"
  | "failed";

export interface ScoutObservation {
  readonly frame_index: number;
  readonly timestamp_seconds: number;
  /** True only when the subject tracker held a lock on this sample. */
  readonly subject_locked: boolean;
  readonly mean_visibility: number;
  /** 33 × (x,y,z) normalized coords of the locked subject; empty when unlocked. */
  readonly normalized: readonly number[];
  readonly candidates_detected: number;
}

export interface PresenceSpan {
  readonly start_frame: number;
  readonly end_frame: number;
  readonly start_sec: number;
  readonly end_sec: number;
  readonly present_samples: number;
}

export interface ScoutFindings {
  readonly sample_count: number;
  readonly samples_with_subject: number;
  readonly presence: PresenceSpan | null;
  /** Frame index at the centre of the highest-movement region, null when the
   *  span has too few samples to form an interval. */
  readonly motion_centre_frame: number | null;
  /** Peak smoothed motion, in normalized frame-heights per second. Reported so
   *  a reader can see whether "peak movement" was actually movement. */
  readonly motion_peak_per_sec: number;
  readonly subjects_detected_max: number;
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

/** Evenly spaced integer sample indices across the WHOLE clip. */
export function selectScoutFrameIndices(
  fps_true: number,
  duration_sec: number,
  budget: number = SCOUT_SAMPLE_BUDGET,
): number[] {
  if (!Number.isFinite(fps_true) || fps_true <= 0) return [];
  if (!Number.isFinite(duration_sec) || duration_sec <= 0) return [];
  const totalFrames = Math.max(1, Math.floor(duration_sec * fps_true));
  const maxIndex = totalFrames - 1;
  const n = Math.max(1, Math.min(Math.floor(budget), totalFrames));
  if (n === 1) return [0];
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.round((i * maxIndex) / (n - 1));
    if (out[out.length - 1] !== idx) out.push(idx);
  }
  return out;
}

function midHip(normalized: readonly number[]): { x: number; y: number } | null {
  if (normalized.length < 33 * 3) return null;
  const lx = normalized[LEFT_HIP * 3];
  const ly = normalized[LEFT_HIP * 3 + 1];
  const rx = normalized[RIGHT_HIP * 3];
  const ry = normalized[RIGHT_HIP * 3 + 1];
  return { x: (lx + rx) / 2, y: (ly + ry) / 2 };
}

/**
 * Derive the presence span and the highest-movement region from scout samples.
 * Pure: same observations in → same findings out.
 */
export function deriveScoutFindings(observations: readonly ScoutObservation[]): ScoutFindings {
  const sample_count = observations.length;
  const subjects_detected_max = observations.reduce(
    (m, o) => Math.max(m, o.candidates_detected),
    0,
  );
  const present = observations.filter(
    (o) => o.subject_locked && o.mean_visibility >= SCOUT_MIN_MEAN_VISIBILITY,
  );

  if (present.length < SCOUT_MIN_PRESENT_SAMPLES) {
    return {
      sample_count,
      samples_with_subject: present.length,
      presence: null,
      motion_centre_frame: null,
      motion_peak_per_sec: 0,
      subjects_detected_max,
    };
  }

  const first = present[0];
  const last = present[present.length - 1];
  const presence: PresenceSpan = {
    start_frame: first.frame_index,
    end_frame: last.frame_index,
    start_sec: round6(first.timestamp_seconds),
    end_sec: round6(last.timestamp_seconds),
    present_samples: present.length,
  };

  // Per-interval motion between CONSECUTIVE present samples, normalized
  // frame-heights per second. Intervals spanning a gap are still valid — the
  // per-second normalisation accounts for the longer time base.
  const intervals: { centre_frame: number; speed: number }[] = [];
  for (let i = 1; i < present.length; i++) {
    const a = present[i - 1];
    const b = present[i];
    const dt = b.timestamp_seconds - a.timestamp_seconds;
    if (!(dt > 0)) continue;
    const ha = midHip(a.normalized);
    const hb = midHip(b.normalized);
    if (!ha || !hb) continue;
    let sum = Math.hypot(hb.x - ha.x, hb.y - ha.y);
    let n = 1;
    for (const p of MOTION_POINTS) {
      const ax = a.normalized[p * 3];
      const ay = a.normalized[p * 3 + 1];
      const bx = b.normalized[p * 3];
      const by = b.normalized[p * 3 + 1];
      if (
        !Number.isFinite(ax) || !Number.isFinite(ay) ||
        !Number.isFinite(bx) || !Number.isFinite(by)
      ) continue;
      sum += Math.hypot(bx - ax, by - ay);
      n += 1;
    }
    intervals.push({
      centre_frame: Math.round((a.frame_index + b.frame_index) / 2),
      speed: round6(sum / n / dt),
    });
  }

  if (intervals.length === 0) {
    return {
      sample_count,
      samples_with_subject: present.length,
      presence,
      motion_centre_frame: null,
      motion_peak_per_sec: 0,
      subjects_detected_max,
    };
  }

  // Smoothed peak: widest window that fits, up to MOTION_SMOOTHING intervals.
  const w = Math.min(MOTION_SMOOTHING, intervals.length);
  let bestStart = 0;
  let bestSum = -1;
  for (let s = 0; s + w <= intervals.length; s++) {
    let sum = 0;
    for (let k = 0; k < w; k++) sum += intervals[s + k].speed;
    if (sum > bestSum) {
      // Strict > : earliest region wins ties. Deterministic.
      bestSum = sum;
      bestStart = s;
    }
  }
  const block = intervals.slice(bestStart, bestStart + w);
  const centre = Math.round(
    block.reduce((s, it) => s + it.centre_frame, 0) / block.length,
  );

  return {
    sample_count,
    samples_with_subject: present.length,
    presence,
    motion_centre_frame: centre,
    motion_peak_per_sec: round6(bestSum / w),
    subjects_detected_max,
  };
}

export interface ScoutedWindow {
  readonly start_frame: number;
  readonly end_frame: number; // inclusive
  readonly frame_count: number;
  readonly start_sec: number;
  readonly end_sec: number;
  readonly rule: string;
  readonly source: WindowSource;
}

export interface ScoutedWindowFailure {
  readonly failed: true;
  readonly reason: MissingnessReason;
  readonly detail: string;
}

/**
 * PASS 2 window placement.
 *
 * - A landing mark is a real signal and is kept — but only after the scout
 *   confirms the athlete is actually present at it. A stale mark on a clip
 *   where the athlete is elsewhere is rejected, and recorded as rejected.
 * - Otherwise the window centres on the scouted motion region.
 * - The window is clamped to stay inside the presence span whenever the span is
 *   long enough to hold it; when the span is shorter than the budget the window
 *   is the span, padded outward only into frames the clip actually has.
 * - No midpoint fallback. Ever.
 */
export function placeDenseWindowFromScout(args: {
  fps_true: number;
  duration_sec: number;
  budget: number;
  landingTimeSec: number | null;
  findings: ScoutFindings;
}): ScoutedWindow | ScoutedWindowFailure {
  const { fps_true, duration_sec, budget, landingTimeSec, findings } = args;
  if (!Number.isFinite(fps_true) || fps_true <= 0 || !Number.isFinite(duration_sec) || duration_sec <= 0) {
    return {
      failed: true,
      reason: MISSINGNESS_REASONS.INSUFFICIENT_TEMPORAL_RESOLUTION,
      detail: "unusable probe (fps_true/duration_sec)",
    };
  }
  if (!findings.presence) {
    return {
      failed: true,
      reason: MISSINGNESS_REASONS.POSE_NOT_DETECTED,
      detail: `scout pass found no confidently locked subject in ${findings.sample_count} samples across the clip`,
    };
  }

  const totalFrames = Math.max(1, Math.floor(duration_sec * fps_true));
  const maxIndex = totalFrames - 1;
  const windowFrames = Math.min(totalFrames, Math.max(1, Math.floor(budget)));

  const span = findings.presence;
  const hasLanding =
    landingTimeSec != null && landingTimeSec > 0 && landingTimeSec < duration_sec;
  const landingFrame = hasLanding
    ? Math.min(maxIndex, Math.max(0, Math.round(landingTimeSec! * fps_true)))
    : null;

  // Validate the landing mark against the scout: is the athlete present there?
  // Tolerance is one scout sample period, since presence is only observed at
  // sample points.
  const samplePeriodFrames =
    findings.sample_count > 1 ? Math.ceil(maxIndex / (findings.sample_count - 1)) : maxIndex;
  const landingInsideSpan =
    landingFrame != null &&
    landingFrame >= span.start_frame - samplePeriodFrames &&
    landingFrame <= span.end_frame + samplePeriodFrames;

  let centre: number;
  let source: WindowSource;
  let preRatio: number;
  if (landingFrame != null && landingInsideSpan) {
    centre = landingFrame;
    source = "landing_mark";
    preRatio = 0.6; // load and stride precede the landing
  } else if (findings.motion_centre_frame != null) {
    centre = findings.motion_centre_frame;
    source = landingFrame != null ? "landing_mark_rejected_scout_motion" : "scout_motion";
    preRatio = 0.6; // the wind-up precedes peak movement
  } else {
    // Athlete present, but no usable motion signal (single interval-less span).
    centre = Math.round((span.start_frame + span.end_frame) / 2);
    source = landingFrame != null ? "landing_mark_rejected_scout_motion" : "scout_motion";
    preRatio = 0.5;
  }

  let start = centre - Math.floor(windowFrames * preRatio);
  let end = start + windowFrames - 1;

  // Prefer to sit inside the presence span; only spill outside it when the span
  // is shorter than the window.
  const spanLength = span.end_frame - span.start_frame + 1;
  if (spanLength >= windowFrames) {
    if (start < span.start_frame) start = span.start_frame;
    end = start + windowFrames - 1;
    if (end > span.end_frame) {
      end = span.end_frame;
      start = end - windowFrames + 1;
    }
  }
  // Always clamp into the clip, preserving length.
  if (start < 0) start = 0;
  end = start + windowFrames - 1;
  if (end > maxIndex) {
    end = maxIndex;
    start = Math.max(0, end - windowFrames + 1);
  }

  const ruleBase =
    windowFrames >= totalFrames ? "full_clip_native_fps" : `budget_${windowFrames}_frames`;
  const rule =
    source === "landing_mark"
      ? `${ruleBase}_landing_centred_60_40_scout_validated`
      : source === "landing_mark_rejected_scout_motion"
        ? `${ruleBase}_scout_motion_centred_landing_mark_rejected`
        : `${ruleBase}_scout_motion_centred`;

  return {
    start_frame: start,
    end_frame: end,
    frame_count: end - start + 1,
    start_sec: round6(start / fps_true),
    end_sec: round6(end / fps_true),
    rule,
    source,
  };
}

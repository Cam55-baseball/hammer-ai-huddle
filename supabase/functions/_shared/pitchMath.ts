/**
 * Pitch velocity math — single-camera, calibrated ball-flight measurement.
 *
 * Method (v1, "apparent_ball_diameter"):
 *   A regulation ball has a known real-world diameter. A detector bounding
 *   box gives the apparent diameter in pixels, so each detected frame carries
 *   its own feet-per-pixel scale at the ball's depth. Velocity per frame pair:
 *
 *     feet_per_pixel = ball_diameter_ft / apparent_diameter_px
 *     velocity_ft_s  = displacement_px * feet_per_pixel / dt_seconds
 *     velocity_mph   = velocity_ft_s * 0.6818182
 *
 *   Because scale is re-derived per detection, the ball approaching the
 *   camera (growing apparent size) is handled frame-by-frame instead of
 *   assuming one global calibration depth.
 *
 * Honesty rules (system-wide doctrine): if the track is too short, too
 * fragmented, or the derived numbers are implausible, this module returns
 * status 'low_confidence' or 'unavailable' with velocity_mph = null — it
 * never fabricates a number.
 */

export interface BallDetection {
  x: number; // center x, px
  y: number; // center y, px
  width: number;
  height: number;
  confidence: number; // 0..1
  class: string;
}

export interface FrameObservation {
  frame_index: number;
  timestamp_seconds: number;
  detection: BallDetection | null;
}

export interface PairSample {
  from_frame_index: number;
  to_frame_index: number;
  dt_seconds: number;
  displacement_px: number;
  apparent_diameter_px: number;
  feet_per_pixel: number;
  velocity_mph: number;
}

export interface TrackSummary {
  start_frame_index: number;
  end_frame_index: number;
  start_timestamp_seconds: number;
  end_timestamp_seconds: number;
  length: number;
}

export type VelocityStatus = "measured" | "low_confidence" | "unavailable";
export type VelocityMissingness = "ball_not_detected" | "insufficient_temporal_resolution";

export interface VelocityResult {
  status: VelocityStatus;
  missingness_reason: VelocityMissingness | null;
  velocity_mph: number | null;
  confidence: number | null;
  method: "apparent_ball_diameter";
  frames_total: number;
  frames_detected: number;
  frames_missed: number;
  track: TrackSummary | null;
  pair_samples: PairSample[];
}

const FT_S_TO_MPH = 0.6818182;
// Regulation ball diameters (ft). Baseball 2.86–2.94 in, 12" softball ≈ 3.82 in.
export const BALL_DIAMETER_FT: Record<"baseball" | "softball", number> = {
  baseball: 2.90 / 12,
  softball: 3.82 / 12,
};

// Plausibility envelope for a thrown pitch. Pairs outside it are treated as
// detector noise (e.g. the box latched onto a glove or a jersey logo).
const MIN_PLAUSIBLE_MPH = 25;
const MAX_PLAUSIBLE_MPH = 110;
// A track must span at least this much real time to say anything about speed.
const MIN_TRACK_SPAN_SEC = 0.08;
// Below this many consecutive detections the flight path is not established.
const MIN_TRACK_LENGTH = 3;
// Confidence below this → report low_confidence instead of a number.
const MIN_CONFIDENCE_FOR_MEASURED = 0.45;

function apparentDiameterPx(d: BallDetection): number {
  // Geometric mean is robust to motion-blurred boxes that stretch along the
  // flight direction.
  return Math.sqrt(Math.max(1, d.width) * Math.max(1, d.height));
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

/**
 * Longest run of consecutive observations that all carry a detection.
 * "Consecutive" = adjacent entries in the sampled frame sequence, so a run
 * maps to an unbroken observed flight segment.
 */
function longestDetectionRun(observations: FrameObservation[]): FrameObservation[] {
  let best: FrameObservation[] = [];
  let current: FrameObservation[] = [];
  for (const obs of observations) {
    if (obs.detection) {
      current.push(obs);
      if (current.length > best.length) best = current;
    } else {
      current = [];
    }
  }
  return best;
}

export function computeVelocity(
  observations: FrameObservation[],
  sport: "baseball" | "softball",
): VelocityResult {
  const sorted = [...observations].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
  const framesTotal = sorted.length;
  const detected = sorted.filter((o) => o.detection !== null);
  const framesDetected = detected.length;
  const framesMissed = framesTotal - framesDetected;

  const base: Omit<VelocityResult, "status" | "missingness_reason" | "velocity_mph" | "confidence" | "track" | "pair_samples"> = {
    method: "apparent_ball_diameter",
    frames_total: framesTotal,
    frames_detected: framesDetected,
    frames_missed: framesMissed,
  };

  if (framesDetected < MIN_TRACK_LENGTH) {
    return {
      ...base,
      status: "unavailable",
      missingness_reason: "ball_not_detected",
      velocity_mph: null,
      confidence: null,
      track: null,
      pair_samples: [],
    };
  }

  const run = longestDetectionRun(sorted);
  if (run.length < MIN_TRACK_LENGTH) {
    // Detections exist but are scattered — the flight path is fragmented.
    return {
      ...base,
      status: "low_confidence",
      missingness_reason: "ball_not_detected",
      velocity_mph: null,
      confidence: null,
      track: null,
      pair_samples: [],
    };
  }

  const ballDiameterFt = BALL_DIAMETER_FT[sport];
  const allPairs: PairSample[] = [];
  for (let i = 1; i < run.length; i++) {
    const a = run[i - 1];
    const b = run[i];
    const dt = b.timestamp_seconds - a.timestamp_seconds;
    if (!(dt > 0)) continue;
    const da = a.detection!;
    const db = b.detection!;
    const displacementPx = Math.hypot(db.x - da.x, db.y - da.y);
    const diameterPx = (apparentDiameterPx(da) + apparentDiameterPx(db)) / 2;
    if (diameterPx < 4) continue; // box too small to scale from honestly
    const feetPerPixel = ballDiameterFt / diameterPx;
    const velocityMph = (displacementPx * feetPerPixel) / dt * FT_S_TO_MPH;
    allPairs.push({
      from_frame_index: a.frame_index,
      to_frame_index: b.frame_index,
      dt_seconds: round6(dt),
      displacement_px: round2(displacementPx),
      apparent_diameter_px: round2(diameterPx),
      feet_per_pixel: round6(feetPerPixel),
      velocity_mph: round2(velocityMph),
    });
  }

  const spanSec = run[run.length - 1].timestamp_seconds - run[0].timestamp_seconds;
  const track: TrackSummary = {
    start_frame_index: run[0].frame_index,
    end_frame_index: run[run.length - 1].frame_index,
    start_timestamp_seconds: round6(run[0].timestamp_seconds),
    end_timestamp_seconds: round6(run[run.length - 1].timestamp_seconds),
    length: run.length,
  };

  if (allPairs.length < 2 || spanSec < MIN_TRACK_SPAN_SEC) {
    return {
      ...base,
      status: "low_confidence",
      missingness_reason: "insufficient_temporal_resolution",
      velocity_mph: null,
      confidence: null,
      track,
      pair_samples: allPairs,
    };
  }

  const plausible = allPairs.filter(
    (p) => p.velocity_mph >= MIN_PLAUSIBLE_MPH && p.velocity_mph <= MAX_PLAUSIBLE_MPH,
  );
  if (plausible.length < 2) {
    // Everything the detector produced was physically implausible — do not
    // average noise into a number.
    return {
      ...base,
      status: "unavailable",
      missingness_reason: "ball_not_detected",
      velocity_mph: null,
      confidence: null,
      track,
      pair_samples: allPairs,
    };
  }

  const velocityMph = median(plausible.map((p) => p.velocity_mph));

  // Confidence: detection coverage, detector self-confidence, and scale
  // stability (consistent apparent size trend = believable boxes).
  const detectionRate = framesDetected / Math.max(1, framesTotal);
  const meanDetConfidence =
    detected.reduce((sum, o) => sum + (o.detection?.confidence ?? 0), 0) / Math.max(1, framesDetected);
  const diameters = run.map((o) => apparentDiameterPx(o.detection!));
  const meanDiameter = diameters.reduce((s, d) => s + d, 0) / diameters.length;
  const variance =
    diameters.reduce((s, d) => s + (d - meanDiameter) ** 2, 0) / diameters.length;
  const diameterCv = meanDiameter > 0 ? Math.sqrt(variance) / meanDiameter : 1;
  const scaleStability = 1 - Math.min(1, diameterCv * 2); // cv 0 → 1, cv ≥0.5 → 0

  const confidence = round2(
    Math.max(0, Math.min(1, 0.35 * detectionRate + 0.35 * meanDetConfidence + 0.30 * scaleStability)),
  );

  if (confidence < MIN_CONFIDENCE_FOR_MEASURED) {
    return {
      ...base,
      status: "low_confidence",
      missingness_reason: null,
      velocity_mph: null,
      confidence,
      track,
      pair_samples: allPairs,
    };
  }

  return {
    ...base,
    status: "measured",
    missingness_reason: null,
    velocity_mph: round2(velocityMph),
    confidence,
    track,
    pair_samples: allPairs,
  };
}

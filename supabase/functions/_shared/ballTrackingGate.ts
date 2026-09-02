/**
 * Ball-tracking frame-rate gate (server mirror of src/lib/capture/highFpsCapture.ts).
 *
 * Doctrine: missing beats fabricated. Below the tracking floor the ball is
 * destroyed by motion blur between frames — any velocity / movement / location
 * number produced from that footage is invented, not measured. Mechanics
 * analysis is unaffected and continues at any usable frame rate.
 */

/** Frames per second required before ball-flight measurement is honest. */
export const BALL_TRACKING_FLOOR_FPS = 58;
/** Below this nothing is analyzable at all (mechanics floor lives elsewhere). */
export const MECHANICS_FLOOR_FPS = 24;

export interface BallTrackingGate {
  eligible: boolean;
  /** Best honest fps we know for this clip, or null when unknown. */
  fps: number | null;
  /** Where the fps number came from. */
  fpsSource: "capture" | "file_probe" | "unknown";
  /** Plain-language reason, safe to show a user. Null when eligible. */
  reason: string | null;
}

/**
 * Metric keys whose value depends on tracking a fast-moving ball/barrel across
 * consecutive frames. These are the only tiles the gate suppresses.
 */
export const BALL_FLIGHT_METRIC_KEYS = new Set<string>([
  "bat_speed_contact_mph",
]);

export function evaluateBallTrackingGate(input: {
  captureFps?: number | null;
  fpsTrue?: number | null;
  /** Client hint. Advisory only — it can never widen the gate. */
  clientEligible?: boolean | null;
}): BallTrackingGate {
  const capture = num(input.captureFps);
  const probe = num(input.fpsTrue);
  const fps = capture ?? probe;
  const fpsSource: BallTrackingGate["fpsSource"] =
    capture != null ? "capture" : probe != null ? "file_probe" : "unknown";

  if (fps == null) {
    return {
      eligible: false,
      fps: null,
      fpsSource,
      reason:
        "We couldn't confirm this clip's frame rate, so ball speed and flight can't be measured honestly.",
    };
  }

  const rounded = Math.round(fps);
  if (fps < BALL_TRACKING_FLOOR_FPS) {
    return {
      eligible: false,
      fps,
      fpsSource,
      reason:
        `This footage was captured at ${rounded} fps. The ball blurs between frames below ` +
        `${BALL_TRACKING_FLOOR_FPS} fps, so ball speed, movement and location can't be measured ` +
        `from it. Mechanics were analyzed normally. Record in-app or in slow motion for ball tracking.`,
    };
  }

  // Fps clears the floor. A client that reports itself ineligible is still
  // believed (fail-closed), but a client claiming eligibility never overrides fps.
  if (input.clientEligible === false) {
    return {
      eligible: false,
      fps,
      fpsSource,
      reason:
        "The recorder reported this clip isn't suitable for ball tracking, so ball speed and flight were not measured.",
    };
  }

  return { eligible: true, fps, fpsSource, reason: null };
}

/**
 * Force every ball-flight metric to an honest `missing` entry. Mutates and
 * returns the metrics object. No-op when the gate is open.
 */
export function suppressBallFlightMetrics(
  metrics: Record<string, unknown> | null,
  gate: BallTrackingGate,
): { metrics: Record<string, unknown> | null; suppressedKeys: string[] } {
  if (!metrics || gate.eligible) return { metrics, suppressedKeys: [] };
  const suppressedKeys: string[] = [];
  for (const key of Object.keys(metrics)) {
    if (!BALL_FLIGHT_METRIC_KEYS.has(key)) continue;
    metrics[key] = {
      missing: true,
      missing_reason: gate.reason ?? "Frame rate too low for ball tracking",
      missing_cause: "capture_fps_below_ball_tracking_floor",
      confidence: 0,
      capture_fps: gate.fps,
    };
    suppressedKeys.push(key);
  }
  return { metrics, suppressedKeys };
}

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : v == null ? NaN : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Ball-flight measurement, merged into the single analysis pipeline.
 *
 * One recording now produces one report: mechanics tiles from `analyze-video`
 * plus ball-flight numbers from the velocity pipeline. The athlete never
 * chooses "which system" they are in.
 *
 * Honesty gates, in order — any one of them returns a `missing` result with a
 * plain-language reason instead of a number:
 *   1. Frame rate below `FPS_TRACKING_FLOOR` — the ball is blurred away.
 *   2. No reference distance — pixels can't become miles per hour.
 *   3. Measurement not enabled for this account (hosted inference is
 *      staff-gated while it is unvalidated).
 *   4. The detector could not follow the ball well enough.
 */

import { supabase } from "@/integrations/supabase/client";
import { FPS_TRACKING_FLOOR } from "@/lib/capture/highFpsCapture";
import { isValidDistance } from "@/lib/capture/referenceDistance";
import type { ExtractedFrame } from "@/lib/frameExtraction";

export interface BallFlightResult {
  status: "measured" | "missing";
  velocity_mph: number | null;
  confidence: number | null;
  /** Plain-language sentence, safe to render to a 12-year-old. */
  reason: string | null;
  /** Machine-readable missingness code for the ledger. */
  missing_code: string | null;
  captureFps: number | null;
  referenceDistanceFt: number | null;
}

function missing(code: string, reason: string, captureFps: number | null, ft: number | null): BallFlightResult {
  return {
    status: "missing",
    velocity_mph: null,
    confidence: null,
    reason,
    missing_code: code,
    captureFps,
    referenceDistanceFt: ft,
  };
}

export interface RunBallFlightInput {
  videoId: string;
  frames: ExtractedFrame[];
  referenceDistanceFt: number | null;
  captureFps: number | null;
  /** Hosted inference bills real credits and is unvalidated — staff only. */
  measurementEnabled: boolean;
}

export async function runBallFlight(input: RunBallFlightInput): Promise<BallFlightResult> {
  const { videoId, frames, referenceDistanceFt, captureFps, measurementEnabled } = input;

  if (!isValidDistance(referenceDistanceFt)) {
    return missing(
      "reference_distance_missing",
      "We didn't get the pitching distance for your field, so we can't turn this video into a real speed. Mechanics feedback is unaffected.",
      captureFps,
      null,
    );
  }

  if (captureFps == null || !Number.isFinite(captureFps)) {
    return missing(
      "capture_fps_unknown",
      "We couldn't read a reliable frame rate from this clip, so ball speed is left blank rather than guessed.",
      null,
      referenceDistanceFt,
    );
  }

  if (captureFps < FPS_TRACKING_FLOOR) {
    return missing(
      "capture_fps_below_floor",
      `This clip recorded at about ${Math.round(captureFps)} frames per second. Ball speed needs ${FPS_TRACKING_FLOOR} or faster — below that the ball is a blur between frames, so any number would be made up. Mechanics feedback still works.`,
      captureFps,
      referenceDistanceFt,
    );
  }

  if (!measurementEnabled) {
    return missing(
      "measurement_not_enabled",
      "Your clip is good enough to measure ball speed, but that measurement isn't switched on for your account yet. It's coming.",
      captureFps,
      referenceDistanceFt,
    );
  }

  if (frames.length < 3) {
    return missing(
      "insufficient_frames",
      "We didn't get enough readable frames from this clip to follow the ball. Try a brighter, steadier recording.",
      captureFps,
      referenceDistanceFt,
    );
  }

  try {
    const { data: prep, error: prepError } = await supabase.functions.invoke("pitch-velocity-prep", {
      body: {
        video_id: videoId,
        reference_distance_ft: referenceDistanceFt,
        capture_fps: captureFps,
        frames: frames.map((frame) => ({
          frame_index: frame.frame_index,
          timestamp_seconds: frame.timestamp_seconds,
          data_url: frame.dataUrl,
          width: frame.width,
          height: frame.height,
        })),
      },
    });
    if (prepError) throw new Error(prepError.message);
    if (prep?.error) throw new Error(String(prep.error));

    const sessionId = prep?.session_id;
    if (!sessionId) throw new Error("No calibration session was created.");

    const { data: measured, error: measureError } = await supabase.functions.invoke(
      "pitch-velocity-measure",
      { body: { calibration_session_id: sessionId } },
    );
    if (measureError) throw new Error(measureError.message);
    if (measured?.error) throw new Error(String(measured.error));

    if (measured?.status === "measured" && typeof measured.velocity_mph === "number") {
      return {
        status: "measured",
        velocity_mph: measured.velocity_mph,
        confidence: typeof measured.confidence === "number" ? measured.confidence : null,
        reason: null,
        missing_code: null,
        captureFps,
        referenceDistanceFt,
      };
    }

    return missing(
      typeof measured?.missing_reason === "string" ? measured.missing_reason : "ball_not_tracked",
      "We couldn't follow the ball clearly enough through this clip to report a speed we'd stand behind.",
      captureFps,
      referenceDistanceFt,
    );
  } catch (err) {
    return missing(
      "measurement_failed",
      err instanceof Error
        ? `Ball speed measurement didn't finish: ${err.message}`
        : "Ball speed measurement didn't finish.",
      captureFps,
      referenceDistanceFt,
    );
  }
}

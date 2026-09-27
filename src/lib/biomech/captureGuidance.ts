/**
 * Capture guidance shown at upload, driven by the frame rate read from the
 * file. Pure and deterministic: same (fps, module) → same guidance.
 *
 * Floors mirror what the code declares:
 *  - FPS_FLOOR (29.9) — pose-timed anchors (first move, load, swing start,
 *    launch position, finish, rear-hip load) and tiles 19/20 refuse below it.
 *  - FPS_T_MID (59.9) — the pose-only release point refuses below it.
 *  - Foot plant / tempo: no floor is declared in code yet (see report); a
 *    heel strike needs ~60 fps to land on a frame, so guidance uses 60.
 * Body-position feedback that compares positions, not timing, needs no rate.
 */
import { FPS_FLOOR, FPS_T_MID } from "./anchors/poseKinematics";

export type GuidanceModule = "hitting" | "pitching" | "throwing";

export interface CaptureGuidance {
  readonly fps: number | null;
  readonly possible: readonly string[];
  readonly notPossible: readonly string[];
  readonly fix: string;
}

export const RECOMMENDED_FPS = 60;

export const IPHONE_FIX =
  "On iPhone: Settings → Camera → Record Video → 1080p at 60 fps. Then film in the normal Video mode, not Cinematic — Cinematic mode records at 24 fps.";

export function captureGuidanceFor(fps: number | null, module: GuidanceModule): CaptureGuidance | null {
  if (fps != null && Number.isFinite(fps) && fps >= FPS_T_MID) return null;
  const possible: string[] = ["Body positions and posture feedback"];
  const notPossible: string[] = [];
  const known = fps != null && Number.isFinite(fps);
  const timed =
    module === "hitting"
      ? "Timing of first move, load, swing start, launch position and finish"
      : "Timing of first move, leg lift and finish";
  if (known && fps! >= FPS_FLOOR) possible.push(timed);
  else notPossible.push(timed);
  if (module === "hitting") {
    notPossible.push("Foot plant and tempo");
    if (known && fps! >= FPS_FLOOR) possible.push("Back-hip and head checks, when the foot plant is found");
    else notPossible.push("Back-hip and head checks (they start at the foot plant)");
  } else {
    notPossible.push("Foot plant and tempo", "Release point");
  }
  return { fps: known ? fps : null, possible, notPossible, fix: IPHONE_FIX };
}

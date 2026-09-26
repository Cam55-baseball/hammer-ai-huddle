/**
 * STEP 2 — Per-detector version registry.
 *
 * WHY THIS FILE EXISTS
 * `versions.ts` carries a single global `DETECTOR_VERSION = "events@0.0.0-stub"`,
 * and several anchor modules short-circuit to missingness whenever a version
 * string ends in `-stub`. That makes the global constant a kill switch: bumping
 * it to a real version would silently un-stub every anchor at once, and the
 * still-unimplemented ones would start returning values they cannot justify.
 *
 * So the stub flag moves here, PER DETECTOR. Each detector id carries its own
 * version string and its own stub state. `DETECTOR_VERSION` in `versions.ts` is
 * deliberately left untouched at `events@0.0.0-stub` — it still participates in
 * the cache fingerprint and still keeps every legacy path honest.
 *
 * Rule: a detector may only be given a non-`-stub` version in the same change
 * that ships its real implementation and its validation evidence.
 */

export const DETECTOR_IDS = [
  "D-POSE",
  "D-PLANT",
  "D-RELEASE",
  "D-BAT",
  "D-CONTACT",
  "D-BALL",
  // Pose-derived event anchors (anchors/poseEvents.ts). Each carries its own
  // real version; changing a constant in a detector means bumping its string.
  "D-STILL",
  "D-FIRST-MOVE",
  "D-RELEASE-POSE",
  "D-LOAD-APEX",
  "D-SWING-START",
  "D-P4",
  "D-FINISH",
  "D-COIL",
] as const;

export type DetectorId = (typeof DETECTOR_IDS)[number];

export const DETECTOR_VERSIONS: Readonly<Record<DetectorId, string>> = {
  // D-POSE is real (STEP 1: MediaPipe Tasks Vision BlazePose Full).
  "D-POSE": "blazepose_full@0.10.35-mediapipe-tasks-vision",
  // D-PLANT is real as of STEP 2 — ankle/heel vertical-velocity zero-crossing
  // with a vertical-load gate, computed over the persisted landmark series.
  "D-PLANT": "plant@1.0.0-zero-crossing-load-gate",
  // Pose-derived event anchors — real, but NOT yet validated on real clips.
  // Real version = implemented; wiring into tiles is a separate approval.
  "D-STILL": "still@1.0.0-agg-speed-run",
  "D-FIRST-MOVE": "first_move@1.0.0-exit-still-2f",
  // POSE-ONLY TIER of release: 2-of-3 fusion (wrist speed peak, elbow
  // extension max, arm braking onset). Uncertainty is reported, never hidden.
  "D-RELEASE-POSE": "release_pose@1.0.0-2of3-wrist-elbow-brake",
  "D-LOAD-APEX": "load_apex@1.1.0-wrist-rear-extremum-sign-change-noise-floor",
  "D-SWING-START": "swing_start@1.0.1-wrist-fwd-accel-2f",
  "D-P4": "p4@1.0.0-plant-then-back-elbow-fwd-2f",
  "D-FINISH": "finish@1.1.0-still-after-peak-rotation-requires-movement",
  // Everything below is still a skeleton and MUST keep short-circuiting.
  // D-RELEASE = the future BALL-ASSISTED release tier (ball leaves hand).
  "D-RELEASE": "release@0.0.0-stub",
  "D-BAT": "bat@0.0.0-stub",
  "D-CONTACT": "contact@0.0.0-stub",
  "D-BALL": "ball@0.0.0-stub",
  // D-COIL awaits owner sign-off on the proxy (femoral rotation is not visible).
  "D-COIL": "coil@0.0.0-stub",
} as const;

export function detectorVersion(id: DetectorId): string {
  return DETECTOR_VERSIONS[id];
}

/** True when the named detector is still a stub and must emit missingness. */
export function isDetectorStubbed(id: DetectorId): boolean {
  return DETECTOR_VERSIONS[id].endsWith("-stub");
}

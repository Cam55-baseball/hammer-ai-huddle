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
] as const;

export type DetectorId = (typeof DETECTOR_IDS)[number];

export const DETECTOR_VERSIONS: Readonly<Record<DetectorId, string>> = {
  // D-POSE is real (STEP 1: MediaPipe Tasks Vision BlazePose Full).
  "D-POSE": "blazepose_full@0.10.35-mediapipe-tasks-vision",
  // D-PLANT is real as of STEP 2 — ankle/heel vertical-velocity zero-crossing
  // with a vertical-load gate, computed over the persisted landmark series.
  "D-PLANT": "plant@1.0.0-zero-crossing-load-gate",
  // Everything below is still a skeleton and MUST keep short-circuiting.
  "D-RELEASE": "release@0.0.0-stub",
  "D-BAT": "bat@0.0.0-stub",
  "D-CONTACT": "contact@0.0.0-stub",
  "D-BALL": "ball@0.0.0-stub",
} as const;

export function detectorVersion(id: DetectorId): string {
  return DETECTOR_VERSIONS[id];
}

/** True when the named detector is still a stub and must emit missingness. */
export function isDetectorStubbed(id: DetectorId): boolean {
  return DETECTOR_VERSIONS[id].endsWith("-stub");
}

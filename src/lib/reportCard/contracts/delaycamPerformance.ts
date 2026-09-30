/**
 * DelayCam PERFORMANCE spec — everything moved OUT of the upload body-mechanics
 * card (owner ruling 2026-09-27: upload = body mechanics only; bat, ball and
 * contact = DelayCam at 240 fps).
 *
 * This is the record that stops these being re-added to the upload card.
 * Nothing here is built. Every entry is BLOCKED, in order, on:
 *   1. the native Swift camera plugin for 240 fps capture, then
 *   2. Roboflow-hosted detectors for D-BAT / D-BALL.
 * D-BAT, D-BALL and D-CONTACT stay `-stub` in detectorVersions.ts until then.
 */
export type PerformanceDetector = "D-BAT" | "D-BALL" | "D-CONTACT" | "audio_onset";

export interface DelayCamPerformanceEntry {
  readonly key: string;
  readonly moved_from: string;
  readonly definition: string;
  readonly requires: readonly PerformanceDetector[];
  readonly blocked_on: readonly ("native_swift_camera_plugin_240fps" | "roboflow_detectors")[];
  /** "mechanics" = body-only, needs frame rate not detectors (DelayCam mechanics toggle). */
  readonly side?: "performance" | "mechanics";
}

const BLOCKED = ["native_swift_camera_plugin_240fps", "roboflow_detectors"] as const;

export const DELAYCAM_PERFORMANCE_SPEC: readonly DelayCamPerformanceEntry[] = [
  { key: "bat_path", moved_from: "bh upload tile bat_path", definition: "Barrel path through the zone.", requires: ["D-BAT"], blocked_on: BLOCKED },
  { key: "on_plane_pct", moved_from: "bh upload tile on_plane", definition: "Percent of the swing the barrel travels on the pitch plane.", requires: ["D-BAT"], blocked_on: BLOCKED },
  { key: "time_to_contact_ms", moved_from: "bh upload tile time_to_contact", definition: "Blast definition: start of the forward bat move → impact.", requires: ["D-BAT", "D-CONTACT"], blocked_on: BLOCKED },
  { key: "bat_speed_contact_mph", moved_from: "bh upload tile bat_speed_contact", definition: "Barrel speed at impact.", requires: ["D-BAT", "D-CONTACT"], blocked_on: BLOCKED },
  { key: "sequencing.barrel", moved_from: "bh sequencing (barrel segment)", definition: "Barrel's place in the kinetic chain after the lead arm.", requires: ["D-BAT"], blocked_on: BLOCKED },
  { key: "eyes_tracking.head_ball_alignment", moved_from: "bh eyes_tracking channel (b)", definition: "Head-pitch alignment toward the estimated ball trajectory.", requires: ["D-BALL"], blocked_on: BLOCKED },
  { key: "connection.barrel_to_ball_direction", moved_from: "bh back_elbow_contact channel (c)", definition: "Barrel-to-ball delivery direction.", requires: ["D-BAT", "D-BALL"], blocked_on: BLOCKED },
  { key: "contact_frame", moved_from: "all upload windows that ended at contact (now D-SWING-PEAK)", definition: "True contact frame: ball trajectory reversal plus audio onset.", requires: ["D-BALL", "audio_onset"], blocked_on: BLOCKED },
  { key: "micro_pauses", moved_from: "bh upload tile micro_pauses (owner ruling 2026-09-30: route to DelayCam if 24–30 fps cannot resolve it)", definition: "The two pauses in P1-P2-pause-P3-pause-P4: after the load, and after landing before the swing. Body-speed dip between anchors.", requires: [], blocked_on: ["native_swift_camera_plugin_240fps"], side: "mechanics" },
];

/** Words that promise a performance measurement. Upload-card display text may not use them. */
export const UPLOAD_FORBIDDEN_WORDS = /\b(contact|ball|barrel|bat)\b/i;

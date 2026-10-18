/**
 * REPORT CARD SWITCH (`report_card`) — owner ruling 2026-10-18 (reversal):
 * OFF for every role (players, parents, coaches, organizations, scouts, and
 * owner/admin screens too). The Report Card states specific numbers and the
 * owner allows no estimates on it; it stays off until camera measurement
 * (computer vision) exists. Stored data is kept — nothing is deleted.
 *
 * While off, no screen may show a numeric grade that comes from video
 * analysis; show VIDEO_GRADE_PLACEHOLDER instead. Entered test measurements
 * (sprint, jumps, verified maxes, radar/sensor) and human coach/scout grades
 * are not affected.
 *
 * Only the owner turns this on.
 */
export type SwitchMode = "on" | "off";
export const REPORT_CARD_SWITCH: SwitchMode = "off";

/** Text shown wherever a video-based grade would have appeared. */
export const VIDEO_GRADE_PLACEHOLDER = "Grade coming with camera measurement";

/** True only when the owner has turned the report_card switch on. */
export function videoGradesShown(): boolean {
  return REPORT_CARD_SWITCH === "on";
}

// `roles` is kept for call-site compatibility; while the switch is off it
// grants nothing to anyone.
export function canSeeReportCard(_roles?: { isOwner: boolean; isAdmin: boolean }): boolean {
  return videoGradesShown();
}

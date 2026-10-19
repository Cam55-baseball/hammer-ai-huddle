/**
 * REPORT CARD SWITCH (`report_card`) — owner ruling 2026-10-18 (reversal):
 * OFF for players, parents, coaches, organizations and scouts. Owner/admin see
 * it with an "Internal — not released" label (correction 2026-10-19). The Report Card states specific numbers and the
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

// Owner correction 2026-10-19: while the switch is off, owner and admin
// still see the Report Card, marked "Internal — not released". Everyone else
// sees nothing from it.
export function canSeeReportCard(roles?: { isOwner: boolean; isAdmin: boolean }): boolean {
  return videoGradesShown() || !!roles?.isOwner || !!roles?.isAdmin;
}

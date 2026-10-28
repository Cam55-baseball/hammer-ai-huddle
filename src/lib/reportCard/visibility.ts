/**
 * REPORT CARD ARCHIVE — owner October 28: hidden for every role, including
 * owner and admin. Code and stored data remain intact for later use.
 *
 * While off, no screen may show a numeric grade that comes from video
 * analysis; show VIDEO_GRADE_PLACEHOLDER instead. Entered test measurements
 * (sprint, jumps, verified maxes, radar/sensor) and human coach/scout grades
 * are not affected.
 *
 * The archive has no athlete or staff release control.
 */
export type SwitchMode = "on" | "off";
export const REPORT_CARD_SWITCH: SwitchMode = "off";

/** Text shown wherever a video-based grade would have appeared. */
export const VIDEO_GRADE_PLACEHOLDER = "Grade coming with camera measurement";

/** True only when the owner has turned the report_card switch on. */
export function videoGradesShown(): boolean {
  return REPORT_CARD_SWITCH === "on";
}

// A role never overrides the owner's universal archive.
export function canSeeReportCard(roles?: { isOwner: boolean; isAdmin: boolean }): boolean {
  // Archived October 28: no role, including the owner, may open this surface.
  void roles;
  return false;
}

/**
 * REPORT CARD RELEASE SWITCH — owner ruling 2026-10-01.
 *
 * While `false`, the Report Card (toggle and card, all six analyses) is
 * visible ONLY to owner and admin. Everyone else sees the Analysis alone,
 * with no toggle and no hint a report card exists.
 *
 * Flip to `true` only when the owner says the report card is ready.
 * Do not flip it on your own.
 */
export const REPORT_CARD_RELEASED_TO_ALL_USERS = false;

export function canSeeReportCard(roles: { isOwner: boolean; isAdmin: boolean }): boolean {
  if (REPORT_CARD_RELEASED_TO_ALL_USERS) return true;
  return roles.isOwner === true || roles.isAdmin === true;
}

/**
 * PARKED UI SWITCHES (Step 28 correction, 2026-09-25).
 * Each parked ask, button or screen stays in the code but is hidden behind
 * its own switch here. All are OFF — athletes never see them.
 * Pick-up list: docs/wic/parked-features.md
 */
export const PARKED_UI = {
  /** Sidebar "Game IQ 101 (Coming soon)" entries (pitching, baserunning, defense). */
  sidebarGameIq101: false,
  /** Landing page "Exciting Updates Coming Soon" box. */
  landingComingSoonBox: false,
  /** Landing page teaser cards: motion capture, analytics, rankings. */
  landingTeaserCards: false,
  /** Progress page "Game IQ 101 · Coming soon" tile. */
  progressGameIqTile: false,
} as const;
export type ParkedUiKey = keyof typeof PARKED_UI;

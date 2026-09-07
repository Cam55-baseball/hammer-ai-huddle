/**
 * Pre-launch softball lockdown — single registry.
 *
 * The softball side did not receive the same content and engine work as
 * baseball. Rather than ship half-built surfaces, each one listed here is
 * locked for softball athletes and stays open to owner/admin so authoring and
 * testing continue. Unlocking a feature later is a one-line change: remove it
 * from this list.
 *
 * Baseball is never affected by anything in this file.
 */

export type SoftballLockedFeature =
  | "drill_library"
  | "tex_vision"
  | "pie_v2_pitching"
  | "base_stealing_baseball"
  | "pickoff_trainer"
  | "org_standards";

interface LockedFeatureMeta {
  /** Athlete-facing name used on the coming-soon screen. */
  label: string;
  /** Why it is locked — shown in the report, not to athletes. */
  reason: string;
  /** What has to exist before it can unlock. */
  unlockCriteria: string;
}

export const SOFTBALL_LOCKED_FEATURES: Record<
  SoftballLockedFeature,
  LockedFeatureMeta
> = {
  drill_library: {
    label: "Defensive Drill Library",
    reason: "14 softball drills against 168 baseball drills.",
    unlockCriteria: "A softball drill set comparable in size and position coverage.",
  },
  tex_vision: {
    label: "Tex Vision",
    reason:
      "Every Tex Vision hook defaults to baseball; there is no softball drill selection or adaptive difficulty path.",
    unlockCriteria: "Softball drill selection, metrics and difficulty curves.",
  },
  pie_v2_pitching: {
    label: "Pitching Intelligence recommendations",
    reason:
      "The PIE v2 drill and video catalogs exist only for baseball; a windmill delivery would get overhand recommendations.",
    unlockCriteria: "Softball PIE v2 drill and video catalogs.",
  },
  base_stealing_baseball: {
    label: "Base Stealing",
    reason:
      "Baseball lead and pickoff rules. Softball athletes have their own Softball Stealing trainer.",
    unlockCriteria: "Not needed — softball has its own trainer.",
  },
  pickoff_trainer: {
    label: "Pick-Off Trainer",
    reason: "Baseball pickoff rules; softball has no lead-off pickoff.",
    unlockCriteria: "A softball-appropriate leave-early / lookback trainer.",
  },
  org_standards: {
    label: "Organization Standards",
    reason: "No softball standards exist in the standards library.",
    unlockCriteria: "Seeded softball standards and criteria.",
  },
};

export function isSoftballFeatureLocked(
  feature: SoftballLockedFeature,
): boolean {
  return feature in SOFTBALL_LOCKED_FEATURES;
}

/**
 * Softball athletes have no scouting benchmark anchors (`scale_reference` is
 * baseball-only), so grades derived from them are suppressed while the raw
 * measurement is still shown and stored.
 */
export const SOFTBALL_BENCHMARKS_PENDING_NOTE =
  "Softball benchmarks are still being built — your raw number is saved, but it isn't graded yet.";

/**
 * Reads the same source the sidebar and sport theme read. Deliberately not a
 * hook so plain data hooks can call it without a provider.
 */
export function isSoftballSelected(): boolean {
  try {
    return localStorage.getItem("selectedSport") === "softball";
  } catch {
    return false;
  }
}

/**
 * Per-user feature-switch resolution (Step 9 §D4).
 *
 * One switch per feature, four settings:
 *   off   — nobody
 *   self  — only the person who set the switch (the owner)
 *   pilot — the people on the switch's list
 *   all   — everyone
 *
 * Pure: the same function answers for the generator and for the UI.
 */
export type SwitchMode = "off" | "self" | "pilot" | "all";

export type FeatureSwitchRow = {
  feature_key: string;
  mode: string | null;
  allowlist: string[] | null;
  updated_by: string | null;
};

export const FEATURE_KEYS = [
  "rest_day_calculator",
  "ub_plyo_hand_wrist",
  "onboarding_off_days",
  "one_tap_logging",
  "staff_view",
  "offseason_arc",
  "in_season_post_game",
  "personalization",
  "load_spike_protection",
  "tell_hammers",
  "adaptive_phases",
  "phase_feedback",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export function isSwitchOnFor(row: FeatureSwitchRow | null | undefined, userId: string | null): boolean {
  if (!row || !userId) return false;
  switch (row.mode) {
    case "all":
      return true;
    case "pilot":
      return (row.allowlist ?? []).includes(userId);
    case "self":
      return row.updated_by === userId;
    default:
      return false;
  }
}

/** Resolve every switch for one user. Unknown or missing rows resolve to off. */
export function resolveFeatures(
  rows: FeatureSwitchRow[] | null | undefined,
  userId: string | null,
): Record<string, boolean> {
  const byKey = new Map((rows ?? []).map((r) => [r.feature_key, r]));
  const out: Record<string, boolean> = {};
  for (const key of FEATURE_KEYS) out[key] = isSwitchOnFor(byKey.get(key), userId);
  return out;
}

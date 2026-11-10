/**
 * Owner Nov 9 (round 4): fields PARKED until they can be measured by camera (CV).
 * Their inputs are hidden on every entry screen; any stored value stays untouched in the
 * database but is archived — read-only and excluded from every display and calculation.
 * They are deliberately NOT in the metric dictionary.
 * Plan for later: docs/NEXT-PHASE-PLAN.md → "PARKED — needs a CV measurement plan".
 */

export const ARCHIVED_FIELDS = [
  {
    id: "defense.distance_to_cover",
    label: "Defensive play distance to cover",
    storedIn: "defensive_plays.distance_to_cover",
    measured: "Feet from the fielder's position at contact to where the ball landed (fed catch probability and outs-above-expected).",
    inputLived: "src/pages/DefensivePlayEntry.tsx (\"Ground to cover (ft)\")",
  },
  {
    id: "catching.framing_strikes_above_expected",
    label: "Catcher framing",
    storedIn: "catching_reps (metric = framing_strikes_above_expected)",
    measured: "Strikes gained above expected from receiving borderline pitches.",
    inputLived: "src/pages/CatchingRepEntry.tsx (metric picker)",
  },
  {
    id: "catching.block_success",
    label: "Catcher block success",
    storedIn: "catching_reps (metric = block_success) and performance_sessions.micro_layer_data[].block_success",
    measured: "Share of blocks that stuck in the mitt or deadened at the plate.",
    inputLived: "src/pages/CatchingRepEntry.tsx (metric picker) and src/components/practice/CatchingRepFields.tsx (\"Block Success\" switch)",
  },
] as const;

/** Catching rep metrics that are archived (never offered, saved, shown or counted). */
export const ARCHIVED_CATCHING_METRICS: readonly string[] = ["framing_strikes_above_expected", "block_success"];

export function isArchivedCatchingMetric(metric: string | null | undefined): boolean {
  return !!metric && ARCHIVED_CATCHING_METRICS.includes(metric);
}

/** Drop archived catching rows from any read used for display or calculation. */
export function withoutArchivedCatchingRows<T extends { metric: string }>(rows: readonly T[]): T[] {
  return rows.filter((r) => !isArchivedCatchingMetric(r.metric));
}

/**
 * Defensive play rows: distance to cover is archived, and catch probability / outs-above-expected
 * can only have come from it, so all three read as missing in the app. The stored row is untouched.
 */
export function withoutArchivedDefenseFields<T extends { distance_to_cover: number | null; catch_probability: number | null; oae_credit: number | null }>(row: T): T {
  return { ...row, distance_to_cover: null, catch_probability: null, oae_credit: null };
}


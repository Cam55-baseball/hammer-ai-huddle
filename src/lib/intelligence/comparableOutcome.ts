// Owner rule (Oct 20): "comparable" = same athlete, same sport, same category,
// same measure, measured before and 2–4 weeks after the recommendation, with at
// least 2 comparable observations. Labels: "It worked" when the change beats the
// measure's normal variation (the test's existing minimal-change value where one
// exists; otherwise a 3% relative change), "No change" inside that band,
// "Got worse" beyond it the wrong way, and "Need more data" otherwise.
// This helper never fabricates: missing or non-finite inputs are "Need more data".

export type ComparableOutcome = "worked" | "no_change" | "got_worse" | "need_more_data";

export const COMPARABLE_OUTCOME_LABEL: Record<ComparableOutcome, string> = {
  worked: "It worked",
  no_change: "No change",
  got_worse: "Got worse",
  need_more_data: "Need more data",
};

/** Default normal-variation band when a measure has no existing minimal-change value: 3% of the baseline. */
export const DEFAULT_RELATIVE_BAND = 0.03;

/** Days after the recommendation in which a re-measure counts as comparable. */
export const RECHECK_MIN_DAYS = 14;
export const RECHECK_MAX_DAYS = 28;

export interface ComparableMeasure {
  /** The before value, same units as `after`. */
  before: number | null | undefined;
  /** The after value, same units as `before`. */
  after: number | null | undefined;
  /** True when a lower number is better (e.g. time to first base). */
  lowerIsBetter?: boolean;
  /** The measure's existing minimal-change value, in the same units. Omit to use the 3% relative band. */
  minimalChange?: number | null;
  /** Days between the recommendation and the after measurement. Outside 14–28 the pair is not comparable. */
  daysAfter?: number | null;
  /** Number of comparable observations; fewer than 2 is "Need more data". */
  observations?: number | null;
}

const finite = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);

/** Normal-variation band for one measure: its own minimal-change value, else 3% of the baseline. */
export function normalVariationBand(baseline: number, minimalChange?: number | null): number {
  if (finite(minimalChange) && minimalChange > 0) return minimalChange;
  return Math.abs(baseline) * DEFAULT_RELATIVE_BAND;
}

/**
 * Judge one comparable before/after pair. Returns "need_more_data" — never a
 * guess — when either value is missing, the re-measure is outside the 2–4 week
 * window, or fewer than 2 comparable observations exist.
 */
export function judgeComparableOutcome(m: ComparableMeasure): ComparableOutcome {
  if (!finite(m.before) || !finite(m.after)) return "need_more_data";
  if (finite(m.daysAfter) && (m.daysAfter < RECHECK_MIN_DAYS || m.daysAfter > RECHECK_MAX_DAYS)) {
    return "need_more_data";
  }
  if (finite(m.observations) && m.observations < 2) return "need_more_data";
  const band = normalVariationBand(m.before, m.minimalChange);
  const diff = (m.after - m.before) * (m.lowerIsBetter ? -1 : 1);
  if (Math.abs(diff) <= band) return "no_change";
  return diff > 0 ? "worked" : "got_worse";
}

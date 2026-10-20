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

/**
 * Re-judge a stored intelligence_recommendations row under the owner rules.
 * The server judge uses a fixed absolute band and no time window, so the
 * client re-derives the label from the stored before/after values and dates.
 * A missing window or missing values is "Need more data" — never a guess.
 */
export function judgedOutcomeFromRecheck(row: {
  baseline_value?: number | null;
  recheck_value?: number | null;
  followed_at?: string | null;
  checked_at?: string | null;
  minimal_change?: number | null;
}): ComparableOutcome {
  let daysAfter: number | null = null;
  if (row.followed_at && row.checked_at) {
    const from = Date.parse(row.followed_at);
    const to = Date.parse(row.checked_at);
    if (Number.isFinite(from) && Number.isFinite(to) && to >= from) {
      daysAfter = Math.round((to - from) / 86_400_000);
    }
  }
  return judgeComparableOutcome({
    before: row.baseline_value,
    after: row.recheck_value,
    daysAfter,
    minimalChange: row.minimal_change,
  });
}

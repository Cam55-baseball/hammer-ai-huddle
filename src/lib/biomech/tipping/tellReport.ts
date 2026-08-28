/**
 * Tipping detection — "Tell Report".
 *
 * Pure computation over pose/mechanics measurements already captured per
 * pitch. No ball tracking, no video: each observation is one pitch with a
 * pitch-type tag and a set of mechanical metric values.
 *
 * The question this answers is narrow and honest: does a metric separate
 * pitch types by MORE than it wobbles pitch-to-pitch within a single type?
 * That is a one-way ANOVA in plain clothes — between-group variance over
 * within-group variance (an F-like separation ratio). A high ratio means
 * the metric reliably differs by pitch type, which is what a hitter would
 * be reading. A low ratio means the metric is the same regardless of what
 * is being thrown, and is therefore not a tell.
 *
 * Honesty rules, same as everywhere else:
 *   - Missing values are dropped, never imputed.
 *   - Insufficient data returns `indeterminate` with a reason, never a
 *     fabricated "no tell found".
 *   - A tell is reported as a likelihood with its numbers exposed, never
 *     as a certainty.
 *
 * NOT LIVE. `TIPPING_DETECTION_ENABLED` is false. Unvalidated on real data.
 */

/** Kill switch — MUST stay false until validated against real pitch data. */
export const TIPPING_DETECTION_ENABLED = false as const;

/** Metrics with real validated geometry. Only these are eligible today. */
export const TIPPING_ELIGIBLE_METRICS = [
  "energy_angle_deg",
  "shoulder_tilt_deg",
] as const;

export type TippingMetric = (typeof TIPPING_ELIGIBLE_METRICS)[number];

/** One pitch: its type tag and whatever metrics were measurable on it. */
export interface PitchObservation {
  readonly pitch_id: string;
  readonly pitch_type: string;
  /** Null = not measurable on this pitch. Never substitute a default. */
  readonly metrics: Readonly<Record<string, number | null | undefined>>;
}

export type TellIndeterminateReason =
  | "not_enough_pitch_types"
  | "not_enough_pitches_per_type"
  | "no_within_type_variation";

export interface MetricGroupSummary {
  readonly pitch_type: string;
  readonly n: number;
  readonly mean: number;
  /** Population variance within this pitch type. */
  readonly variance: number;
}

export interface MetricTellFinding {
  readonly metric: string;
  readonly verdict: "likely_tell" | "no_tell" | "indeterminate";
  readonly reason: TellIndeterminateReason | null;
  /** between-type variance / within-type variance. Null when undefined. */
  readonly separation_ratio: number | null;
  readonly between_variance: number | null;
  readonly within_variance: number | null;
  /** Largest gap between any two pitch-type means, in metric units. */
  readonly max_mean_gap: number | null;
  readonly groups: readonly MetricGroupSummary[];
  readonly pitches_used: number;
  readonly pitches_dropped_missing: number;
}

export interface TellReport {
  readonly pitcher_id: string;
  readonly pitch_types: readonly string[];
  readonly total_pitches: number;
  readonly findings: readonly MetricTellFinding[];
  readonly likely_tells: readonly string[];
  readonly config: TellReportConfig;
}

export interface TellReportConfig {
  /** Minimum usable pitches per type for that type to be scored. */
  readonly min_pitches_per_type: number;
  /** Minimum distinct scorable pitch types. */
  readonly min_pitch_types: number;
  /**
   * Separation ratio at or above which a metric is flagged. 4 means the
   * metric separates types four times more than it wobbles within a type.
   */
  readonly separation_threshold: number;
  readonly metrics: readonly string[];
}

export const DEFAULT_TELL_CONFIG: TellReportConfig = {
  min_pitches_per_type: 3,
  min_pitch_types: 2,
  separation_threshold: 4,
  metrics: TIPPING_ELIGIBLE_METRICS,
};

function usable(v: number | null | undefined): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function mean(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Population variance — these are the pitches thrown, not a sample of them. */
function variance(xs: readonly number[], mu: number): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + (b - mu) ** 2, 0) / xs.length;
}

function round(v: number, digits = 3): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

function analyzeMetric(
  metric: string,
  observations: readonly PitchObservation[],
  config: TellReportConfig,
): MetricTellFinding {
  const byType = new Map<string, number[]>();
  let dropped = 0;

  for (const obs of observations) {
    const v = obs.metrics[metric];
    if (!usable(v)) {
      dropped += 1;
      continue;
    }
    const bucket = byType.get(obs.pitch_type) ?? [];
    bucket.push(v);
    byType.set(obs.pitch_type, bucket);
  }

  const scorable = [...byType.entries()].filter(
    ([, xs]) => xs.length >= config.min_pitches_per_type,
  );

  const groups: MetricGroupSummary[] = scorable.map(([pitch_type, xs]) => {
    const mu = mean(xs);
    return {
      pitch_type,
      n: xs.length,
      mean: round(mu),
      variance: round(variance(xs, mu)),
    };
  });

  const used = scorable.reduce((a, [, xs]) => a + xs.length, 0);

  const base = {
    metric,
    groups,
    pitches_used: used,
    pitches_dropped_missing: dropped,
  };

  if (groups.length < config.min_pitch_types) {
    return {
      ...base,
      verdict: "indeterminate",
      reason:
        byType.size < config.min_pitch_types
          ? "not_enough_pitch_types"
          : "not_enough_pitches_per_type",
      separation_ratio: null,
      between_variance: null,
      within_variance: null,
      max_mean_gap: null,
    };
  }

  // Within-type variance: n-weighted average of each type's variance.
  const withinVariance =
    scorable.reduce((acc, [, xs]) => {
      const mu = mean(xs);
      return acc + variance(xs, mu) * xs.length;
    }, 0) / used;

  // Between-type variance: n-weighted spread of type means about the
  // grand mean of the pitches actually used.
  const grandMean =
    scorable.reduce((acc, [, xs]) => acc + xs.reduce((a, b) => a + b, 0), 0) / used;
  const betweenVariance =
    scorable.reduce((acc, [, xs]) => acc + xs.length * (mean(xs) - grandMean) ** 2, 0) /
    used;

  const means = groups.map((g) => g.mean);
  const maxMeanGap = Math.max(...means) - Math.min(...means);

  if (withinVariance === 0) {
    // Every pitch of a type reported an identical value. Real footage does
    // not do this; refusing to divide by zero is more honest than an
    // infinite separation ratio.
    return {
      ...base,
      verdict: "indeterminate",
      reason: "no_within_type_variation",
      separation_ratio: null,
      between_variance: round(betweenVariance),
      within_variance: 0,
      max_mean_gap: round(maxMeanGap),
    };
  }

  const ratio = betweenVariance / withinVariance;

  return {
    ...base,
    verdict: ratio >= config.separation_threshold ? "likely_tell" : "no_tell",
    reason: null,
    separation_ratio: round(ratio),
    between_variance: round(betweenVariance),
    within_variance: round(withinVariance),
    max_mean_gap: round(maxMeanGap),
  };
}

/**
 * Build a Tell Report for one pitcher from their tagged pitch observations.
 * Pure — no I/O, no clock, deterministic for a given input.
 */
export function buildTellReport(
  pitcher_id: string,
  observations: readonly PitchObservation[],
  config: TellReportConfig = DEFAULT_TELL_CONFIG,
): TellReport {
  const findings = config.metrics.map((m) => analyzeMetric(m, observations, config));
  const pitchTypes = [...new Set(observations.map((o) => o.pitch_type))].sort();

  return {
    pitcher_id,
    pitch_types: pitchTypes,
    total_pitches: observations.length,
    findings,
    likely_tells: findings.filter((f) => f.verdict === "likely_tell").map((f) => f.metric),
    config,
  };
}

/** Plain-language line for one finding. No certainty language. */
export function describeFinding(finding: MetricTellFinding): string {
  const label = finding.metric.replace(/_/g, " ");
  if (finding.verdict === "indeterminate") {
    const why: Record<TellIndeterminateReason, string> = {
      not_enough_pitch_types: "not enough different pitch types tagged yet",
      not_enough_pitches_per_type: "not enough pitches of each type yet",
      no_within_type_variation: "the values are identical within each type, which is not measurable data",
    };
    return `${label}: can't say yet — ${why[finding.reason ?? "not_enough_pitch_types"]}.`;
  }
  if (finding.verdict === "likely_tell") {
    return `${label}: likely tell — separates pitch types ${finding.separation_ratio}x more than it varies within a type (largest gap ${finding.max_mean_gap}).`;
  }
  return `${label}: no tell — varies about as much within one pitch type as it does between types.`;
}

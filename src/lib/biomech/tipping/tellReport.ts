/**
 * Tipping detection — "Tell Report".
 *
 * Pure computation over pose/mechanics measurements already captured per
 * pitch. No ball tracking, no video: each observation is one pitch with a
 * pitch-type tag, a delivery tag, and a set of mechanical metric values.
 *
 * The question this answers is narrow and honest: does a metric separate
 * pitch types by MORE than it wobbles pitch-to-pitch within a single type?
 * That is a one-way ANOVA in plain clothes — between-group variance over
 * within-group variance (an F-like separation ratio). A high ratio means
 * the metric reliably differs by pitch type, which is what a hitter would
 * be reading. A low ratio means the metric is the same regardless of what
 * is being thrown, and is therefore not a tell.
 *
 * DELIVERY SEPARATION (correctness, not a refinement): a pitcher moves
 * differently from the windup than from the stretch. Comparing a
 * fastball-from-windup against a curveball-from-stretch measures the
 * delivery, not the pitch — a false positive that would mislead badly.
 * So every comparison happens strictly within one delivery type, and a
 * pitcher gets one report per delivery. A pitch missing a delivery tag is
 * excluded from every comparison rather than guessed into one.
 *
 * Honesty rules, same as everywhere else:
 *   - Missing values are dropped, never imputed.
 *   - Insufficient data returns `indeterminate` with a reason, never a
 *     fabricated "no tell found".
 *   - A tell is reported as a likelihood with its numbers exposed, never
 *     as a certainty, and carries a sample-size confidence label.
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

/** The only deliveries a comparison may be scoped to. */
export const DELIVERY_TYPES = ["windup", "stretch"] as const;
export type DeliveryType = (typeof DELIVERY_TYPES)[number];

export function isDeliveryType(v: unknown): v is DeliveryType {
  return v === "windup" || v === "stretch";
}

/** One pitch: its type tag, delivery tag, and whatever metrics were measurable. */
export interface PitchObservation {
  readonly pitch_id: string;
  readonly pitch_type: string;
  /** Null/absent = not tagged. Such a pitch is excluded from all comparisons. */
  readonly delivery_type?: DeliveryType | null;
  /** Null = not measurable on this pitch. Never substitute a default. */
  readonly metrics: Readonly<Record<string, number | null | undefined>>;
}

export type TellIndeterminateReason =
  | "not_enough_pitch_types"
  | "not_enough_pitches_per_type"
  | "no_within_type_variation";

/** Sample-size confidence for a computed finding. Never hidden from the UI. */
export type TellConfidence = "preliminary" | "established";

export interface MetricGroupSummary {
  readonly pitch_type: string;
  readonly n: number;
  readonly mean: number;
  /** Population variance within this pitch type. */
  readonly variance: number;
}

export interface MetricTellFinding {
  readonly metric: string;
  readonly delivery_type: DeliveryType;
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
  /** Smallest scored group size — what the confidence label is driven by. */
  readonly min_group_n: number | null;
  /** Null on indeterminate findings; nothing was computed to be confident about. */
  readonly confidence: TellConfidence | null;
}

/** One delivery's arsenal: what has been tagged, and how much of it. */
export interface ArsenalEntry {
  readonly delivery_type: DeliveryType;
  readonly pitch_type: string;
  readonly n: number;
  /** True once this type has enough pitches in this delivery to be scored. */
  readonly meets_minimum: boolean;
  /** How many more pitches of this type/delivery are needed to score at all. */
  readonly pitches_to_minimum: number;
  /** How many more to reach the higher-confidence band. */
  readonly pitches_to_confident: number;
}

/** A complete report scoped to exactly one delivery. */
export interface DeliveryTellReport {
  readonly delivery_type: DeliveryType;
  readonly pitch_types: readonly string[];
  readonly total_pitches: number;
  readonly findings: readonly MetricTellFinding[];
  readonly likely_tells: readonly string[];
  readonly arsenal: readonly ArsenalEntry[];
}

export interface TellReport {
  readonly pitcher_id: string;
  /** One report per delivery. Never pooled across deliveries. */
  readonly deliveries: readonly DeliveryTellReport[];
  /** Tagged with a pitch type but no delivery — excluded, counted honestly. */
  readonly excluded_missing_delivery: number;
  readonly total_pitches: number;
  readonly config: TellReportConfig;
}

export interface TellReportConfig {
  /** Minimum usable pitches per type for that type to be scored. */
  readonly min_pitches_per_type: number;
  /** Per-type count at or above which a finding is no longer preliminary. */
  readonly confident_pitches_per_type: number;
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
  min_pitches_per_type: 5,
  confident_pitches_per_type: 10,
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

/**
 * Analyze one metric within ONE delivery. The caller is responsible for
 * having already partitioned observations by delivery; this function never
 * sees pitches from more than one delivery at a time.
 */
function analyzeMetric(
  metric: string,
  delivery_type: DeliveryType,
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
  const minGroupN = groups.length > 0 ? Math.min(...groups.map((g) => g.n)) : null;

  const base = {
    metric,
    delivery_type,
    groups,
    pitches_used: used,
    pitches_dropped_missing: dropped,
    min_group_n: minGroupN,
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
      confidence: null,
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
      confidence: null,
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
    confidence:
      (minGroupN ?? 0) >= config.confident_pitches_per_type ? "established" : "preliminary",
  };
}

function buildArsenal(
  delivery_type: DeliveryType,
  observations: readonly PitchObservation[],
  config: TellReportConfig,
): ArsenalEntry[] {
  const counts = new Map<string, number>();
  for (const o of observations) {
    counts.set(o.pitch_type, (counts.get(o.pitch_type) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([pitch_type, n]) => ({
      delivery_type,
      pitch_type,
      n,
      meets_minimum: n >= config.min_pitches_per_type,
      pitches_to_minimum: Math.max(0, config.min_pitches_per_type - n),
      pitches_to_confident: Math.max(0, config.confident_pitches_per_type - n),
    }));
}

/**
 * Build a Tell Report for one pitcher from their tagged pitch observations.
 * Pure — no I/O, no clock, deterministic for a given input.
 *
 * Observations are partitioned by delivery first; windup and stretch pitches
 * are never pooled into the same comparison. Observations without a delivery
 * tag are excluded and reported as such.
 */
export function buildTellReport(
  pitcher_id: string,
  observations: readonly PitchObservation[],
  config: TellReportConfig = DEFAULT_TELL_CONFIG,
): TellReport {
  const excluded = observations.filter((o) => !isDeliveryType(o.delivery_type)).length;

  const deliveries: DeliveryTellReport[] = DELIVERY_TYPES.map((delivery) => {
    const scoped = observations.filter((o) => o.delivery_type === delivery);
    return {
      delivery_type: delivery,
      pitch_types: [...new Set(scoped.map((o) => o.pitch_type))].sort(),
      total_pitches: scoped.length,
      findings: config.metrics.map((m) => analyzeMetric(m, delivery, scoped, config)),
      likely_tells: [],
      arsenal: buildArsenal(delivery, scoped, config),
    };
  }).map((d) => ({
    ...d,
    likely_tells: d.findings.filter((f) => f.verdict === "likely_tell").map((f) => f.metric),
  }));

  return {
    pitcher_id,
    deliveries,
    excluded_missing_delivery: excluded,
    total_pitches: observations.length,
    config,
  };
}

const DELIVERY_LABEL: Record<DeliveryType, string> = {
  windup: "windup",
  stretch: "stretch",
};

/** Plain-language line for one finding. No certainty language. */
export function describeFinding(finding: MetricTellFinding): string {
  const label = finding.metric.replace(/_/g, " ");
  const where = `from the ${DELIVERY_LABEL[finding.delivery_type]}`;
  if (finding.verdict === "indeterminate") {
    const why: Record<TellIndeterminateReason, string> = {
      not_enough_pitch_types: "not enough different pitch types tagged yet",
      not_enough_pitches_per_type: `not enough pitches of each type yet (need ${finding.pitches_used === 0 ? DEFAULT_TELL_CONFIG.min_pitches_per_type : finding.min_group_n === null ? DEFAULT_TELL_CONFIG.min_pitches_per_type : DEFAULT_TELL_CONFIG.min_pitches_per_type} of each)`,
      no_within_type_variation:
        "the values are identical within each type, which is not measurable data",
    };
    return `${label} ${where}: can't say yet — ${why[finding.reason ?? "not_enough_pitch_types"]}.`;
  }
  const strength =
    finding.confidence === "established"
      ? ""
      : ` Early read — based on as few as ${finding.min_group_n} pitches of a type, so treat it as a first look, not a conclusion.`;
  if (finding.verdict === "likely_tell") {
    return `${label} ${where}: likely tell — separates pitch types ${finding.separation_ratio}x more than it varies within a type (largest gap ${finding.max_mean_gap}).${strength}`;
  }
  return `${label} ${where}: no tell — varies about as much within one pitch type as it does between types.${strength}`;
}

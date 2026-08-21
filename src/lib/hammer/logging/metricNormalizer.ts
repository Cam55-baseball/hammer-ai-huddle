/**
 * Canonical metric normalizer — pure, deterministic, shared shape with
 * `supabase/functions/_shared/wic/progression/metricNormalizer.ts`.
 *
 * Log templates name their fields for the athlete ("Peak velo", "Bat speed",
 * "Time"). The progression engine reads canonical keys (`throw_velo_mph`,
 * `bat_speed_mph`, `sprint_time_s`). This module is the single translation
 * between the two so a new template can never silently drop a metric.
 *
 * Direction-aware: sprint time takes the fastest round, every other metric
 * takes the best (highest) round.
 */

export type LoggedRound = Record<string, unknown>;

export interface CanonicalMetric {
  readonly key: string;
  readonly label: string;
  readonly unit: string;
  readonly value: number;
}

/** Metrics where a lower number is the better number. */
export const LOWER_IS_BETTER: ReadonlySet<string> = new Set(["sprint_time_s"]);

interface MetricSpec {
  readonly key: string;
  readonly label: string;
  readonly unit: string;
  /** Round-field keys that feed this metric. */
  readonly from: readonly string[];
  /** When set, only these template ids may produce the metric. */
  readonly templates?: readonly string[];
}

const SPRINT_TEMPLATES = ["sprint_timed", "agility"] as const;
const THROW_TEMPLATES = ["long_toss", "bullpen_pitching", "pitching_outing", "catch_play"] as const;
const BAT_TEMPLATES = ["bat_speed_tee", "bat_speed_live", "overload_bat"] as const;
const LOAD_TEMPLATES = [
  "barbell_lift",
  "accessory_lift",
  "unilateral_lift",
  "isometric_hold",
  "carry",
  "sled",
] as const;

const SPECS: readonly MetricSpec[] = [
  { key: "bat_speed_mph", label: "peak bat speed", unit: "mph", from: ["bat_speed", "bat_speed_mph", "peak_bat_speed"], templates: BAT_TEMPLATES },
  { key: "exit_velo_mph", label: "exit velo", unit: "mph", from: ["exit_velo", "exit_velo_mph", "exit_velocity"], templates: BAT_TEMPLATES },
  { key: "throw_velo_mph", label: "throwing velo", unit: "mph", from: ["peak_velo", "throw_velo_mph", "velo_mph"], templates: THROW_TEMPLATES },
  { key: "sprint_time_s", label: "sprint time", unit: "s", from: ["time", "sprint_time_s", "time_seconds"], templates: SPRINT_TEMPLATES },
  { key: "sprint_distance_ft", label: "sprint distance", unit: "ft", from: ["distance", "sprint_distance_ft"], templates: SPRINT_TEMPLATES },
  { key: "throw_distance_ft", label: "throw distance", unit: "ft", from: ["distance", "throw_distance_ft"], templates: THROW_TEMPLATES },
  { key: "jump_height_in", label: "jump height", unit: "in", from: ["height", "jump_height_in"], templates: ["jump_plyo"] },
  { key: "load_lb", label: "load", unit: "lb", from: ["weight", "load", "load_lb"], templates: LOAD_TEMPLATES },
];

function toPositiveNumber(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Derive the canonical metric set for one logged movement.
 * `templateId` may be null — then every spec without a template gate applies,
 * and gated specs are skipped rather than guessed.
 */
export function deriveCanonicalMetrics(
  templateId: string | null | undefined,
  rounds: readonly LoggedRound[] | null | undefined,
): CanonicalMetric[] {
  if (!rounds || rounds.length === 0) return [];
  const out: CanonicalMetric[] = [];

  for (const spec of SPECS) {
    if (spec.templates && (!templateId || !spec.templates.includes(templateId))) continue;
    let best: number | null = null;
    for (const round of rounds) {
      if (!round || typeof round !== "object") continue;
      for (const field of spec.from) {
        const value = toPositiveNumber((round as Record<string, unknown>)[field]);
        if (value == null) continue;
        if (best == null) best = value;
        else best = LOWER_IS_BETTER.has(spec.key) ? Math.min(best, value) : Math.max(best, value);
      }
    }
    if (best != null) out.push({ key: spec.key, label: spec.label, unit: spec.unit, value: best });
  }

  return out;
}

/** Flat `{ key: value }` shape written alongside `rounds` in `wk_session_logs.metrics`. */
export function canonicalMetricMap(
  templateId: string | null | undefined,
  rounds: readonly LoggedRound[] | null | undefined,
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const m of deriveCanonicalMetrics(templateId, rounds)) map[m.key] = m.value;
  return map;
}

// ---------------------------------------------------------------------------
// Per-side (left / right) metrics
//
// Unilateral movements log one round per side. The combined bests above stay
// exactly as they were; these helpers add a side-decomposed view so progression
// and imbalance reads can see L vs R without re-parsing rounds.
// ---------------------------------------------------------------------------

export type SideKey = "L" | "R";

/** Deltas are only reported when BOTH sides carry at least this many rounds. */
export const MIN_ROUNDS_PER_SIDE_FOR_DELTA = 2;

export interface SideMetrics {
  readonly rounds: number;
  readonly metrics: Record<string, number>;
}

export interface SideDelta {
  readonly key: string;
  readonly label: string;
  readonly unit: string;
  readonly left: number;
  readonly right: number;
  /** Absolute difference as a percentage of the stronger/faster side. */
  readonly diffPct: number;
  readonly weaker: SideKey;
}

export interface SideMetricSummary {
  readonly L: SideMetrics | null;
  readonly R: SideMetrics | null;
  readonly unsided: number;
  readonly deltas: SideDelta[];
}

function normalizeSide(v: unknown): SideKey | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toUpperCase();
  if (s === "L" || s === "LEFT") return "L";
  if (s === "R" || s === "RIGHT") return "R";
  return null;
}

/**
 * Split logged rounds by their `side` field and derive canonical metrics per
 * side. Returns `null` when no round carries a side — never imputes a side.
 */
export function deriveSideMetrics(
  templateId: string | null | undefined,
  rounds: readonly LoggedRound[] | null | undefined,
  minRoundsPerSide: number = MIN_ROUNDS_PER_SIDE_FOR_DELTA,
): SideMetricSummary | null {
  if (!rounds || rounds.length === 0) return null;

  const buckets: Record<SideKey, LoggedRound[]> = { L: [], R: [] };
  let unsided = 0;
  for (const round of rounds) {
    if (!round || typeof round !== "object") continue;
    const side = normalizeSide((round as Record<string, unknown>).side);
    if (side) buckets[side].push(round);
    else unsided += 1;
  }
  if (buckets.L.length === 0 && buckets.R.length === 0) return null;

  const build = (side: SideKey): SideMetrics | null => {
    if (buckets[side].length === 0) return null;
    return {
      rounds: buckets[side].length,
      metrics: canonicalMetricMap(templateId, buckets[side]),
    };
  };

  const L = build("L");
  const R = build("R");

  const deltas: SideDelta[] = [];
  if (
    L && R &&
    L.rounds >= minRoundsPerSide &&
    R.rounds >= minRoundsPerSide
  ) {
    for (const spec of SPECS) {
      const l = L.metrics[spec.key];
      const r = R.metrics[spec.key];
      if (typeof l !== "number" || typeof r !== "number" || l <= 0 || r <= 0) continue;
      const lowerBetter = LOWER_IS_BETTER.has(spec.key);
      const better = lowerBetter ? Math.min(l, r) : Math.max(l, r);
      const worse = lowerBetter ? Math.max(l, r) : Math.min(l, r);
      const reference = lowerBetter ? worse : better;
      if (reference <= 0) continue;
      const diffPct = Math.round((Math.abs(l - r) / reference) * 1000) / 10;
      const weaker: SideKey = (lowerBetter ? (l > r) : (l < r)) ? "L" : "R";
      deltas.push({
        key: spec.key,
        label: spec.label,
        unit: spec.unit,
        left: l,
        right: r,
        diffPct,
        weaker,
      });
    }
  }

  return { L, R, unsided, deltas };
}

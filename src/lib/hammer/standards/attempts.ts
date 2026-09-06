/**
 * Standards attempt collection — pure, deterministic, no I/O, no dose authority.
 *
 * Why this exists: every mark in the catalog is seeded from outside field
 * benchmarks and carries an honest "not yet validated on Hammers athletes"
 * label. That label stays true until we hold our own distribution. So from now
 * on, every logged set at a movement that belongs to a standard is recorded as
 * a raw observation — the number, the movement, the standard it maps to, the
 * date, the athlete's training-age band, and how many attempts the row stands
 * for.
 *
 * Raw only. Nothing derived, nothing graded, nothing displayed. The evaluator,
 * the awards table and every athlete-facing surface are untouched by this file.
 */
import type { AthleteMeasures, LoggedSet } from "./evaluate";
import { buildBestIndex, evaluateStandard, standardsForSlug } from "./evaluate";
import { effectiveBodyweight, type StandardDef } from "./catalog";

export interface AttemptObservation {
  standard_id: string;
  family: string;
  movement_slug: string;
  metric: string;
  unit: string | null;
  observed_value: number;
  reps_at_value: number | null;
  bodyweight_lbs: number | null;
  training_age_band: string;
  chronological_age: number | null;
  /** Always at least 1. One attempt is one attempt. */
  sample_size: number;
  plan_date: string;
}

/** Metrics a single logged set can honestly speak to on its own. */
const PER_SET_METRICS = new Set(["reps", "seconds", "distance_ft", "load_pct_bw_at_reps"]);

function n(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

/** How many rounds in this set actually produced a number for the metric. */
function countRounds(set: LoggedSet, def: StandardDef): number {
  let c = 0;
  for (const r of set.rounds ?? []) {
    switch (def.metric) {
      case "reps":
        if ((n(r.reps) ?? 0) > 0) c += 1;
        break;
      case "seconds":
        if ((n(r.duration) ?? n(r.time) ?? 0) > 0) c += 1;
        break;
      case "distance_ft":
        if ((n(r.distance) ?? 0) > 0) c += 1;
        break;
      case "load_pct_bw_at_reps":
        if ((n(r.weight) ?? 0) > 0 && (n(r.reps) ?? 0) > 0) c += 1;
        break;
      default:
        break;
    }
  }
  return Math.max(1, c);
}

function bestRepsInSet(set: LoggedSet): number | null {
  let best: number | null = null;
  for (const r of set.rounds ?? []) {
    const v = n(r.reps);
    if (v !== null && (best === null || v > best)) best = v;
  }
  return best;
}

/**
 * Every raw observation this one logged set contributes.
 * Returns [] when the movement belongs to no standard, or nothing usable was
 * logged. Eligibility gates (age, training age) do NOT filter collection —
 * they only ever gated display and awards, and the research distribution wants
 * the full population.
 */
export function collectAttempts(
  set: LoggedSet,
  m: AthleteMeasures,
  planDate: string,
): AttemptObservation[] {
  if (!set.movement_slug) return [];
  const idx = buildBestIndex([set]);
  const out: AttemptObservation[] = [];

  for (const def of standardsForSlug(set.movement_slug)) {
    if (!PER_SET_METRICS.has(def.metric)) continue;
    const p = evaluateStandard(def, idx, m);
    if (p.value === null || !Number.isFinite(p.value)) continue;

    out.push({
      standard_id: def.id,
      family: def.family,
      movement_slug: set.movement_slug,
      metric: def.metric,
      unit: def.unit ?? null,
      observed_value: p.value,
      reps_at_value: def.metric === "load_pct_bw_at_reps" ? bestRepsInSet(set) : null,
      bodyweight_lbs: effectiveBodyweight(m.bodyweightLbs),
      training_age_band: m.trainingAge ?? "unknown",
      chronological_age: m.chronologicalAge,
      sample_size: countRounds(set, def),
      plan_date: planDate,
    });
  }
  return out;
}

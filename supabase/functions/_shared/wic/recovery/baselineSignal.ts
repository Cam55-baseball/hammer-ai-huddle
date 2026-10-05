/**
 * Stage 7 (owner-authorised 2026-10-05) — the athlete's own baselines in the plan.
 *
 * Pure. Reads the latest baseline verdict per metric (athlete_baseline_history,
 * written by public.baseline_recompute: median + IQR, at least the minimum
 * number of in-context observations). Only an ESTABLISHED baseline counts —
 * "still_learning"/"missing" never moves anything.
 *
 * Effect: at most ONE recovery-limit step, and none when the check-in already
 * stepped (sleep / readiness / day intent), so the athlete's own usual
 * sharpens the existing rule instead of stacking a second one. Only ever
 * lighter, only from a recent observation, never a dose, never a slot.
 */
export interface BaselineRow {
  metric_key: string;
  status: string;
  n_used: number;
  computed_at: string;
  /** recorded_at of the observation the verdict was computed for. */
  observed_at: string | null;
}
export interface BaselineSignal {
  coverage: "none" | "learning" | "established";
  established: string[];
  learning: string[];
  applied: boolean;
  trigger: { metric_key: string; status: string; observed_at: string } | null;
  reason: string | null;
}

/** Metric → which direction means "go lighter". */
const LIGHTER_WHEN: Record<string, "low" | "high"> = {
  "readiness.readiness_score": "low",
  "readiness.training_readiness_score": "low",
  "lifting.session_rpe": "high",
  "workload.recovery_debt": "high",
};
const LINES: Record<string, string> = {
  "readiness.readiness_score": "Your check-in is lower than your usual, so today is lighter.",
  "readiness.training_readiness_score": "Your check-in is lower than your usual, so today is lighter.",
  "lifting.session_rpe": "Your last lift felt much harder than usual for you, so today is lighter.",
  "workload.recovery_debt": "You're carrying more tiredness than usual for you, so today is lighter.",
};
const ESTABLISHED = new Set(["well_below", "below", "usual", "above", "well_above"]);
export const BASELINE_RECENT_DAYS = 2;

export function baselineSignal(input: { planDate: string; rows: BaselineRow[]; checkInAlreadyStepped: boolean }): BaselineSignal {
  // Latest verdict per metric.
  const latest = new Map<string, BaselineRow>();
  for (const r of input.rows) {
    const prev = latest.get(r.metric_key);
    if (!prev || r.computed_at > prev.computed_at || (r.computed_at === prev.computed_at && (r.observed_at ?? "") > (prev.observed_at ?? ""))) latest.set(r.metric_key, r);
  }
  const established: string[] = [];
  const learning: string[] = [];
  for (const [k, r] of latest) (ESTABLISHED.has(r.status) ? established : learning).push(k);
  established.sort(); learning.sort();
  const coverage = established.length ? "established" : learning.length ? "learning" : "none";

  const from = new Date(`${input.planDate}T12:00:00Z`);
  from.setUTCDate(from.getUTCDate() - BASELINE_RECENT_DAYS);
  const fromIso = from.toISOString().slice(0, 10);

  let trigger: BaselineSignal["trigger"] = null;
  for (const k of Object.keys(LIGHTER_WHEN)) {
    const r = latest.get(k);
    if (!r || !ESTABLISHED.has(r.status) || !r.observed_at) continue;
    const d = r.observed_at.slice(0, 10);
    if (d < fromIso || d > input.planDate) continue;
    // Only a clear move away from their own usual: "well_" for every metric,
    // plus "below" for a check-in (the band already accounts for their noise).
    const far = LIGHTER_WHEN[k] === "low" ? (r.status === "well_below" || r.status === "below") : r.status === "well_above";
    if (far) { trigger = { metric_key: k, status: r.status, observed_at: d }; break; }
  }
  const applied = !!trigger && !input.checkInAlreadyStepped;
  return { coverage, established, learning, applied, trigger, reason: applied ? LINES[trigger!.metric_key] : null };
}

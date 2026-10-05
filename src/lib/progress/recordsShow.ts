/**
 * Stage 6 (owner-authorised 2026-10-05) — The General: what the athlete's own
 * records show. Pure.
 *
 * - "On file": which kinds of record exist, with their first and latest dates.
 *   Facts only — no averages, no trends invented from them.
 * - "Moves together": only relationships that clear the correlation store's
 *   EVIDENCE_BAR (`whatMovesWith`). Worded "tends to move with", never cause.
 *   Below the bar we say so, with a meter toward it — no number, no guess.
 * - Never a medical, psychological or behavioural inference: mental/mood keys
 *   are excluded before any test is run.
 */
import { EVIDENCE_BAR, whatMovesWith, type MetricPair } from "@/lib/biomech/baseline/metricCorrelation";

export const EXCLUDED_KEY = /mood|stress|motivat|confiden|mental|focus|emotion|journal|anxi|mindset|discipline|effort|attitude/i;

const LABELS: Record<string, string> = {
  "readiness.readiness_score": "your body check-in",
  "readiness.training_readiness_score": "your training readiness",
  "workload.volume_load": "your lifting volume",
  "workload.cns_load_total": "your planned hard work",
  "workload.cns_load_actual": "the hard work you did",
  "workload.recovery_debt": "the recovery you owe",
  "lifting.session_rpe": "how hard your lifts felt",
};
export function metricLabel(key: string): string {
  if (LABELS[key]) return LABELS[key];
  const last = key.split(".").slice(1).join(" ").replace(/_/g, " ");
  return `your ${last || key}`;
}

export interface RecordKind { key: string; label: string; first: string | null; last: string | null; unlocks: string }
export interface MovesTogether { a: string; b: string; sentence: string; from: string; to: string }
export interface RecordsShow {
  onFile: RecordKind[];
  together: MovesTogether[];
  /** 0–1: best paired-day coverage toward the evidence bar (for a meter). */
  progressToBar: number;
  /** Plain line when nothing cleared. */
  waiting: string | null;
}

export function buildRecordsShow(input: { kinds: RecordKind[]; pairs: readonly MetricPair[] }): RecordsShow {
  const pairs = input.pairs.filter((p) => !EXCLUDED_KEY.test(p.key_a) && !EXCLUDED_KEY.test(p.key_b) && p.key_a !== p.key_b);
  const keys = [...new Set(pairs.flatMap((p) => [p.key_a, p.key_b]))].sort();
  const seen = new Set<string>();
  const together: MovesTogether[] = [];
  let bestDays = 0;
  for (const k of keys) {
    for (const v of whatMovesWith(pairs, k)) {
      bestDays = Math.max(bestDays, v.n);
      const id = [k, v.other].sort().join("|");
      if (!v.surfaced || seen.has(id)) continue;
      seen.add(id);
      const days = pairs.filter((p) => (p.key_a === k && p.key_b === v.other) || (p.key_b === k && p.key_a === v.other)).map((p) => p.day).sort();
      const A = metricLabel(k), B = metricLabel(v.other);
      together.push({
        a: k, b: v.other, from: days[0], to: days[days.length - 1],
        sentence: v.direction === "moves_with"
          ? `When ${A} is higher, ${B} tends to be higher too.`
          : `When ${A} is higher, ${B} tends to be lower.`,
      });
    }
  }
  return {
    onFile: input.kinds,
    together,
    progressToBar: Math.min(1, bestDays / EVIDENCE_BAR.min_n),
    waiting: together.length
      ? null
      : keys.length === 0
        ? "Nothing to compare yet. Once you've logged the same things on the same days for a while, anything that really moves together shows up here."
        : "Not enough yet to say anything moves together. Keep logging. Only patterns that hold up over many days show up here.",
  };
}

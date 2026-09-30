/**
 * Correlation store over the athlete ledger (`athlete_metric_observations`,
 * paired by the `athlete_metric_pairs` view: same clip, or same day when one
 * side has no clip). Data accumulates from day one; nothing is SURFACED until
 * it clears EVIDENCE_BAR. Never blends athletes — every call is one athlete.
 *
 * Evidence bar (all must hold), and why:
 *  - n ≥ 20 paired observations: below ~20 a rank correlation of 0.5 is
 *    within chance for a single pair.
 *  - |Spearman ρ| ≥ 0.5: ranks, not raw values, so one odd clip can't make it.
 *  - Bonferroni: p < 0.05 / (number of pairs tested for this athlete). An
 *    athlete with 40 measurements has 780 pairs; ~39 would clear p<0.05 by
 *    luck alone. This is the fabrication problem in a new costume.
 *  - Replicates: same sign and |ρ| ≥ 0.3 in BOTH the earlier and later half,
 *    so a relationship that only existed for one fortnight is not reported.
 * Even when cleared: staff-only, worded as "moves with", never "causes".
 */
import { pearson, MIN_SAMPLES, type CorrelationResult } from "@/lib/progress/correlations";

export interface MetricObservation { readonly video_id: string; readonly metric_key: string; readonly value: number; readonly recorded_at: string; }
export interface MetricPair { readonly key_a: string; readonly key_b: string; readonly value_a: number; readonly value_b: number; readonly day: string; }

export const EVIDENCE_BAR = { min_n: 20, min_abs_rho: 0.5, alpha: 0.05, split_half_min_abs_rho: 0.3 } as const;

export function correlateMetrics(rows: readonly MetricObservation[], xKey: string, yKey: string): CorrelationResult | null {
  const x = new Map<string, MetricObservation>();
  for (const r of rows) if (r.metric_key === xKey) x.set(r.video_id, r);
  const pts = rows.filter((r) => r.metric_key === yKey && x.has(r.video_id))
    .map((r) => ({ x: x.get(r.video_id)!.value, y: r.value, date: r.recorded_at.slice(0, 10) }));
  return pts.length < MIN_SAMPLES ? null : pearson(pts);
}

/** Flatten a card's tile values into store rows. Missing values are not written. */
export function toObservations(videoId: string, recordedAt: string, prefix: string, tiles: Record<string, { values: Readonly<Record<string, number | null>> }>): MetricObservation[] {
  const out: MetricObservation[] = [];
  for (const [k, t] of Object.entries(tiles)) for (const [vk, v] of Object.entries(t.values))
    if (v != null && Number.isFinite(v)) out.push({ video_id: videoId, metric_key: `${prefix}.${k}.${vk}`, value: v, recorded_at: recordedAt });
  return out.sort((a, b) => (a.metric_key < b.metric_key ? -1 : 1));
}

const ranks = (a: readonly number[]) => {
  const idx = a.map((v, i) => [v, i] as const).sort((p, q) => p[0] - q[0]);
  const r = new Array<number>(a.length);
  for (let i = 0; i < idx.length;) {
    let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
};
export function spearman(x: readonly number[], y: readonly number[]): number | null {
  if (x.length !== y.length || x.length < 3) return null;
  const rx = ranks(x), ry = ranks(y), n = x.length;
  const mx = rx.reduce((s, v) => s + v, 0) / n, my = ry.reduce((s, v) => s + v, 0) / n;
  let c = 0, vx = 0, vy = 0;
  for (let i = 0; i < n; i++) { c += (rx[i] - mx) * (ry[i] - my); vx += (rx[i] - mx) ** 2; vy += (ry[i] - my) ** 2; }
  return vx > 0 && vy > 0 ? c / Math.sqrt(vx * vy) : null;
}
/** Two-sided p for ρ via t with n−2 df (normal approximation to t; conservative enough at n ≥ 20). */
export function rhoPValue(rho: number, n: number): number {
  const t = Math.abs(rho) * Math.sqrt((n - 2) / Math.max(1e-12, 1 - rho * rho));
  const z = t, p = Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
  const b = 1 / (1 + 0.2316419 * z), tail = p * b * (0.31938153 + b * (-0.356563782 + b * (1.781477937 + b * (-1.821255978 + b * 1.330274429))));
  return Math.min(1, 2 * tail);
}

export interface CorrelationVerdict { readonly other: string; readonly n: number; readonly rho: number | null; readonly p: number | null; readonly surfaced: boolean; readonly reason: string; readonly direction: "moves_with" | "moves_against" | null; }

/** Same-day pairs collapse to one point per day (median of each side), so a busy day can't count ten times. */
function collapse(pairs: readonly MetricPair[]) {
  const byDay = new Map<string, { a: number[]; b: number[] }>();
  for (const p of pairs) { const d = byDay.get(p.day) ?? { a: [], b: [] }; d.a.push(p.value_a); d.b.push(p.value_b); byDay.set(p.day, d); }
  const med = (v: number[]) => { const s = [...v].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  return [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([day, d]) => ({ day, a: med(d.a), b: med(d.b) }));
}

/** "When this athlete's <key> drops, what else moves?" — one athlete's pairs only. */
export function whatMovesWith(pairs: readonly MetricPair[], key: string): CorrelationVerdict[] {
  const groups = new Map<string, MetricPair[]>();
  for (const p of pairs) {
    if (p.key_a !== key && p.key_b !== key) continue;
    const other = p.key_a === key ? p.key_b : p.key_a;
    const oriented = p.key_a === key ? p : { ...p, key_a: p.key_b, key_b: p.key_a, value_a: p.value_b, value_b: p.value_a };
    (groups.get(other) ?? groups.set(other, []).get(other)!).push(oriented);
  }
  const tests = Math.max(1, groups.size);
  return [...groups.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([other, ps]) => {
    const pts = collapse(ps), n = pts.length;
    if (n < EVIDENCE_BAR.min_n) return { other, n, rho: null, p: null, surfaced: false, reason: "not_enough_paired_sessions", direction: null };
    const rho = spearman(pts.map((q) => q.a), pts.map((q) => q.b));
    if (rho == null) return { other, n, rho: null, p: null, surfaced: false, reason: "no_variation", direction: null };
    const p = rhoPValue(rho, n);
    const h = n >> 1, r1 = spearman(pts.slice(0, h).map((q) => q.a), pts.slice(0, h).map((q) => q.b)), r2 = spearman(pts.slice(h).map((q) => q.a), pts.slice(h).map((q) => q.b));
    const replicates = r1 != null && r2 != null && Math.sign(r1) === Math.sign(rho) && Math.sign(r2) === Math.sign(rho)
      && Math.abs(r1) >= EVIDENCE_BAR.split_half_min_abs_rho && Math.abs(r2) >= EVIDENCE_BAR.split_half_min_abs_rho;
    const reason = Math.abs(rho) < EVIDENCE_BAR.min_abs_rho ? "too_weak" : p >= EVIDENCE_BAR.alpha / tests ? "could_be_chance_after_multiple_testing" : !replicates ? "does_not_replicate_across_halves" : "cleared";
    return { other, n, rho, p, surfaced: reason === "cleared", reason, direction: reason === "cleared" ? (rho > 0 ? "moves_with" : "moves_against") : null };
  });
}

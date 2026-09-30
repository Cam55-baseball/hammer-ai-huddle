/**
 * Per-athlete baseline — owner rulings 2026-09-30. Mirror of the database
 * engine `public.baseline_recompute` (the ledger's one writer runs it on every
 * new observation; this module is the same maths for tests and the client).
 *
 * Robust statistics only: centre = median, spread = IQR (robust SD = IQR/1.349).
 * One bad clip cannot move either.
 *
 * Why BASELINE_MIN_CLIPS = 8: quartiles need at least two points on each side
 * of each quartile to be more than a single clip; with n = 8 each quartile is
 * interpolated between clips 2–3 and 6–7, so any ONE odd clip shifts the IQR
 * by at most one rank. Below 8 a single clip can be a quartile by itself and
 * the band chases noise. Above ~10 an athlete filming weekly waits two months
 * for any feedback. 8 = two–three sessions of normal filming.
 *
 * Only prior clips in the SAME capture context (camera view + side) form a
 * baseline, so a change of filming angle can never read as a change in the
 * athlete. The newest clip is never part of its own baseline.
 */
export const ATHLETE_BASELINE_VERSION = "athlete_baseline@2.0.0-2026-09-30-median-iqr";
export const BASELINE_MIN_CLIPS = 8;
/** Use at most the last N clips so the baseline follows a developing athlete. */
export const BASELINE_WINDOW = 20;
/** Band half-width in robust SDs. */
export const BAND_K = 1.0;
export const FAR_K = 2.0;
/** Sustained drift = this many consecutive observations (incl. current) on one side. */
export const DRIFT_RUN = 4;
export const IQR_TO_SD = 1.349;

export interface BaselineObservation { readonly clip_id: string; readonly recorded_at: string; readonly value: number | null; }
export type BaselineStatus = "still_learning" | "well_below" | "below" | "usual" | "above" | "well_above" | "missing";

export interface BaselineResult {
  readonly status: BaselineStatus;
  readonly clips_used: number;
  readonly clips_needed: number;
  readonly centre: number | null;
  readonly band: readonly [number, number] | null;
  /** null = not enough history to judge a drift (needs 8 before the run + the run). */
  readonly trend: "rising" | "falling" | "steady" | null;
  readonly version: string;
}

/** Linear-interpolated percentile, identical to Postgres percentile_cont. */
export function percentileCont(a: readonly number[], p: number): number {
  const s = [...a].sort((x, y) => x - y);
  const pos = p * (s.length - 1), lo = Math.floor(pos), hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}
const robust = (vals: readonly number[], floor: number) => {
  const c = percentileCont(vals, 0.5);
  return { c, rsd: Math.max((percentileCont(vals, 0.75) - percentileCont(vals, 0.25)) / IQR_TO_SD, floor) };
};

/**
 * @param history prior clips in the same capture context (any order), current clip excluded.
 * @param current this clip's value.
 * @param noiseFloor measurement floor — the band is never narrower than this, so noise is never called a change.
 */
export function compareToBaseline(history: readonly BaselineObservation[], current: number | null, noiseFloor: number): BaselineResult {
  const vals = [...history].filter((h) => h.value != null && Number.isFinite(h.value))
    .sort((a, b) => (a.recorded_at < b.recorded_at ? -1 : a.recorded_at > b.recorded_at ? 1 : a.clip_id < b.clip_id ? -1 : 1))
    .slice(-BASELINE_WINDOW).map((h) => h.value as number);
  const base = { clips_used: vals.length, clips_needed: BASELINE_MIN_CLIPS, version: ATHLETE_BASELINE_VERSION };
  if (vals.length < BASELINE_MIN_CLIPS) return { ...base, status: current == null ? "missing" : "still_learning", centre: null, band: null, trend: null };
  const { c, rsd } = robust(vals, noiseFloor);
  const band: [number, number] = [c - BAND_K * rsd, c + BAND_K * rsd];
  if (current == null) return { ...base, status: "missing", centre: c, band, trend: null };

  let trend: BaselineResult["trend"] = null;
  const recent = [...vals.slice(-(DRIFT_RUN - 1)), current];
  const before = vals.slice(0, vals.length - (DRIFT_RUN - 1));
  if (recent.length === DRIFT_RUN && before.length >= BASELINE_MIN_CLIPS) {
    const b = robust(before, noiseFloor), rm = percentileCont(recent, 0.5);
    const oneSide = recent.every((x) => x > b.c) || recent.every((x) => x < b.c);
    trend = b.rsd > 0 && oneSide && Math.abs(rm - b.c) > b.rsd ? (rm > b.c ? "rising" : "falling") : "steady";
  }
  if (rsd <= 0) return { ...base, status: "usual", centre: c, band, trend };
  const z = (current - c) / rsd;
  const status: BaselineStatus = z <= -FAR_K ? "well_below" : z < -BAND_K ? "below" : z >= FAR_K ? "well_above" : z > BAND_K ? "above" : "usual";
  return { ...base, status, centre: c, band, trend };
}

/** Alerts fire only for strong single deviations or sustained drifts — never for "a little". */
export function alertsFor(r: BaselineResult, o: { noiseFloorDeclared: boolean; confidence: number | null; minConfidence?: number }): Array<{ kind: "outlier" | "drift"; direction: "below" | "above" }> {
  if (!o.noiseFloorDeclared) return [];
  if (o.confidence != null && o.confidence < (o.minConfidence ?? 0.5)) return [];
  const out: Array<{ kind: "outlier" | "drift"; direction: "below" | "above" }> = [];
  if (r.status === "well_below" || r.status === "well_above") out.push({ kind: "outlier", direction: r.status === "well_below" ? "below" : "above" });
  if (r.trend === "rising" || r.trend === "falling") out.push({ kind: "drift", direction: r.trend === "falling" ? "below" : "above" });
  return out;
}

/** Coach language, no numbers. Both directions can matter for this athlete. */
export const BASELINE_COPY: Record<BaselineStatus, string> = {
  still_learning: "We're still learning your normal range — keep filming and we'll start comparing soon.",
  missing: "We couldn't read this one on this clip.",
  usual: "Right where you normally sit.",
  below: "A little below where you normally sit.",
  well_below: "Well below where you normally sit — work on getting back to your usual range.",
  above: "A little above where you normally sit.",
  well_above: "Well above where you normally sit — if it feels off or something hurts, ease back toward your usual range and tell your coach.",
};
export const TREND_COPY: Record<"rising" | "falling" | "steady", string> = {
  rising: "It has been creeping up over your recent clips.",
  falling: "It has been drifting down over your recent clips.",
  steady: "It has been steady over your recent clips.",
};

/** Athlete-facing alert sentence. `label` comes from measurement_definitions.athlete_label. */
export function alertSentence(label: string, kind: "outlier" | "drift", direction: "below" | "above"): string {
  const L = label.charAt(0).toUpperCase() + label.slice(1);
  if (kind === "outlier") return direction === "below" ? `Your ${label} is well below where you normally sit.` : `Your ${label} is well above where you normally sit.`;
  return direction === "below" ? `${L} has been drifting down over your last few sessions.` : `${L} has been creeping up over your last few sessions.`;
}

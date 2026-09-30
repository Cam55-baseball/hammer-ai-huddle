/**
 * Per-athlete baseline — owner ruling 2026-09-30 ("fascial law says each user
 * is different"). For measurements with real individual variation and no
 * defensible population threshold: record every clip, learn the athlete's OWN
 * typical range, flag deviation in BOTH directions. Never a universal optimum.
 *
 * Why BASELINE_MIN_CLIPS = 8: the baseline centre is the median and the spread
 * is the MAD. With n < 8 a single odd clip moves the MAD by >30 %, and the
 * band would chase noise. 8 keeps the breakdown point (4 bad clips) above
 * what one bad session produces. Until then the athlete sees "still learning".
 * The newest clip is never part of its own baseline.
 */
export const ATHLETE_BASELINE_VERSION = "athlete_baseline@1.0.0-2026-09-30";
export const BASELINE_MIN_CLIPS = 8;
/** Use at most the last N clips so the baseline follows a developing athlete. */
export const BASELINE_WINDOW = 20;
/** Band half-width in robust SDs (1.4826·MAD). */
export const BAND_K = 1.0;
export const FAR_K = 2.0;

export interface BaselineObservation { readonly clip_id: string; readonly recorded_at: string; readonly value: number | null; }
export type BaselineStatus = "still_learning" | "well_below" | "below" | "usual" | "above" | "well_above" | "missing";

export interface BaselineResult {
  readonly status: BaselineStatus;
  readonly clips_used: number;
  readonly clips_needed: number;
  readonly centre: number | null;
  readonly band: readonly [number, number] | null;
  readonly trend: "rising" | "falling" | "steady" | null;
  readonly version: string;
}

const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/**
 * @param history prior clips (any order), current clip excluded.
 * @param current this clip's value.
 * @param noiseFloor measurement floor — the band is never narrower than this, so noise is never called a change.
 */
export function compareToBaseline(history: readonly BaselineObservation[], current: number | null, noiseFloor: number): BaselineResult {
  const vals = [...history].filter((h) => h.value != null && Number.isFinite(h.value))
    .sort((a, b) => (a.recorded_at < b.recorded_at ? -1 : a.recorded_at > b.recorded_at ? 1 : a.clip_id < b.clip_id ? -1 : 1))
    .slice(-BASELINE_WINDOW).map((h) => h.value as number);
  const base = { clips_used: vals.length, clips_needed: BASELINE_MIN_CLIPS, version: ATHLETE_BASELINE_VERSION };
  if (vals.length < BASELINE_MIN_CLIPS) return { ...base, status: current == null ? "missing" : "still_learning", centre: null, band: null, trend: null };
  const c = median(vals);
  const rsd = Math.max(1.4826 * median(vals.map((v) => Math.abs(v - c))), noiseFloor);
  const band: [number, number] = [c - BAND_K * rsd, c + BAND_K * rsd];
  const half = vals.length >> 1, d = median(vals.slice(half)) - median(vals.slice(0, half));
  const trend = Math.abs(d) <= noiseFloor ? "steady" : d > 0 ? "rising" : "falling";
  if (current == null) return { ...base, status: "missing", centre: c, band, trend };
  const z = (current - c) / rsd;
  const status: BaselineStatus = z <= -FAR_K ? "well_below" : z < -BAND_K ? "below" : z >= FAR_K ? "well_above" : z > BAND_K ? "above" : "usual";
  return { ...base, status, centre: c, band, trend };
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

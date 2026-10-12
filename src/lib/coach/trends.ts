// Plan v3.1 §4 — Trends tab wording. Pure; every value is labeled, missing data says so.
export interface TrendObservation {
  value: number;
  unit: string | null;
  recorded_at: string;
  source: string | null;
}

export interface TrendRow {
  metric_key: string;
  unit: string | null;
  n_used: number | null;
  baseline_median: number | null;
  band_lo: number | null;
  band_hi: number | null;
  trend: string | null;
  computed_at: string | null;
  recent: TrendObservation[] | null;
}

const words = (k: string) => k.replace(/[_.]+/g, " ").trim();

export function metricName(key: string): string {
  return words(key);
}

/** "Their usual: 1.58–1.66 s (from 12 measurements)" or honest fallback. */
export function baselineLine(r: TrendRow): string {
  if (r.baseline_median == null || r.band_lo == null || r.band_hi == null) {
    return "No baseline yet — not enough measurements";
  }
  const unit = r.unit ? ` ${r.unit}` : "";
  const n = r.n_used != null ? ` (from ${r.n_used} measurements)` : "";
  return `Their usual: ${r.band_lo.toFixed(2)}–${r.band_hi.toFixed(2)}${unit}${n}`;
}

/** Arrow + word for the stored trend; unknown trends are shown plainly. */
export function trendLabel(trend: string | null | undefined): string {
  switch (trend) {
    case "improving":
      return "↑ Improving vs their usual";
    case "declining":
      return "↓ Slipping vs their usual";
    case "stable":
      return "→ Steady vs their usual";
    default:
      return "Trend: not enough data yet";
  }
}

/** "1.62 s on Oct 10, 2026" — one per recorded measurement, newest first. */
export function observationLine(
  o: TrendObservation,
  fmt: (iso: string) => string,
): string {
  const unit = o.unit ? ` ${o.unit}` : "";
  return `${o.value}${unit} on ${fmt(o.recorded_at)}`;
}

/** Latest reading vs baseline band, in plain words. Never invents a verdict. */
export function latestVsBaseline(r: TrendRow): string | null {
  const recent = r.recent ?? [];
  if (recent.length === 0 || r.band_lo == null || r.band_hi == null) return null;
  const latest = recent[0].value;
  if (latest < r.band_lo) return "Latest reading is below their usual range";
  if (latest > r.band_hi) return "Latest reading is above their usual range";
  return "Latest reading is inside their usual range";
}

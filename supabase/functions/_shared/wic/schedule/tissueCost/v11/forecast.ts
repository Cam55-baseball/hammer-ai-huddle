// TCS v1.1 §4 — forecasts and correlations. Never causation.
// PURE: no clock, no database, no network. Deterministic.
// Not wired into any generator, edge function or client.

export const TCS_FORECAST_VERSION = "tcs_forecast_v1_1";

/* ----------------------------------------------------------- language rules */

/** §4 — banned in every athlete-facing string this engine produces. */
export const BANNED_PHRASES = [
  "cause",
  "causes",
  "caused",
  "causing",
  "because of",
  "prevent",
  "prevents",
  "prevented",
  "injury",
  "injuries",
  "injured",
];

export const ALLOWED_RELATION_PHRASES = ["linked with", "tends to go with", "predicts"];

export function bannedWordsIn(text: string): string[] {
  const t = (text ?? "").toLowerCase();
  return BANNED_PHRASES.filter((w) => new RegExp(`\\b${w.replace(" ", "\\s+")}\\b`).test(t));
}

export function copyIsLegal(text: string): boolean {
  return bannedWordsIn(text).length === 0;
}

/* ----------------------------------------------------------------- forecasts */

export type ForecastKey =
  | "best_next_lift_day"
  | "next_week_readiness"
  | "estimated_max_track"
  | "sprint_track"
  | "jump_track"
  | "velocity_track";

export interface Forecast {
  key: ForecastKey;
  /** Point prediction. Dates are ISO strings, tracks are numbers. */
  value: number | string | null;
  /** 80% band. null when there isn't enough data. */
  low: number | null;
  high: number | null;
  confidence: "high" | "medium" | "low" | "not_enough_data";
  basis: string;
  copy: string;
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

/** §4 — a numeric forecast with an uncertainty band and a data-count basis. */
export function forecastSeries(
  key: ForecastKey,
  series: number[],
  cohortN = 0,
): Forecast {
  const xs = (series ?? []).filter((v) => typeof v === "number" && Number.isFinite(v));
  const basis = `based on your data + ${Math.max(0, Math.trunc(cohortN))} similar athletes`;
  if (xs.length < 3) {
    return {
      key,
      value: null,
      low: null,
      high: null,
      confidence: "not_enough_data",
      basis,
      copy: "Not enough data yet.",
    };
  }
  // Deterministic least-squares trend, one step ahead.
  const nn = xs.length;
  const sx = (nn * (nn - 1)) / 2;
  const sxx = xs.reduce((a, _v, i) => a + i * i, 0);
  const sy = xs.reduce((a, b) => a + b, 0);
  const sxy = xs.reduce((a, v, i) => a + i * v, 0);
  const denom = nn * sxx - sx * sx;
  const slope = Math.abs(denom) < 1e-9 ? 0 : (nn * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / nn;
  const point = intercept + slope * nn;
  const resid = xs.map((v, i) => v - (intercept + slope * i));
  const band = 1.2816 * Math.max(stdev(resid), 1e-6);
  const confidence = xs.length >= 12 ? "high" : xs.length >= 6 ? "medium" : "low";
  return {
    key,
    value: Number(point.toFixed(3)),
    low: Number((point - band).toFixed(3)),
    high: Number((point + band).toFixed(3)),
    confidence,
    basis,
    copy: `Projected next value ${point.toFixed(1)} (range ${(point - band).toFixed(1)}–${(point + band).toFixed(1)}), ${basis}.`,
  };
}

/* -------------------------------------------------- correlation question list */

/** §4 — fixed, pre-chosen questions. Nothing is discovered by fishing. */
export interface CorrelationQuestion {
  id: string;
  label: string;
  xLabel: string;
  yLabel: string;
  scope: "athlete" | "cohort";
}

export const QUESTION_LIST: CorrelationQuestion[] = [
  { id: "sleep_next_day_readiness", label: "Sleep and next-day readiness", xLabel: "sleep", yLabel: "next-day readiness", scope: "athlete" },
  { id: "jump_contacts_jump_test", label: "Weekly jump contacts and jump test", xLabel: "weekly jump contacts", yLabel: "jump test", scope: "athlete" },
  { id: "lift_spacing_soreness", label: "Days between lifts and soreness", xLabel: "days between lifts", yLabel: "soreness", scope: "athlete" },
  { id: "throw_count_arm_soreness", label: "Throw count and arm soreness", xLabel: "throw count", yLabel: "arm soreness", scope: "athlete" },
  { id: "rest_days_session_outcome", label: "Days off and session outcome", xLabel: "days off", yLabel: "session outcome", scope: "athlete" },
  { id: "weekly_load_load_risk", label: "Weekly load and load risk", xLabel: "weekly load", yLabel: "load risk", scope: "athlete" },
  { id: "cohort_rest_days_outcome", label: "Days off and outcome, similar athletes", xLabel: "days off", yLabel: "session outcome", scope: "cohort" },
  { id: "cohort_games_readiness", label: "Games played and readiness, similar athletes", xLabel: "games played", yLabel: "readiness", scope: "cohort" },
];

export type PatternLabel = "strong pattern" | "possible pattern" | "not enough data yet";

export interface CorrelationResult {
  id: string;
  label: PatternLabel;
  r: number | null;
  pValue: number | null;
  n: number;
  /** Benjamini–Hochberg adjusted p. */
  qValue: number | null;
  significant: boolean;
  copy: string;
}

export interface PairedSeries {
  id: string;
  pairs: [number, number][];
}

export function pearson(pairs: [number, number][]): number | null {
  const ps = (pairs ?? []).filter(
    ([a, b]) => Number.isFinite(a) && Number.isFinite(b),
  );
  if (ps.length < 3) return null;
  const xs = ps.map((p) => p[0]);
  const ys = ps.map((p) => p[1]);
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < ps.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  if (dx <= 0 || dy <= 0) return null;
  return num / Math.sqrt(dx * dy);
}

/** Two-sided p for Pearson r, via a normal approximation of Fisher's z. */
export function pearsonP(r: number, n: number): number {
  if (n < 4 || !Number.isFinite(r)) return 1;
  const rr = Math.max(-0.999999, Math.min(0.999999, r));
  const z = 0.5 * Math.log((1 + rr) / (1 - rr)) * Math.sqrt(n - 3);
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  return Math.max(0, Math.min(1, p));
}

function normalCdf(x: number): number {
  // Abramowitz–Stegun 7.1.26 on erf.
  const t = 1 / (1 + 0.3275911 * (x / Math.SQRT2));
  const y = 1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t * Math.exp(-(x / Math.SQRT2) ** 2);
  return 0.5 * (1 + y);
}

/** Benjamini–Hochberg false-discovery control across the question list. */
export function benjaminiHochberg(pValues: number[], fdr = 0.1): number[] {
  const m = pValues.length;
  if (m === 0) return [];
  const idx = pValues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  const q = new Array<number>(m).fill(1);
  let prev = 1;
  for (let k = m - 1; k >= 0; k--) {
    const val = Math.min(prev, (idx[k].p * m) / (k + 1));
    prev = val;
    q[idx[k].i] = Math.min(1, val);
  }
  void fdr;
  return q;
}

export const MIN_PAIRED_DAYS = 20;

/** §4 — run the pre-chosen question list with FDR control and honest labels. */
export function runCorrelationBoard(
  series: PairedSeries[],
  options: { fdr?: number; weeksOfData?: number } = {},
): CorrelationResult[] {
  const fdr = options.fdr ?? 0.1;
  const enoughHistory = (options.weeksOfData ?? 0) >= 6;
  const byId = new Map(series.map((s) => [s.id, s.pairs ?? []]));

  const prepared = QUESTION_LIST.map((q) => {
    const pairs = (byId.get(q.id) ?? []).filter(
      ([a, b]) => Number.isFinite(a) && Number.isFinite(b),
    );
    const n = pairs.length;
    const usable = enoughHistory && n >= MIN_PAIRED_DAYS;
    const r = usable ? pearson(pairs) : null;
    const p = r === null ? null : pearsonP(r, n);
    return { q, n, r, p };
  });

  const ps = prepared.map((x) => (x.p === null ? 1 : x.p));
  const qs = benjaminiHochberg(ps, fdr);

  return prepared.map((x, i) => {
    const qv = x.p === null ? null : qs[i];
    const significant = qv !== null && qv <= fdr;
    const label: PatternLabel = x.r === null
      ? "not enough data yet"
      : significant && Math.abs(x.r) >= 0.5
      ? "strong pattern"
      : significant || Math.abs(x.r) >= 0.3
      ? "possible pattern"
      : "not enough data yet";
    const copy = label === "not enough data yet"
      ? `Not enough data yet for ${x.q.label.toLowerCase()}.`
      : `Your ${x.q.xLabel} is linked with your ${x.q.yLabel} (${label}, ${x.n} paired days).`;
    return {
      id: x.q.id,
      label,
      r: x.r === null ? null : Number(x.r.toFixed(4)),
      pValue: x.p === null ? null : Number(x.p.toFixed(6)),
      n: x.n,
      qValue: qv === null ? null : Number(qv.toFixed(6)),
      significant,
      copy,
    };
  });
}

/* ------------------------------------------------------- accuracy watchdog */

export interface ScoredPrediction {
  key: string;
  predicted: number;
  actual: number;
  /** The simple default the model has to beat. */
  baseline: number;
}

export interface CalibrationReport {
  key: string;
  n: number;
  modelMae: number;
  baselineMae: number;
  /** Positive = the model is better than the default. */
  skill: number;
  enabled: boolean;
  note: string;
}

/** §4 — score every stored prediction; a model worse than the default is off. */
export function calibrationReport(preds: ScoredPrediction[]): CalibrationReport[] {
  const byKey = new Map<string, ScoredPrediction[]>();
  for (const p of preds ?? []) {
    if (!p || !Number.isFinite(p.predicted) || !Number.isFinite(p.actual) || !Number.isFinite(p.baseline)) continue;
    const arr = byKey.get(p.key) ?? [];
    arr.push(p);
    byKey.set(p.key, arr);
  }
  return [...byKey.keys()].sort().map((key) => {
    const arr = byKey.get(key)!;
    const modelMae = mean(arr.map((p) => Math.abs(p.predicted - p.actual)));
    const baselineMae = mean(arr.map((p) => Math.abs(p.baseline - p.actual)));
    const skill = baselineMae - modelMae;
    const enabled = arr.length < 10 ? true : skill >= 0;
    return {
      key,
      n: arr.length,
      modelMae: Number(modelMae.toFixed(4)),
      baselineMae: Number(baselineMae.toFixed(4)),
      skill: Number(skill.toFixed(4)),
      enabled,
      note: enabled
        ? "Scored against the simple default and kept."
        : "Switched off automatically — the simple rules scored better.",
    };
  });
}

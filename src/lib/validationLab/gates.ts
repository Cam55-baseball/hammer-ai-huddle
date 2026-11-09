/**
 * Validation Lab scorecard (Release 0, owner Nov 8): the five accuracy gates for ONE metric and ONE app build.
 *  G1 capture   — every trial's counted fps ≥ the metric's required fps (camera metrics).
 *  G2 detection — the thing was detected in ≥ 95% of trials (proposed threshold).
 *  G3 physics   — every app value is inside the dictionary's physical min/max.
 *  G4 truth     — n ≥ 20 paired trials; Bland–Altman bias and 95% limits of agreement (bias ± 1.96·SD)
 *                 all within ± the dictionary tolerance (Bland & Altman 1986; tolerance "proposed" unless sourced).
 *  G5 repeat    — every consistency group (same input, ≥ 3 runs) spans ≤ the tolerance; at least one group.
 * "Ready to open" only when all five pass. Missing data never passes.
 */
export interface LabMetric { metric_key: string; unit: string; required_fps: number | null; physical_min: number | null; physical_max: number | null; gt_tolerance: number | null }
export interface LabTrial {
  id?: string;
  device_name: string;
  device_value: number | null;
  app_value: number | null;
  measured_fps: number | null;
  detected: boolean;
  consistency_group: string | null;
  app_build: string;
  conditions?: Record<string, unknown> | null;
  created_at?: string;
}

export type GateKey = "G1" | "G2" | "G3" | "G4" | "G5";
export interface Gate { key: GateKey; label: string; pass: boolean; detail: string }
export interface Scorecard { gates: Gate[]; ready: boolean; n: number; bias: number | null; loaLow: number | null; loaHigh: number | null }

export const MIN_TRUTH_TRIALS = 20;
export const MIN_DETECTION_RATE = 0.95;
export const MIN_REPEATS = 3;

const r = (x: number) => Math.round(x * 1000) / 1000;

export function scorecard(metric: LabMetric, trials: LabTrial[]): Scorecard {
  const tol = metric.gt_tolerance;
  const withApp = trials.filter((t) => t.app_value != null && Number.isFinite(t.app_value));

  // G1
  let g1: Gate;
  if (metric.required_fps == null) g1 = { key: "G1", label: "Capture (real fps)", pass: true, detail: "Not a camera metric" };
  else {
    const low = withApp.filter((t) => t.measured_fps == null || t.measured_fps < metric.required_fps!);
    g1 = { key: "G1", label: "Capture (real fps)", pass: withApp.length > 0 && low.length === 0,
      detail: withApp.length === 0 ? "No trials yet" : low.length ? `${low.length} trial(s) below ${metric.required_fps} fps or not counted` : `All ≥ ${metric.required_fps} fps` };
  }

  // G2
  const rate = trials.length ? trials.filter((t) => t.detected).length / trials.length : 0;
  const g2: Gate = { key: "G2", label: "Detection", pass: trials.length > 0 && rate >= MIN_DETECTION_RATE,
    detail: trials.length ? `${Math.round(rate * 100)}% detected (needs ${MIN_DETECTION_RATE * 100}%, proposed)` : "No trials yet" };

  // G3
  let g3: Gate;
  if (metric.physical_min == null || metric.physical_max == null) g3 = { key: "G3", label: "Physics", pass: false, detail: "No physical limits in the dictionary" };
  else {
    const out = withApp.filter((t) => t.app_value! < metric.physical_min! || t.app_value! > metric.physical_max!);
    g3 = { key: "G3", label: "Physics", pass: withApp.length > 0 && out.length === 0,
      detail: withApp.length === 0 ? "No trials yet" : out.length ? `${out.length} value(s) outside ${metric.physical_min}–${metric.physical_max} ${metric.unit}` : `All inside ${metric.physical_min}–${metric.physical_max} ${metric.unit}` };
  }

  // G4
  const pairs = withApp.filter((t) => t.detected && t.device_value != null && Number.isFinite(t.device_value)).map((t) => t.app_value! - t.device_value!);
  let bias: number | null = null, lo: number | null = null, hi: number | null = null;
  let g4: Gate;
  if (tol == null) g4 = { key: "G4", label: "Ground truth", pass: false, detail: "No tolerance in the dictionary" };
  else if (pairs.length < MIN_TRUTH_TRIALS) g4 = { key: "G4", label: "Ground truth", pass: false, detail: `${pairs.length} of ${MIN_TRUTH_TRIALS} paired trials` };
  else {
    bias = pairs.reduce((a, b) => a + b, 0) / pairs.length;
    const sd = Math.sqrt(pairs.reduce((a, b) => a + (b - bias!) ** 2, 0) / (pairs.length - 1));
    lo = bias - 1.96 * sd; hi = bias + 1.96 * sd;
    const pass = Math.abs(bias) <= tol && lo >= -tol && hi <= tol;
    g4 = { key: "G4", label: "Ground truth", pass, detail: `bias ${r(bias)}, 95% limits ${r(lo)} to ${r(hi)} ${metric.unit} (allowed ±${tol})` };
  }

  // G5
  const groups = new Map<string, number[]>();
  for (const t of withApp) if (t.consistency_group) groups.set(t.consistency_group, [...(groups.get(t.consistency_group) ?? []), t.app_value!]);
  const full = [...groups.entries()].filter(([, v]) => v.length >= MIN_REPEATS);
  let g5: Gate;
  if (tol == null) g5 = { key: "G5", label: "Consistency", pass: false, detail: "No tolerance in the dictionary" };
  else if (!full.length) g5 = { key: "G5", label: "Consistency", pass: false, detail: `Needs one input run ${MIN_REPEATS} times` };
  else {
    const bad = full.filter(([, v]) => Math.max(...v) - Math.min(...v) > tol);
    g5 = { key: "G5", label: "Consistency", pass: bad.length === 0, detail: bad.length ? `${bad.length} of ${full.length} repeat group(s) spread more than ±${tol}` : `${full.length} repeat group(s) within ${tol} ${metric.unit}` };
  }

  const gates = [g1, g2, g3, g4, g5];
  return { gates, ready: gates.every((g) => g.pass), n: trials.length, bias, loaLow: lo, loaHigh: hi };
}

const csvCell = (v: unknown) => {
  const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function trialsCsv(metric: LabMetric, trials: LabTrial[]): string {
  const head = ["metric_key", "unit", "app_build", "device_name", "device_value", "app_value", "difference", "measured_fps", "detected", "consistency_group", "conditions", "created_at"];
  const rows = trials.map((t) => [metric.metric_key, metric.unit, t.app_build, t.device_name, t.device_value, t.app_value,
    t.app_value != null && t.device_value != null ? r(t.app_value - t.device_value) : null, t.measured_fps, t.detected, t.consistency_group, t.conditions ?? null, t.created_at ?? null]);
  return [head, ...rows].map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
}

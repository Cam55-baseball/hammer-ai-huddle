import type { AnalysisLike, TileState } from "./types";
import type { MetricValue } from "./contracts/shared";

/** Read a metric and surface missingness — never fabricate. */
export function readMetric(a: AnalysisLike, key: string): MetricValue | null {
  const m = a.metrics?.[key];
  if (!m || typeof m !== "object") return null;
  return m as MetricValue;
}

export function readNumber(a: AnalysisLike, key: string): { value: number; confidence: number } | null {
  const m = readMetric(a, key);
  if (!m) return null;
  if ("missing" in m && m.missing) return null;
  if ("value" in m && typeof m.value === "number" && Number.isFinite(m.value)) {
    return { value: m.value, confidence: typeof m.confidence === "number" ? m.confidence : 1 };
  }
  return null;
}

/**
 * Back-compat helper: read a 0..100 score from `keyHundred`, falling back to
 * the legacy 0..10 `keyTen` (multiplied by 10) when only old data is present.
 */
export function readScore100(
  a: AnalysisLike,
  keyHundred: string,
  keyTen?: string,
): { value: number; confidence: number } | null {
  const direct = readNumber(a, keyHundred);
  if (direct) return { value: Math.max(0, Math.min(100, direct.value)), confidence: direct.confidence };
  if (keyTen) {
    const legacy = readNumber(a, keyTen);
    if (legacy) return { value: Math.max(0, Math.min(100, legacy.value * 10)), confidence: legacy.confidence };
  }
  return null;
}

export function readBool(a: AnalysisLike, key: string): { value: boolean; confidence: number } | null {
  const m = readMetric(a, key);
  if (!m) return null;
  if ("missing" in m && m.missing) return null;
  if ("value" in m && typeof m.value === "boolean") {
    return { value: m.value, confidence: typeof m.confidence === "number" ? m.confidence : 1 };
  }
  return null;
}

export function missingState(a: AnalysisLike, key: string): TileState {
  const m = readMetric(a, key);
  const reason =
    m && "missing" in m && m.missing && typeof m.missing_reason === "string"
      ? m.missing_reason
      : undefined;
  return { status: "missing", missing_reason: reason };
}

/**
 * Build a TileState for a 0..100 score meter with acceptable + elite bands.
 *  - score < acceptable → fail
 *  - acceptable ≤ score < elite → pass
 *  - score ≥ elite → elite
 *  - acceptable*0.7 ≤ score < acceptable → warn
 */
export function scoreMeterState(
  score: number,
  confidence: number,
  acceptable: number,
  elite?: number,
): TileState {
  const v = Math.max(0, Math.min(100, score));
  let status: TileState["status"] = "fail";
  if (elite !== undefined && v >= elite) status = "elite";
  else if (v >= acceptable) status = "pass";
  else if (v >= acceptable * 0.7) status = "warn";
  return { status, score100: v, acceptable, elite, confidence };
}

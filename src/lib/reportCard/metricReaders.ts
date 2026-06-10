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

/**
 * Shared metric contract types used by BOTH the client tile compute and the
 * server AI metrics extractor. Single source of truth — drift-impossible.
 */

export type MetricKind = "number" | "boolean";

export interface MetricSpec {
  /** Stable key. Stored on `ai_analysis.metrics[key]`. */
  key: string;
  /** Human label used in the AI prompt. */
  label: string;
  kind: MetricKind;
  /** Unit shown to the model so it reports comparable values. */
  unit?: string;
  /** Plain-English description fed to the AI vision prompt. */
  prompt: string;
  /** Plausible value range; used in the schema description, not as a hard clamp. */
  range?: [number, number];
  /** Tile key this metric drives (1:1 today). */
  tileKey: string;
}

export interface DisciplineContract {
  id: "bp" | "bh" | "throwing" | "sb-pitching" | "sh";
  label: string;
  metrics: MetricSpec[];
}

/** Persisted shape for each metric on `ai_analysis.metrics[key]`. */
export type MetricValue =
  | {
      value: number | boolean;
      /** 0..1 — measurement quality, NOT athlete quality. */
      confidence: number;
      missing?: false;
    }
  | {
      missing: true;
      missing_reason: string;
      confidence?: 0;
    };

export type MetricsRecord = Record<string, MetricValue>;

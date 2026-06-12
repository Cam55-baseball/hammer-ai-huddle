/**
 * Hammer Report Card — universal tile spec.
 *
 * All scored meters are 0..100. Each scored tile carries an
 * `acceptable` threshold (PASS line) and an optional `elite`
 * threshold (perfection line) so users can SEE how close to elite
 * they are landing.
 *
 * Pass/fail tiles stay binary (geometric absolutes like stride
 * direction, sequencing, head-at-release).
 */

import type { MetricValue, MetricsRecord } from "./contracts/shared";

export type TileMode =
  | "raw_passed"          // Raw measurement + "PASSED X/10" chip (with optional elite badge)
  | "pass_fail"           // Big PASS / FAIL badge (binary geometric absolutes)
  | "raw_pass_fail"       // Raw measurement + PASS/FAIL badge combined (with optional elite badge)
  | "score_meter";        // 0..100 score with circular meter, acceptable + elite arcs

export type TileStatus = "pass" | "fail" | "warn" | "elite" | "missing";

export interface TileState {
  status: TileStatus;
  /** Display value e.g. "0.98s", "22°", "82%". */
  value?: string;
  /** 0..100 numeric for `score_meter` mode. */
  score100?: number;
  /** Acceptable PASS threshold for `score_meter` (0..100). */
  acceptable?: number;
  /** Elite/perfection threshold for `score_meter` (0..100). */
  elite?: number;
  /** 0..1 measurement confidence from the model. */
  confidence?: number;
  /** When status === "missing", optional reason from the model. */
  missing_reason?: string;
}

export interface TileExplainer {
  whatWhy: string;
  howToImprove: string;
  encouragement: string;
}

export interface ReportCardTileSpec {
  key: string;
  name: string;
  mode: TileMode;
  /** Short standard line shown under the tile, e.g. "Within 15° of square". */
  standard: string;
  /** Concise "Acceptable X · Elite Y" chip text. Optional. */
  thresholdChip?: string;
  nonNegotiable?: boolean;
  phase?: string;            // optional grouping (BH uses P1–P4)
  explainer: TileExplainer;
  /** Map an analysis result to a tile state. Return { status: "missing" } if not measurable yet. */
  compute: (analysis: AnalysisLike) => TileState;
}

export interface ReportCardSpec {
  disciplineLabel: string;   // "Baseball Pitching"
  groupByPhase: boolean;     // true for BH
  tiles: ReportCardTileSpec[];
}

/** Loose shape of the existing analysis result we already produce. */
export interface AnalysisLike {
  efficiency_score?: number;
  summary?: string[];
  feedback?: string;
  positives?: string[];
  drills?: unknown[];
  scorecard?: unknown;
  /** Structured per-metric measurements with confidence/missingness. */
  metrics?: MetricsRecord;
}

export type { MetricValue, MetricsRecord };

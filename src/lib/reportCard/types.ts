/**
 * Hammer Report Card — universal tile spec.
 *
 * Tiles consume the existing analysis result; if a metric cannot be measured
 * yet, the tile renders a "Not detected yet" missingness state with the
 * model's stated reason (per §3 Law 7 — never fabricate).
 */

import type { MetricValue, MetricsRecord } from "./contracts/shared";

export type TileMode =
  | "raw_passed"          // Raw measurement + "PASSED X/10" chip
  | "pass_fail"           // Big PASS / FAIL badge
  | "raw_pass_fail"       // Raw measurement + PASS/FAIL badge combined
  | "score_meter";        // 1–10 score with circular meter

export type TileState =
  | {
      status: "pass" | "fail" | "warn";
      value?: string;       // e.g. "0.98", "22°", "82%"
      passedOf?: string;    // e.g. "10/10"
      score10?: number;     // 0..10 for score_meter mode
      /** 0..1 measurement confidence from the model. */
      confidence?: number;
    }
  | { status: "missing"; missing_reason?: string };

export interface TileExplainer {
  whatWhy: string;
  howToImprove: string;
  encouragement: string;
}

export interface ReportCardTileSpec {
  key: string;
  name: string;
  mode: TileMode;
  standard: string;          // e.g. "1.05s OR LESS"
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
  /** New: structured per-metric measurements with confidence/missingness. */
  metrics?: MetricsRecord;
}

export type { MetricValue, MetricsRecord };

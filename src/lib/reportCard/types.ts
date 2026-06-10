/**
 * Hammer Report Card — universal tile spec.
 *
 * One spec drives every analysis's report card. Tiles consume the existing
 * analysis result; if a metric cannot be computed yet, the tile renders a
 * "Not detected yet" missingness state (per §3 Law 7 — never fabricate).
 */

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
    }
  | { status: "missing" };

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
  phase?: string;            // optional grouping (BH uses §5.1 phases)
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
  /** Future: structured per-metric measurements keyed by tile key. */
  metrics?: Record<string, unknown>;
}

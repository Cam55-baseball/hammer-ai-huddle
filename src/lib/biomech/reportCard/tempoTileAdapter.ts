/**
 * Phase 27 — Read-only adapter: TempoEvidenceArtifact → ReportCard TileState.
 *
 * Translates the deterministic `tempo_sec` evidence chain into the existing
 * `src/lib/reportCard/types.ts::TileState` shape WITHOUT modifying any
 * report-card contract, reader, or hook. Per Phase 27 constraints:
 *
 *  - The adapter NEVER promotes the metric to `pass`/`fail` while the
 *    aggregate six-gate matrix is not fully `pass`. Today that aggregate
 *    can never be fully `pass` because (a) D-POSE is stubbed and (b) no
 *    labeled corpus exists. Under those conditions this adapter returns
 *    `status: "missing"` with the canonical `missing_reason`, exactly as
 *    `src/lib/reportCard/metricReaders.ts::missingState` would for an
 *    AI-missing metric — so no display surface is fabricated.
 *  - The adapter NEVER fabricates a confidence number. Until the calibration
 *    certificate is present, `confidence` is omitted from the TileState
 *    (rendering as "no confidence shown" per the existing tile component
 *    rather than the model's self-reported value).
 *
 * The adapter is intentionally side-effect-free and consumer-pull only.
 * Wiring it into `useReportCardTrend.ts` is deliberately deferred to a later
 * phase where doing so would not require fabricating any of the six gates.
 */

import type { TileState } from "../../reportCard/types";
import type { TempoEvidenceArtifact } from "../evidence/tempoEvidence";
import type { TempoGateMatrixReport } from "../gates/tempoGateMatrix";

export interface TempoTileAdapterInputs {
  readonly evidence: TempoEvidenceArtifact;
  readonly gate_matrix: TempoGateMatrixReport;
}

/** Format a tempo value the same way the BP tile does (`x.xxs`). */
function formatTempo(valueSec: number): string {
  return `${valueSec.toFixed(2)}s`;
}

export function tempoEvidenceToTileState(
  inputs: TempoTileAdapterInputs,
): TileState {
  const { evidence, gate_matrix } = inputs;
  const metric = evidence.metric;

  // 1. Explicit missingness anywhere in the chain → surface canonical reason.
  if (metric.missingness != null || metric.value == null) {
    const reason =
      metric.missingness?.missing_reason ??
      evidence.anchors.peak_leg_lift.missingness?.missing_reason ??
      evidence.anchors.front_foot_strike.missingness?.missing_reason ??
      "metric_unavailable";
    return { status: "missing", missing_reason: reason };
  }

  // 2. A non-missing value exists but the production matrix is not fully
  //    `pass`. Per `canonical-production-gate-matrix.md` Part 0
  //    "Failure of any single condition makes the component
  //    production-ineligible." We mark the tile as `missing` with the
  //    explicit gate-blocker code rather than emit a pass/fail verdict.
  if (!gate_matrix.all_pass) {
    const blocker = gate_matrix.blocking_gates[0] ?? "production_gate_blocked";
    return {
      status: "missing",
      missing_reason: `gate_blocked:${blocker}`,
    };
  }

  // 3. Fully gated path. (Unreachable at Phase 27; kept for forward-compatibility.)
  const valueDisplay = formatTempo(metric.value);
  const status: TileState["status"] =
    gate_matrix.value_gate.decision === "pass"
      ? "pass"
      : gate_matrix.value_gate.decision === "fail"
        ? "fail"
        : "missing";
  return {
    status,
    value: valueDisplay,
    ...(metric.confidence.status === "calibrated" &&
    metric.confidence.value != null
      ? { confidence: metric.confidence.value }
      : {}),
  };
}

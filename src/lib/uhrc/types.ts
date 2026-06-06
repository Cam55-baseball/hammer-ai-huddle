/**
 * Universal Hammers Report Card (UHRC) — constitutional types.
 *
 * UHRC is a PROJECTION over existing intelligence (HIE snapshot,
 * latest PIE V2 aggregate, foundation/athlete state, longitudinal
 * trends). It NEVER re-scores, never invents signals, never authors
 * organism truth. Every pillar value carries lineage back to a
 * source event so the lineage handle is one click away.
 *
 * Subordinate to: Eternal Laws, RR-5 (no destiny framing), RR-6
 * (injury supremacy), Phase 46 ledger supremacy, Phase 47 RP-1…RP-10
 * replay legality, EI-1…EI-10 production realization invariants.
 */
import type { PieV2SignalId, PieV2SeverityTier } from "@/lib/pieV2/types";

export const UHRC_ENGINE_VERSION = "uhrc-1.0.0" as const;

export type UhrcPillarId =
  | "mechanics"
  | "command"
  | "stuff"
  | "movement_quality"
  | "decision_quality"
  | "durability";

export interface UhrcSignalContribution {
  /** Stable id used for replay equivalence. */
  source_signal_id: string;
  /** Where the value came from. */
  source_system: "pie_v2" | "hie" | "foundation" | "athlete_state" | "longitudinal";
  /** 0..100, null when missing. NEVER fabricated. */
  value: number | null;
  /** 0..100 weight inside the pillar. Sum across contributions = 100. */
  weight: number;
  tier?: PieV2SeverityTier | null;
  /** Source event id when known — lets the UI surface a replay handle. */
  source_event_id?: string | null;
  /** Plain-English why string. Observational only. */
  explanation: string;
  /** Sparse-signal flag — preserves missingness instead of imputing. */
  missing: boolean;
}

export interface UhrcPillar {
  id: UhrcPillarId;
  label: string;
  /** 0..100 weighted mean over present contributions, null when all missing. */
  score: number | null;
  /** 0..100 — derived from contribution confidences, null when no data. */
  confidence: number;
  tier: PieV2SeverityTier | null;
  contributions: UhrcSignalContribution[];
  /** Observational note. RR-5 — no destiny framing. */
  note: string;
}

export interface UhrcEvidence {
  /** Source event id or stable derived id (e.g. `hie:<snapshotId>:<cluster>`). */
  source_event_id: string;
  topic_id?: string;
  occurred_at?: string;
  summary: string;
}

export interface UhrcReport {
  athlete_id: string;
  sport: "baseball" | "softball";
  /** Pitching, hitting, or both — drives which pillars participate. */
  discipline_scope: Array<"pitching" | "hitting">;
  computed_at: string;
  engine_version: typeof UHRC_ENGINE_VERSION;
  /** Pinned upstream engine versions for replay equivalence. */
  source_engine_versions: {
    pie_v2: string | null;
    hie: string | null;
  };
  pillars: UhrcPillar[];
  /** Weighted mean across present pillars. Null when nothing present. */
  composite: number | null;
  biggest_win: UhrcEvidence | null;
  biggest_leak: UhrcEvidence | null;
  /** Missingness summary — RR-6 / Phase 60 missingness preserved. */
  missingness: {
    total_signals_expected: number;
    total_signals_present: number;
    missing_signal_ids: string[];
  };
}

/** Recommendation envelope consumed by `generateHammerBrief`. */
export interface UhrcRecommendationEnvelope {
  drill: { id: string; name: string; rationale: string; source_signal_id: string } | null;
  video: { id: string; title: string; rationale: string; source_signal_id: string } | null;
}

/** Trend envelope consumed by `generateHammerBrief`. */
export interface UhrcTrendEnvelope {
  source_signal_id: string;
  trend: "improving" | "stable" | "regressing" | "insufficient_data";
  slope: number | null;
}

export type PieV2SignalIdRef = PieV2SignalId;

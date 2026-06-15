/**
 * Phase 0 — Determinism Foundation
 *
 * Thin writer for video_analysis_runs. Every analysis attempt — cache hit,
 * cache miss, rejection, or failure — MUST persist a row here. Append-only.
 */

import { supabase } from "@/integrations/supabase/client";

export type AnalysisOutcome =
  | "ok"
  | "cache_hit"
  | "rejected"
  | "failed";

export interface AnalysisRunRecord {
  video_id: string;
  requested_by?: string | null;
  cache_fingerprint_hex: string;
  cache_hit: boolean;
  video_sha256_hex?: string | null;
  landmark_model_version?: string | null;
  detector_version?: string | null;
  metric_engine_version?: string | null;
  fps_true?: number | null;
  frame_selection_jsonb?: Record<string, unknown>;
  event_selection_jsonb?: Record<string, unknown>;
  confidence_summary_jsonb?: Record<string, unknown>;
  landmark_run_id?: string | null;
  event_run_id?: string | null;
  metric_run_id?: string | null;
  coaching_run_id?: string | null;
  outcome: AnalysisOutcome;
  outcome_reason?: string | null;
}

/**
 * Best-effort persistence. The audit trail is the contract — if the write
 * fails we surface the error so callers can log/alert, but we never throw
 * past the analysis flow itself.
 */
export async function recordAnalysisRun(record: AnalysisRunRecord): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("video_analysis_runs")
    .insert({
      video_id: record.video_id,
      requested_by: record.requested_by ?? null,
      cache_fingerprint_hex: record.cache_fingerprint_hex,
      cache_hit: record.cache_hit,
      video_sha256_hex: record.video_sha256_hex ?? null,
      landmark_model_version: record.landmark_model_version ?? null,
      detector_version: record.detector_version ?? null,
      metric_engine_version: record.metric_engine_version ?? null,
      fps_true: record.fps_true ?? null,
      frame_selection_jsonb: record.frame_selection_jsonb ?? {},
      event_selection_jsonb: record.event_selection_jsonb ?? {},
      confidence_summary_jsonb: record.confidence_summary_jsonb ?? {},
      landmark_run_id: record.landmark_run_id ?? null,
      event_run_id: record.event_run_id ?? null,
      metric_run_id: record.metric_run_id ?? null,
      coaching_run_id: record.coaching_run_id ?? null,
      outcome: record.outcome,
      outcome_reason: record.outcome_reason ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return { id: null, error: error.message };
  }
  return { id: data?.id ?? null, error: null };
}

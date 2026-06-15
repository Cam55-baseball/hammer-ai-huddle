/**
 * Phase 0 — Determinism Foundation.
 *
 * Edge-function writer for video_analysis_runs. Every analyze-video
 * invocation — ok, cache_hit, rejected, failed — MUST persist one row here.
 */

export type AnalysisOutcome = "ok" | "cache_hit" | "rejected" | "failed";

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

// deno-lint-ignore no-explicit-any
export async function recordAnalysisRun(supabase: any, rec: AnalysisRunRecord): Promise<{ id: string | null; error: string | null }> {
  const payload = {
    video_id: rec.video_id,
    requested_by: rec.requested_by ?? null,
    cache_fingerprint_hex: rec.cache_fingerprint_hex,
    cache_hit: rec.cache_hit,
    video_sha256_hex: rec.video_sha256_hex ?? null,
    landmark_model_version: rec.landmark_model_version ?? null,
    detector_version: rec.detector_version ?? null,
    metric_engine_version: rec.metric_engine_version ?? null,
    fps_true: rec.fps_true ?? null,
    frame_selection_jsonb: rec.frame_selection_jsonb ?? {},
    event_selection_jsonb: rec.event_selection_jsonb ?? {},
    confidence_summary_jsonb: rec.confidence_summary_jsonb ?? {},
    landmark_run_id: rec.landmark_run_id ?? null,
    event_run_id: rec.event_run_id ?? null,
    metric_run_id: rec.metric_run_id ?? null,
    coaching_run_id: rec.coaching_run_id ?? null,
    outcome: rec.outcome,
    outcome_reason: rec.outcome_reason ?? null,
  };
  try {
    const { data, error } = await supabase
      .from("video_analysis_runs")
      .insert(payload)
      .select("id")
      .single();
    if (error) {
      console.error("[recordAnalysisRun] insert error", error.message);
      return { id: null, error: error.message };
    }
    return { id: data?.id ?? null, error: null };
  } catch (e) {
    console.error("[recordAnalysisRun] threw", (e as Error)?.message);
    return { id: null, error: (e as Error)?.message ?? "unknown" };
  }
}

/**
 * Persistence for DelayCam sessions and reps. Writes happen whether or not the
 * athlete opens Analyze Session — gathered data always lands on their record.
 */
import { supabase } from "@/integrations/supabase/client";
import { classifyDensityTier } from "@/lib/biomech/pose/denseLandmarkCapture";
import { SPLITTER_VERSION } from "./repSplitter";
import { buildSessionSummary, SUMMARY_VERSION, type SessionSummary } from "./sessionSummary";
import type { SessionPipelineResult } from "./sessionPipeline";
import type { SessionModule } from "./repSplitter";

// The new tables aren't in the generated client types until regeneration.
const db = supabase as unknown as { from: (t: string) => any };

export interface NewSessionInput {
  user_id: string;
  sport: "baseball" | "softball";
  module: SessionModule;
  side_stamp: Record<string, unknown>;
  started_at: string;
  ended_at: string;
  duration_sec: number | null;
  requested_fps: number | null;
  achieved_fps: number | null;
  fps_source: string | null;
  /** Recorded for audit only. Nothing in gathering reads it. */
  display_metrics_on: boolean;
}

export async function createSession(input: NewSessionInput): Promise<string> {
  const { data, error } = await db
    .from("delaycam_sessions")
    .insert({ ...input, fps_tier: input.achieved_fps ? classifyDensityTier(input.achieved_fps) : null, processing_state: "splitting" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function markSessionFailed(sessionId: string, message: string) {
  await db.from("delaycam_sessions").update({ processing_state: "failed", processing_error: message.slice(0, 500) }).eq("id", sessionId);
}

export async function saveSessionResults(args: {
  sessionId: string;
  userId: string;
  module: SessionModule;
  sport: "baseball" | "softball";
  duration_sec: number | null;
  fps: number | null;
  result: SessionPipelineResult;
}): Promise<SessionSummary> {
  const { result } = args;
  const repRows = result.reps.map((r) => ({
    session_id: args.sessionId,
    user_id: args.userId,
    rep_index: r.window.rep_index,
    start_ms: r.window.start_ms,
    end_ms: r.window.end_ms,
    anchor_ms: r.window.peak_ms,
    fps_measured: r.fps,
    fps_tier: r.tier,
    boundary_confidence: r.window.boundary_confidence,
    boundary_signals: { peak_speed: r.window.peak_speed, coverage: r.window.coverage, frames_decoded: r.frames_decoded, anchor_kind: "peak_movement_candidate" },
    metrics: r.metrics,
    engine_version: result.engine_version,
    splitter_version: SPLITTER_VERSION,
  }));
  if (repRows.length > 0) {
    const { error } = await db.from("delaycam_reps").upsert(repRows, { onConflict: "session_id,rep_index,splitter_version" });
    if (error) throw error;
  }
  const summary = buildSessionSummary({
    module: args.module,
    sport: args.sport,
    duration_sec: args.duration_sec,
    fps: args.fps,
    fps_tier: result.session_tier,
    coverage: result.split.coverage,
    detection_state: result.split.state,
    detection_reason: result.split.state_reason,
    uncertain: result.split.uncertain,
    reps: result.reps.map((r) => ({ rep_index: r.window.rep_index, start_ms: r.window.start_ms, end_ms: r.window.end_ms, metrics: r.metrics })),
  });
  const { error } = await db
    .from("delaycam_sessions")
    .update({
      processing_state: "analyzed",
      rep_detection_state: result.split.state,
      rep_detection_reason: result.split.state_reason,
      boundary_log: result.split.uncertain,
      engine_version: result.engine_version,
      splitter_version: SPLITTER_VERSION,
      summary,
      summary_version: SUMMARY_VERSION,
      analyzed_at: new Date().toISOString(),
    })
    .eq("id", args.sessionId);
  if (error) throw error;
  return summary;
}

export async function linkSessionVideo(sessionId: string, videoId: string) {
  await db.from("delaycam_sessions").update({ video_id: videoId }).eq("id", sessionId);
}

export interface SessionListRow {
  id: string;
  created_at: string;
  sport: string;
  module: string;
  duration_sec: number | null;
  achieved_fps: number | null;
  fps_tier: string | null;
  processing_state: string;
  rep_detection_state: string;
  summary: SessionSummary | null;
}

export async function listRecentSessions(userId: string, limit = 5): Promise<SessionListRow[]> {
  const { data, error } = await db
    .from("delaycam_sessions")
    .select("id,created_at,sport,module,duration_sec,achieved_fps,fps_tier,processing_state,rep_detection_state,summary")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as SessionListRow[];
}

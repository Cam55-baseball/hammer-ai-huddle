import { supabase } from "@/integrations/supabase/client";

/** Columns a regular user may still read directly on `videos` (score + stored analysis are locked). */
export const VIDEO_PUBLIC_COLUMNS =
  "id,user_id,sport,module,video_url,thumbnail_url,status,mocap_data,created_at,updated_at,saved_to_library,library_title,library_notes,shared_with_scouts,session_date,analysis_public,thumbnail_webp_url,thumbnail_sizes,blurhash,contributes_to_progress,practice_session_id,game_id,sha256_hex,fps_true,duration_sec,width,height,orientation,landing_time_sec,calibration_h_px,direction_sign,batting_side,throwing_hand,capture_source,requested_fps,achieved_fps,capture_fps_tier,capture_fps_source,parent_video_id,variant";

/** Owner/admin only — merges locked score fields onto rows. Non-staff get rows unchanged. */
export async function withStaffScores<T extends { id: string }>(rows: T[]): Promise<Array<T & { efficiency_score: number | null; ai_analysis: unknown }>> {
  if (!rows.length) return [];
  const { data, error } = await (supabase.rpc as any)("get_staff_video_scores", { p_video_ids: rows.map((r) => r.id) });
  const map = new Map<string, { efficiency_score: number | null; ai_analysis: unknown }>();
  if (!error) for (const s of (data ?? []) as any[]) map.set(s.id, { efficiency_score: s.efficiency_score === null ? null : Number(s.efficiency_score), ai_analysis: s.ai_analysis });
  return rows.map((r) => ({ ...r, efficiency_score: map.get(r.id)?.efficiency_score ?? null, ai_analysis: map.get(r.id)?.ai_analysis ?? null }));
}

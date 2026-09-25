CREATE TABLE IF NOT EXISTS public.game_plan_week_overrides (
  created_at timestamptz DEFAULT now(),
  day_of_week numeric NOT NULL,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  override_schedule jsonb NOT NULL,
  updated_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL,
  week_start text NOT NULL
);
CREATE TABLE IF NOT EXISTS public.sprint_analyses (
  acceleration_profile jsonb, ai_model text, confidence_score numeric,
  created_at timestamptz DEFAULT now(), distance_key text NOT NULL, frame_count numeric,
  grade_20_80 numeric, grade_breakdown jsonb, id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processing_time_ms numeric, session_id uuid, split_times jsonb, sport text NOT NULL,
  steps_per_split jsonb, total_steps numeric, total_time_sec numeric, user_id uuid NOT NULL,
  validation_reasons text[], validation_status text NOT NULL, video_url text NOT NULL
);
CREATE TABLE IF NOT EXISTS public.video_pose_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), landmark_data jsonb, processed_at timestamptz,
  video_id uuid NOT NULL, violation_timestamps jsonb
);
CREATE TABLE IF NOT EXISTS public.udl_alerts (
  alert_type text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), dismissed_by text,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), message text NOT NULL, metadata jsonb,
  severity text NOT NULL, target_user_id uuid NOT NULL
);
CREATE TABLE IF NOT EXISTS public.udl_constraint_overrides (
  constraint_key text NOT NULL, created_by text NOT NULL, enabled boolean,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), prescription_overrides jsonb,
  threshold_overrides jsonb, updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.udl_drill_completions (
  completed_at timestamptz, difficulty_level numeric, drill_key text NOT NULL,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plan_id uuid NOT NULL, result_notes text,
  started_at timestamptz, user_id uuid NOT NULL
);
CREATE TABLE IF NOT EXISTS public.udl_daily_plans (
  constraints_detected jsonb, feedback_applied jsonb, generated_at timestamptz,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), linked_sessions jsonb, plan_date date NOT NULL,
  player_state jsonb, prescribed_drills jsonb, readiness_adjustments jsonb, user_id uuid NOT NULL
);
CREATE TABLE IF NOT EXISTS public.udl_audit_log (
  action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), metadata jsonb, user_id uuid NOT NULL
);
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['game_plan_week_overrides','sprint_analyses','video_pose_analysis','udl_alerts','udl_constraint_overrides','udl_drill_completions','udl_daily_plans','udl_audit_log'] LOOP
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
COMMENT ON TABLE public.game_plan_week_overrides IS 'PARKED 2026-09-25. Purpose: per-week manual reorder of Game Plan days. Still needs: a Game Plan screen that writes and reads week overrides. Service role only. See docs/wic/parked-features.md';
COMMENT ON TABLE public.sprint_analyses IS 'PARKED 2026-09-25. Purpose: AI sprint video analysis results (splits, steps, 20-80 grade). Still needs: a sprint video analysis function and results screen. Service role only. See docs/wic/parked-features.md';
COMMENT ON TABLE public.video_pose_analysis IS 'PARKED 2026-09-25. Purpose: pose landmarks per uploaded video. Still needs: a pose-estimation pipeline and a consumer screen. Service role only. See docs/wic/parked-features.md';
COMMENT ON TABLE public.udl_alerts IS 'PARKED 2026-09-25. Purpose: alerts from the retired Unified Daily Loop. Still needs: a UDL engine or a decision to fold into Tell Hammers. Service role only. See docs/wic/parked-features.md';
COMMENT ON TABLE public.udl_constraint_overrides IS 'PARKED 2026-09-25. Purpose: owner overrides for UDL constraint thresholds. Still needs: a UDL engine that reads them. Service role only. See docs/wic/parked-features.md';
COMMENT ON TABLE public.udl_drill_completions IS 'PARKED 2026-09-25. Purpose: drill completions inside a UDL daily plan. Still needs: a UDL engine and completion screen. Service role only. See docs/wic/parked-features.md';
COMMENT ON TABLE public.udl_daily_plans IS 'PARKED 2026-09-25. Purpose: daily drill plans from the retired Unified Daily Loop. Still needs: a UDL engine. 12 old test rows were lost in the 2026-09-25 drop. Service role only. See docs/wic/parked-features.md';
COMMENT ON TABLE public.udl_audit_log IS 'PARKED 2026-09-25. Purpose: audit trail for the UDL engine. Still needs: a UDL engine. 13 old test rows were lost in the 2026-09-25 drop. Service role only. See docs/wic/parked-features.md';
COMMENT ON COLUMN public.wk_movement_catalog.surface_hint IS 'PARKED 2026-09-25. Purpose: training surface hint per movement (turf, grass, mat). Filled on all rows. Still needs: an owner-approved place and wording on the card. See docs/wic/parked-features.md';
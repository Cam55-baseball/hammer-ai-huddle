-- Owner decision Nov 9 (approved by name): remove mental measurement entirely.
-- Checked read-only first: all 15 columns below held 0 non-empty values, the ledger had 0 mental_load rows,
-- and no view, trigger, constraint or other function referenced the columns or record_mental_load.
-- The save function is removed. The empty columns are left in place, marked DEPRECATED, because
-- dropping columns is blocked as a breaking change for the live app; nothing reads or writes them.
-- Snapshot of the two data rows removed separately (data tools), kept here for the record:
--   measurement_definitions: {"metric_key":"mental_load","unit":"rating_x_minutes","display_name":"Mental load","category":"readiness","privacy_class":"health","physical_min":1,"physical_max":6000,"source_status":"proposed","sport":"both","policy":"baseline","min_confidence":0.5,"is_canonical":true,"in_app_only":false,"notes":"Release 0 dictionary","created_at":"2026-11-09T02:17:44.962081+00:00"}
--   wk_feature_switches: {"feature_key":"mental_load_v1","label":"Mental load prompt + stress in readiness","mode":"off","allowlist":[],"buildable":true,"sort_order":303,"created_at":"2026-11-08T20:31:16.903362+00:00"}
DROP FUNCTION IF EXISTS public.record_mental_load(text, uuid, integer, numeric, text, date);

COMMENT ON COLUMN public.mind_item_logs.mental_drain_rating IS 'DEPRECATED (owner Nov 9): mental load removed; unused, always empty.';
COMMENT ON COLUMN public.mind_item_logs.mental_minutes IS 'DEPRECATED (owner Nov 9): mental load removed; unused, always empty.';
COMMENT ON COLUMN public.mind_item_logs.mental_minutes_source IS 'DEPRECATED (owner Nov 9): mental load removed; unused, always empty.';
COMMENT ON COLUMN public.mind_item_logs.mental_load IS 'DEPRECATED (owner Nov 9): mental load removed; unused, always empty.';
COMMENT ON COLUMN public.mind_item_logs.mental_rated_at IS 'DEPRECATED (owner Nov 9): mental load removed; unused, always empty.';
COMMENT ON COLUMN public.royal_timing_sessions.mental_drain_rating IS 'DEPRECATED (owner Nov 9): mental load removed; unused, always empty.';
COMMENT ON COLUMN public.royal_timing_sessions.mental_minutes IS 'DEPRECATED (owner Nov 9): mental load removed; unused, always empty.';
COMMENT ON COLUMN public.royal_timing_sessions.mental_minutes_source IS 'DEPRECATED (owner Nov 9): mental load removed; unused, always empty.';
COMMENT ON COLUMN public.royal_timing_sessions.mental_load IS 'DEPRECATED (owner Nov 9): mental load removed; unused, always empty.';
COMMENT ON COLUMN public.royal_timing_sessions.mental_rated_at IS 'DEPRECATED (owner Nov 9): mental load removed; unused, always empty.';
COMMENT ON COLUMN public.baserunning_daily_attempts.mental_drain_rating IS 'DEPRECATED (owner Nov 9): mental load removed; unused, always empty.';
COMMENT ON COLUMN public.baserunning_daily_attempts.mental_minutes IS 'DEPRECATED (owner Nov 9): mental load removed; unused, always empty.';
COMMENT ON COLUMN public.baserunning_daily_attempts.mental_minutes_source IS 'DEPRECATED (owner Nov 9): mental load removed; unused, always empty.';
COMMENT ON COLUMN public.baserunning_daily_attempts.mental_load IS 'DEPRECATED (owner Nov 9): mental load removed; unused, always empty.';
COMMENT ON COLUMN public.baserunning_daily_attempts.mental_rated_at IS 'DEPRECATED (owner Nov 9): mental load removed; unused, always empty.';
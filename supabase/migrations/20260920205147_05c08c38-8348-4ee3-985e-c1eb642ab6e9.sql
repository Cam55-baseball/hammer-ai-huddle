-- Job-runner and broadcast helpers should never be callable from a browser.
REVOKE EXECUTE ON FUNCTION public.cron_call(text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.dispatch_standard_match_pings() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.dispatch_standard_match_pings_v2(text) FROM anon, authenticated;

-- Trigger functions are invoked by the triggers themselves, never by clients.
REVOKE EXECUTE ON FUNCTION public.apply_block_severance() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_block_on_follow() FROM anon, authenticated;

-- These all depend on a signed-in identity; anonymous callers have no business here.
REVOKE EXECUTE ON FUNCTION public.blocked_user_ids() FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_edit_folder_item(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_view_scout_grade(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.coach_calibration_summary() FROM anon;
REVOKE EXECUTE ON FUNCTION public.scout_calibration_summary() FROM anon;
REVOKE EXECUTE ON FUNCTION public.combine_evaluator_context(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_athlete_evaluators(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_pending_evaluations() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_active_evaluator_role(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_player_module(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_blocked_pair(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_linked_coach(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.owns_scout_grade(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.save_equipment_context(text, text[], text, text, timestamp with time zone) FROM anon;
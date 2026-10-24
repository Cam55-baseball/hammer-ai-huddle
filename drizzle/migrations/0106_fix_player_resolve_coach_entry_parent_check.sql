-- Bug fix: player_resolve_coach_entry referenced public.is_parent_of(uuid,uuid), which
-- does not exist — every player/parent confirm-or-flag call failed with 42883.
-- The project's parent check is public.is_authorizing_parent(_parent, _athlete).
-- Also keeps the run-3 behavior: a 'not me' flag reverses throws and soft-deletes
-- the mirrored gp_games row.
CREATE OR REPLACE FUNCTION public.player_resolve_coach_entry(_entry uuid, _confirm boolean, _reason text DEFAULT NULL, _note text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e coach_logged_entries;
BEGIN
  SELECT * INTO e FROM coach_logged_entries WHERE id = _entry AND status IN ('pending','flagged')
    AND (athlete_id = auth.uid() OR public.is_authorizing_parent(auth.uid(), athlete_id));
  IF NOT FOUND THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  IF _confirm THEN
    UPDATE coach_logged_entries SET status = 'confirmed', resolved_at = now(), flag_reason = NULL WHERE id = _entry;
  ELSE
    IF _reason NOT IN ('not_me','wrong_numbers','other') THEN RAISE EXCEPTION 'Pick a reason'; END IF;
    UPDATE coach_logged_entries SET status = 'flagged', flag_reason = _reason, flag_note = left(_note, 500), resolved_at = NULL WHERE id = _entry;
    IF _reason = 'not_me' AND e.status = 'pending' THEN
      PERFORM public._coach_log_throws(e.athlete_id, e.entry_date, e.stats, -1);
      IF e.gp_game_id IS NOT NULL THEN UPDATE gp_games SET deleted_at = now(), updated_at = now() WHERE id = e.gp_game_id AND deleted_at IS NULL; END IF;
    END IF;
  END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.player_resolve_coach_entry(uuid,boolean,text,text) TO authenticated;
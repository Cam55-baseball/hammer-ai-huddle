CREATE OR REPLACE FUNCTION public.coach_connected_to(_me uuid, _athlete uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _me IS NOT NULL AND _me <> _athlete AND (
    public.is_coach_of(_me, _athlete) OR public.is_linked_coach(_me, _athlete)
    OR EXISTS (SELECT 1 FROM organization_members m WHERE m.user_id = _athlete AND m.status = 'active'
               AND m.removed_at IS NULL AND public.is_org_admin(_me, m.organization_id)))
$$;

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
    IF _reason IS NULL OR _reason NOT IN ('not_me','wrong_numbers','other') THEN RAISE EXCEPTION 'Pick a reason'; END IF;
    UPDATE coach_logged_entries SET status = 'flagged', flag_reason = _reason, flag_note = left(_note, 500), resolved_at = NULL WHERE id = _entry;
    IF _reason = 'not_me' AND e.status = 'pending' THEN PERFORM public._coach_log_throws(e.athlete_id, e.entry_date, e.stats, -1); END IF;
  END IF;
END $$;

CREATE POLICY "authorizing parent sees child's coach entries" ON public.coach_logged_entries FOR SELECT TO authenticated
  USING (public.is_authorizing_parent(auth.uid(), athlete_id));
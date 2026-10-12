ALTER TABLE public.initial_assessments ADD COLUMN IF NOT EXISTS recorded_at timestamptz;
ALTER TABLE public.initial_assessments ADD COLUMN IF NOT EXISTS parent_present_confirmed_at timestamptz;

-- Plan 4 B "on the spot": a connected coach or org admin records the movement and safety check
-- with the player in person. Saves to the PLAYER's row, labeled coach-verified with name + date.
-- Under 13: the parent runs the account, so the coach must confirm the parent is present and agrees.
CREATE OR REPLACE FUNCTION public.coach_record_movement_screen(
  _athlete uuid, _screen jsonb, _pain boolean, _parent_present boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _me uuid := auth.uid(); _dob date; _name text; _ok boolean; _row initial_assessments;
BEGIN
  IF _me IS NULL OR _me = _athlete THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  _ok := public.is_coach_of(_me, _athlete) OR public.is_linked_coach(_me, _athlete)
    OR EXISTS (SELECT 1 FROM organization_members m
               WHERE m.user_id = _athlete AND m.status = 'active' AND m.removed_at IS NULL
                 AND public.is_org_admin(_me, m.organization_id));
  IF NOT _ok THEN RAISE EXCEPTION 'A connection with this player is required' USING ERRCODE='42501'; END IF;
  IF jsonb_typeof(_screen) <> 'object' THEN RAISE EXCEPTION 'screen must be an object'; END IF;
  SELECT date_of_birth INTO _dob FROM profiles WHERE id = _athlete;
  IF (_dob IS NULL OR age(_dob) < interval '13 years') AND NOT coalesce(_parent_present,false) THEN
    RAISE EXCEPTION 'Under 13: the parent must be present and agree' USING ERRCODE='42501';
  END IF;
  SELECT coalesce(nullif(trim(full_name),''),'Coach') INTO _name FROM profiles WHERE id = _me;
  PERFORM set_config('request.jwt.claim.role','service_role', true);
  INSERT INTO initial_assessments (user_id, movement_screen, movement_done_at, pain_flag, recorded_by, recorded_by_label, recorded_at, parent_present_confirmed_at)
  VALUES (_athlete, _screen, now(), coalesce(_pain,false), _me, 'Coach-verified · ' || _name || ' · ' || to_char(now(),'Mon DD, YYYY'), now(),
          CASE WHEN _parent_present THEN now() END)
  ON CONFLICT (user_id) DO UPDATE SET movement_screen = EXCLUDED.movement_screen, movement_done_at = EXCLUDED.movement_done_at,
    pain_flag = EXCLUDED.pain_flag, recorded_by = EXCLUDED.recorded_by, recorded_by_label = EXCLUDED.recorded_by_label,
    recorded_at = EXCLUDED.recorded_at, parent_present_confirmed_at = EXCLUDED.parent_present_confirmed_at, updated_at = now()
  RETURNING * INTO _row;
  PERFORM set_config('request.jwt.claim.role','authenticated', true);
  RETURN jsonb_build_object('label', _row.recorded_by_label, 'pain_flag', _row.pain_flag);
END $$;
REVOKE ALL ON FUNCTION public.coach_record_movement_screen(uuid, jsonb, boolean, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.coach_record_movement_screen(uuid, jsonb, boolean, boolean) TO authenticated;
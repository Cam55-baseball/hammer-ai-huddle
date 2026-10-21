-- PENDING ONLY. Do not apply without named owner authorization.
-- Additive append RPC for exactly two informational cross-athlete events.
-- Existing self-only event INSERT and all athlete-data SELECT policies stay unchanged.
BEGIN;

INSERT INTO public.asb_topic_registry
  (topic_id, topic_class, authority_pathway, replay_policy, materialization_policy,
   description, introduced_in_engine_version)
VALUES
  ('coach.review.opened', 'observability', 'system',
   'non_replayable_informational', 'on_demand',
   'An authenticated, currently connected coach opened the athlete review.', 'asb-1.0.0'),
  ('relational.exposure.gate_blocked', 'observability', 'system',
   'non_replayable_informational', 'on_demand',
   'Server-confirmed recruiting visibility denial; no athlete data is returned.', 'asb-1.0.0')
ON CONFLICT (topic_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.record_view_audit_event(
  _athlete uuid, _topic text, _event_id uuid, _scope text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  stamp timestamptz := now();
  body jsonb;
  role_value public.asb_actor_role;
  key_value text;
  saved_id uuid;
BEGIN
  IF caller IS NULL OR _athlete IS NULL OR _event_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated viewer and target required' USING ERRCODE = '42501';
  END IF;
  IF _scope IS NOT NULL AND _scope NOT IN ('profile','metrics','video','contact','health','academics') THEN
    RAISE EXCEPTION 'Invalid visibility scope' USING ERRCODE = '22023';
  END IF;
  IF _topic = 'coach.review.opened' THEN
    IF caller = _athlete OR public.is_blocked_pair(caller, _athlete)
       OR NOT public.coach_connected_to(caller, _athlete)
       OR NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = caller
                      AND r.role = 'coach'::public.app_role AND r.status = 'active') THEN
      RAISE EXCEPTION 'Current coach connection required' USING ERRCODE = '42501';
    END IF;
    role_value := 'coach';
    body := jsonb_build_object('surface','coach_athlete_detail');
    key_value := 'coach.review.opened:' || caller || ':' || _athlete || ':' || (stamp AT TIME ZONE 'UTC')::date;
  ELSIF _topic = 'relational.exposure.gate_blocked' THEN
    -- Do not accept a client-supplied denial reason or any athlete measurements.
    IF public.resolve_recruiting_visibility(_athlete)
       AND (_scope IS NULL OR public.resolve_recruiting_scope(_athlete, _scope)) THEN
      RAISE EXCEPTION 'Visibility is not blocked' USING ERRCODE = '42501';
    END IF;
    role_value := 'system';
    body := jsonb_build_object('reason','consent_missing','viewer_id',caller,
                              'scope',_scope,'engine_version','asb-1.0.0');
    key_value := 'relational.exposure.gate_blocked:' || caller || ':' || _athlete
                 || ':' || coalesce(_scope,'all') || ':' || (stamp AT TIME ZONE 'UTC')::date;
  ELSE
    RAISE EXCEPTION 'Unsupported view audit topic' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.asb_events
    (event_id, athlete_id, topic_id, actor_role, actor_id, occurred_at, ingested_at,
     effective_at, valid_from, payload, engine_version, idempotency_key, causality_refs, lineage_refs)
  VALUES
    (_event_id, _athlete, _topic, role_value, caller, stamp, stamp, stamp, stamp,
     body, 'asb-1.0.0', key_value, '[]'::jsonb, '[]'::jsonb)
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING event_id INTO saved_id;
  IF saved_id IS NULL THEN
    SELECT e.event_id INTO saved_id FROM public.asb_events e
      WHERE e.idempotency_key = key_value AND e.actor_id = caller;
  END IF;
  RETURN saved_id;
END;
$$;
REVOKE ALL ON FUNCTION public.record_view_audit_event(uuid,text,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_view_audit_event(uuid,text,uuid,text) TO authenticated;
COMMIT;

-- After authorization: route ONLY these two client producers to this RPC;
-- recheck coach/recruiting pages as democoach, and test unrelated/revoked/blocked
-- viewers, spoofed topics, unauthenticated calls, and duplicate daily records.
-- Snapshot and clean exact TEST event IDs after verification. Not verified/applied.
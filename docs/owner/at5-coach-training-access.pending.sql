-- AT5 STAGED ONLY. Do not apply without named owner authorization.
-- Snapshot current function definitions before applying. No tables or data changed.
-- This gate is deliberately independent of legacy is_coach_of/is_linked_coach:
-- those helpers admit linked adult scouts or broad organizational staff.
CREATE OR REPLACE FUNCTION public._coach_training_access(_athlete uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    auth.uid() = _athlete OR (
      NOT public.user_has_role(auth.uid(), 'scout'::public.app_role)
      AND NOT public.user_has_role(auth.uid(), 'recruiter'::public.app_role)
      AND NOT EXISTS (SELECT 1 FROM public.user_blocks b
        WHERE (b.blocker_id=auth.uid() AND b.blocked_id=_athlete)
           OR (b.blocker_id=_athlete AND b.blocked_id=auth.uid()))
      AND (
        (public.user_has_role(auth.uid(), 'coach'::public.app_role)
          AND EXISTS (SELECT 1 FROM public.scout_follows sf
            WHERE sf.scout_id=auth.uid() AND sf.player_id=_athlete
              AND sf.status='accepted' AND sf.relationship_type='linked'))
        OR EXISTS (SELECT 1 FROM public.organization_members player
          JOIN public.organizations o ON o.id=player.organization_id
          WHERE player.user_id=_athlete AND player.status='active' AND player.role_in_org='player'
            AND (o.verified OR o.is_solo)
            AND (public.is_org_admin(auth.uid(),o.id)
              OR (public.is_org_staff(auth.uid(),o.id) AND EXISTS (
                SELECT 1 FROM public.org_athlete_assignments a
                WHERE a.organization_id=o.id AND a.coach_user_id=auth.uid()
                  AND a.athlete_user_id=_athlete AND a.revoked_at IS NULL))))
      )
    )
  );
$$;
REVOKE ALL ON FUNCTION public._coach_training_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._coach_training_access(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.coach_athlete_development(_athlete uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if NOT public._coach_training_access(_athlete) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'reports', coalesce((
      select jsonb_agg(jsonb_build_object('id', q.id, 'date', coalesce(q.session_date, q.created_at::date), 'module', q.module, 'efficiency_score', q.efficiency_score) order by coalesce(q.session_date, q.created_at::date) desc)
      from (
        select v.id, v.session_date, v.created_at, v.module, v.efficiency_score
        from videos v
        where v.user_id = _athlete and v.ai_analysis is not null
        order by coalesce(v.session_date, v.created_at::date) desc
        limit 25
      ) q), '[]'::jsonb),
    'findings', coalesce((
      select jsonb_agg(jsonb_build_object('id', f.id, 'video_id', f.video_id, 'skill_domain', f.skill_domain, 'fault_key', f.fault_key, 'evidence', f.evidence, 'created_at', f.created_at) order by f.created_at desc)
      from (
        select f.id, f.video_id, f.skill_domain, f.fault_key, f.evidence, f.created_at
        from analysis_fault_findings f
        where f.user_id = _athlete
        order by f.created_at desc
        limit 50
      ) f), '[]'::jsonb)
  );
end $function$;

CREATE OR REPLACE FUNCTION public.coach_athlete_outcomes(_athlete uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _viewer uuid := auth.uid();
  _health boolean;
BEGIN
  IF NOT public._coach_training_access(_athlete) THEN
    RETURN jsonb_build_object('state', 'denied');
  END IF;

  _health := _viewer = _athlete OR public.resolve_recruiting_scope(_athlete, 'health');

  RETURN jsonb_build_object(
    'state', 'ok',
    'outcomes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'area', r.area,
               'do_this', r.do_this,
               'baseline_value', r.baseline_value,
               'recheck_value', r.recheck_value,
               'followed_at', r.followed_at,
               'checked_at', r.checked_at,
               'created_at', r.created_at
             ) ORDER BY r.checked_at DESC NULLS LAST)
      FROM (
        SELECT r.*
        FROM public.intelligence_recommendations r
        WHERE r.user_id = _athlete
          AND r.followed = true
          AND r.outcome IS NOT NULL
          AND (_health OR NOT public._plan_line_is_health(COALESCE(r.do_this, '')))
        ORDER BY r.checked_at DESC NULLS LAST
        LIMIT 6
      ) AS r
    ), '[]'::jsonb)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.coach_athlete_plan(_athlete uuid, _date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _viewer uuid := auth.uid();
  _row public.athlete_plan_snapshots%ROWTYPE;
  _health boolean;
  _blocks jsonb;
BEGIN
  IF NOT public._coach_training_access(_athlete) THEN
    RETURN jsonb_build_object('state', 'denied');
  END IF;

  SELECT * INTO _row
  FROM public.athlete_plan_snapshots
  WHERE user_id = _athlete AND plan_date = _date
  ORDER BY updated_at DESC
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('state', 'unavailable');
  END IF;

  _health := _viewer = _athlete OR public.resolve_recruiting_scope(_athlete, 'health');

  IF _health THEN
    _blocks := COALESCE(_row.payload->'blocks', '[]'::jsonb);
  ELSE
    SELECT COALESCE(jsonb_agg(b), '[]'::jsonb) INTO _blocks
    FROM (
      SELECT jsonb_set(
               b,
               '{because}',
               COALESCE(
                 (SELECT jsonb_agg(x)
                  FROM jsonb_array_elements_text(COALESCE(b->'because', '[]'::jsonb)) AS x
                  WHERE NOT public._plan_line_is_health(x)),
                 '[]'::jsonb),
               true
             ) || jsonb_build_object(
               'roadmapReason',
               CASE WHEN public._plan_line_is_health(COALESCE(b->>'roadmapReason', ''))
                    THEN '' ELSE COALESCE(b->>'roadmapReason', '') END
             ) AS b
      FROM jsonb_array_elements(COALESCE(_row.payload->'blocks', '[]'::jsonb)) AS b
    ) AS sub;
  END IF;

  RETURN jsonb_build_object(
    'state', 'ok',
    'sport', _row.sport,
    'plan_date', _row.plan_date,
    'engine_version', _row.engine_version,
    'updated_at', _row.updated_at,
    'health_shared', _health,
    'blocks', _blocks
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.coach_athlete_plan(uuid,date), public.coach_athlete_outcomes(uuid), public.coach_athlete_development(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coach_athlete_plan(uuid,date), public.coach_athlete_outcomes(uuid), public.coach_athlete_development(uuid) TO authenticated;

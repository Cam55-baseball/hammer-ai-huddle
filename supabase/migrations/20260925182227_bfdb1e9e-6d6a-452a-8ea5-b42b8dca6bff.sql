-- Prior definition recorded in docs/asb/recruiting-consent-enforcement-2026-09-25.md
CREATE OR REPLACE FUNCTION public.is_coach_of(_coach uuid, _athlete uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select
    _coach is not null
    and _athlete is not null
    and (
      exists (
        select 1 from public.athlete_mpi_settings a
        where a.user_id = _athlete
          and (_coach = a.primary_coach_id
               or _coach = any(coalesce(a.secondary_coach_ids,'{}'::uuid[])))
      )
      or exists (
        select 1 from public.organization_members om1
        join public.organization_members om2
          on om1.organization_id = om2.organization_id
        where om1.user_id = _coach and om2.user_id = _athlete
          and om1.status = 'active' and om2.status = 'active'
      )
      or (
        exists (
          select 1 from public.scout_follows sf
          where sf.scout_id = _coach and sf.player_id = _athlete
            and sf.status = 'accepted' and sf.relationship_type = 'linked'
        )
        -- Child safety: a "linked" follow only confers coach access to a minor
        -- when the follower actually holds an active coach role. Scout-only
        -- accounts go through the recruiting consent resolver instead.
        and (public.is_minor(_athlete) = false or public.user_has_role(_coach, 'coach'::app_role))
      )
    );
$function$;
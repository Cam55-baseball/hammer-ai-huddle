
create or replace function public.is_coach_of(_coach uuid, _athlete uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
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
      or exists (
        select 1 from public.scout_follows sf
        where sf.scout_id = _coach and sf.player_id = _athlete
          and sf.status = 'accepted' and sf.relationship_type = 'linked'
      )
    );
$$;

drop policy if exists "coach_can_read_roster_events" on public.asb_events;
create policy "coach_can_read_roster_events"
  on public.asb_events
  for select
  to authenticated
  using (public.is_coach_of(auth.uid(), athlete_id));

drop policy if exists "coach_can_read_roster_notification_acks" on public.notification_acks;
create policy "coach_can_read_roster_notification_acks"
  on public.notification_acks
  for select
  to authenticated
  using (public.is_coach_of(auth.uid(), user_id));

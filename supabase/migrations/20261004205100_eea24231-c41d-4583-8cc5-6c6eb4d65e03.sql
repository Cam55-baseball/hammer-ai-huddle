-- Trigger functions are never called directly; nobody needs EXECUTE on them.
revoke execute on function public.apply_block_severance() from public, anon, authenticated;
revoke execute on function public.enforce_block_on_follow() from public, anon, authenticated;

-- These policies applied to every role, including signed-out visitors. Limit them to signed-in users, like the sibling scout-grade tables.
do $$
declare r record;
begin
  for r in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'vault_scout_grade_pitching_sides' and roles = '{public}'
  loop
    execute format('alter policy %I on public.vault_scout_grade_pitching_sides to authenticated', r.policyname);
  end loop;
end $$;

-- Signed-in-only helpers: remove signed-out access, keep signed-in and backend access.
do $$
declare r record;
begin
  for r in select p.oid::regprocedure as sig
           from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public'
             and p.proname in ('blocked_user_ids','can_view_scout_grade','coach_calibration_summary','combine_evaluator_context','get_athlete_evaluators','get_pending_evaluations','has_active_evaluator_role','has_player_module','is_blocked_pair','owns_scout_grade','scout_calibration_summary')
  loop
    execute format('revoke execute on function %s from public, anon', r.sig);
    execute format('grant execute on function %s to authenticated, service_role', r.sig);
  end loop;
end $$;

-- Pin the search path on the one function missing it.
alter function public.grade_row_overall(public.vault_scout_grades) set search_path = public;
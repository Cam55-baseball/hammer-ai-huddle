-- 1. Remove direct client access to service-only routines
revoke execute on function public.get_athlete_context_envelope(uuid) from authenticated;
revoke execute on function public.recompute_library_video_tier(uuid) from authenticated;
revoke execute on function public.try_acquire_hie_lock(uuid, integer) from authenticated;
revoke execute on function public.update_block_status_service(uuid) from authenticated;
revoke execute on function public.batch_decrement_sets(uuid[]) from authenticated;
revoke execute on function public.batch_increment_sets(uuid[]) from authenticated;
revoke execute on function public.batch_deload_exercises(uuid[]) from authenticated;

do $$
declare r record;
begin
  for r in
    select n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' as sig
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('insert_training_block_atomic','wk_persist_prescriptions_atomic')
  loop
    execute format('revoke execute on function %s from authenticated', r.sig);
  end loop;
end $$;

-- 2. Identity guards on user-scoped live A/B link routines
create or replace function public.assert_self(_user_id uuid)
returns void language plpgsql stable security invoker set search_path = public as $$
begin
  if auth.uid() is null or _user_id is distinct from auth.uid() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
end;
$$;
revoke execute on function public.assert_self(uuid) from public;
grant execute on function public.assert_self(uuid) to authenticated, service_role;

create or replace function public.assert_owns_block(_block_id uuid)
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from public.training_blocks b where b.id = _block_id and b.user_id = auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
end;
$$;
revoke execute on function public.assert_owns_block(uuid) from public;
grant execute on function public.assert_owns_block(uuid) to authenticated, service_role;
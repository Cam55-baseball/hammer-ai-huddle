do $$
declare
  r record;
  fname text;
  keep_anon text[] := array['get_public_bundle','check_bundle_discount','has_role','user_has_role',
    'is_coach_of','is_minor','is_system_user','is_linked_coach','is_authorizing_parent',
    'is_org_owner','is_org_coach_or_owner','resolve_recruiting_visibility',
    'folder_allows_coach_edit','can_edit_folder_item','all_checked','has_any_checked'];
  is_internal boolean;
begin
  for r in
    select p.oid, p.proname, p.prorettype::regtype::text as rettype,
           n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    fname := r.proname;
    is_internal := r.rettype = 'trigger'
      or fname like 'cleanup%' or fname like 'archive%' or fname like 'manual%'
      or fname = 'expire_stale_links';

    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);

    if not is_internal then
      execute format('grant execute on function %s to authenticated', r.sig);
      if fname = any(keep_anon) then
        execute format('grant execute on function %s to anon', r.sig);
      end if;
    end if;
  end loop;
end $$;
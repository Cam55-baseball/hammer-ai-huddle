do $$
declare
  r record;
  fname text;
  keep_anon text[] := array['get_public_bundle','check_bundle_discount','has_role','user_has_role',
    'is_coach_of','is_minor','is_system_user','is_linked_coach','is_authorizing_parent',
    'is_org_owner','is_org_coach_or_owner','resolve_recruiting_visibility',
    'folder_allows_coach_edit','can_edit_folder_item','all_checked','has_any_checked'];
begin
  for r in
    select p.oid, p.proname, p.prorettype::regtype::text as rettype,
           n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    fname := r.proname;

    -- Trigger functions and maintenance/cron routines: no client access at all.
    if r.rettype = 'trigger'
       or fname like 'cleanup\_%' or fname like 'cleanup%old%'
       or fname like 'archive\_%' or fname like 'manual\_%'
       or fname = 'expire_stale_links'
    then
      execute format('revoke execute on function %s from anon, authenticated', r.sig);
      continue;
    end if;

    -- Everything else: signed-out callers only keep the intentionally public surface.
    if not (fname = any(keep_anon)) then
      execute format('revoke execute on function %s from anon', r.sig);
    end if;
  end loop;
end $$;
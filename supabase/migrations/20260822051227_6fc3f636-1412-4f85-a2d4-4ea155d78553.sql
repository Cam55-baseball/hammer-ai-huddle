create or replace function public.assert_self(_user_id uuid)
returns void language plpgsql stable security invoker set search_path = public as $$
begin
  -- service/system contexts have no auth.uid(); client contexts must match
  if auth.uid() is not null and _user_id is distinct from auth.uid() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.assert_owns_block(_block_id uuid)
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and not exists (select 1 from public.training_blocks b where b.id = _block_id and b.user_id = auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.create_ab_link(p_user_id uuid, p_sport text, p_link_code text)
returns setof live_ab_links language plpgsql security definer set search_path to 'public' as $function$
BEGIN
  PERFORM public.assert_self(p_user_id);

  UPDATE live_ab_links SET status = 'expired'
  WHERE creator_user_id = p_user_id AND status IN ('pending', 'claimed');

  UPDATE live_ab_links SET status = 'expired'
  WHERE status IN ('pending', 'claimed') AND expires_at < now();

  RETURN QUERY
  INSERT INTO live_ab_links (link_code, creator_user_id, sport, status, expires_at)
  VALUES (p_link_code, p_user_id, p_sport, 'pending', now() + interval '2 hours')
  RETURNING *;
END;
$function$;

create or replace function public.claim_ab_link(p_code text, p_user_id uuid)
returns setof live_ab_links language plpgsql security definer set search_path to 'public' as $function$
BEGIN
  PERFORM public.assert_self(p_user_id);

  UPDATE live_ab_links SET status = 'expired'
  WHERE status IN ('pending', 'claimed') AND expires_at < now();

  RETURN QUERY
  UPDATE live_ab_links
  SET joiner_user_id = p_user_id, status = 'claimed', claimed_at = now()
  WHERE link_code = p_code
    AND status = 'pending'
    AND joiner_user_id IS NULL
    AND creator_user_id != p_user_id
    AND expires_at > now()
  RETURNING *;
END;
$function$;

create or replace function public.expire_ab_link(p_user_id uuid, p_link_code text)
returns setof live_ab_links language plpgsql security definer set search_path to 'public' as $function$
BEGIN
  PERFORM public.assert_self(p_user_id);
  RETURN QUERY
  UPDATE public.live_ab_links SET status = 'expired'
  WHERE link_code = p_link_code
    AND status IN ('pending', 'claimed')
    AND (creator_user_id = p_user_id OR joiner_user_id = p_user_id)
  RETURNING *;
END;
$function$;

create or replace function public.extend_ab_link(p_user_id uuid, p_link_code text)
returns setof live_ab_links language plpgsql security definer set search_path to 'public' as $function$
BEGIN
  PERFORM public.assert_self(p_user_id);
  RETURN QUERY
  UPDATE public.live_ab_links SET expires_at = now() + interval '2 hours'
  WHERE link_code = p_link_code
    AND status IN ('pending', 'claimed')
    AND (creator_user_id = p_user_id OR joiner_user_id = p_user_id)
  RETURNING *;
END;
$function$;

create or replace function public.attach_session_to_link(p_user_id uuid, p_link_code text, p_session_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $function$
DECLARE
  v_link live_ab_links;
BEGIN
  PERFORM public.assert_self(p_user_id);

  SELECT * INTO v_link FROM live_ab_links WHERE link_code = p_link_code FOR UPDATE;
  IF v_link IS NULL THEN RETURN; END IF;
  IF v_link.status NOT IN ('pending', 'claimed', 'linked') THEN RETURN; END IF;

  IF EXISTS (
    SELECT 1 FROM live_ab_links
    WHERE (creator_session_id = p_session_id OR joiner_session_id = p_session_id)
      AND id != v_link.id
  ) THEN RETURN; END IF;

  IF v_link.creator_user_id = p_user_id THEN
    UPDATE live_ab_links SET creator_session_id = COALESCE(creator_session_id, p_session_id) WHERE id = v_link.id;
  ELSIF v_link.joiner_user_id = p_user_id THEN
    UPDATE live_ab_links SET joiner_session_id = COALESCE(joiner_session_id, p_session_id) WHERE id = v_link.id;
  ELSE
    RETURN;
  END IF;

  SELECT * INTO v_link FROM live_ab_links WHERE id = v_link.id;

  IF v_link.creator_session_id IS NOT NULL AND v_link.joiner_session_id IS NOT NULL THEN
    UPDATE performance_sessions SET linked_session_id = v_link.joiner_session_id
    WHERE id = v_link.creator_session_id AND linked_session_id IS DISTINCT FROM v_link.joiner_session_id;

    UPDATE performance_sessions SET linked_session_id = v_link.creator_session_id
    WHERE id = v_link.joiner_session_id AND linked_session_id IS DISTINCT FROM v_link.creator_session_id;

    IF v_link.status != 'linked' THEN
      UPDATE live_ab_links SET status = 'linked', linked_at = now() WHERE id = v_link.id;
    END IF;
  END IF;
END;
$function$;

create or replace function public.shift_workouts_forward(p_block_id uuid, p_after_date date, p_days integer default 1)
returns integer language plpgsql security definer set search_path to 'public' as $function$
DECLARE
  v_count int;
BEGIN
  PERFORM public.assert_owns_block(p_block_id);

  WITH ordered AS (
    SELECT id,
           (p_after_date + p_days + (row_number() OVER (ORDER BY scheduled_date ASC, id ASC))::int) AS new_date
    FROM block_workouts
    WHERE block_id = p_block_id AND scheduled_date > p_after_date AND status = 'scheduled'
  )
  UPDATE block_workouts bw
  SET scheduled_date = ordered.new_date
  FROM ordered
  WHERE bw.id = ordered.id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

revoke execute on function public.create_ab_link(uuid, text, text) from public, anon;
revoke execute on function public.claim_ab_link(text, uuid) from public, anon;
revoke execute on function public.expire_ab_link(uuid, text) from public, anon;
revoke execute on function public.extend_ab_link(uuid, text) from public, anon;
revoke execute on function public.attach_session_to_link(uuid, text, uuid) from public, anon;
revoke execute on function public.shift_workouts_forward(uuid, date, integer) from public, anon;
grant execute on function public.create_ab_link(uuid, text, text) to authenticated, service_role;
grant execute on function public.claim_ab_link(text, uuid) to authenticated, service_role;
grant execute on function public.expire_ab_link(uuid, text) to authenticated, service_role;
grant execute on function public.extend_ab_link(uuid, text) to authenticated, service_role;
grant execute on function public.attach_session_to_link(uuid, text, uuid) to authenticated, service_role;
grant execute on function public.shift_workouts_forward(uuid, date, integer) to authenticated, service_role;
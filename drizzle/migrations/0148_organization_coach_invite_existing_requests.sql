CREATE OR REPLACE FUNCTION public.invite_org_coach_by_email(_organization_id uuid, _email text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $function$
DECLARE v_coach uuid;
BEGIN
  IF NOT public.is_org_admin(auth.uid(),_organization_id) THEN RAISE EXCEPTION 'Only organization admins can invite coaches' USING ERRCODE='42501'; END IF;
  SELECT u.id INTO v_coach FROM auth.users u JOIN public.profiles p ON p.id=u.id
    WHERE lower(u.email)=lower(btrim(_email)) AND public.user_has_role(u.id,'coach'::app_role)
      AND p.suspended_at IS NULL AND p.account_paused_at IS NULL LIMIT 1;
  IF v_coach IS NULL THEN RAISE EXCEPTION 'No active coach account matches that email'; END IF;
  RETURN public.send_connection_request('org_coach',v_coach,_organization_id,NULL,NULL);
END $function$;
REVOKE ALL ON FUNCTION public.invite_org_coach_by_email(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invite_org_coach_by_email(uuid,text) TO authenticated, service_role;
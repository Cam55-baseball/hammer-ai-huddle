CREATE OR REPLACE FUNCTION public.parent_optional_sharing(_athlete uuid)
RETURNS TABLE(optional_sharing boolean, signed_at timestamptz, health_allowed boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT (public.is_authorizing_parent(auth.uid(),_athlete) OR (auth.uid()=_athlete AND EXISTS(SELECT 1 FROM public.profiles WHERE id=_athlete AND parent_controlled IS TRUE))) THEN
  RAISE EXCEPTION 'Only the linked parent can manage this permission.' USING ERRCODE='42501';
 END IF;
 RETURN QUERY SELECT c.optional_sharing,c.signed_at,public.resolve_recruiting_scope(_athlete,'health') FROM public.parent_consents c WHERE c.child_user_id=_athlete AND c.withdrawn_at IS NULL AND c.parent_is_adult IS TRUE ORDER BY c.signed_at DESC LIMIT 1;
END $$;
CREATE OR REPLACE FUNCTION public.set_parent_optional_sharing(_athlete uuid,_enabled boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE consent_id uuid;
BEGIN
 IF _enabled IS NULL THEN RAISE EXCEPTION 'Choose on or off.'; END IF;
 IF auth.uid() IS NULL OR NOT (public.is_authorizing_parent(auth.uid(),_athlete) OR (auth.uid()=_athlete AND EXISTS(SELECT 1 FROM public.profiles WHERE id=_athlete AND parent_controlled IS TRUE))) THEN
  RAISE EXCEPTION 'Only the linked parent can manage this permission.' USING ERRCODE='42501';
 END IF;
 SELECT id INTO consent_id FROM public.parent_consents WHERE child_user_id=_athlete AND withdrawn_at IS NULL AND parent_is_adult IS TRUE ORDER BY signed_at DESC LIMIT 1 FOR UPDATE;
 IF consent_id IS NULL THEN RAISE EXCEPTION 'An active signed Parent Promise is required.' USING ERRCODE='42501'; END IF;
 UPDATE public.parent_consents SET optional_sharing=_enabled,optional_sharing_at=now() WHERE id=consent_id;
 RETURN _enabled;
END $$;
REVOKE ALL ON FUNCTION public.parent_optional_sharing(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.set_parent_optional_sharing(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.parent_optional_sharing(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_parent_optional_sharing(uuid,boolean) TO authenticated;
COMMENT ON FUNCTION public.set_parent_optional_sharing(uuid,boolean) IS 'Linked-parent or parent-run self only; active signed consent required. Does not modify recruiting, health, academics, training opt-in or visibility permissions.';
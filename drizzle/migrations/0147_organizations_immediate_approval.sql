ALTER TABLE public.organizations ALTER COLUMN verified SET DEFAULT true;
ALTER TABLE public.organizations ALTER COLUMN verification_status SET DEFAULT 'verified';
CREATE OR REPLACE FUNCTION public.guard_org_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND auth.uid() IS NOT NULL
     AND NOT (public.user_has_role(auth.uid(),'owner'::app_role) OR public.user_has_role(auth.uid(),'admin'::app_role))
     AND (NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id OR NEW.is_solo IS DISTINCT FROM OLD.is_solo) THEN
    RAISE EXCEPTION 'Organization ownership cannot be changed';
  END IF;
  NEW.verified := true;
  NEW.verification_status := 'verified';
  NEW.verified_by := CASE WHEN TG_OP = 'UPDATE' THEN OLD.verified_by ELSE NULL END;
  NEW.reviewed_at := coalesce(NEW.reviewed_at, now());
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION public.submit_org_for_verification(_organization_id uuid, _address text, _website text, _official_email text, _phone text, _admin_role_title text, _proof_path text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $function$
BEGIN
  IF NOT public.is_org_admin(auth.uid(), _organization_id) THEN RAISE EXCEPTION 'Only organization admins can save details'; END IF;
  UPDATE public.organizations SET address=_address, website=_website, official_email=nullif(lower(btrim(_official_email)),''), phone=_phone,
    admin_role_title=_admin_role_title, proof_path=_proof_path WHERE id=_organization_id;
END $function$;
CREATE OR REPLACE FUNCTION public.review_org_verification(_organization_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $function$
BEGIN
  IF NOT (public.user_has_role(auth.uid(),'owner'::app_role) OR public.user_has_role(auth.uid(),'admin'::app_role)) THEN RAISE EXCEPTION 'Owner only'; END IF;
  UPDATE public.organizations SET verified=true, verification_status='verified' WHERE id=_organization_id;
END $function$;
CREATE OR REPLACE FUNCTION public.list_org_pending_verification()
RETURNS TABLE(id uuid, name text, org_type text, address text, website text, official_email text, phone text, admin_role_title text, proof_path text, email_confirmed boolean, submitted_at timestamptz, owner_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO public AS $function$
  SELECT o.id, o.name, o.org_type, o.address, o.website, o.official_email, o.phone, o.admin_role_title, o.proof_path,
         o.email_verified_at IS NOT NULL, o.submitted_at, p.full_name
  FROM public.organizations o LEFT JOIN public.profiles p ON p.id=o.owner_user_id WHERE false;
$function$;
COMMENT ON COLUMN public.organizations.verified IS 'Automatic organization activation; not proof of email, identity or test-result verification.';
COMMENT ON FUNCTION public.submit_org_for_verification(uuid,text,text,text,text,text,text) IS 'Compatibility contact-details save only; no approval or email-code wait.';
CREATE OR REPLACE FUNCTION public.anon_training_eligible(_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE((
    SELECT p.account_paused_at IS NULL AND p.date_of_birth IS NOT NULL
      AND NOT COALESCE(p.is_system_account, false) AND
      CASE WHEN date_part('year', age(current_date, p.date_of_birth))::int >= 13 THEN NOT p.anon_training_opt_out
           ELSE EXISTS (SELECT 1 FROM parent_consents c WHERE c.child_user_id = p.id AND c.withdrawn_at IS NULL
                          AND c.payment_confirmed_at IS NOT NULL AND c.training_opt_in) END
    FROM profiles p WHERE p.id = _user), false)
$function$;
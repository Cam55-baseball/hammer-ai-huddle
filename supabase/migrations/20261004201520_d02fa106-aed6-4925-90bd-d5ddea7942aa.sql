create or replace function public.guard_subscription_billing_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Trusted: backend (service role), database jobs and SECURITY DEFINER functions, and owner/admin staff.
  if current_user not in ('authenticated', 'anon')
     or public.has_role(auth.uid(), 'owner'::public.app_role)
     or public.has_role(auth.uid(), 'admin'::public.app_role) then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    -- Regular users cannot change their own subscription row.
    return old;
  end if;

  -- INSERT by a regular user: only a blank free row.
  new.plan := 'free';
  new.status := 'active';
  new.subscribed_modules := array[]::text[];
  new.tier := null;
  new.module_subscription_mapping := '{}'::jsonb;
  new.module_data_status := '{}'::jsonb;
  new.stripe_customer_id := null;
  new.stripe_subscription_id := null;
  new.coupon_code := null;
  new.coupon_name := null;
  new.discount_percent := null;
  new.grandfathered_price := null;
  new.grandfathered_at := null;
  new.has_pending_cancellations := false;
  new.current_period_end := now() + interval '7 days';
  return new;
end;
$$;

drop trigger if exists guard_subscription_billing_fields on public.subscriptions;
create trigger guard_subscription_billing_fields
  before insert or update on public.subscriptions
  for each row execute function public.guard_subscription_billing_fields();
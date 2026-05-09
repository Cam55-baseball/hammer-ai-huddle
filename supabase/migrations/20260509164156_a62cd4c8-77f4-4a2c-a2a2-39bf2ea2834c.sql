create table if not exists public.foundation_notification_dispatches (
  id uuid primary key default gen_random_uuid(),
  alert_key text not null,
  severity text not null check (severity in ('info','warning','critical')),
  adapter text not null,
  status text not null check (status in ('ok','error','dlq','skipped_flap','skipped_severity','skipped_disabled','skipped_idem','config_invalid')),
  attempt int not null default 1,
  error text,
  payload jsonb,
  minute_bucket timestamptz,
  dispatched_at timestamptz not null default now()
);

create index if not exists idx_fnd_alert_key_time on public.foundation_notification_dispatches (alert_key, dispatched_at desc);
create index if not exists idx_fnd_status_time on public.foundation_notification_dispatches (status, dispatched_at desc);
create unique index if not exists uq_fnd_idem_minute on public.foundation_notification_dispatches (alert_key, adapter, minute_bucket) where minute_bucket is not null;

alter table public.foundation_notification_dispatches enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'admins read notification dispatches' and schemaname = 'public' and tablename = 'foundation_notification_dispatches') then
    create policy "admins read notification dispatches" on public.foundation_notification_dispatches
      for select to authenticated
      using (public.has_role(auth.uid(), 'admin'::public.app_role));
  end if;
  if not exists (select 1 from pg_policies where policyname = 'service role writes notification dispatches' and schemaname = 'public' and tablename = 'foundation_notification_dispatches') then
    create policy "service role writes notification dispatches" on public.foundation_notification_dispatches
      for all to service_role
      using (true) with check (true);
  end if;
end $$;

create index if not exists idx_fha_resolved_severity on public.foundation_health_alerts (severity, resolved_at desc) where resolved_at is not null;
create index if not exists idx_fha_alert_key_resolved on public.foundation_health_alerts (alert_key, resolved_at desc);

comment on table public.foundation_notification_dispatches is 'Phase II: ledger of every notification dispatch attempt. Append-only, admin read.';
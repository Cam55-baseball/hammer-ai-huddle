-- PENDING owner authorization (additive). Player writes own failure rows; owner/admin read.
create table if not exists public.plan_check_failures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  check_key text not null check (check_key in ('analysis_findings','drill_choice','practice_history')),
  error text,
  created_at timestamptz not null default now()
);
create index if not exists plan_check_failures_created_idx on public.plan_check_failures (created_at desc);
alter table public.plan_check_failures enable row level security;
grant select, insert on public.plan_check_failures to authenticated;
create policy "players log own check failures" on public.plan_check_failures for insert to authenticated with check (user_id = auth.uid());
create policy "owner reads check failures" on public.plan_check_failures for select to authenticated
  using (public.has_role(auth.uid(),'owner') or public.has_role(auth.uid(),'admin'));

create table public.launch_events (
  id          uuid primary key default gen_random_uuid(),
  event       text not null,
  payload     jsonb not null default '{}'::jsonb,
  ts          timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index launch_events_event_created_at_idx
  on public.launch_events (event, created_at desc);

alter table public.launch_events enable row level security;
-- No policies → only service role (via edge function) can read/write.
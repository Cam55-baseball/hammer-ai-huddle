create table public.user_build_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  build_id text not null,
  build_type text not null check (build_type in ('program','bundle','consultation')),
  granted_at timestamptz not null default now(),
  unique (user_id, build_id)
);

create index idx_user_build_access_user on public.user_build_access(user_id);
create index idx_user_build_access_build on public.user_build_access(build_id);

alter table public.user_build_access enable row level security;

create policy "Users read own access"
on public.user_build_access for select to authenticated
using (user_id = auth.uid());

create policy "Owners read all access"
on public.user_build_access for select to authenticated
using (public.has_role(auth.uid(), 'owner'));
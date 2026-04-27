create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text unique not null,
  build_id text not null,
  build_type text not null check (build_type in ('program','bundle','consultation')),
  build_name text,
  buyer_email text not null,
  buyer_user_id uuid references auth.users(id) on delete set null,
  amount_cents integer,
  currency text default 'usd',
  created_at timestamptz not null default now()
);

alter table public.purchases enable row level security;

create policy "Buyers read own purchases"
on public.purchases for select to authenticated
using (
  buyer_user_id = auth.uid()
  or buyer_email = (auth.jwt() ->> 'email')
);

create policy "Owners read all purchases"
on public.purchases for select to authenticated
using (public.has_role(auth.uid(), 'owner'));

create index purchases_buyer_user_id_idx on public.purchases(buyer_user_id);
create index purchases_buyer_email_idx on public.purchases(buyer_email);
create index purchases_build_id_idx on public.purchases(build_id);
-- ============ bundles ============
create table public.bundles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  slug text not null unique,
  name text not null,
  description text,
  cover_url text,
  price_cents integer not null default 4900 check (price_cents >= 50),
  video_ids uuid[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_bundles_owner on public.bundles(owner_id);
create index idx_bundles_status on public.bundles(status);

grant select, insert, update, delete on public.bundles to authenticated;
grant select on public.bundles to anon;
grant all on public.bundles to service_role;

alter table public.bundles enable row level security;

create policy "Owners manage bundles"
on public.bundles for all to authenticated
using (public.has_role(auth.uid(), 'owner'))
with check (public.has_role(auth.uid(), 'owner'));

create policy "Anyone reads published bundles"
on public.bundles for select to anon, authenticated
using (status = 'published');

create trigger trg_bundles_updated_at
before update on public.bundles
for each row execute function public.update_updated_at_column();

-- ============ discount codes ============
create table public.bundle_discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  kind text not null check (kind in ('percent','amount')),
  value integer not null check (value > 0),
  bundle_id uuid references public.bundles(id) on delete cascade,
  expires_at timestamptz,
  max_redemptions integer,
  redeemed_count integer not null default 0,
  active boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.bundle_discount_codes to authenticated;
grant all on public.bundle_discount_codes to service_role;

alter table public.bundle_discount_codes enable row level security;

create policy "Owners manage discount codes"
on public.bundle_discount_codes for all to authenticated
using (public.has_role(auth.uid(), 'owner'))
with check (public.has_role(auth.uid(), 'owner'));

-- ============ grants audit ============
create table public.bundle_grants_audit (
  id uuid primary key default gen_random_uuid(),
  build_id text not null,
  target_user_id uuid,
  target_email text,
  action text not null check (action in ('grant','revoke')),
  actor_id uuid,
  reason text,
  created_at timestamptz not null default now()
);

grant select on public.bundle_grants_audit to authenticated;
grant all on public.bundle_grants_audit to service_role;

alter table public.bundle_grants_audit enable row level security;

create policy "Owners read grant audit"
on public.bundle_grants_audit for select to authenticated
using (public.has_role(auth.uid(), 'owner'));

-- ============ page views ============
create table public.bundle_page_views (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references public.bundles(id) on delete cascade,
  referrer text,
  created_at timestamptz not null default now()
);

create index idx_bundle_page_views_bundle on public.bundle_page_views(bundle_id);

grant insert on public.bundle_page_views to anon, authenticated;
grant select on public.bundle_page_views to authenticated;
grant all on public.bundle_page_views to service_role;

alter table public.bundle_page_views enable row level security;

create policy "Anyone can record a view"
on public.bundle_page_views for insert to anon, authenticated
with check (true);

create policy "Owners read views"
on public.bundle_page_views for select to authenticated
using (public.has_role(auth.uid(), 'owner'));

-- ============ public bundle lookup (no playable urls) ============
create or replace function public.get_public_bundle(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  b public.bundles%rowtype;
  vids jsonb;
begin
  select * into b from public.bundles where slug = p_slug and status = 'published';
  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', v.id,
    'title', v.title,
    'description', v.description,
    'thumbnail_url', v.thumbnail_url
  ) order by array_position(b.video_ids, v.id)), '[]'::jsonb)
  into vids
  from public.library_videos v
  where v.id = any(b.video_ids);

  return jsonb_build_object(
    'id', b.id,
    'slug', b.slug,
    'name', b.name,
    'description', b.description,
    'cover_url', b.cover_url,
    'price_cents', b.price_cents,
    'videos', vids
  );
end;
$$;

grant execute on function public.get_public_bundle(text) to anon, authenticated;

-- ============ purchased bundle videos (access gated) ============
create or replace function public.get_bundle_videos(p_bundle_id uuid)
returns table (
  id uuid,
  title text,
  description text,
  video_url text,
  thumbnail_url text,
  sort_order integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  b public.bundles%rowtype;
begin
  select * into b from public.bundles where bundles.id = p_bundle_id;
  if not found then
    return;
  end if;

  if not (
    public.has_role(auth.uid(), 'owner')
    or exists (
      select 1 from public.user_build_access uba
      where uba.user_id = auth.uid() and uba.build_id = b.id::text
    )
  ) then
    return;
  end if;

  return query
  select v.id, v.title, v.description, v.video_url, v.thumbnail_url,
         array_position(b.video_ids, v.id)::integer
  from public.library_videos v
  where v.id = any(b.video_ids)
  order by array_position(b.video_ids, v.id);
end;
$$;

grant execute on function public.get_bundle_videos(uuid) to authenticated;

-- ============ discount preview ============
create or replace function public.check_bundle_discount(p_code text, p_bundle_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c public.bundle_discount_codes%rowtype;
  b public.bundles%rowtype;
  discount integer;
begin
  select * into b from public.bundles where id = p_bundle_id and status = 'published';
  if not found then
    return jsonb_build_object('valid', false, 'reason', 'Bundle unavailable');
  end if;

  select * into c from public.bundle_discount_codes
  where upper(code) = upper(trim(p_code)) and active = true;

  if not found then
    return jsonb_build_object('valid', false, 'reason', 'Code not found');
  end if;
  if c.bundle_id is not null and c.bundle_id <> p_bundle_id then
    return jsonb_build_object('valid', false, 'reason', 'Code does not apply to this bundle');
  end if;
  if c.expires_at is not null and c.expires_at < now() then
    return jsonb_build_object('valid', false, 'reason', 'Code expired');
  end if;
  if c.max_redemptions is not null and c.redeemed_count >= c.max_redemptions then
    return jsonb_build_object('valid', false, 'reason', 'Code fully redeemed');
  end if;

  if c.kind = 'percent' then
    discount := (b.price_cents * least(c.value, 100)) / 100;
  else
    discount := least(c.value, b.price_cents);
  end if;

  return jsonb_build_object(
    'valid', true,
    'code', upper(c.code),
    'kind', c.kind,
    'value', c.value,
    'discount_cents', discount,
    'final_cents', greatest(b.price_cents - discount, 0)
  );
end;
$$;

grant execute on function public.check_bundle_discount(text, uuid) to anon, authenticated;

-- ============ claim purchases made with this email ============
create or replace function public.claim_build_purchases()
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_count integer := 0;
begin
  if v_uid is null or v_email = '' then
    return 0;
  end if;

  update public.purchases
     set buyer_user_id = v_uid
   where buyer_user_id is null
     and lower(buyer_email) = v_email;

  insert into public.user_build_access (user_id, build_id, build_type)
  select v_uid, p.build_id, p.build_type
  from public.purchases p
  where lower(p.buyer_email) = v_email
  on conflict (user_id, build_id) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.claim_build_purchases() to authenticated;
create table if not exists public.facility_spaces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  space_type text not null default 'other'
    check (space_type in ('cage','mound','field','weight_room','track','classroom','other')),
  notes text check (notes is null or char_length(notes) <= 500),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists facility_spaces_org_idx on public.facility_spaces (organization_id);

grant select, insert, update, delete on public.facility_spaces to authenticated;
grant all on public.facility_spaces to service_role;

alter table public.facility_spaces enable row level security;

create policy "Org members read spaces"
  on public.facility_spaces for select to authenticated
  using (
    is_org_staff(auth.uid(), organization_id)
    or exists (
      select 1 from public.organization_members m
      where m.organization_id = facility_spaces.organization_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
    or user_has_role(auth.uid(), 'admin'::app_role)
    or user_has_role(auth.uid(), 'owner'::app_role)
  );

create policy "Org admins add spaces"
  on public.facility_spaces for insert to authenticated
  with check (
    is_org_admin(auth.uid(), organization_id)
    or user_has_role(auth.uid(), 'admin'::app_role)
    or user_has_role(auth.uid(), 'owner'::app_role)
  );

create policy "Org admins update spaces"
  on public.facility_spaces for update to authenticated
  using (
    is_org_admin(auth.uid(), organization_id)
    or user_has_role(auth.uid(), 'admin'::app_role)
    or user_has_role(auth.uid(), 'owner'::app_role)
  )
  with check (
    is_org_admin(auth.uid(), organization_id)
    or user_has_role(auth.uid(), 'admin'::app_role)
    or user_has_role(auth.uid(), 'owner'::app_role)
  );

create policy "Org admins delete spaces"
  on public.facility_spaces for delete to authenticated
  using (
    is_org_admin(auth.uid(), organization_id)
    or user_has_role(auth.uid(), 'admin'::app_role)
    or user_has_role(auth.uid(), 'owner'::app_role)
  );

create or replace function public.facility_spaces_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger facility_spaces_touch
  before update on public.facility_spaces
  for each row execute function public.facility_spaces_touch_updated_at();
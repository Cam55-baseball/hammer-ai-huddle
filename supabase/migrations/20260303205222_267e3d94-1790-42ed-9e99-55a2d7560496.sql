
create table public.coach_notifications (
  id uuid primary key default gen_random_uuid(),
  coach_user_id uuid references auth.users(id) on delete cascade not null,
  sender_user_id uuid references auth.users(id) on delete cascade not null,
  notification_type text not null default 'card_shared',
  title text not null,
  message text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.coach_notifications enable row level security;

create policy "Coaches can read own notifications"
  on public.coach_notifications for select to authenticated
  using (coach_user_id = auth.uid());

create policy "Coaches can update own notifications"
  on public.coach_notifications for update to authenticated
  using (coach_user_id = auth.uid());

create policy "Authenticated users can insert notifications"
  on public.coach_notifications for insert to authenticated
  with check (sender_user_id = auth.uid());

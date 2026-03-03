

# Add Notification Badge for Shared Cards on Coach Dashboard

## Problem
When a player sends a custom activity to a coach for editing, there's no persistent record or notification. The standalone flow just shows a toast on the player's side — nothing reaches the coach. The coach has no way to know a card was shared.

## Approach

### 1. Create a `coach_notifications` database table
A new table to store notifications for coaches, triggered when a player shares a card:

```sql
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

-- Coaches can read their own notifications
create policy "Coaches can read own notifications"
  on public.coach_notifications for select to authenticated
  using (coach_user_id = auth.uid());

-- Coaches can update (mark read) their own notifications
create policy "Coaches can update own notifications"
  on public.coach_notifications for update to authenticated
  using (coach_user_id = auth.uid());

-- Players can insert notifications for coaches
create policy "Authenticated users can insert notifications"
  on public.coach_notifications for insert to authenticated
  with check (sender_user_id = auth.uid());
```

### 2. Update `SendCardToCoachDialog.tsx`
When a player selects a coach (both standalone and folder-based), insert a row into `coach_notifications` with the item title and sender info.

### 3. Add notification badge to `CollaborativeWorkspace.tsx`
- Query `coach_notifications` for unread count where `notification_type = 'card_shared'`
- Display a badge with the unread count on the "Collaborative Workspace" card header
- Show recent notifications as a small list above the shared cards
- Add a "Mark all read" button

### 4. Add notification count to `CoachScoutGamePlanCard.tsx`
- Add a new `TaskRow` for "Shared Cards" showing unread notification count, with accent styling when > 0
- Links to `/coach-dashboard` (where the Collaborative Workspace lives)

| File | Change |
|------|--------|
| Database migration | Create `coach_notifications` table with RLS |
| `src/components/custom-activities/SendCardToCoachDialog.tsx` | Insert notification row on share |
| `src/components/coach/CollaborativeWorkspace.tsx` | Show unread badge + notification list |
| `src/components/CoachScoutGamePlanCard.tsx` | Add "Shared Cards" TaskRow with unread count |


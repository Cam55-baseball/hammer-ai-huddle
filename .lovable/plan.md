## Problem

Game Plan sort mode (`auto` / `manual` / `timeline`) and the user-defined order of activities are currently stored **only in `localStorage`**:

- `gameplan-sort-mode` → which mode the user picked
- `gameplan-timeline-order` → timeline mode order (single global list)
- `gameplan-checkin-order` / `gameplan-training-order` / `gameplan-tracking-order` / `gameplan-custom-order` → manual mode per-section order

Because nothing is written to the database, the user's choices are lost when they:

- Sign in on another device
- Clear browser data / use private mode
- Switch browsers
- Reinstall the PWA
- Have multiple tabs open (no cross-tab sync)

The order also silently drifts because completion handlers in `auto` mode reshuffle, but neither timeline nor manual orders are mirrored to the server, so if the device-local copy disappears the app falls back to its computed default.

## Goal

Sort mode and order are 100% persistent end-to-end:

| What | Where it lives now | Where it must live |
|---|---|---|
| Sort mode (`auto` / `manual` / `timeline`) | localStorage only | DB (per user), with localStorage as cache |
| Timeline global order | localStorage (+ `calendar_day_orders` only when "locked" for a date) | DB (per user, default daily order), with localStorage as cache |
| Manual per-section order (checkin / training / tracking / custom) | localStorage only | DB (per user, per section), with localStorage as cache |

Order and mode must only change when **the user changes them** — never spontaneously after a refresh, login, or completion event in manual/timeline mode.

## Fix

### 1. New table: `game_plan_user_preferences`

One row per user. Holds the chosen sort mode plus the default (non-date-locked) order for each mode.

```text
game_plan_user_preferences
  user_id              uuid  PK, FK -> auth.users
  sort_mode            text  CHECK in ('auto','manual','timeline')  default 'auto'
  timeline_order       text[]  default '{}'   -- ordered task ids
  manual_order_checkin text[]  default '{}'
  manual_order_training text[] default '{}'
  manual_order_tracking text[] default '{}'
  manual_order_custom  text[]  default '{}'
  updated_at           timestamptz default now()
```

- RLS: owner-only select / insert / update (mirrors `calendar_day_orders` policies).
- Add to `supabase_realtime` publication so other tabs/devices see the update.
- `updated_at` trigger using existing `update_updated_at_column()`.

No CHECK on the array contents — task ids include unstable values like `template-<uuid>`, so we just store strings. Validation is done client-side when sorting.

### 2. New hook: `useGamePlanPreferences`

`src/hooks/useGamePlanPreferences.ts` — single source of truth, server-backed:

- On mount: read row for `auth.uid()` (upsert empty row if missing). Hydrate from DB; localStorage is used only as a **first-paint cache** to avoid flicker.
- Exposes:
  - `sortMode`, `setSortMode(mode)`
  - `timelineOrder`, `setTimelineOrder(ids)`
  - `manualOrder(section)`, `setManualOrder(section, ids)`
- Each setter:
  1. Updates local state immediately (optimistic).
  2. Writes the new value to localStorage (cache).
  3. Upserts the row in `game_plan_user_preferences` (debounced ~400 ms to coalesce drag events).
  4. Broadcasts via `BroadcastChannel('data-sync')` with `TAB_ID` (per the multi-tab sync rule in core memory).
- Subscribes to `postgres_changes` on `game_plan_user_preferences` filtered by `user_id` so other tabs/devices repaint without manual refresh.
- Falls back gracefully if offline: keeps optimistic value, retries on reconnect (uses the existing pattern from `useCustomActivities` for queued writes).

### 3. Refactor `GamePlanCard.tsx`

Replace localStorage reads/writes with the hook:

- Remove the `useState` initializers that read `localStorage.getItem('gameplan-sort-mode')` and the order keys; instead pull from `useGamePlanPreferences`.
- `handleReorderCheckin / Training / Tracking / Custom` → call `setManualOrder(section, ids)` instead of `localStorage.setItem`.
- `handleReorderTimeline` and `handleApplyTemplate` → call `setTimelineOrder(ids)` instead of `localStorage.setItem('gameplan-timeline-order', ...)`.
- Sort-mode toggle (line 673-674) → call `setSortMode(mode)`.
- The order-restoration `useEffect` (lines 405-518) keeps using `restoreOrder`, but reads the order from the hook (DB) instead of localStorage. localStorage is read only as the synchronous first-paint cache before the DB query resolves.
- Date-locked timeline (`calendar_day_orders`) keeps priority over the default `timeline_order` — that behavior is unchanged.

### 4. Stop auto-mutating order on completion in non-Auto modes

Confirm (already true after the previous fix) that `handleCustomActivityToggle` and `handleNNGateSatisfied` do **not** call any setter that writes order when `sortMode !== 'auto'`. They flip `completed` in place only. No DB write to `timeline_order` happens on completion.

### 5. One-time migration of existing localStorage values

In `useGamePlanPreferences`, on first successful DB read where the row is empty AND localStorage has values, migrate them once:

- Read all six localStorage keys.
- Upsert into the new row.
- Tag completion in localStorage (`gameplan-prefs-migrated = '1'`) so we don't repeat.

This preserves the order existing users already curated.

### 6. Multi-tab consistency

Per the core memory rule, every setter broadcasts on `BroadcastChannel('data-sync')`:

```text
{ type: 'gameplan-prefs', tabId: TAB_ID, payload: { sortMode, timelineOrder, manualOrder* } }
```

Listeners ignore messages from their own `TAB_ID` and apply the payload to local state. This pairs with the realtime subscription to cover both same-device tabs and cross-device updates.

## Files touched

- **New**: `supabase/migrations/<timestamp>_game_plan_user_preferences.sql` (table + RLS + realtime + trigger)
- **New**: `src/hooks/useGamePlanPreferences.ts`
- **Edited**: `src/components/GamePlanCard.tsx` — replace 12 localStorage call sites with hook calls; thread `sortMode` through props instead of local state.

## Behavior summary

| Action | Result |
|---|---|
| User picks `Manual` on phone | Row upsert; next login on laptop opens in `Manual` |
| User drags activities in `Timeline` mode | DB write within 400 ms; other tabs/devices repaint via realtime |
| User completes a custom activity in `Manual` or `Timeline` | Strike-through only; **no** order write |
| User completes one in `Auto` | Section re-sorts to bottom (existing behavior, not persisted because Auto is computed) |
| User clears browser data | Order/mode hydrate from DB on next load — nothing lost |
| Two tabs open | Reorder in tab A is visible in tab B within ~1 s via BroadcastChannel + realtime |

## Out of scope

- Changing how `calendar_day_orders` (date-locked timeline) works — that already persists per date and stays the source of truth when a date is locked.
- Server-side persistence of `taskTimes` / `taskReminders` — those already round-trip via `game_plan_task_schedule` and `game_plan_locked_days`.

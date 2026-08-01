## Goal
The daily plan is already a pure database read. The one AI call that fires on every dashboard open/refresh is **Coach Hammer · Next Best Step**. Make it persist so the model runs at most a few times per user per day.

## Changes

### 1. Persist the generated step (backend)
- New table `coach_hammer_steps`: `user_id`, `plan_date`, `snapshot_hash`, `step` (jsonb), `created_at`; unique on `(user_id, plan_date, snapshot_hash)`. RLS: user reads own rows; service role full access; plus the required GRANTs.
- In `supabase/functions/coach-hammer-next-step/index.ts`:
  - Hash the incoming snapshot (stable JSON → SHA-256), rounded so trivial field jitter doesn't bust the cache.
  - Look up an existing row for today + hash. If found, return it immediately with `cached: true` and **no model call**.
  - Otherwise call the model as today, then insert the row before returning.
  - Optional safety valve: cap at N model generations per user per day; beyond that, return the most recent stored step.

### 2. Client stops re-requesting (frontend)
- `src/hooks/useCoachHammerNextStep.ts`: drop the 30-minute bucket from the query key (it forces a new request twice an hour) and key on `user + planDate + snapshotHash`; raise `gcTime`/`staleTime` so an in-session refresh reuses the row.
- `src/components/dashboard/CommunicationAI.tsx`: only enable the hook once the collapsible has been opened (or the card is visible), so a user who never expands the card triggers zero AI usage.

### 3. Verify
- Load `/dashboard`, hard-refresh several times, then check the AI Gateway / provider request log: one generation for the first load, cache hits after.

## Technical notes
- No change to `useWkDailyPrescriptions` or `wk-generate-daily` — the plan path is already cache-correct and AI-free.
- `get-daily-tip` / `get-daily-lesson` stay as-is; they already serve from the DB pool and only generate on exhaustion.

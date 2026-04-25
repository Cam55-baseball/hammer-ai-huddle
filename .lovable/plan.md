
# Phase 10 — Rest Day System + Identity Amplification

**Additive only.** All Phase 9 invariants remain enforced: `custom_activity_logs` = source of truth, system user excluded, Hammer v3 engine version, realtime triggers, single behavioral toast.

**Locked decisions:**
- Rest Day UI: **both** banner button + Game Plan card
- Skip behavior: **never auto-convert** — Skip and Rest are separate intents
- DDA: **conservative** — slipping users get 1 NN waived/day

---

## PART 1 — Rest Day System

### 1.1 Database (migration)

**`user_rest_day_rules`** — one row per user
- `user_id uuid PK references auth.users`
- `recurring_days int[] default '{}'` (0=Sun … 6=Sat)
- `max_rest_days_per_week int default 2 check (between 0 and 7)`
- `created_at`, `updated_at` timestamps + `update_updated_at_column` trigger
- RLS: owner select/insert/update

**`user_rest_day_overrides`** — explicit per-date marks
- `id uuid PK`
- `user_id uuid not null`
- `date date not null`
- `type text not null check in ('manual_rest','auto_recurring')`
- `created_at`
- `unique (user_id, date)`
- RLS: owner all
- CHECK: `user_id <> '00000000-0000-0000-0000-000000000001'` (system user guard)

### 1.2 `evaluate-behavioral-state` patch

Insert rest-day classification **before** the 30-day scoring loop:

```
restRulesByUser  = fetch user_rest_day_rules for current user(s)
overridesByDay   = Set(date) from user_rest_day_overrides last 30d
```

For each day in 30-day window, classification precedence:
1. `injury_mode` → `injury_hold`
2. `overridesByDay.has(d)` OR `recurring_days.includes(weekday(d))` → `rest_day` (subject to weekly cap)
3. `completedByDay.has(d)` → `logged`
4. else → `missed`

**Weekly cap enforcement:** walk days oldest→newest within each ISO week; once `rest_used_this_week > max_rest_days_per_week`, demote further rest days to `missed` (or `logged` if also completed).

**Streak rules:**
- `performance_streak` & `discipline_streak`: rest day = neutral (skip iteration without break, do not increment)
- Injury same as today

**NN enforcement:** rest days excluded from NN evaluation and `nn_miss_count_7d`.

**Snapshot additions** (`user_consistency_snapshots`):
- `rest_days_30d int`
- `rest_days_7d int`
- `recovery_mode_today boolean`
- `inputs.source = "custom_activity_logs_v3_rest"`

Denominator for score: `max(1, 30 - injury_hold - rest_days_30d)`.

### 1.3 Hammer v3 — `restFactor`

Add to `compute-hammer-state`:

```
restFactor = rest_days_7d <= max_rest_days_per_week
  ? +5
  : -min((rest_days_7d - max) * 5, 15)
```

Final formula:
```
final = clamp(
  (activityScore*0.55 + consistencyScore*0.25 + neuroBlend*0.20)
  * damping_multiplier
  - min(nn_miss_count_7d * 8, 30)
  + min(performance_streak * 1.5, 15)
  + restFactor
, 0, 100)
```

### 1.4 Behavioral event: `rest_overuse`
- Emitted when `rest_days_7d > max_rest_days_per_week`
- Magnitude = excess count
- Priority order updated: `nn_miss > rest_overuse > consistency_drop > identity_tier_change > consistency_recover`
- Command tone: "Rest limit exceeded — standard slipping."
- Action: `tighten_week` (no-op acknowledge)

### 1.5 UI components

**`RestDayButton.tsx`** (compact, in `IdentityBanner`)
- One-tap "Rest Day" toggle for today
- Optimistic upsert into `user_rest_day_overrides` (type=`manual_rest`)
- Triggers fire-and-forget recompute (8s throttle, reuses Phase 9 trigger hook)

**`RestDayControl.tsx`** (Game Plan header card)
- Weekly recurring picker (reuse `RecurringDayPicker` styling)
- Max rest/week selector (1–3, default 2)
- "Today is a rest day" switch
- Writes to `user_rest_day_rules` + `user_rest_day_overrides`

**Game Plan rest-day visual state**
- When today is rest: banner "RECOVERY MODE — Recovery supports performance. Resume tomorrow."
- Activity tasks rendered muted (opacity-60), no NN pressure styling, no failure copy
- Existing skip/log buttons remain functional (separate intent)

**`useRestDayState.ts`** hook
- Fetches rules + overrides for last 14d
- `isTodayRestDay`, `restUsedThisWeek`, `restRemaining`, `setTodayAsRest()`, `clearTodayRest()`
- Realtime subscription on both tables
- Invalidates `behavioral-events`, `identity-state`, `hammer-state` on change

### 1.6 Skip / Push integration
- Skip stays independent — no auto-convert prompt
- If user skips on a rest day → no penalty (already classified as rest)
- Push logic: push from rest day allowed without penalty (no streak break since rest is neutral)

---

## PART 2 — Identity Amplification Layer

### 2.1 Behavioral events: `command_text` + `action_type`

Migration: add to `behavioral_events`:
- `command_text text` (direct-tone copy)
- `action_type text` (`complete_nn` | `save_streak` | `log_session` | `two_min_reset` | `tighten_week` | `acknowledge`)
- `action_payload jsonb` (e.g. `{template_id}`)

Backfill in `evaluate-behavioral-state` event emission:
- `nn_miss` → "Standard broken. Fix it now." → `complete_nn` with smallest NN template_id
- `consistency_drop` → "You are slipping. Act immediately." → `log_session`
- `identity_tier_change` (down) → "You dropped to {TIER}. Reclaim it." → `complete_nn`
- `identity_tier_change` (up) → "{TIER} unlocked." → `acknowledge`
- `consistency_recover` → "Back on standard. Hold it." → `acknowledge`
- `rest_overuse` → "Rest limit exceeded — standard slipping." → `tighten_week`
- `streak_risk` (new, see 2.3) → "You are about to break your streak." → `save_streak`

### 2.2 `BehavioralPressureToast` upgrade
- Replace dismiss-only UX with **action button** rendered from `action_type`
- Button click → invokes `QuickActionExecutor` → on success acknowledges event
- Maintain "one toast at a time" priority queue from Phase 9

### 2.3 Streak protection

New edge function: **`detect-streak-risk`**
- Runs as part of post-completion realtime trigger AND nightly
- For each user with `performance_streak >= 3`:
  - If today not yet logged AND local time > 18:00 (use user TZ if available, else UTC) AND no rest day declared → emit `streak_risk` event (deduped per day)

New edge function: **`save-streak`**
- POST `{user_id}` (RLS: must match auth)
- Finds smallest NN template (lowest estimated duration) for user
- Inserts `custom_activity_logs` row: today, `completion_state='completed'`, `completion_method='quick_save'`
- Triggers recompute

### 2.4 `QuickActionExecutor.ts` (client)
```
executeAction(event): Promise<{ scoreDelta, newTier, message }>
```
- `complete_nn` → insert custom_activity_logs (template_id from payload), wait for snapshot refresh, compute delta
- `save_streak` → invoke `save-streak` edge fn
- `log_session` → navigate to log dialog with prefilled "quick session"
- `two_min_reset` → insert pre-seeded "2-Min Reset" template log
- `tighten_week` / `acknowledge` → just acknowledge
- All paths invalidate identity + hammer queries; target <500ms perceived latency

### 2.5 Identity feedback

After any QuickAction success:
- Toast: `"That's {tier} behavior. {±delta} consistency."`
- Reuse existing sonner toaster, 3s duration
- If `performance_streak` incremented → append `"Streak: {n}d"`

### 2.6 DDA — conservative

In `evaluate-behavioral-state`, for users with previous tier `slipping`:
- If `nnIds.length >= 2`, waive **lowest-priority NN** (smallest `estimated_duration_min`) for that day's `performance_streak` calculation only
- Snapshot: `inputs.dda_relief = true`
- Does NOT affect `nn_miss_count_7d` accounting (still tracked truthfully)

### 2.7 `PerformanceTimeline.tsx`
- New component on Identity page
- Reads last 14d of `behavioral_events` + `user_consistency_snapshots`
- Renders cause→effect rows: `"Missed NN → Score -12 → Dropped to BUILDING"`
- Read-only; pure projection of existing data

### 2.8 Identity gamification (status-based, no points)
- Add `days_in_tier` derived field in `useIdentityState` (count consecutive snapshots with same tier)
- `IdentityBanner`: framer-motion entry animation when tier changes (scale + glow)
- "Tier loss" friction: 800ms delay + red ring pulse on downgrade before settling
- "Days in tier" chip displayed under tier label

### 2.9 `DailyStandardCheck.tsx`
- Once-per-day prompt (modal, dismissable) on home: *"I am operating at {TIER} standard today."*
- Confirm → writes to `daily_standard_checks` table (new: `user_id, date, confirmed_at, tier_at_confirm`); unique `(user_id, date)`
- Skip 3+ days → emit behavioral event `standard_check_missed` (low priority)

### 2.10 Coaching layer (rule-based, in evaluator)
- If `discipline_streak >= 5` AND `performance_streak == 0` → emit `coaching_insight` event: "You're active, not executing. Lock the standard."
- If `nn_miss_count_7d >= 5` AND `nnIds.length >= 4` → "Reduce NN count to stabilize."
- Both low priority, dismiss-only

### 2.11 Tone lock
- Pass on all toast/event copy: identity-based, direct, non-optional
- Replace any remaining "You logged a session" → "Standard met."
- Memory rule already exists (`style/coaching-language-standard`); reassert in PR

---

## Execution order

1. **DB migration** — 4 new tables (`user_rest_day_rules`, `user_rest_day_overrides`, `daily_standard_checks`) + columns on `behavioral_events` + columns on `user_consistency_snapshots`
2. **Patch `evaluate-behavioral-state`** — rest-day classification, weekly cap, DDA, command_text/action_type emission, coaching insights
3. **Patch `compute-hammer-state`** — restFactor in formula
4. **Deploy `detect-streak-risk` + `save-streak`** edge functions
5. **Hooks**: `useRestDayState`, extend `useIdentityState` with `days_in_tier`
6. **Components**: `RestDayButton`, `RestDayControl`, `QuickActionExecutor`, upgraded `BehavioralPressureToast`, `PerformanceTimeline`, `DailyStandardCheck`
7. **Wire**: `IdentityBanner` (RestDayButton + animations), `GamePlan` (RestDayControl card + recovery mode visual state)
8. **Smoke test**: set rest day → verify score unchanged, streak preserved, restFactor=+5; exceed cap → `rest_overuse` event fires; skip-day on rest day → no penalty
9. **Memory update** — append Phase 10 invariants to `mem://features/behavioral-engine/phase-9-architecture` (rename mentally to engine canonical), add Core line about rest-day neutrality
10. **Final audit** — re-run owner snapshot, confirm DB ↔ UI parity, p95 < 2s

---

## Non-negotiables (Phase 10 invariants)
1. Rest days within weekly cap NEVER count as missed and NEVER break streaks
2. Rest days do NOT increment streaks either (neutral)
3. Excess rest days (> cap) demote to `missed` AND emit `rest_overuse`
4. Skip and Rest are independent intents — no auto-conversion
5. Every behavioral event ships with `command_text` + actionable `action_type`
6. QuickAction perceived latency < 500ms; full system response < 2s
7. DDA relief is conservative: max 1 NN waived/day, slipping tier only
8. All Phase 9 invariants remain enforced (system user excluded, custom_activity_logs source of truth, engine_version v3)

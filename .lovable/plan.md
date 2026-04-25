# Phase 10 Refinement — Unified Day Control + NN Clarity

This is a **refinement layer** on top of existing Phase 9/10 systems. No rebuilds. We unify Rest/Skip/Push into one daily classification source, replace fragmented controls with a single `DayControlCard`, and make Non-Negotiables visually unmistakable.

---

## Current State (verified)

- **Rest Day**: `user_rest_day_overrides` (per-date) + `user_rest_day_rules` (recurring) — fully wired into evaluator + Hammer v3.
- **Skip Day**: `calendar_skipped_items.skip_days[]` is **recurring weekday skips** for individual items — NOT a daily classification. There is no "skip today as a day-type" concept yet.
- **Push Day**: `GamePlanPushDayDialog` only **reschedules** (shifts dates forward). Not a day classification, no engine signal.
- **NN**: `custom_activity_templates.is_non_negotiable` exists and is read by evaluator + `save-streak`, but Game Plan UI does not visually label, group, or progress-track them.

---

## Part 1 — Unified Day Classification Source

**New table** `user_day_state_overrides` becomes the single source for daily intent:

```
id uuid pk
user_id uuid (indexed)
date date
type text check in ('rest','skip','push')
created_at timestamptz
UNIQUE(user_id, date)
```

**Migration tasks:**
1. Create `user_day_state_overrides`.
2. Backfill existing `user_rest_day_overrides` rows → `(type='rest')`.
3. Keep `user_rest_day_overrides` table for now (read-compat) but **route all new writes** through the unified table. Add a thin compat view or update `useRestDay` to read from unified table.
4. Recurring rest config (`user_rest_day_rules`) stays as-is — recurring days still resolve to `type='rest'` at classification time.

Mutual exclusion is enforced by the UNIQUE constraint: only one `type` per (user_id, date).

---

## Part 2 — Evaluator Day Classification (`evaluate-behavioral-state`)

Add unified day classifier. **Precedence:**

```
injury_mode > skip > rest > push > standard
```

Per-day handling:
- **rest**: neutral — excluded from `logged_days`, `missed_days`, NN; doesn't break or extend streaks; counts toward weekly cap (excess rest demoted to `missed`, unchanged from current logic).
- **skip**: **hard miss** — counts as `missed_days`, breaks both `performance_streak` and `discipline_streak`, NN auto-missed → `nn_miss_count` increments, no `restFactor` benefit.
- **push**: classified as `standard` for scoring base, but:
  - if all NN completed → emit `push_complete` event (low-priority boost, +2 to streakBoost cap).
  - if any NN missed → emit `push_fail` event (high priority, command_text + action).
- **standard**: existing logic.

**Snapshot fields added** to `user_consistency_snapshots`:
- `day_type_today text` — `'injury'|'rest'|'skip'|'push'|'standard'`
- `push_days_7d int`
- `skip_days_7d int`

---

## Part 3 — Hammer Engine (`compute-hammer-state`)

- `restFactor` unchanged (rest within cap → +5; excess → penalty).
- Skip days flow through normal `nnPenalty` + missed-streak path (no special factor).
- Push: if `push_complete` event in last 24h, add `+2` to `streakBoost` (capped at existing 15).

No formula rewrite — additive only.

---

## Part 4 — Behavioral Events Extension

Add to `behavioral_events.event_type` enum (or text values):
- `push_fail` — `command_text: "You called a push and didn't meet it."`, `action_type: 'complete_nn'`
- `push_complete` — `command_text: "Push executed. That's locked in."`, `action_type: 'acknowledge'`
- `skip_day_used` — `command_text: "You skipped the day. No standard applied."`, `action_type: 'acknowledge'`

**Updated priority** (used by `useBehavioralEvents.PRIORITY`):
```
nn_miss(6) > push_fail(5) > rest_overuse(4) > streak_risk(4)
> consistency_drop(3) > coaching_insight(2)
> identity_tier_change(2) > push_complete(1) > consistency_recover(1)
```

---

## Part 5 — Unified `DayControlCard.tsx`

**New component** at `src/components/game-plan/DayControlCard.tsx` — replaces both:
- `RestDayControl` mount in `Dashboard.tsx` (line 596)
- `RestDayButton` in `IdentityBanner` (keep button as compact entry point but route through unified hook)

**Structure:**
1. **Status header** — single line, color + tone:
   - Standard → default theme, "STANDARD DAY"
   - Rest → cool blue, "REST DAY — RECOVERY MODE"
   - Skip → neutral gray, "SKIP DAY — NO LOGGED OUTPUT"
   - Push → amber/red, "PUSH DAY — EXTRA LOAD"
2. **Action button row** — three mutually exclusive toggle buttons: `[Rest] [Skip] [Push]`. Tapping the active one clears it (back to Standard). Tapping a different one swaps (DELETE + INSERT in one call via upsert on UNIQUE).
3. **Quick explanation text** — dynamic, exact copy from spec.
4. **Recurring rest sub-section** (collapsed by default) — preserves existing recurring-day picker + weekly cap from `RestDayControl`.

**New hook** `useDayState.ts`:
- Reads + writes `user_day_state_overrides` for today.
- Resolves effective state: explicit override > recurring rest rule > standard.
- `setDayType(type | null)` → upsert/delete + invoke `evaluate-behavioral-state` + `compute-hammer-state` (fire-and-forget, 8s throttle reused).
- Replaces `useRestDay` consumers — `useRestDay` becomes a thin wrapper for backward compatibility during transition.

---

## Part 6 — NN Visual Clarity in Game Plan (`GamePlanCard.tsx`)

1. **NN badge** on every NN activity row:
   - Bold red label "NON-NEGOTIABLE" + `Flame` icon (lucide-react).
   - Distinct border-l-2 border-red-500 on the row.
2. **Section grouping** — split rendered activities into:
   - `NON-NEGOTIABLES (REQUIRED)` section first
   - `OPTIONAL WORK` section below
3. **Progress strip** at top of Game Plan: `"X / Y Non-Negotiables completed"`. If `X === 0` and Y > 0 and not rest day → subtle warning glow on NN section header.
4. **Failure language** — replace "You haven't completed this" → "Standard not met" (search occurrences in GamePlanCard).

---

## Part 7 — Game Plan UI Reactivity to Day State

`GamePlanCard` reads `useDayState`:
- **Rest**: activities at `opacity-60`, banner "RECOVERY MODE — Resume tomorrow", NN badges hidden.
- **Skip**: activities `grayscale opacity-50 pointer-events-none`, banner "DAY SKIPPED — No progress recorded".
- **Push**: NN section gets `ring-2 ring-amber-500/40` glow, banner "PUSH DAY — Higher output expected".
- **Standard**: default rendering.

Skip/Push do NOT modify the existing per-item recurring `calendar_skipped_items` system — that remains independent (it's about hiding individual recurring items from the calendar, not classifying a day).

---

## Part 8 — Existing Push Dialog

`GamePlanPushDayDialog` (rescheduling) is preserved as **secondary action** — accessible via "Reschedule…" link in the DayControlCard for users who want to actually shift dates rather than just declare a push intent. The new `[Push]` button on the card only sets day-type classification.

---

## Part 9 — Realtime + Throttle

Reuse existing 8s throttle pattern. On any `setDayType` call:
- Optimistic UI update (<50ms).
- DB upsert.
- `supabase.functions.invoke('evaluate-behavioral-state', ...)` + `compute-hammer-state` (fire-and-forget).
- Realtime channel on `user_day_state_overrides` invalidates queries cross-tab.

---

## Files to create
- `supabase/migrations/<ts>_unified_day_state.sql` — new table + backfill from rest overrides + add snapshot columns + extend event types.
- `src/hooks/useDayState.ts`
- `src/components/game-plan/DayControlCard.tsx`
- `src/components/game-plan/NonNegotiableBadge.tsx`
- `src/components/game-plan/NNProgressStrip.tsx`

## Files to edit
- `supabase/functions/evaluate-behavioral-state/index.ts` — unified classifier, push events, skip handling, snapshot fields.
- `supabase/functions/compute-hammer-state/index.ts` — push_complete streak bonus.
- `src/hooks/useRestDay.ts` — read from unified table; keep API for backcompat.
- `src/hooks/useBehavioralEvents.ts` — updated PRIORITY map + new event types.
- `src/components/identity/RestDayButton.tsx` — route through `useDayState`.
- `src/pages/Dashboard.tsx` — swap `RestDayControl` → `DayControlCard`.
- `src/components/GamePlanCard.tsx` — NN badges, section split, progress strip, day-state visual states, language fixes.
- `src/integrations/supabase/types.ts` — auto-regenerated.

## Invariants preserved
- `custom_activity_logs` remains source of truth for activity completion.
- System user `00000000-...-0001` excluded from all pipelines.
- Phase 9 NN/streak/Hammer v3 contracts intact — additive only.
- Skip and Rest remain user-explicit (no auto-conversion).
- Rest within cap never penalizes; Skip always counts as miss.

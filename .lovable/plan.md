## Phase 10.3 — Nightly Check-In Upgrade (Authoritative Daily Outcome Layer)

We already have a fully-built nightly check-in flow (`VaultFocusQuizDialog` with `quizType='night'`) and a success screen (`NightCheckInSuccess.tsx`) powered by `useNightCheckInStats`. We will **upgrade it in-place** to be the single source of truth for daily outcome — no new card on the dashboard, no parallel summary system.

---

### Part 1 — New derived hook: `src/hooks/useDailyOutcome.ts`

Pure read/derive layer. No DB writes, no new tables.

**Returns:**
```ts
{
  status: 'STANDARD MET' | 'STANDARD NOT MET' | 'RECOVERY DAY' | 'SKIP REGISTERED',
  standardMet: boolean,
  nnCompleted: number,
  nnTotal: number,
  dayType: 'standard' | 'rest' | 'skip' | 'push',
  streakImpact: 'up' | 'held' | 'broken',
  summary: string,
  loading: boolean,
}
```

**Sources (in priority):**
1. `useDayState()` → `dayType`
2. NN counts via existing logic from `NonNegotiableProgressStrip` — extract the NN counting query into a small shared helper (`src/lib/nnProgress.ts`) so both the strip and the hook consume the same numbers (no duplication, no drift).
3. `useIdentityState()` → today's snapshot:
   - `streakImpact = 'up'` if `performance_streak` increased vs. previous snapshot (compare `snapshot_date`)
   - `'held'` if same
   - `'broken'` if `performance_streak === 0` and prior > 0, OR `nn_miss_count_7d` jumped today
4. Any-activity-logged fallback: `custom_activity_logs` count for today (only used when `nnTotal === 0`).

**Outcome logic (deterministic, exactly per spec):**
- `dayType === 'rest'` → `RECOVERY DAY`, `standardMet = true`
- `dayType === 'skip'` → `SKIP REGISTERED`, `standardMet = false`
- `nnTotal > 0` → `STANDARD MET` if `nnCompleted === nnTotal`, else `STANDARD NOT MET`
- Else (no NNs defined) → fallback to `anyActivityLogged ? MET : NOT MET`

**Summary line (1:1, no randomness):**
- MET → "You protected your standard."
- NOT MET → "You missed required work."
- RECOVERY → "Recovery applied correctly."
- SKIP → "You skipped the day. No standard applied."

Realtime: subscribe to `custom_activity_logs`, `custom_activity_templates`, `user_day_state_overrides`, `user_consistency_snapshots` (filtered by `user_id`) and invalidate the query — keeps outcome reactive in <1s.

---

### Part 2 — Upgrade `NightCheckInSuccess.tsx` (in-place)

Insert a new **"Daily Outcome"** section as the **first block above the Hero**, sourced entirely from `useDailyOutcome`:

- **Status header** (large, bold) — color-coded:
  - MET → emerald, `CheckCircle2` icon
  - NOT MET → red, `AlertTriangle` icon
  - RECOVERY → blue/sky, `Moon` icon
  - SKIP → muted gray, `SkipForward` icon
- **Row: Non-Negotiables** → `nnCompleted / nnTotal` (hidden if `nnTotal === 0`)
- **Row: Day Type** → `Push / Rest / Skip / Standard` (mapped label)
- **Row: Streak Impact** → `Extended` (up) / `Held` (held) / `Broken` (broken) with arrow icon
- **System Summary** → the deterministic 1-line string

Keep the existing Today's Highlights / Tomorrow Preview / Morning Bonus / Sleep Countdown sections untouched — they are complementary context, not the verdict.

No new file. No second card.

---

### Part 3 — Optional inline banner on Progress Dashboard

In `src/pages/ProgressDashboard.tsx`, add a **single thin inline banner** (NOT a card) at the very top, reading from `useDailyOutcome`:

```
Today: STANDARD MET     (emerald bg-emerald-500/10 border-l-4 border-emerald-500)
Today: STANDARD NOT MET (red, border-l-4 border-red-500)
Today: RECOVERY DAY     (sky)
Today: SKIP REGISTERED  (muted)
```

One line, no actions, no extra metrics — purely passive visibility. This satisfies "Part 7 — Passive Visibility" without duplicating the verdict.

---

### Part 4 — Language standardization sweep

In the upgraded `NightCheckInSuccess` outcome section and the Progress Dashboard banner only, use exactly:
- "Standard met" / "Standard not met" / "Recovery day" / "Skip registered"

We will **not** rewrite unrelated copy elsewhere in this pass (out of scope; the phrasing across the app is being standardized in earlier phases already).

---

### Part 5 — Invariants (enforced)

- ❌ No new tables, no migrations
- ❌ No edge function changes (`evaluate-behavioral-state` / `compute-hammer-state` untouched)
- ❌ No new "Daily Summary" / "Outcome Card" components elsewhere
- ❌ No changes to NN enforcement, Hammer scoring, streak math
- ✅ Pure read + presentation upgrade
- ✅ Single source of truth: `useDailyOutcome` → consumed by Nightly Check-In + thin dashboard banner only

---

### Files

**New:**
- `src/hooks/useDailyOutcome.ts`
- `src/lib/nnProgress.ts` (extracted shared NN-count helper used by both `NonNegotiableProgressStrip` and `useDailyOutcome` to prevent drift)

**Edited:**
- `src/components/vault/quiz/NightCheckInSuccess.tsx` — prepend Daily Outcome section
- `src/components/game-plan/NonNegotiableProgressStrip.tsx` — refactored to use shared helper (no behavior change)
- `src/pages/ProgressDashboard.tsx` — add thin inline banner at top

---

### Acceptance

- Nightly check-in success screen now opens with a clear verdict (status + NN + day type + streak impact + 1-line summary)
- Outcome matches NN completion + day state deterministically
- Progress Dashboard shows the same verdict as a single inline banner — no second card, no duplication
- Updates within 1s as NNs are completed or day type changes (realtime subscriptions)
- Zero changes to evaluator, Hammer, or scoring logic
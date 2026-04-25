## Phase 10.7 — Launch Activation + Feedback Capture Layer

Pure UX/instrumentation pass. **No DB tables, no evaluator changes, no scoring changes, no new derived state.** Everything reads from `useDailyOutcome` and stores user-facing flags in `localStorage`.

---

### Part 1 — First-Visit-of-Day Activation Banner

**File:** `src/pages/Dashboard.tsx` (entry surface — `GamePlanCard` lives here at line 601)

- Add a small inline banner directly above `<GamePlanCard />`, gated by:
  - localStorage key `hm:activation:lastShown` !== today (`getTodayDate()` from `src/utils/dateUtils.ts`)
  - `useDailyOutcome().status === 'STANDARD NOT MET'` AND `nnTotal > 0` (no banner if already met, rest, skip, or no NNs)
- Copy: **"You have a standard today. Finish it before the day ends."**
- CTA button: **"View Non-Negotiables"** → smooth-scrolls to `#nn-section` (already exists in `GamePlanCard`)
- Dismiss "X" sets the localStorage stamp; CTA also stamps. Banner never re-renders same day.
- Component: `src/components/identity/StandardActivationBanner.tsx` (new, ~50 lines, inline card style — no modal so it never blocks active flow).

---

### Part 2 — Night Check-In Reflection Prompt

**File:** `src/components/vault/quiz/NightCheckInSuccess.tsx`

- Inside `<DailyOutcomeSection />` (after the detail rows, before closing `<CardContent>`), add one optional `<input>`:
  - status `STANDARD NOT MET` → label **"What blocked you today?"**
  - status `STANDARD MET`     → label **"What did you do right today?"**
  - status `RECOVERY DAY` / `SKIP REGISTERED` → no prompt
- `maxLength={120}`, optional, no submit button — auto-saves on blur to `localStorage` key `hm:reflection:{YYYY-MM-DD}`.
- Pre-fills if a value already exists for today (so reopen shows their answer).
- No DB write, no friction — pure local capture so we have a behavioral signal harness ready.

---

### Part 3 — Post-Success Feedback Prompt

**File:** `src/components/vault/quiz/NightCheckInSuccess.tsx`

- New child `<FeedbackPrompt />` rendered above the close button.
- Mounts hidden, fades in after **2000 ms** (timer cleared on unmount).
- Throttle: only renders if `localStorage['hm:feedback:lastAsked']` is null OR ≥ 3 days ago.
- Question: **"Did today's plan help you perform better?"** with **Yes** / **No** buttons.
- On **No** → reveal one `<input maxLength={140}>` "What was missing?" with a Submit button.
- On submit (Yes, or No+text), write to `localStorage['hm:feedback:log']` (append-only JSON array of `{date, helpful, note}`) and stamp `hm:feedback:lastAsked = today`. DEV-only console log via the new tracker (Part 4).
- No new endpoint or table — store local now, ready to ship to a future endpoint without UI rework.

---

### Part 4 — Silent Event Tracker

**New file:** `src/lib/launchEvents.ts`

```ts
export type LaunchEvent =
  | 'NN_COMPLETED' | 'STANDARD_MET' | 'NIGHT_CHECKIN_COMPLETED' | 'DAY_SKIPPED';
export function trackLaunchEvent(event: LaunchEvent, payload?: Record<string, unknown>) {
  if (import.meta.env.DEV) console.log(`[HM-EVENT] ${event}`, payload ?? {});
  // Future: forward to analytics endpoint here without touching call sites.
}
```

Wire-in points (single call each, no logic changes):
- `NN_COMPLETED` → `src/hooks/useCustomActivities.ts` log mutation success path (only when target reached for that template that day — guard via `localStorage['hm:nn:fired:{date}:{templateId}']` to prevent duplicates).
- `STANDARD_MET` → `src/components/GamePlanCard.tsx` inside the existing pulse-trigger effect (already latched once-per-day via `pulsedRef`).
- `NIGHT_CHECKIN_COMPLETED` → `src/components/vault/VaultFocusQuizDialog.tsx` immediately after the night-quiz successful submission (pre-existing path).
- `DAY_SKIPPED` → wherever `dayType` is set to `'skip'` (search `useDayState`/DayControl mutation; fire on the mutation success).

---

### Part 5 — "Share your standard" Hook

**File:** `src/components/vault/quiz/NightCheckInSuccess.tsx`

- Inside `<DailyOutcomeSection />`, only when `outcome.status === 'STANDARD MET'`:
  - Subtle ghost button **"Share your standard"** under the detail rows.
  - On click: `navigator.clipboard.writeText("I completed my full standard today.")` + sonner toast `"Copied to clipboard"`.
  - Graceful fallback if clipboard API unavailable (toast "Copy not supported").
  - Fires `trackLaunchEvent('STANDARD_MET', { shared: true })` once per click.

---

### Part 6 — Guardrails (verified, no code)

- ❌ No new tables, columns, or migrations
- ❌ No changes to `useDailyOutcome`, `nnProgress.ts`, or the evaluator edge function
- ❌ No new scoring or derived state
- ✅ Everything reads from existing single sources of truth
- ✅ All persistence is `localStorage` + future-ready event util

---

### Files Touched

| File | Change |
|------|--------|
| `src/components/identity/StandardActivationBanner.tsx` | **NEW** — once-per-day banner |
| `src/pages/Dashboard.tsx` | Mount banner above `GamePlanCard` |
| `src/components/vault/quiz/NightCheckInSuccess.tsx` | Reflection input, FeedbackPrompt, Share button |
| `src/lib/launchEvents.ts` | **NEW** — `trackLaunchEvent` util |
| `src/hooks/useCustomActivities.ts` | Fire `NN_COMPLETED` on log success |
| `src/components/GamePlanCard.tsx` | Fire `STANDARD_MET` inside existing pulse latch |
| `src/components/vault/VaultFocusQuizDialog.tsx` | Fire `NIGHT_CHECKIN_COMPLETED` on submit |
| `src/hooks/useDayState.ts` (or DayControl mutation site) | Fire `DAY_SKIPPED` on skip |

---

### Acceptance Validation

1. First Dashboard visit of a new day with incomplete NNs → banner appears, CTA scrolls to `#nn-section`, dismiss persists for the day.
2. Night check-in shows status-aware reflection input; value persists across re-opens.
3. After 2s on the success screen, feedback prompt fades in; dismissed/answered state respected for 3 days.
4. STANDARD MET success screen shows "Share your standard" → clipboard contains the canonical sentence.
5. DEV console emits `[HM-EVENT] …` on the four key behaviors; production build contains zero `[HM-EVENT]` references.
6. No DB schema changes; `useDailyOutcome` and `nnProgress` headers untouched.
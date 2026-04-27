## Problems

**1. Non-Negotiable UI is cluttered on the Game Plan**
- `NonNegotiableProgressStrip` sits above the Game Plan ("X / N Non-Negotiables completed") AND every NN task in the list gets a red left border + red `NON-NEGOTIABLE` badge + red glow shadow. On a 440px viewport this stacks visually noisy red elements that compete with the actual task content.
- The user's standard: NN identity should live **inside the task detail** (when the card is tapped), not be plastered all over the list.

**2. "Daily Mental Reset" countdown clock is unusable**
- Any NN custom activity with a duration renders the shared `CountdownTimer` (mono badge, pulses orange under 5min) inline inside the cramped NN row. With the red border + badge + flame + title + time badge stacked on a 440px screen it gets clipped and hard to read.

**3. "Standard broken — 7 non-negotiables missed. Fix it now." is incomprehensible**
- Source: `evaluate-behavioral-state/index.ts` line 370 emits `nn_miss` with `magnitude = nnMiss7` (count over the last 7 days). The toast in `BehavioralPressureToast.tsx` reads that magnitude and just says "7 non-negotiables missed" with no time window, no NN name, and no actionable next step. Users with 2 NNs and a few missed days see "7" and panic.
- It also fires every recompute as long as `nnMiss7 > 0`, so it nags daily even after the user is back on track.

---

## Plan

### A. Clean up NN visuals on the Game Plan (`src/components/GamePlanCard.tsx`, `src/pages/Dashboard.tsx`)

1. **Remove `NonNegotiableProgressStrip` from above the Game Plan** in `Dashboard.tsx`. The Identity Banner and Daily Outcome already convey standard status; this strip duplicates it.
2. **Demote the in-row NN treatment** in `renderTask`:
   - Drop the red left border (`border-l-4 border-l-red-500`) and the red glow shadow on incomplete NN rows.
   - Replace the inline `<NonNegotiableBadge />` next to the title with a small **flame dot** (single red flame icon, no "NON-NEGOTIABLE" text pill) tucked next to the icon. Keeps NN identifiable at a glance without screaming.
3. **Move full NN context into the task detail** (the dialog/sheet that opens when the card is tapped). In the detail view, surface:
   - "Non-Negotiable" label with explanation copy (already in `NonNegotiableBadge` tooltip — promote to inline in the detail).
   - The toggle to make/unmake NN (already exists at line 1335; keep it there).
   - The countdown timer (if duration-based) gets full width inside the detail, not crammed into the row.

### B. Fix the "Daily Mental Reset" countdown placement
- Stop rendering `CountdownTimer` (or any per-task time pill) inside the row layout for NN tasks. The countdown only renders inside the **task detail dialog**, where it has room to breathe (full-width, larger mono digits, clear label).
- The row keeps just the small flame dot + title + completion checkbox.

### C. Rewrite the "Standard broken" message with real context

Edit `supabase/functions/evaluate-behavioral-state/index.ts` and `src/components/identity/BehavioralPressureToast.tsx`:

1. **Server-side (`evaluate-behavioral-state`)**:
   - Only emit `nn_miss` when **today** has a missed NN (not just "any miss in the last 7 days"). Add a `missed_today_count` and `missed_today_titles` (top 1–2) to the event metadata.
   - If today is already complete or it's a rest/skip/push day, do **not** emit `nn_miss`.
   - Update `eventCopy('nn_miss')` to produce contextual text using the NN title when available:
     - 1 missed today: `"You haven't done [NN title] yet today. Lock it in."`
     - 2+ missed today: `"2 non-negotiables still open today: [A], [B]. Lock them in."`
     - Fallback (no titles): `"Today's standard isn't met yet. Open Non-Negotiables to fix it."`
   - Keep `magnitude` = today's missed count (not the rolling 7-day total).

2. **Client-side (`BehavioralPressureToast.tsx`)**:
   - Trust `command_text` first (already does). Remove the legacy fallback line that prints "7 non-negotiables missed" using a 7-day count — replace with: `"Today's standard isn't met yet. Open Non-Negotiables to fix it."`
   - Keep the "Complete NN" action button (already wired via `complete_nn` action).

3. **De-noise**:
   - In the evaluator, dedupe `nn_miss` to once per day (same pattern as `dedupeToday` already used for `skip_day_used` / `push_fail`). Stops the same alert firing on every recompute.

---

## Files Touched

- `src/pages/Dashboard.tsx` — remove `NonNegotiableProgressStrip` mount + import.
- `src/components/GamePlanCard.tsx` — replace inline NN badge/border/glow with a small flame dot; move NN context + countdown into the existing task detail dialog.
- `supabase/functions/evaluate-behavioral-state/index.ts` — change `nn_miss` to today-only, attach NN titles, dedupe per day, rewrite copy.
- `src/components/identity/BehavioralPressureToast.tsx` — replace legacy `nn_miss` fallback copy.
- `src/components/game-plan/NonNegotiableProgressStrip.tsx` — keep file (other surfaces may still want it later) but it stops rendering on the dashboard.

## Out of Scope
- No changes to NN scoring, streaks, or the Hammer state engine.
- No changes to `useDailyOutcome` (already the source of truth for "Standard met / not met").
- No changes to the lock / mode toggle / Skip Day toolbar work just shipped.

## Outcome
- Game Plan is visually calm: one small flame dot identifies NN tasks; full context lives in the detail view.
- The "Daily Mental Reset" countdown gets a usable, full-width display in the task detail.
- The pressure toast finally tells the user **what** they missed, **today**, and stops nagging once it's done.

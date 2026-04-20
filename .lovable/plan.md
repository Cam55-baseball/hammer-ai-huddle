

## Plan — Fix nutrition & mind fuel badge unlocks

### Root causes

**Nutrition (`get-daily-tip`)** — badges are computed but never reach the user:
1. **First-visit branch** (no streak record yet) hardcodes `badges_earned: ['starter']` even though `starter` requires 3 days. Awards a wrong badge instantly and never re-evaluates real milestones.
2. **No `newBadges` delta returned** — response only sends the cumulative `badgesEarned` list. The client cannot detect *which* badge was just unlocked.
3. **`DailyTipHero.tsx` has zero badge-toast wiring** — no import, no celebration, no haptics. Even when a badge IS added to the DB list, the user sees nothing.
4. **Same-day repeat visits** still update `badges_earned` correctly via the `else` branch loop, but with no client toast, the user never knows.

**Mind Fuel (`get-daily-lesson`)** — server logic works AND client wires `newBadges` to `showBadgeUnlockToast`. One small gap:
1. The `mind_starter` (1-day) badge is awarded only when `currentStreak >= 1`, which only becomes true inside the `!alreadyVisitedToday` block. On a brand-new user's very first visit this works. ✔️
2. **Confirmed working** — no fix needed beyond defensive cleanup.

### Changes

**1. `supabase/functions/get-daily-tip/index.ts`** — track and return new-badge deltas.

- **First-visit branch** (lines 83-98): create the streak with `badges_earned: []` (not `['starter']`). Compute `newBadges = []` for this path (streak=1, none of the milestones ≥ 3 days qualify).
- **Same-day / consecutive / broken branches**: keep existing badge-loop logic, but explicitly compute and return a `newBadges` array (the badges added in *this* invocation).
- **Response payload** (both `limitReached` path and normal path): add top-level `newBadges: string[]` field.
- Add `console.log` for awarded badges (mirrors `get-daily-lesson` for parity / debuggability).

**2. `src/components/DailyTipHero.tsx`** — show the celebration toast.

- Import `showBadgeUnlockToast` (we'll create a small nutrition variant — or reuse existing pattern).
- After `supabase.functions.invoke('get-daily-tip', …)` returns, if `data.newBadges?.length`, fire one toast per badge with staggered 1.5s delay (mirrors `MindFuelWeeklyChallenge.tsx` pattern).

**3. New file: `src/components/NutritionBadgeUnlockToast.tsx`** — dedicated nutrition badge toast.
- Mirrors `MindFuelBadgeUnlockToast.tsx` structure.
- `BADGE_INFO` map for the 6 nutrition milestones (`starter`, `week_warrior`, `iron_will`, `iron_horse`, `elite`, `legendary`) with their emojis from `NutritionBadges.tsx`.
- Exports `showBadgeUnlockToast({ badgeKey })` — triggers confetti + haptic + sonner toast with green/emerald gradient (matches nutrition theme).

**4. Backfill existing wrongly-awarded `'starter'` badges** — via SQL update (insert tool):
- For users in `nutrition_streaks` where `'starter' = ANY(badges_earned)` AND `current_streak < 3`, remove `'starter'` from the array so they earn it legitimately.

### Out of scope
- No changes to mind_fuel server logic (already correct).
- No DB schema changes.
- No changes to weekly challenge / bounce-back-bay badge systems (already working).
- No badge UI redesign — only the unlock event flow.

### Verification
1. **New user** visits Nutrition → sees a tip → no badge toast (streak = 1, first milestone is 3 days). DB row created with `badges_earned: []`.
2. Same user returns 3 consecutive days → on day 3 sees 🌱 **"Getting Started"** confetti + toast. `nutrition_streaks.badges_earned` includes `starter` and response payload contains `newBadges: ['starter']`.
3. Day 7 → 🌱 stays earned, ⚡ **"Week Warrior"** unlocks with toast.
4. Refresh page same day after unlock → no duplicate toast (newBadges is empty on second invocation).
5. **Mind Fuel** day 1 → 🧠 **"Mind Starter"** toast still fires (regression check).
6. Existing user who falsely had `'starter'` with streak < 3 → after backfill, no badge shown until they hit 3 consecutive days.


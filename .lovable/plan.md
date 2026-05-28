## Problem

The Coach Hammer "Do Check-In" CTA dumps the user into `/command`, which has no questions. We need a short but **elite-grade** guided check-in that captures the full signal set Hammer needs to coach intelligently — readiness, fatigue, soreness, sleep, stress, hydration, training load, and free-text flags — without feeling like a survey.

## Solution: multi-step `QuickCheckInSheet`

A bottom sheet opened in-place from the Coach Hammer card. Stepped flow (one prompt per screen, large tap targets, progress dots, ~60–90 sec total). Every answer is optional except readiness — the user can swipe past anything they don't want to log, and missingness propagates through to the AI so it can adjust confidence.

### Step flow

```text
Step 1/7 · How ready do you feel today?      [1 ──●── 10]
Step 2/7 · Overall fatigue right now?        [1 ──●── 10]
Step 3/7 · Muscle soreness?                  [1 ──●── 10]
         Where? (multi-select chips)
           [legs] [back] [shoulders] [arms] [core] [none]
Step 4/7 · Sleep last night                  [hours: 0–12]
         Quality                             [1 ──●── 10]
Step 5/7 · Stress / mental load              [1 ──●── 10]
         Hydration today                     [low · ok · good]
Step 6/7 · What's on deck today?  (multi-select)
           [lifting] [throwing] [hitting] [conditioning]
           [skill work] [game/scrimmage] [recovery only] [rest day]
         If lifting → intensity                [light · moderate · heavy · max]
         If throwing/hitting → planned volume  [low · normal · high]
Step 7/7 · Anything to flag for Hammer? (optional text, 240 chars)
           e.g. "tight hamstring", "didn't eat enough", "bullpen tomorrow"

         [ Send to Hammer ]
```

Bottom of every step: **Skip** (left) · **Back** (left) · **Next** (right). Final step button reads "Send to Hammer".

### What gets emitted on submit

One transaction's worth of canonical `asb_events` via the existing `emitAsbEvent` helper. Each row carries the same `causality_refs` group ID so Hammer can stitch them as a single check-in:

| Topic | Payload |
|---|---|
| `behavioral.readiness` | `{ score: 1–10 }` |
| `behavioral.fatigue` | `{ score: 1–10 }` |
| `behavioral.soreness` | `{ score: 1–10, regions: string[] }` |
| `behavioral.sleep` | `{ hours: number, quality: 1–10 }` |
| `behavioral.stress` | `{ score: 1–10 }` |
| `behavioral.hydration` | `{ level: "low" \| "ok" \| "good" }` |
| `athlete.plan.today` | `{ modules: string[], liftingIntensity?, volume? }` |
| `behavioral.checkin` | `{ note: string, fields_logged: string[], skipped: string[] }` |

Skipped fields are NOT emitted (preserves missingness). The summary event records what was logged vs skipped so Hammer can transparently say "you didn't tell me about sleep — assuming priors."

After submit:
- Toast: "Check-in saved · Coach Hammer is recalculating."
- Invalidate `coach-hammer-next-step`, `athlete-command-rows`, and `escalation-feed` query keys.
- Close sheet; Hammer card re-renders with a fresh, signal-grounded recommendation.

### Wiring

- `CommunicationAI.tsx`: when `ctaRoute === "/check-in"`, open the sheet locally instead of navigating. All other routes navigate normally.
- `supabase/functions/coach-hammer-next-step/index.ts`:
  - Add `/check-in` to `ALLOWED_ROUTES`.
  - Expand the system prompt so the model uses `/check-in` when readiness/fatigue/soreness/sleep/stress signals are missing, stale > 18h, or contradictory.
  - Extend the inbound snapshot to include the new fields (`soreness`, `sleep`, `stress`, `hydration`, `todayPlan`) so the agent can write more specific guidance immediately after a check-in.
- Update `useCoachHammerNextStep.ts` to derive those extra fields from the canonical projections.
- Update the deterministic fallback step's CTA to `/check-in` for "no fresh data" cases.

### What this is NOT

- Not a survey wall. Each step is one question, one tap, swipe to skip.
- Not a chat. No free conversation, no AI back-and-forth inside the sheet.
- No new tables, no new edge function, no new dependencies — reuses `asb_events`, the existing emit helper, and the existing `coach-hammer-next-step` function.
- No changes to `/command`, the Command Center cards, `QuickLogSheet` (session log is a separate surface), onboarding, or escalation banner.

### Files touched

- **new** `src/components/checkin/QuickCheckInSheet.tsx` (stepped sheet + emit logic)
- **new** `src/components/checkin/steps/` (small per-step components: ReadinessStep, FatigueStep, SorenessStep, SleepStep, StressHydrationStep, TodayPlanStep, FlagStep)
- edit `src/components/dashboard/CommunicationAI.tsx` (open sheet vs navigate, updated fallback route)
- edit `src/hooks/useCoachHammerNextStep.ts` (snapshot includes soreness, sleep, stress, hydration, today plan)
- edit `supabase/functions/coach-hammer-next-step/index.ts` (allow `/check-in`, prompt update, accept richer snapshot)
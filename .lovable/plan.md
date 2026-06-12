## What is happening now

- **Command Center was not deleted.** It still exists as the deep-link route `/command`, still renders inside `/today`, and its body-readiness cards were moved to **Progress Dashboard → “How your body is doing today”** (`/progress#body`). It was removed from the main Dashboard to reduce clutter, but it is still alive.
- **Hammer Daily To Do is currently too shallow.** The existing plan is deterministic and context-aware in a limited way, but it is mostly a 9-modality template: warmup, speed, strength, hitting, throwing, defense, baserunning, fueling, recovery.
- **The weak behavior reports are real from the code path:**
  - “Start warm-up” routes to `/tex-vision`, even when the card does not say Tex Vision.
  - “Answer Hammer” routes to `/command`, which feels dead because it does not open the actual question/conversation inline.
  - Daily blocks show short bullet labels like “Band activation” and “2 build-ups” without exact setup, distance, reps, cues, safety notes, or logging.
  - The plan does not currently create/open a loggable Game Plan card from each Hammer item.

## Goal

Turn **Hammers Today Plan / Daily To Do** into an elite, personalized, explainable, loggable daily coaching system:

- No cookie-cutter cards.
- No vague drill names.
- No route mismatch.
- No fake personalization.
- Every card explains exactly what to do, why this athlete is doing it today, how far/how many/how long, what “good” looks like, where to log it, and how to ask Hammer about it.

## Plan

### 1. Make Hammer Daily To Do an expandable coaching board

Replace the compact one-line block renderer with openable modality cards:

- Each block opens inline instead of sending the athlete away immediately.
- Closed state shows: title, duration, priority, status, and “why today.”
- Open state shows:
  - exact drill list
  - setup
  - reps/sets/distance/time/rest
  - simple “8-year-old can follow it” instructions
  - coaching cues
  - stop/modify rules
  - how this connects to the player’s current goal, sport, position, season, body state, schedule, and recent app data
  - log/add buttons
  - “Ask Hammer about this” dialogue box

### 2. Add inline Hammer AI communication inside the dropdown

Add a real communication piece directly inside **Hammers Today Plan**, not somewhere else:

- Add an inline “Talk through today’s plan” Hammer chat panel at the top of the dropdown.
- Add per-card “Ask Hammer about this block” prompts that pass the selected modality/card context into the existing Hammer chat system.
- Use the existing `useHammerChat` / `hammer-chat` function so it reads the athlete context and current next step.
- Extend the chat payload with the selected daily-plan block so Hammer can discuss the exact warmup/speed/hitting/throwing/etc. item, not answer generically.
- Keep model calls server-side; no client-side AI keys.

### 3. Fix “Answer Hammer” dead buttons

Replace current dead-end navigation with inline context acquisition:

- If a card is missing information, the button opens an inline question panel directly in the daily plan.
- It uses the existing context persistence path from Hammer onboarding (`persistContextAnswer`) so answers actually update the athlete profile/context envelope.
- After saving an answer, invalidate/refetch the Hammer context so the plan regenerates from the new truth.
- Example: “Hitting — waiting on equipment” opens “What hitting equipment do you have today?” right there, then rebuilds the plan.

### 4. Fix CTA route mismatches

Correct misleading routes and labels:

- Warmup should not say “Start warm-up” and silently send the athlete to Tex Vision.
- If Tex Vision is truly prescribed, the card must explicitly say that:
  - title/step includes Tex Vision
  - why explains why vision work is today’s warmup/primer
  - CTA says “Open Tex Vision primer”
- If it is a real warmup, the CTA should open/add a warmup execution card, not Tex Vision.
- Same standard for speed, workout, throwing, hitting, fielding, baserunning, recovery, and fueling.

### 5. Add “Add to Game Plan” and “Log this” behavior

Use the existing custom activity system instead of creating a parallel logging system:

- Convert each Hammer daily block into a `custom_activity_template` shape with:
  - title
  - activity type
  - duration
  - exact exercises/drills
  - custom checklist fields
  - purpose/action/success criteria
  - completion binding
  - today’s date/schedule
- Add buttons:
  - **Add to Game Plan** creates/schedules the exact Hammer item for today.
  - **Open log** opens the existing custom activity detail/checklist flow after the item is created.
  - **Done / check off steps** uses existing custom activity log mechanics.
- Avoid duplicate cards by generating stable Hammer source keys per date/modality/context fingerprint.

### 6. Upgrade daily plan personalization logic

Deepen `buildHammerDailyPlan` so it is no longer shallow template branching:

- Pull from the existing context spine:
  - sport
  - position
  - age/lifecycle band
  - season phase
  - goals
  - training focus
  - development priorities
  - equipment
  - injury/pain constraints
  - readiness/fatigue/workload/sleep
  - MPI/HIE weakness signals
  - recent video/report-card trends where available
  - schedule window: games/practices today, tomorrow, next 7 days
  - active program status/progression where available
- Generate a deterministic daily plan fingerprint from date + context + recent activity.
- Use the fingerprint to vary emphasis truthfully without randomness.
- Preserve missingness: if data is missing, Hammer must say what is missing and ask for it instead of pretending.

### 7. Upgrade speed into a real speed-lab style session

Replace weak speed copy like “2 build-ups” with full speed session cards:

- Example structure:
  - prep: A-skips, wall switches, pogos
  - acceleration/max velocity/tempo based on athlete state
  - exact distance: feet/yards/meters
  - exact reps
  - full recovery time
  - intensity target
  - coaching cue
  - stop rule
  - logging fields: times, effort, tightness, best rep
- Youth versions stay simple and safe.
- Pitchers/in-season/game-near athletes get taper/freshness logic.
- Low readiness or leg-risk athletes get recovery/tempo substitutions.

### 8. Upgrade warmup clarity

Replace vague “band activation” with exact instructions:

- What band.
- Where to place it.
- Which body part/pattern it activates.
- Sets/reps.
- How it should feel.
- Common mistake.
- When to stop.

Example output level:

```text
Mini-band lateral walks
Band: light mini-band above knees
Do: 2 sets x 8 steps each direction
Cue: knees track over toes; hips stay level
Why today: primes glutes before acceleration work
Stop if: knee/hip pain increases
```

### 9. Add progression / roadmap behavior

Make Daily To Do answer “Does this roadmap me to greatness?” with visible progression:

- Add a “Roadmap reason” line per card:
  - “Today is acceleration base because your speed freshness is high and game is not within 48h.”
  - “Today is maintenance because game is tomorrow.”
  - “Today is recovery-first because readiness is low.”
- Track whether today is build, sharpen, maintain, deload, or recover.
- Rotate/progress only when the athlete’s logs and app signals justify it.
- No random variation.

### 10. Improve discoverability of Command Center

Because the sidebar top-level Command Center link was removed, make its current location obvious:

- Add a small link inside the Hammer Daily dropdown: **Body state / Command Center** → `/progress#body`.
- Keep `/command` as the deep-link route for legacy/direct links.
- Keep `/today` rendering Command Center for users who land there.

### 11. Technical implementation targets

Primary files:

- `src/lib/hammer/prescription/dailyPlan.ts`
  - expand plan model beyond flat steps
  - add exact drills, cues, log schema, add-to-game-plan metadata, roadmap reason, source signals
- `src/components/hammer/HammerDailyPlan.tsx`
  - expandable cards
  - inline chat
  - inline missing-info answers
  - add/log buttons
  - route-label fixes
- `src/hooks/useHammerChat.ts`
  - accept selected daily-plan block context
- `supabase/functions/hammer-chat/index.ts`
  - include selected Hammer block in the system prompt safely
- `src/lib/hammer/context/athleteContext.ts`
  - expose any already-available missing live signals needed by the plan without inventing new truth
- `src/hooks/command/useScheduleWindow.ts`
  - keep schedule as a plan input instead of only a display strip
- `src/hooks/useCustomActivities.ts`
  - reuse existing create/add/log mechanics; add only small helper if needed
- `src/pages/Dashboard.tsx`
  - keep the dropdown home above Game Plan, but render the upgraded board

### 12. Verification

After implementation:

- Warmup no longer routes to Tex Vision unless the card explicitly prescribes Tex Vision.
- “Answer Hammer” opens a real inline question and updates context.
- Each Hammer card can be opened and understood by a young athlete.
- Each card can be added to/logged in Game Plan.
- Two different athlete profiles produce visibly different plans for truthful reasons.
- Same athlete/date/context produces the same plan; changed context/logs produce explainable changes.
- Command Center is reachable from `/progress#body`, `/today`, and `/command`.
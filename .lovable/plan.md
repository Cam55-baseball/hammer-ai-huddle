## The problem (verified in code)

Right now `buildHammerDailyPlan` in `src/lib/hammer/prescription/dailyPlan.ts` builds **all 10 modalities every single day** (line 1617: `ALL_MODALITIES.map((m) => builder(...))`). The only "scheduling" that exists is:

- Speed can flip into `deload` / `tempo_recovery` mode via `selectSpeedFocus`, but the card still appears daily.
- Strength appears every day regardless of season phase, workload, or yesterday's session.
- `applyScheduleModulation` only reacts to games/tournaments/travel — it has no concept of a weekly microcycle.
- `TRAINING_DEFAULT_SCHEDULES` (day-of-week map) exists in `src/constants/trainingSchedules.ts` but is only consumed by the Calendar / Game Plan module, never by the daily Hammer plan.

That is exactly why users see "lifts every day, speed sometimes" — there is no per-modality frequency rule, no CNS pairing rule, no rest-day rule, and no visible roadmap of what's coming Tue/Wed/Thu. The plan looks fake because it is fake: it's a full 10-card menu re-rendered daily with cosmetic phase-labels.

## What this plan builds

A single **Weekly Microcycle Engine** that is the sole authority for "does this modality run today, why, and when does it come back?" It composes cleanly with the existing schedule posture, injury gates, readiness, workload, and side-split logic — none of those are weakened, and organism truth stays owned by the existing envelope.

### 1. New module: `src/lib/hammer/prescription/weeklyMicrocycle.ts`

Pure, deterministic, replay-safe (no I/O, no clocks beyond an injected `today: Date`). Exports:

- `resolveWeeklyTemplate(proj, ctx)` → picks a canonical template based on:
  - `seasonPhase` (off / pre / in / post)
  - `weeklyAvailabilityDays` (3, 4, 5, 6)
  - `competitionLevel` + `liftingAgeYears` (youth vs HS+ vs college+)
  - Primary position (pitcher vs position player vs two-way)
  - Primary category-goal (speed / power / hitting / throwing / fielding)
  - `injuryRegions`, `workloadHigh`, `readinessScore`

- `applyMicrocycle(today, template)` → returns:
  ```ts
  Record<ModalityKey, {
    scheduled: boolean;
    intensity: "primary" | "secondary" | "activation" | "off";
    microcycleLabel: string;   // "Day 2 of 5 · Heavy lift"
    nextScheduled: string;     // "Next speed: Thu"
    reason: string;            // "Speed and lower-body lift never stacked back-to-back heavy."
  }>
  ```

### 2. Canonical templates (season × availability)

Each template is a 7-slot week keyed to `getDay()`. Rules baked in:

- **Off-season (5-6 days):** Lift 4×, Speed 2-3× (Mon/Wed/Fri CNS spacing), Hit 4-5×, Throw per-position, Conditioning 1×, Full rest 1×, Active recovery 1×.
- **Pre-season (5 days):** Lift 3×, Speed 3×, Hit 5×, Throw 5× (pitcher long-toss cycle), Defense 3×, Rest 1×, Recovery 1×.
- **In-season (3-4 days):** Lift 2× (maintenance), Speed 1× (freshness only), Hit daily (activation), Throw governed by pitcher rotation, Recovery day locked after outings.
- **Post-season / deload:** Recovery-first; every high-CNS modality drops to 1×.
- **Youth / low training age:** Motor-learning bias — Hit/Throw/Defense daily at low volume, Lift capped at 2×, Speed 2× (ATP-CP short reps only), mandatory Sat rest.

CNS pairing invariants enforced across all templates:
- Never max-speed the day before or after max-lift lower.
- Never two consecutive high-CNS days without a recovery buffer.
- Pitcher throwing schedule (starter D+1 recovery, D+2 flat, D+3 bullpen, D+4 tune-up, D+5 rest) supersedes generic throwing frequency.
- Switch hitters / ambidextrous throwers keep their laterality split — the template schedules the *block*, then `splitLateralityBlocks` continues to duplicate cards.

### 3. Wire the engine into `dailyPlan.ts`

- Add `"off-day"` to `BlockStatus`.
- Before `builder()` runs, call `applyMicrocycle` and pass the per-modality decision in as `BuilderArgs.schedule`.
- Each `case "…"` in `builder()`:
  - If `schedule.scheduled === false` → return an `off-day` block with:
    - `title`: e.g. "Speed — off today (returns Thu)"
    - `roadmapReason`: the CNS-pairing rationale
    - `steps`: 1-2 optional micro-activations (mobility, breath, film) — never full drills
    - `gamePlanTemplate: null` so nothing spawns a loggable session
  - If `schedule.intensity === "activation"` → cap volume at ~30% (e.g. tee-only hitting, catch-play throwing, single-set lift primer).
  - If `schedule.intensity === "secondary"` → cap at ~60%.
  - Append `microcycleLabel` and `nextScheduled` into `roadmapReason` for every block so the "why today" text finally reflects the plan.

### 4. Modality-specific tightening

- **Strength:** Add a `liftDayType` derived from template (`heavy_lower`, `heavy_upper`, `dynamic_effort`, `repetition_effort`, `maintenance`) so consecutive lift days don't repeat the same pattern.
- **Speed:** `selectSpeedFocus` becomes a two-step decision — template picks *whether* today is a speed day and *which slot* (acceleration / max-velocity / tempo); the existing focus enum picks *how* to execute given readiness.
- **Conditioning:** Add a proper `conditioning` modality (currently folded into `recovery`) with 1× / week baseline, 0× in-season during heavy game weeks.
- **Throwing:** Feed the pitcher rotation state (from `athlete_professional_status` / `training_focus`) into template so bullpen-day never lands on start-day-minus-one.
- **Recovery day:** Convert the day the microcycle assigns as "rest" into a full-card recovery day (sleep, hydration, breath, mobility) — not just a suppressed lift.

### 5. Roadmap UI surface

A new `WeeklyRoadmapStrip` component above the daily plan on `HammerDailyPlan.tsx` renders the 7-day template:

```text
Mon    Tue    Wed    Thu    Fri    Sat    Sun
Lift+  Speed+ Rest   Lift+  Speed+ Hit    Recov
Hit    Throw         Hit    Throw  Field
```

- Today is highlighted.
- Tap a day → shows that day's scheduled modalities and the reason each is on/off.
- One button: "Override this week" → temporary user shift (stored in `game_plan_task_schedule` so it survives across sessions and remains the constitutional source of truth).

### 6. Integration order (unchanged constitutional stack)

`buildHammerDailyPlan` becomes:

```text
projectEnvelope
  → selectSpeedFocus
  → resolveWeeklyTemplate  ← NEW
  → applyMicrocycle(today) ← NEW
  → builder() per modality (now schedule-aware)
  → splitLateralityBlocks
  → applyMinorParentSupremacy
  → applyCategoryGoalOrdering
  → applyScheduleModulation   (games/tournaments override microcycle)
  → applySideBias
  → applyGpSignalBias
```

Suppression precedence stays: **injury > parent supremacy > game/tournament posture > microcycle off-day > readiness deload > goal ordering**. Microcycle can *turn a modality off* but never *unlock* one that a higher rule suppressed.

### 7. Files to add / change

- **New:** `src/lib/hammer/prescription/weeklyMicrocycle.ts`
- **New:** `src/lib/hammer/prescription/microcycleTemplates.ts` (the season×availability tables)
- **New:** `src/components/hammer/WeeklyRoadmapStrip.tsx`
- **Edit:** `src/lib/hammer/prescription/dailyPlan.ts` — add `off-day` status, thread `schedule` into `BuilderArgs`, update each modality's `case` block, extend `roadmapReason` output.
- **Edit:** `src/components/hammer/WkPrescriptionCard.tsx` — render `off-day` variant (grayed card with "Returns Thu" and 1 optional micro-primer).
- **Edit:** `src/components/hammer/HammerDailyPlan.tsx` — mount `WeeklyRoadmapStrip`.
- **Edit:** `src/lib/hammer/context/decisionFilters.ts` — expose `competitionLevel` and `primaryPosition` in the projection if not already surfaced.
- **Tests:** `src/test/weeklyMicrocycle.test.ts` covering (a) each season × availability template is CNS-legal, (b) in-season pitcher throwing rotation never collides with heavy lift, (c) game/tournament posture still overrides the microcycle, (d) injury still suppresses regardless of scheduled day.

### 8. Non-goals (explicit)

- No new database tables. Microcycle is derived from existing context.
- No changes to Game Plan / Calendar scheduling (already user-owned).
- No changes to the WIC constitution, envelope ownership, or replay/lineage boundaries.
- No AI calls — the template is deterministic; AI stays for the "why" explainer only.

## What the user will see after this

- Speed shows up on scheduled days only (e.g. Mon/Wed/Fri in off-season) with "Next speed: Wed" on off days.
- Lifts drop to 2×/week in-season with a visible "Maintenance week — 2 heavy days" label instead of showing every day.
- A 7-day strip at the top of Hammers Today explaining the week's shape.
- Every block's "why today" line ends with "Day 2 of 5 — heavy lower. Recovery day tomorrow." so the plan reads like a real program, not a menu.
